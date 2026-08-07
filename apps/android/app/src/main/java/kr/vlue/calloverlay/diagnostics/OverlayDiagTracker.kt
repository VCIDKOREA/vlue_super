package kr.vlue.calloverlay.diagnostics

import android.os.SystemClock
import java.util.UUID
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicReference
import kr.vlue.calloverlay.companion.CompanionOverlaySnapshot
import kr.vlue.calloverlay.companion.OverlayTriggerEvent
import kr.vlue.calloverlay.diagnostics.oem.OemRuleCatalog
import kr.vlue.calloverlay.diagnostics.oem.SamsungCompatibilityAudit
import kr.vlue.calloverlay.diagnostics.perf.CompanionPerfTracker
import kr.vlue.calloverlay.diagnostics.recovery.CompanionRecoveryTracker
import kr.vlue.calloverlay.diagnostics.security.CompanionSecurityAudit
import org.json.JSONArray
import org.json.JSONObject

/**
 * CallOverlayService / Companion Overlay 관찰 전용.
 * 상태를 제어하지 않는다 — Event 기록 · Timeline · KPI만.
 */
object OverlayDiagTracker {
    const val MAX_TRANSITIONS = 32
    /** Answer → FULLSCREEN layout commit 목표 */
    const val KPI_ANSWER_TO_SHOWCASE_LAYOUT_MS = 500

    private val overlayInstanceId = AtomicReference<String?>(null)
    private val showOverlayCount = AtomicInteger(0)
    private val addViewCount = AtomicInteger(0)
    private val removeViewCount = AtomicInteger(0)
    private val overlayCreateCountInSession = AtomicInteger(0)
    private val sessionBindLog = AtomicReference(JSONArray())
    private val companionSnapshot = AtomicReference<JSONObject?>(null)
    private val transitionLog = AtomicReference(JSONArray())
    private val lastTransition = AtomicReference<JSONObject?>(null)
    private val failureLog = AtomicReference(JSONArray())
    private val lastFailure = AtomicReference<JSONObject?>(null)
    private val attachTimeline = AtomicReference(JSONArray())
    private val layoutTimeline = AtomicReference(JSONArray())
    private val oemDeviceInfo = AtomicReference<JSONObject?>(null)
    private val lastScenarioResult = AtomicReference<JSONObject?>(null)
    private val scenarioResultsLog = AtomicReference(JSONArray())
    private val exceptionTimeline = AtomicReference(JSONArray())
    private val exceptionCaseResults = AtomicReference(JSONArray())
    private val lastExceptionCase = AtomicReference<JSONObject?>(null)
    private val stressTimeline = AtomicReference(JSONArray())
    private val lastStressResult = AtomicReference<JSONObject?>(null)
    private val memorySummary = AtomicReference<JSONObject?>(null)
    private val failureMatrix = AtomicReference<JSONObject?>(null)
    private val deviceCompatibility = AtomicReference<JSONObject?>(null)
    private val samsungCompatibilityAudit = AtomicReference<JSONObject?>(null)
    private val oneUiCallFlowResult = AtomicReference<JSONObject?>(null)
    private val securityAuditReport = AtomicReference<JSONObject?>(null)

    private val failureCount = AtomicInteger(0)
    private val attachAttemptCount = AtomicInteger(0)
    private val attachSuccessCount = AtomicInteger(0)
    private val layoutAttemptCount = AtomicInteger(0)
    private val layoutSuccessCount = AtomicInteger(0)

    @Volatile
    private var attachStartedAtElapsedMs: Long? = null
    @Volatile
    private var layoutStartedAtElapsedMs: Long? = null

    @Volatile
    private var incomingAtElapsedMs: Long? = null
    @Volatile
    private var answerAtElapsedMs: Long? = null
    @Volatile
    private var bigPushVisibleAtElapsedMs: Long? = null
    @Volatile
    private var showcaseFullscreenAtElapsedMs: Long? = null
    @Volatile
    private var lastEventAtElapsedMs: Long? = null

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

    fun setCompanionSnapshot(snapshot: CompanionOverlaySnapshot) {
        publishCompanion(snapshot, OverlayTriggerEvent.INTERNAL, userAction = false)
    }

    private fun nowElapsedMs(): Long =
        try {
            SystemClock.elapsedRealtime()
        } catch (_: Throwable) {
            System.nanoTime() / 1_000_000L
        }

