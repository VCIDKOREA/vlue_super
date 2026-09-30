package kr.vlue.calloverlay

import android.content.Context
import android.util.Log
import java.util.concurrent.ConcurrentHashMap
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.supervisorScope
import org.json.JSONObject

/**
 * 통화 중 번호 조회 결과 메모리 캐시 + 병렬 프리패치 (v2).
 *
 * 통화 시작(발신 다이얼/수신 링잉) 즉시 백그라운드(IO)에서 후보 소스를 **병렬 동시 조회**하고
 * 먼저 도착한 결과를 즉시 바인딩한다. 미니버블/미니케이스 탭 시 서비스는 네트워크 없이
 * [peek] 한 번으로 표시할 내용을 결정한다 (Zero Latency).
 *
 * 소스 (모두 동시 시작, 먼저 도착한 것부터 바인딩):
 *  - 로컬: 메모리/디스크 카드 캐시 · 공공 디렉터리 인덱스 · 안심 저장  → 즉시(ms)
 *  - 원격: VLUE `/api/cards/by-number` — VLUE 회원 조회 + 서버측 공공DB(카카오/네이버/국세청) 폴백
 *  - 타이머: [FIRST_PAINT_TIMEOUT_MS] 안에 아무 결과가 없으면 미등록(UNREGISTERED)로 바인딩
 *
 * 티어 우선순위: VLUE 회원 > 공공/로컬 DB > 미등록. 낮은 티어가 먼저 도착해도 화면을 띄울 수 있지만
 * 높은 티어를 덮어쓰지 않고, 더 높은 티어가 늦게 도착하면 업그레이드된다.
 */
object CallPrefetchCache {
    private const val TAG = "CallPrefetchCache"

    /** 이 시간 안에 결과가 없으면 미등록 안심팝업으로 확정 바인딩 — 조회 대기 고착 방지. */
    const val FIRST_PAINT_TIMEOUT_MS = 2_000L

    private const val ENTRY_TTL_MS = 5L * 60L * 1000L

    enum class Tier(val rank: Int) {
        /** DB 미등록 · 조회 타임아웃 → 2줄 안심팝업 + 제보/신고 */
        UNREGISTERED(0),

        /** 공공/로컬 DB(공공 디렉터리·안심 저장) → 안심팝업 */
        PUBLIC_DB(1),

        /** VLUE 정식 회원 → Full 쇼케이스 / 인증 팝업 */
        VLUE_MEMBER(2)
    }

    data class Entry(
        val tier: Tier,
        /** UNREGISTERED 는 null */
        val result: CardLookupResult?,
        /** 발신 미니버블 라벨용 상호명. 없으면 빈 문자열 */
        val label: String,
        val atMs: Long,
        /** 타임아웃으로 만들어진 임시 미등록 — 이후 실제 결과가 덮어쓴다 */
        val provisional: Boolean = false
    ) {
        val rawJson: String? get() = result?.rawJson
    }

    private val entries = ConcurrentHashMap<String, Entry>()
    private val inflight = ConcurrentHashMap<String, Job>()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    fun keyOf(raw: String?): String = IncomingNumberResolver.canonicalDigits(raw)

    /** 메모리에 대기 중인 결과. 네트워크/디스크 접근 없음. */
    fun peek(raw: String?): Entry? {
        val key = keyOf(raw)
        if (key.isBlank()) return null
        val e = entries[key] ?: return null
        if (System.currentTimeMillis() - e.atMs > ENTRY_TTL_MS) {
            entries.remove(key, e)
            return null
        }
        return e
    }

    /** 통화 종료 — 통화 단위 상태(임시 미등록 포함)를 다음 통화로 넘기지 않는다. */
    fun clear() {
        entries.clear()
        inflight.values.forEach { it.cancel() }
        inflight.clear()
    }

