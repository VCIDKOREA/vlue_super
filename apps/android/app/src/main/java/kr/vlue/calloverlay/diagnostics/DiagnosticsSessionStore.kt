package kr.vlue.calloverlay.diagnostics

import android.content.Context
import android.os.Build
import android.os.SystemClock
import android.provider.Settings
import kr.vlue.calloverlay.BuildConfig
import kr.vlue.calloverlay.LetteringPrefs
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID
import java.util.concurrent.atomic.AtomicReference

/** Active diagnostics session metadata (one call = one BIG_PUSH session). */
data class ActiveDiagnosticSession(
    val id: String,
    val feature: String,
    val sessionKey: String,
    val startedAtMs: Long,
    /** SystemClock.elapsedRealtime() at session create (ms) */
    val startedElapsedRealtimeMs: Long,
    /** SystemClock.elapsedRealtimeNanos() at session create — Timeline baseTime */
    val startedElapsedRealtimeNanos: Long,
    val deviceModel: String,
    val androidVersion: String,
    val appVersion: String,
    val deviceId: String,
    val userId: String?,
    val phoneMasked: String?
) {
    /** 세션 시작 대비 monotonic 경과(ms) — 타임라인 표시용 */
    fun elapsedRealtimeSinceStart(nowEr: Long = SystemClock.elapsedRealtime()): Int =
        (nowEr - startedElapsedRealtimeMs).coerceAtLeast(0).toInt()

    fun elapsedMsFromNanos(nowNanos: Long = SystemClock.elapsedRealtimeNanos()): Int =
        ((nowNanos - startedElapsedRealtimeNanos) / 1_000_000L).coerceAtLeast(0L).toInt()

    @Deprecated("use elapsedRealtimeSinceStart", ReplaceWith("elapsedRealtimeSinceStart()"))
    fun elapsedMs(now: Long = System.currentTimeMillis()): Int =
        (now - startedAtMs).coerceAtLeast(0).toInt()

    fun toSessionJson(status: String = "RUNNING", lastStep: Int = 0): JSONObject =
        JSONObject().apply {
            put("id", id)
            put("feature", feature)
            put("sessionKey", sessionKey)
            put("status", status)
            put("startedAt", startedAtMs)
            put("startedElapsedRealtimeMs", startedElapsedRealtimeMs)
            put("baseTimeNanos", startedElapsedRealtimeNanos)
            put("startedElapsedRealtimeNanos", startedElapsedRealtimeNanos)
            put("deviceModel", deviceModel)
            put("androidVersion", androidVersion)
            put("appVersion", appVersion)
            put("deviceId", deviceId)
            if (!userId.isNullOrBlank()) put("userId", userId)
            if (!phoneMasked.isNullOrBlank()) put("phoneMasked", phoneMasked)
            put("lastStep", lastStep)
            put("metaJson", JSONObject().put("overlayDiag", OverlayDiagTracker.snapshotJson()))
        }
}

/**
 * 한 통화 = 하나의 sessionId.
 * Call End 직후에도 잠시 recent 를 유지해 늦은 이벤트가 새 세션을 만들지 않게 한다.
 */
object DiagnosticsSessionStore {
    private const val RECENT_GRACE_MS = 20_000L

    private val active = AtomicReference<ActiveDiagnosticSession?>(null)
    @Volatile
    private var recentEnded: ActiveDiagnosticSession? = null
    @Volatile
    private var recentEndedAtMs: Long = 0L

    fun current(): ActiveDiagnosticSession? = active.get()

    /** active 또는 Call End 직후 grace 구간의 세션 */
    fun currentOrRecent(): ActiveDiagnosticSession? {
        active.get()?.let { return it }
        val ended = recentEnded ?: return null
        if (System.currentTimeMillis() - recentEndedAtMs <= RECENT_GRACE_MS) return ended
        return null
    }