    /**
     * Controller 스냅샷 반영 + (상태/visibility 변경 시) OVERLAY_TRANSITION 기록.
     * Diagnostics는 관찰만 — OverlayState를 바꾸지 않는다.
     */
    fun publishCompanion(
        snapshot: CompanionOverlaySnapshot,
        trigger: OverlayTriggerEvent,
        userAction: Boolean = false
    ) {
        val t0 = nowElapsedMs()
        val cpuEvent = when (trigger) {
            OverlayTriggerEvent.INCOMING -> "INCOMING"
            OverlayTriggerEvent.ANSWER -> "ANSWER"
            OverlayTriggerEvent.HOME_CHANGED -> "MINI"
            OverlayTriggerEvent.USER_RESTORE, OverlayTriggerEvent.MINI_RESTORE -> "RESTORE"
            OverlayTriggerEvent.CALL_END -> "CALL_END"
            else -> null
        }
        if (cpuEvent != null) CompanionPerfTracker.beginEventCpu(cpuEvent)

        val prev = companionSnapshot.get()
        val previousState = prev?.optString("overlayState")?.ifBlank { null } ?: "IDLE"
        val previousVis = prev?.optString("miniCaseVisibility")?.ifBlank { null }
        val nextState = snapshot.state.name
        val nextVis = snapshot.miniCaseVisibility.name

        when (trigger) {
            OverlayTriggerEvent.INCOMING -> markIncomingAnchor()
            OverlayTriggerEvent.ANSWER -> markAnswerAnchor()
            OverlayTriggerEvent.SCREEN_CHANGED ->
                CompanionPerfTracker.noteScreenOn(snapshot.screenState.name == "SCREEN_ON")
            else -> Unit
        }

        companionSnapshot.set(snapshot.toJson())

        val stateChanged = previousState != nextState
        val miniVisChanged =
            snapshot.state.name == "MINI_CASE" &&
                previousVis != null &&
                previousVis != nextVis

        if (stateChanged || miniVisChanged ||
            (trigger == OverlayTriggerEvent.SCREEN_CHANGED && prev != null)
        ) {
            val now = nowElapsedMs()
            val elapsedSinceLast =
                lastEventAtElapsedMs?.let { (now - it).coerceAtLeast(0L) } ?: 0L
            lastEventAtElapsedMs = now
            appendTransition(
                previousState = if (miniVisChanged && !stateChanged) {
                    "MINI_CASE/$previousVis"
                } else {
                    previousState
                },
                nextState = if (miniVisChanged && !stateChanged) {
                    "MINI_CASE/$nextVis"
                } else {
                    nextState
                },
                trigger = trigger,
                position = snapshot.position.name,
                screenState = snapshot.screenState.name,
                miniCaseVisibility = nextVis,
                userAction = userAction,
                elapsedMs = elapsedSinceLast
            )
        }

        CompanionPerfTracker.recordControllerProcessingMs(
            trigger.name,
            (nowElapsedMs() - t0).coerceAtLeast(0L)
        )
        if (cpuEvent != null) CompanionPerfTracker.endEventCpu(cpuEvent)
    }

    fun markBigPushVisibleCommit() {
        val now = nowElapsedMs()
        if (bigPushVisibleAtElapsedMs == null) {
            bigPushVisibleAtElapsedMs = now
        }
    }

    fun markShowcaseFullscreenCommit() {
        val now = nowElapsedMs()
        if (showcaseFullscreenAtElapsedMs == null) {
            showcaseFullscreenAtElapsedMs = now
        }
    }

    private fun markIncomingAnchor() {
        if (incomingAtElapsedMs == null) {
            incomingAtElapsedMs = nowElapsedMs()
        }
    }

    private fun markAnswerAnchor() {
        if (answerAtElapsedMs == null) {
            answerAtElapsedMs = nowElapsedMs()
        }
    }

