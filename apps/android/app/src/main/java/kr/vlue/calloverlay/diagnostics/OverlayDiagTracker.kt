package kr.vlue.calloverlay.diagnostics

import java.util.UUID
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicReference
import org.json.JSONArray
import org.json.JSONObject

/**
 * CallOverlayService / WindowManager 인스턴스·호출 횟수 진단.
 * UI 변경 없이 overlayStateJson / event payload 에 실어 보낸다.
 */
object OverlayDiagTracker {
    private val overlayInstanceId = AtomicReference<String?>(null)
    private val showOverlayCount = AtomicInteger(0)
    private val addViewCount = AtomicInteger(0)
    private val removeViewCount = AtomicInteger(0)
    private val overlayCreateCountInSession = AtomicInteger(0)
    private val sessionBindLog = AtomicReference(JSONArray())
    private val companionSnapshot = AtomicReference<JSONObject?>(null)

    @Volatile
    var foregroundStartedAtMs: Long? = null
        private set
    @Volatile
    var foregroundEndedAtMs: Long? = null
        private set
    @Volatile
    var lastStopSelfAtMs: Long? = null
        private set
    @Volatile
    var lastOnDestroyAtMs: Long? = null
        private set
    @Volatile
    var overlayAttached: Boolean = false
        private set

    fun setCompanionSnapshot(snapshot: kr.vlue.calloverlay.companion.CompanionOverlaySnapshot) {
        companionSnapshot.set(snapshot.toJson())
    }

    fun onServiceCreated(): String {
        val id = UUID.randomUUID().toString()
        overlayInstanceId.set(id)
        return id
    }

    fun currentInstanceId(): String? = overlayInstanceId.get()

    fun onShowOverlay() {
        showOverlayCount.incrementAndGet()
        overlayCreateCountInSession.incrementAndGet()
    }

    fun onAddView() {
        addViewCount.incrementAndGet()
        overlayAttached = true
    }

    fun onRemoveView() {
        removeViewCount.incrementAndGet()
        overlayAttached = false
    }

    fun onForegroundStarted() {
        foregroundStartedAtMs = System.currentTimeMillis()
        foregroundEndedAtMs = null
    }

    fun onForegroundEnded() {
        foregroundEndedAtMs = System.currentTimeMillis()
    }

    fun onStopSelf() {
        lastStopSelfAtMs = System.currentTimeMillis()
    }

    fun onDestroy() {
        lastOnDestroyAtMs = System.currentTimeMillis()
        onForegroundEnded()
        overlayInstanceId.set(null)
        overlayAttached = false
    }

    fun resetForNewCallSession() {
        showOverlayCount.set(0)
        addViewCount.set(0)
        removeViewCount.set(0)
        overlayCreateCountInSession.set(0)
        sessionBindLog.set(JSONArray())
        lastStopSelfAtMs = null
        lastOnDestroyAtMs = null
        /* instance id 는 서비스 생명주기와 별개로 onServiceCreated 에서 갱신 */
    }

    fun noteSessionBind(source: String, sessionId: String, created: Boolean) {
        val arr = sessionBindLog.get() ?: JSONArray()
        val next = JSONArray()
        for (i in 0 until arr.length()) next.put(arr.get(i))
        next.put(
            JSONObject().apply {
                put("source", source)
                put("sessionId", sessionId)
                put("created", created)
                put("at", System.currentTimeMillis())
            }
        )
        sessionBindLog.set(next)
    }

    fun snapshotJson(): JSONObject =
        JSONObject().apply {
            put("overlayInstanceId", overlayInstanceId.get() ?: "(none)")
            put("showOverlayCount", showOverlayCount.get())
            put("addViewCount", addViewCount.get())
            put("removeViewCount", removeViewCount.get())
            put("overlayCreateCountInSession", overlayCreateCountInSession.get())
            put("overlayAlreadyAttached", overlayAttached)
            put("foregroundStartedAtMs", foregroundStartedAtMs ?: JSONObject.NULL)
            put("foregroundEndedAtMs", foregroundEndedAtMs ?: JSONObject.NULL)
            put("lastStopSelfAtMs", lastStopSelfAtMs ?: JSONObject.NULL)
            put("lastOnDestroyAtMs", lastOnDestroyAtMs ?: JSONObject.NULL)
            put("sessionBindLog", sessionBindLog.get() ?: JSONArray())
            companionSnapshot.get()?.let { snap ->
                snap.keys().forEach { k -> put(k, snap.get(k)) }
            }
        }

    fun detailSuffix(): String {
        val s = snapshotJson()
        return "overlayInstanceId=${s.optString("overlayInstanceId")} " +
            "showOverlayCount=${s.optInt("showOverlayCount")} " +
            "addViewCount=${s.optInt("addViewCount")} " +
            "removeViewCount=${s.optInt("removeViewCount")} " +
            "overlayCreateCountInSession=${s.optInt("overlayCreateCountInSession")} " +
            "overlayAlreadyAttached=${s.optBoolean("overlayAlreadyAttached")} " +
            "overlayState=${s.optString("overlayState", "—")} " +
            "overlayContext=${s.optString("overlayContext", "—")} " +
            "overlayPosition=${s.optString("overlayPosition", "—")}"
    }
}