    /**
     * @return Pair(session, createdNew)
     */
    fun ensureSession(
        context: Context,
        feature: String = DiagnosticsFeature.BIG_PUSH,
        phoneRaw: String? = null,
        source: String = "unknown"
    ): Pair<ActiveDiagnosticSession, Boolean> {
        active.get()?.let { existing ->
            OverlayDiagTracker.noteSessionBind(source, existing.id, created = false)
            return existing to false
        }
        /*
         * 종료된 세션을 active 로 되살리지 않음.
         * 이전 통화 baseTime 을 새 Incoming 에 물리면 +45000ms 등 왜곡이 발생한다.
         * Call End 이후 늦은 이벤트만 currentOrRecent() grace 로 붙인다.
         */

        val app = context.applicationContext
        val now = System.currentTimeMillis()
        val baseNanos = SystemClock.elapsedRealtimeNanos()
        val baseMs = SystemClock.elapsedRealtime()
        val key = SimpleDateFormat("yyyyMMdd-HHmmss", Locale.US).format(Date(now)) +
            "-" + UUID.randomUUID().toString().take(6)
        val deviceId = try {
            Settings.Secure.getString(app.contentResolver, Settings.Secure.ANDROID_ID) ?: "unknown"
        } catch (_: Exception) {
            "unknown"
        }
        val session = ActiveDiagnosticSession(
            id = UUID.randomUUID().toString(),
            feature = feature,
            sessionKey = key,
            startedAtMs = now,
            startedElapsedRealtimeMs = baseMs,
            startedElapsedRealtimeNanos = baseNanos,
            deviceModel = Build.MODEL ?: "unknown",
            androidVersion = "${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})",
            appVersion = BuildConfig.VERSION_NAME,
            deviceId = deviceId,
            userId = LetteringPrefs.getUserId(app),
            phoneMasked = maskPhone(phoneRaw)
        )
        return if (active.compareAndSet(null, session)) {
            OverlayDiagTracker.resetForNewCallSession()
            DiagnosticsEventQueue.resetTiming(session.id)
            OverlayDiagTracker.noteSessionBind(source, session.id, created = true)
            DiagnosticsEventQueue.enqueueSession(app, session)
            DiagnosticsEventQueue.enqueueEvent(
                app,
                session,
                seq = 0,
                code = "SESSION_CREATED",
                label = "Session created by $source",
                ok = true,
                payloadJson = JSONObject().apply {
                    put("source", source)
                    put("sessionId", session.id)
                    put("sessionKey", session.sessionKey)
                    put("created", true)
                },
                overlayState = OverlayDiagTracker.snapshotJson()
            )
            session to true
        } else {
            val cur = active.get()!!
            OverlayDiagTracker.noteSessionBind(source, cur.id, created = false)
            cur to false
        }
    }

    fun noteSource(context: Context, source: String) {
        val s = currentOrRecent() ?: return
        OverlayDiagTracker.noteSessionBind(source, s.id, created = false)
        DiagnosticsEventQueue.enqueueEvent(
            context.applicationContext,
            s,
            seq = 0,
            code = "SESSION_BIND",
            label = "Session bind by $source",
            ok = true,
            payloadJson = JSONObject().apply {
                put("source", source)
                put("sessionId", s.id)
                put("created", false)
            },
            overlayState = OverlayDiagTracker.snapshotJson()
        )
    }

    fun updatePhoneMasked(phoneRaw: String?) {
        val cur = active.get() ?: return
        val masked = maskPhone(phoneRaw) ?: return
        active.compareAndSet(cur, cur.copy(phoneMasked = masked))
    }

    fun endSession(context: Context, status: String = "OK") {
        val cur = active.getAndSet(null) ?: return
        recentEnded = cur
        recentEndedAtMs = System.currentTimeMillis()
        DiagnosticsEventQueue.enqueueSession(
            context.applicationContext,
            cur,
            status = status,
            endedAtMs = System.currentTimeMillis()
        )
        DiagnosticsEventQueue.flushAsync(context.applicationContext)
    }

    /** 특정 feature 세션만 종료 — BIG_PUSH 통화 세션을 건드리지 않기 위함 */
    fun endSessionIfFeature(context: Context, feature: String, status: String = "OK") {
        val cur = active.get() ?: return
        if (cur.feature != feature) return
        endSession(context, status)
    }

    fun maskPhone(raw: String?): String? {
        if (raw.isNullOrBlank() || raw.equals("unknown", ignoreCase = true) || raw.equals("null", ignoreCase = true)) {
            return null
        }
        val digits = raw.filter { it.isDigit() }
        if (digits.length < 4) return "****"
        val last4 = digits.takeLast(4)
        val prefix = when {
            digits.length >= 10 -> digits.take(3)
            else -> digits.take(2)
        }
        return "$prefix****$last4"
    }
}