    private fun appendTransition(
        previousState: String,
        nextState: String,
        trigger: OverlayTriggerEvent,
        position: String,
        screenState: String,
        miniCaseVisibility: String,
        userAction: Boolean,
        elapsedMs: Long
    ) {
        val event = JSONObject().apply {
            put("timestamp", System.currentTimeMillis())
            put("eventType", "OVERLAY_TRANSITION")
            put("previousState", previousState)
            put("nextState", nextState)
            put("triggerEvent", trigger.name)
            put("overlayPosition", position)
            put("screenState", screenState)
            put("miniCaseVisibility", miniCaseVisibility)
            put("userAction", userAction)
            put("elapsedMs", elapsedMs)
        }
        lastTransition.set(event)
        val arr = transitionLog.get() ?: JSONArray()
        val next = JSONArray()
        val start = if (arr.length() >= MAX_TRANSITIONS) arr.length() - MAX_TRANSITIONS + 1 else 0
        for (i in start until arr.length()) next.put(arr.get(i))
        next.put(event)
        transitionLog.set(next)
    }

    fun companionKpiJson(): JSONObject {
        val answer = answerAtElapsedMs
        val showcase = showcaseFullscreenAtElapsedMs
        val incoming = incomingAtElapsedMs
        val bigPush = bigPushVisibleAtElapsedMs
        val answerToShowcase =
            if (answer != null && showcase != null) (showcase - answer).coerceAtLeast(0L) else null
        val incomingToBigPush =
            if (incoming != null && bigPush != null) (bigPush - incoming).coerceAtLeast(0L) else null
        val bigPushToShowcase =
            if (answer != null && showcase != null) (showcase - answer).coerceAtLeast(0L) else null
        return JSONObject().apply {
            if (answerToShowcase != null) {
                put("answerToShowcaseMs", answerToShowcase)
                put("kpiAnswerToShowcaseMs", KPI_ANSWER_TO_SHOWCASE_LAYOUT_MS)
                put("kpiAnswerToShowcasePass", answerToShowcase <= KPI_ANSWER_TO_SHOWCASE_LAYOUT_MS)
            }
            if (incomingToBigPush != null) put("incomingToBigPushMs", incomingToBigPush)
            if (bigPushToShowcase != null) put("bigPushToShowcaseMs", bigPushToShowcase)
        }
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
        CompanionPerfTracker.noteOverlayAttached(viewCountHint = 1)
    }

    fun onRemoveView() {
        removeViewCount.incrementAndGet()
        overlayAttached = false
        CompanionPerfTracker.noteOverlayDetached()
    }

    fun onForegroundStarted() {
        foregroundStartedAtMs = System.currentTimeMillis()
        foregroundEndedAtMs = null
        CompanionPerfTracker.noteForegroundStarted()
    }

    fun onForegroundEnded() {
        foregroundEndedAtMs = System.currentTimeMillis()
        CompanionPerfTracker.noteForegroundEnded()
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
        transitionLog.set(JSONArray())
        lastTransition.set(null)
        failureLog.set(JSONArray())
        lastFailure.set(null)
        attachTimeline.set(JSONArray())
        layoutTimeline.set(JSONArray())
        lastScenarioResult.set(null)
        scenarioResultsLog.set(JSONArray())
        exceptionTimeline.set(JSONArray())
        exceptionCaseResults.set(JSONArray())
        lastExceptionCase.set(null)
        stressTimeline.set(JSONArray())
        lastStressResult.set(null)
        memorySummary.set(null)
        failureMatrix.set(null)
        deviceCompatibility.set(null)
        samsungCompatibilityAudit.set(null)
        oneUiCallFlowResult.set(null)
        securityAuditReport.set(null)
        failureCount.set(0)
        attachAttemptCount.set(0)
        attachSuccessCount.set(0)
        layoutAttemptCount.set(0)
        layoutSuccessCount.set(0)
        attachStartedAtElapsedMs = null
        layoutStartedAtElapsedMs = null
        incomingAtElapsedMs = null
        answerAtElapsedMs = null
        bigPushVisibleAtElapsedMs = null
        showcaseFullscreenAtElapsedMs = null
        lastEventAtElapsedMs = null
        lastStopSelfAtMs = null
        lastOnDestroyAtMs = null
    }

    fun setOemDeviceInfo(info: JSONObject) {
        oemDeviceInfo.set(info)
        deviceCompatibility.set(OemRuleCatalog.fromOemDeviceInfo(info))
        refreshSamsungCompatibilityAudit()
    }