    /**
     * 병렬 프리패치 시작. 같은 번호가 이미 진행 중이면 재사용한다.
     * [onBind] 는 **티어가 실제로 개선될 때만** IO 스레드에서 호출된다.
     */
    fun prefetch(
        context: Context,
        raw: String,
        onBind: suspend (Entry) -> Unit
    ): Job? {
        val key = keyOf(raw)
        if (key.isBlank()) return null
        inflight[key]?.let { if (it.isActive) return it }
        val app = context.applicationContext
        val job = scope.launch {
            suspend fun bind(e: Entry) {
                if (!offer(key, e)) return
                try {
                    onBind(e)
                } catch (ce: CancellationException) {
                    throw ce
                } catch (t: Throwable) {
                    Log.w(TAG, "onBind failed tier=${e.tier}", t)
                }
            }
            supervisorScope {
                /* ① 로컬 — 메모리/디스크 카드 캐시, 공공 디렉터리 인덱스 */
                launch {
                    val local = localLookup(app, raw)
                    if (local != null) bind(local)
                }
                /* ② 원격 — VLUE 회원 + 서버측 공공DB. 빠른 조회 실패 시 느린 조회 1회 */
                launch {
                    var r = CardLookupRepository.lookup(app, raw)
                    if (r == null) {
                        delay(180L)
                        r = CardLookupRepository.lookupSlow(app, raw)
                    }
                    when {
                        r == null -> Unit /* 타임아웃 — ③ 타이머가 미등록으로 확정 */
                        !r.matched -> bind(unregistered(provisional = false))
                        else -> bind(entryFrom(r))
                    }
                }
                /* ③ 타이머 — 조회 대기 고착 방지 */
                launch {
                    delay(FIRST_PAINT_TIMEOUT_MS)
                    bind(unregistered(provisional = true))
                }
            }
        }
        inflight[key] = job
        job.invokeOnCompletion { inflight.remove(key, job) }
        return job
    }

    private fun localLookup(app: Context, raw: String): Entry? {
        CardLookupRepository.peekCached(app, raw)?.let { return entryFrom(it) }
        PublicDirectoryPhoneCache.peek(app, raw)?.let { hit ->
            val json = CardLookupRepository.buildPublicDirectorySafeJson(raw, hit.displayName)
            return entryFrom(
                CardLookupResult(
                    matched = true,
                    verified = false,
                    displayName = hit.displayName,
                    rawJson = json
                )
            )
        }
        return null
    }

    private fun unregistered(provisional: Boolean): Entry =
        Entry(
            tier = Tier.UNREGISTERED,
            result = null,
            label = "",
            atMs = System.currentTimeMillis(),
            provisional = provisional
        )

    private fun entryFrom(result: CardLookupResult): Entry =
        Entry(
            tier = classify(result),
            result = result,
            label = labelOf(result),
            atMs = System.currentTimeMillis()
        )

    /**
     * 우선순위 병합 (테스트 대상).
     * 더 높은 티어는 항상 채택, 낮은 티어는 거부, 같은 티어는 내용이 다를 때만(최신) 채택.
     */
    internal fun offer(key: String, incoming: Entry): Boolean {
        var accepted = false
        entries.compute(key) { _, old ->
            val take =
                when {
                    old == null -> true
                    incoming.tier.rank > old.tier.rank -> true
                    incoming.tier.rank < old.tier.rank -> false
                    else -> incoming.rawJson != old.rawJson && incoming.atMs >= old.atMs
                }
            if (take) {
                accepted = true
                incoming
            } else {
                old
            }
        }
        return accepted
    }

    /** 결과 → 티어. matched=false/null 은 미등록. */
    internal fun classify(result: CardLookupResult?): Tier {
        if (result == null || !result.matched) return Tier.UNREGISTERED
        return try {
            val json = JSONObject(result.rawJson)
            val kind = json.optString("profileKind").trim()
            val source = json.optString("source").trim()
            if (kind == "public_directory_safe" ||
                kind == "contact_safe_care" ||
                source == "public_directory_local"
            ) {
                Tier.PUBLIC_DB
            } else {
                Tier.VLUE_MEMBER
            }
        } catch (_: Exception) {
            Tier.VLUE_MEMBER
        }
    }

    /** 미니버블 라벨: 상호 → 표시명. 없으면 빈 문자열(호출부가 「안심통화」 폴백). */
    internal fun labelOf(result: CardLookupResult?): String {
        if (result == null) return ""
        return try {
            val json = JSONObject(result.rawJson)
            val card = json.optJSONObject("card") ?: json
            listOf(
                card.optString("organization"),
                json.optString("organization"),
                card.optString("companyName"),
                json.optString("companyName"),
                result.displayName,
                card.optString("displayName"),
                json.optString("displayName")
            ).map { it.trim() }.firstOrNull { it.isNotEmpty() && it != "null" }.orEmpty()
        } catch (_: Exception) {
            result.displayName.trim()
        }
    }

    /** 테스트 전용 초기화. */
    internal fun resetForTest() {
        entries.clear()
        inflight.clear()
    }
}