    /** Attach/Layout 관찰 후 Audit 스냅샷 갱신 (정책 변경 없음). */
    fun refreshSamsungCompatibilityAudit() {
        val partial = JSONObject().apply {
            oemDeviceInfo.get()?.let { put("oemDeviceInfo", it) }
            put("overlayReliability", overlayReliabilityJson())
            put("overlayFailures", failureLog.get() ?: JSONArray())
            put("attachTimeline", attachTimeline.get() ?: JSONArray())
            put("layoutTimeline", layoutTimeline.get() ?: JSONArray())
        }
        val audit = SamsungCompatibilityAudit.buildFromTracker(partial)
        samsungCompatibilityAudit.set(audit)
        deviceCompatibility.set(
            audit.optJSONObject("deviceCompatibility")
                ?: OemRuleCatalog.fromOemDeviceInfo(oemDeviceInfo.get())
        )
    }

    fun recordOneUiCallFlowResult(result: JSONObject) {
        oneUiCallFlowResult.set(result)
    }

    /** Phase 5-D Security / Privacy / Store Readiness (관찰 보고만). */
    fun refreshSecurityAuditReport() {
        securityAuditReport.set(CompanionSecurityAudit.builtInReleaseCandidateReport())
    }

    fun recordSecurityAuditReport(report: JSONObject) {
        securityAuditReport.set(report)
    }

    /**
     * Phase 4-C Scenario 실행 결과 기록 (관찰 전용).
     * Controller / OverlayState / Window를 바꾸지 않는다.
     */
    fun recordScenarioResult(result: JSONObject) {
        lastScenarioResult.set(result)
        appendCapped(scenarioResultsLog, result, MAX_TRANSITIONS)
    }

    fun recordExceptionTimelineStep(step: JSONObject) {
        appendCapped(exceptionTimeline, step, MAX_TRANSITIONS)
    }

    fun recordExceptionCaseResult(result: JSONObject) {
        lastExceptionCase.set(result)
        appendCapped(exceptionCaseResults, result, MAX_TRANSITIONS)
    }

    fun recordExceptionNote(event: String, snapshot: CompanionOverlaySnapshot) {
        appendCapped(
            exceptionTimeline,
            JSONObject().apply {
                put("timestamp", System.currentTimeMillis())
                put("eventType", "EXCEPTION_NOTE")
                put("event", event)
                put("overlayState", snapshot.state.name)
                put("overlayPosition", snapshot.position.name)
                put("screenState", snapshot.screenState.name)
                put("miniCaseVisibility", snapshot.miniCaseVisibility.name)
            },
            MAX_TRANSITIONS
        )
    }

    fun recordStressTimeline(timeline: JSONArray) {
        stressTimeline.set(timeline)
    }

    fun recordStressResult(result: JSONObject) {
        lastStressResult.set(result)
    }

    fun recordMemorySummary(summary: JSONObject) {
        memorySummary.set(summary)
    }

    fun recordFailureMatrix(matrix: JSONObject) {
        failureMatrix.set(matrix)
    }

    fun recordOverlayFailure(
        reason: OverlayFailureReason,
        phase: String,
        detail: String = "",
        error: Throwable? = null
    ) {
        if (reason == OverlayFailureReason.SUCCESS) return
        failureCount.incrementAndGet()
        val event = JSONObject().apply {
            put("timestamp", System.currentTimeMillis())
            put("eventType", "OVERLAY_FAILURE")
            put("failureReason", reason.name)
            put("phase", phase)
            if (detail.isNotBlank()) put("detail", detail)
            if (error != null) {
                put("errorClass", error.javaClass.simpleName)
                put("errorMessage", error.message ?: "")
            }
            companionSnapshot.get()?.optString("overlayState")?.let { put("overlayState", it) }
            companionSnapshot.get()?.optString("overlayPosition")?.let { put("overlayPosition", it) }
            companionSnapshot.get()?.optString("screenState")?.let { put("screenState", it) }
        }
        lastFailure.set(event)
        appendCapped(failureLog, event, MAX_TRANSITIONS)
    }

    fun beginAttach(phase: String) {
        attachAttemptCount.incrementAndGet()
        attachStartedAtElapsedMs = nowElapsedMs()
        appendTimeline(
            attachTimeline,
            JSONObject().apply {
                put("timestamp", System.currentTimeMillis())
                put("step", "REQUEST_ATTACH")
                put("phase", phase)
                put("elapsedMs", 0)
            }
        )
    }

    fun markAddViewBegin() {
        val start = attachStartedAtElapsedMs ?: nowElapsedMs()
        appendTimeline(
            attachTimeline,
            JSONObject().apply {
                put("timestamp", System.currentTimeMillis())
                put("step", "ADD_VIEW_BEGIN")
                put("elapsedMs", (nowElapsedMs() - start).coerceAtLeast(0L))
            }
        )
    }

    fun markAddViewSuccess() {
        val start = attachStartedAtElapsedMs ?: nowElapsedMs()
        val elapsed = (nowElapsedMs() - start).coerceAtLeast(0L)
        attachSuccessCount.incrementAndGet()
        appendTimeline(
            attachTimeline,
            JSONObject().apply {
                put("timestamp", System.currentTimeMillis())
                put("step", "ADD_VIEW_SUCCESS")
                put("failureReason", OverlayFailureReason.SUCCESS.name)
                put("elapsedMs", elapsed)
            }
        )
        CompanionPerfTracker.recordOverlayAttachMs(elapsed)
        attachStartedAtElapsedMs = null
    }

    fun markAddViewFailed(reason: OverlayFailureReason, error: Throwable?, phase: String) {
        val start = attachStartedAtElapsedMs ?: nowElapsedMs()
        val elapsed = (nowElapsedMs() - start).coerceAtLeast(0L)
        appendTimeline(
            attachTimeline,
            JSONObject().apply {
                put("timestamp", System.currentTimeMillis())
                put("step", "ADD_VIEW_FAILED")
                put("failureReason", reason.name)
                put("elapsedMs", elapsed)
                if (error != null) put("errorClass", error.javaClass.simpleName)
            }
        )
        recordOverlayFailure(reason, phase = phase, detail = "ADD_VIEW_FAILED", error = error)
        attachStartedAtElapsedMs = null
    }

    fun beginLayout(position: String, source: String = "") {
        layoutAttemptCount.incrementAndGet()
        layoutStartedAtElapsedMs = nowElapsedMs()
        appendTimeline(
            layoutTimeline,
            JSONObject().apply {
                put("timestamp", System.currentTimeMillis())
                put("step", "REQUEST_LAYOUT")
                put("position", position)
                if (source.isNotBlank()) put("source", source)
                put("elapsedMs", 0)
            }
        )
    }

    fun markLayoutApplied(result: String, position: String) {
        val start = layoutStartedAtElapsedMs ?: nowElapsedMs()
        val elapsed = (nowElapsedMs() - start).coerceAtLeast(0L)
        layoutSuccessCount.incrementAndGet()
        appendTimeline(
            layoutTimeline,
            JSONObject().apply {
                put("timestamp", System.currentTimeMillis())
                put("step", "LAYOUT_APPLIED")
                put("result", result)
                put("position", position)
                put("elapsedMs", elapsed)
            }
        )
        CompanionPerfTracker.recordLayoutCommitMs(elapsed)
        layoutStartedAtElapsedMs = null
    }

    fun markLayoutFailed(reason: OverlayFailureReason, position: String, error: Throwable?) {
        val start = layoutStartedAtElapsedMs ?: nowElapsedMs()
        appendTimeline(
            layoutTimeline,
            JSONObject().apply {
                put("timestamp", System.currentTimeMillis())
                put("step", "LAYOUT_FAILED")
                put("failureReason", reason.name)
                put("position", position)
                put("elapsedMs", (nowElapsedMs() - start).coerceAtLeast(0L))
            }
        )
        recordOverlayFailure(reason, phase = "LAYOUT_$position", detail = "LAYOUT_FAILED", error = error)
        layoutStartedAtElapsedMs = null
    }

    private fun appendTimeline(ref: AtomicReference<JSONArray>, event: JSONObject) {
        appendCapped(ref, event, MAX_TRANSITIONS)
    }

    private fun appendCapped(ref: AtomicReference<JSONArray>, event: JSONObject, max: Int) {
        val arr = ref.get() ?: JSONArray()
        val next = JSONArray()
        val start = if (arr.length() >= max) arr.length() - max + 1 else 0
        for (i in start until arr.length()) next.put(arr.get(i))
        next.put(event)
        ref.set(next)
    }

    fun overlayReliabilityJson(): JSONObject {
        val attachAttempts = attachAttemptCount.get()
        val attachOk = attachSuccessCount.get()
        val layoutAttempts = layoutAttemptCount.get()
        val layoutOk = layoutSuccessCount.get()
        val failures = failureCount.get()
        val overlayAttempts = attachAttempts + layoutAttempts
        val overlayOk = attachOk + layoutOk
        return JSONObject().apply {
            put("failureCount", failures)
            put("attachAttemptCount", attachAttempts)
            put("attachSuccessCount", attachOk)
            put("layoutAttemptCount", layoutAttempts)
            put("layoutSuccessCount", layoutOk)
            if (attachAttempts > 0) {
                put("attachSuccessRate", attachOk.toDouble() / attachAttempts)
            }
            if (layoutAttempts > 0) {
                put("layoutSuccessRate", layoutOk.toDouble() / layoutAttempts)
            }
            if (overlayAttempts > 0) {
                put("overlaySuccessRate", overlayOk.toDouble() / overlayAttempts)
            }
        }
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
            lastTransition.get()?.let { put("lastOverlayTransition", it) }
            put("overlayTransitions", transitionLog.get() ?: JSONArray())
            put("companionKpi", companionKpiJson())
            oemDeviceInfo.get()?.let { put("oemDeviceInfo", it) }
            lastFailure.get()?.let { put("lastOverlayFailure", it) }
            put("overlayFailures", failureLog.get() ?: JSONArray())
            put("attachTimeline", attachTimeline.get() ?: JSONArray())
            put("layoutTimeline", layoutTimeline.get() ?: JSONArray())
            put("overlayReliability", overlayReliabilityJson())
            lastScenarioResult.get()?.let { put("lastScenarioResult", it) }
            put("scenarioResults", scenarioResultsLog.get() ?: JSONArray())
            put("exceptionTimeline", exceptionTimeline.get() ?: JSONArray())
            lastExceptionCase.get()?.let { put("lastExceptionCase", it) }
            put("exceptionCaseResults", exceptionCaseResults.get() ?: JSONArray())
            put("stressTimeline", stressTimeline.get() ?: JSONArray())
            lastStressResult.get()?.let { put("lastStressResult", it) }
            memorySummary.get()?.let { put("memorySummary", it) }
            failureMatrix.get()?.let { put("failureMatrix", it) }
            deviceCompatibility.get()?.let { put("deviceCompatibility", it) }
            samsungCompatibilityAudit.get()?.let { put("samsungCompatibilityAudit", it) }
            oneUiCallFlowResult.get()?.let { put("oneUiCallFlowResult", it) }
            put("performanceDashboard", CompanionPerfTracker.dashboardJson(answerToShowcaseMsOrNull()))
            put("recoveryDashboard", CompanionRecoveryTracker.dashboardJson())
            put(
                "securityAuditReport",
                securityAuditReport.get() ?: CompanionSecurityAudit.builtInReleaseCandidateReport()
            )
        }

    private fun answerToShowcaseMsOrNull(): Long? {
        val answer = answerAtElapsedMs ?: return null
        val showcase = showcaseFullscreenAtElapsedMs ?: return null
        return (showcase - answer).coerceAtLeast(0L)
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
            "overlayPosition=${s.optString("overlayPosition", "—")} " +
            "screenState=${s.optString("screenState", "—")} " +
            "miniCaseVisibility=${s.optString("miniCaseVisibility", "—")}"
    }

    /** 단위 테스트용 — 앵커/로그 초기화 */
    fun resetAllForTest() {
        resetForNewCallSession()
        companionSnapshot.set(null)
        oemDeviceInfo.set(null)
        lastScenarioResult.set(null)
        scenarioResultsLog.set(JSONArray())
        exceptionTimeline.set(JSONArray())
        exceptionCaseResults.set(JSONArray())
        lastExceptionCase.set(null)
        stressTimeline.set(JSONArray())
        lastStressResult.set(null)
        memorySummary.set(null)
        failureMatrix.set(null)
        deviceCompatibility.set(null)
        samsungCompatibilityAudit.set(null)
        oneUiCallFlowResult.set(null)
        securityAuditReport.set(null)
        overlayInstanceId.set(null)
        overlayAttached = false
        foregroundStartedAtMs = null
        foregroundEndedAtMs = null
        CompanionPerfTracker.resetAllForTest()
        CompanionRecoveryTracker.resetAllForTest()
    }
}
