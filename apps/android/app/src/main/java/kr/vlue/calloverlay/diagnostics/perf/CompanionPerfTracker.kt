package kr.vlue.calloverlay.diagnostics.perf

import android.os.Debug
import android.os.SystemClock
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong
import java.util.concurrent.atomic.AtomicReference
import org.json.JSONArray
import org.json.JSONObject

/**
 * Phase 5-B Companion Performance — 계측·Audit만.
 * Architecture Freeze: State / Controller / Window / Overlay 생성 금지.
 */
object CompanionPerfTracker {
    const val KPI_OVERLAY_ATTACH_MS = 200
    const val KPI_ANSWER_TO_SHOWCASE_MS = 500
    const val KPI_LAYOUT_COMMIT_MS = 100
    const val KPI_UPDATE_VIEW_LAYOUT_MS = 50
    const val KPI_JS_BRIDGE_MS = 50
    const val KPI_CONTROLLER_MS = 20
    const val KPI_MAX_DROPPED_FRAMES = 5
    const val FRAME_BUDGET_MS = 16L

    private val samples = AtomicReference(JSONArray())
    private val cpuByEvent = AtomicReference(JSONObject())
    private val overlayAttachMs = AtomicLong(-1)
    private val layoutCommitMs = AtomicLong(-1)
    private val webViewReadyMs = AtomicLong(-1)
    private val jsBridgeCallMs = AtomicLong(-1)
    private val controllerProcessingMs = AtomicLong(-1)
    private val updateViewLayoutMs = AtomicLong(-1)
    private val frameCommitMs = AtomicLong(-1)

    private val droppedFrames = AtomicInteger(0)
    private val jankCount = AtomicInteger(0)
    private val skippedFrames = AtomicInteger(0)
    private val layoutPassCount = AtomicInteger(0)
    private val measureCount = AtomicInteger(0)
    private val animationTimeMs = AtomicLong(0)

    private val viewCount = AtomicInteger(0)
    private val windowCount = AtomicInteger(0)
    private val gcCount = AtomicInteger(0)
    private val bitmapEstimateBytes = AtomicLong(0)

    private val memoryBaselineBytes = AtomicLong(-1)
    private val memoryLastBytes = AtomicLong(-1)
    private val memoryPeakBytes = AtomicLong(-1)

    private val overlayAliveStartedAtMs = AtomicLong(-1)
    private val fgsStartedAtMs = AtomicLong(-1)
    private val wakeLockHeld = AtomicReference(false)
    private val lastScreenOn = AtomicReference(true)

    private val webViewLoadStartedAtMs = AtomicLong(-1)
    private val lastEventCpuStartedAtNs = AtomicLong(-1)
    private val lastEventCpuName = AtomicReference<String?>(null)

    fun resetAllForTest() {
        samples.set(JSONArray())
        cpuByEvent.set(JSONObject())
        overlayAttachMs.set(-1)
        layoutCommitMs.set(-1)
        webViewReadyMs.set(-1)
        jsBridgeCallMs.set(-1)
        controllerProcessingMs.set(-1)
        updateViewLayoutMs.set(-1)
        frameCommitMs.set(-1)
        droppedFrames.set(0)
        jankCount.set(0)
        skippedFrames.set(0)
        layoutPassCount.set(0)
        measureCount.set(0)
        animationTimeMs.set(0)
        viewCount.set(0)
        windowCount.set(0)
        gcCount.set(0)
        bitmapEstimateBytes.set(0)
        memoryBaselineBytes.set(-1)
        memoryLastBytes.set(-1)
        memoryPeakBytes.set(-1)
        overlayAliveStartedAtMs.set(-1)
        fgsStartedAtMs.set(-1)
        wakeLockHeld.set(false)
        lastScreenOn.set(true)
        webViewLoadStartedAtMs.set(-1)
        lastEventCpuStartedAtNs.set(-1)
        lastEventCpuName.set(null)
    }

    fun noteForegroundStarted() {
        fgsStartedAtMs.set(System.currentTimeMillis())
    }

    fun noteForegroundEnded() {
        /* duration computed in battery audit */
    }

    fun noteOverlayAttached(viewCountHint: Int = 1) {
        overlayAliveStartedAtMs.compareAndSet(-1, System.currentTimeMillis())
        windowCount.set(1)
        viewCount.set(viewCountHint.coerceAtLeast(1))
        captureMemorySample("overlay_attached")
    }

    fun noteOverlayDetached() {
        windowCount.set(0)
        viewCount.set(0)
        overlayAliveStartedAtMs.set(-1)
        captureMemorySample("overlay_detached")
    }

    fun noteScreenOn(on: Boolean) {
        lastScreenOn.set(on)
    }

    fun noteWakeLock(held: Boolean) {
        wakeLockHeld.set(held)
    }

    fun noteWebViewLoadStart() {
        webViewLoadStartedAtMs.set(nowElapsedMs())
    }

    fun noteWebViewReady() {
        val start = webViewLoadStartedAtMs.get()
        if (start > 0) {
            val ms = (nowElapsedMs() - start).coerceAtLeast(0L)
            webViewReadyMs.set(ms)
            recordSample("webview_ready_ms", ms)
        }
    }

    fun recordOverlayAttachMs(ms: Long) {
        overlayAttachMs.set(ms)
        recordSample("overlay_attach_ms", ms)
        if (ms > FRAME_BUDGET_MS) noteSlowFrame(ms)
    }

    fun recordLayoutCommitMs(ms: Long) {
        layoutCommitMs.set(ms)
        layoutPassCount.incrementAndGet()
        measureCount.incrementAndGet()
        frameCommitMs.set(ms)
        recordSample("layout_commit_ms", ms)
        recordSample("frame_commit_ms", ms)
        if (ms > FRAME_BUDGET_MS) noteSlowFrame(ms)
    }

    fun recordUpdateViewLayoutMs(ms: Long) {
        updateViewLayoutMs.set(ms)
        recordSample("update_view_layout_ms", ms)
        if (ms > FRAME_BUDGET_MS) noteSlowFrame(ms)
    }

    fun recordJsBridgeCallMs(name: String, ms: Long) {
        jsBridgeCallMs.set(ms)
        recordSample("js_bridge_call_ms", ms, JSONObject().put("name", name))
    }

    fun recordControllerProcessingMs(trigger: String, ms: Long) {
        controllerProcessingMs.set(ms)
        recordSample("controller_processing_ms", ms, JSONObject().put("trigger", trigger))
    }

    fun recordAnimationMs(ms: Long) {
        animationTimeMs.addAndGet(ms.coerceAtLeast(0L))
        recordSample("animation_ms", ms)
    }

    fun beginEventCpu(event: String) {
        lastEventCpuName.set(event)
        lastEventCpuStartedAtNs.set(nowElapsedNs())
    }

    fun endEventCpu(event: String = lastEventCpuName.get() ?: "UNKNOWN") {
        val start = lastEventCpuStartedAtNs.getAndSet(-1)
        if (start <= 0) return
        val ms = ((nowElapsedNs() - start) / 1_000_000L).coerceAtLeast(0L)
        val obj = cpuByEvent.get() ?: JSONObject()
        val next = JSONObject()
        obj.keys().forEach { k -> next.put(k, obj.get(k)) }
        val prev = next.optJSONObject(event) ?: JSONObject()
        val count = prev.optInt("count", 0) + 1
        val total = prev.optLong("totalMs", 0L) + ms
        next.put(
            event,
            JSONObject()
                .put("count", count)
                .put("totalMs", total)
                .put("lastMs", ms)
                .put("avgMs", total.toDouble() / count)
        )
        cpuByEvent.set(next)
        recordSample("cpu_event_ms", ms, JSONObject().put("event", event))
        lastEventCpuName.set(null)
    }

    fun <T> measureUpdateViewLayout(block: () -> T): T {
        val t0 = nowElapsedMs()
        return try {
            block()
        } finally {
            recordUpdateViewLayoutMs((nowElapsedMs() - t0).coerceAtLeast(0L))
        }
    }

    fun <T> measureJsBridge(name: String, block: () -> T): T {
        val t0 = nowElapsedMs()
        return try {
            block()
        } finally {
            recordJsBridgeCallMs(name, (nowElapsedMs() - t0).coerceAtLeast(0L))
        }
    }

    fun noteDroppedFrames(n: Int) {
        droppedFrames.addAndGet(n.coerceAtLeast(0))
    }

    fun noteJank() {
        jankCount.incrementAndGet()
    }

    fun noteSkippedFrames(n: Int) {
        skippedFrames.addAndGet(n.coerceAtLeast(0))
    }

    fun noteGc() {
        gcCount.incrementAndGet()
    }

    fun noteBitmapBytes(bytes: Long) {
        bitmapEstimateBytes.set(bytes.coerceAtLeast(0L))
    }

    fun captureMemorySample(label: String = "sample") {
        val used = usedMemoryBytes()
        memoryLastBytes.set(used)
        memoryBaselineBytes.compareAndSet(-1, used)
        val peak = memoryPeakBytes.get()
        if (peak < 0 || used > peak) memoryPeakBytes.set(used)
        try {
            val gc = Debug.getRuntimeStat("art.gc.gc-count")?.toIntOrNull()
            if (gc != null) gcCount.set(gc)
        } catch (_: Throwable) {
        }
        recordSample("memory_used_bytes", used, JSONObject().put("label", label))
    }

    fun performanceMetricsJson(): JSONObject =
        JSONObject().apply {
            putOptMs("overlayAttachMs", overlayAttachMs.get())
            putOptMs("layoutCommitMs", layoutCommitMs.get())
            putOptMs("webViewReadyMs", webViewReadyMs.get())
            putOptMs("jsBridgeCallMs", jsBridgeCallMs.get())
            putOptMs("controllerProcessingMs", controllerProcessingMs.get())
            putOptMs("updateViewLayoutMs", updateViewLayoutMs.get())
            putOptMs("frameCommitMs", frameCommitMs.get())
            put("kpiOverlayAttachMs", KPI_OVERLAY_ATTACH_MS)
            put("kpiAnswerToShowcaseMs", KPI_ANSWER_TO_SHOWCASE_MS)
        }

    fun memoryAuditJson(): JSONObject {
        captureMemorySample("audit")
        val baseline = memoryBaselineBytes.get()
        val last = memoryLastBytes.get()
        val growth =
            if (baseline >= 0 && last >= 0) (last - baseline).coerceAtLeast(0L) else 0L
        val leak =
            windowCount.get() > 1 ||
                (windowCount.get() == 0 && viewCount.get() > 0)
        return JSONObject().apply {
            put("overlayMemoryBytes", last)
            put("webViewMemoryBytes", last) // process-level proxy — WebView 전용 분리 불가 시 동일 관찰
            put("bitmapBytes", bitmapEstimateBytes.get())
            put("viewCount", viewCount.get())
            put("windowCount", windowCount.get())
            put("gcCount", gcCount.get())
            put("memoryBaselineBytes", if (baseline >= 0) baseline else JSONObject.NULL)
            put("memoryPeakBytes", memoryPeakBytes.get().let { if (it >= 0) it else JSONObject.NULL })
            put("memoryGrowthBytes", growth)
            put("leakDetected", leak)
            put("windowCountPass", windowCount.get() <= 1)
        }
    }

    fun cpuAuditJson(): JSONObject =
        JSONObject().apply {
            put("byEvent", cpuByEvent.get() ?: JSONObject())
            listOf("INCOMING", "ANSWER", "MINI", "RESTORE", "CALL_END").forEach { ev ->
                val o = (cpuByEvent.get() ?: JSONObject()).optJSONObject(ev)
                if (o != null) put(ev, o)
            }
        }

    fun batteryAuditJson(): JSONObject {
        val now = System.currentTimeMillis()
        val fgsStart = fgsStartedAtMs.get()
        val overlayStart = overlayAliveStartedAtMs.get()
        val fgsMs = if (fgsStart > 0) (now - fgsStart).coerceAtLeast(0L) else 0L
        val overlayMs = if (overlayStart > 0) (now - overlayStart).coerceAtLeast(0L) else 0L
        val wake = wakeLockHeld.get() == true
        val screenOn = lastScreenOn.get() == true
        // 휴리스틱 비용 점수 (mAh 추정 아님) — FGS·Overlay·WakeLock·Screen 가중
        val costScore =
            (fgsMs / 60_000.0) * 1.0 +
                (overlayMs / 60_000.0) * 1.5 +
                (if (wake) 2.0 else 0.0) +
                (if (screenOn && overlayMs > 0) 1.0 else 0.0)
        return JSONObject().apply {
            put("foregroundServiceDurationMs", fgsMs)
            put("wakeLockHeld", wake)
            put("screenOn", screenOn)
            put("overlayAliveDurationMs", overlayMs)
            put("estimatedBatteryCostScore", costScore)
        }
    }

    fun renderingAuditJson(): JSONObject =
        JSONObject().apply {
            put("droppedFrames", droppedFrames.get())
            put("jankCount", jankCount.get())
            put("skippedFrames", skippedFrames.get())
            put("animationTimeMs", animationTimeMs.get())
            put("layoutPassCount", layoutPassCount.get())
            put("measureCount", measureCount.get())
            put("frameBudgetMs", FRAME_BUDGET_MS)
            put("kpiMaxDroppedFrames", KPI_MAX_DROPPED_FRAMES)
        }

    /**
     * @param answerToShowcaseMs OverlayDiagTracker KPI (있으면 판정에 포함)
     */
    fun passEvaluationJson(answerToShowcaseMs: Long? = null): JSONObject {
        val attach = overlayAttachMs.get()
        val mem = memoryAuditJson()
        val attachPass = attach < 0 || attach <= KPI_OVERLAY_ATTACH_MS
        val answerPass =
            answerToShowcaseMs == null || answerToShowcaseMs <= KPI_ANSWER_TO_SHOWCASE_MS
        val dropPass = droppedFrames.get() <= KPI_MAX_DROPPED_FRAMES
        val leakPass = !mem.optBoolean("leakDetected", false)
        val growthPass = mem.optLong("memoryGrowthBytes", 0L) < 50L * 1024L * 1024L
        val windowPass = mem.optBoolean("windowCountPass", true)
        val passed = attachPass && answerPass && dropPass && leakPass && growthPass && windowPass
        return JSONObject().apply {
            put("passed", passed)
            put("verdict", if (passed) "PASS" else "FAIL")
            put("overlayAttachPass", attachPass)
            put("answerToShowcasePass", answerPass)
            put("droppedFramePass", dropPass)
            put("leakPass", leakPass)
            put("memoryGrowthPass", growthPass)
            put("windowCountPass", windowPass)
            put("overlayAttachMs", if (attach >= 0) attach else JSONObject.NULL)
            put("answerToShowcaseMs", answerToShowcaseMs ?: JSONObject.NULL)
            put("droppedFrames", droppedFrames.get())
            put("windowCount", windowCount.get())
            put("kpiOverlayAttachMs", KPI_OVERLAY_ATTACH_MS)
            put("kpiAnswerToShowcaseMs", KPI_ANSWER_TO_SHOWCASE_MS)
        }
    }

    fun dashboardJson(answerToShowcaseMs: Long? = null): JSONObject =
        JSONObject().apply {
            put("performance", performanceMetricsJson())
            put("memory", memoryAuditJson())
            put("cpu", cpuAuditJson())
            put("battery", batteryAuditJson())
            put("rendering", renderingAuditJson())
            put("pass", passEvaluationJson(answerToShowcaseMs))
            put("recentSamples", samples.get() ?: JSONArray())
            put("architectureFreeze", true)
        }

    private fun noteSlowFrame(ms: Long) {
        val skipped = ((ms / FRAME_BUDGET_MS) - 1).toInt().coerceAtLeast(0)
        if (skipped > 0) {
            skippedFrames.addAndGet(skipped)
            droppedFrames.addAndGet(skipped)
            jankCount.incrementAndGet()
        }
    }

    private fun recordSample(name: String, value: Long, extra: JSONObject? = null) {
        val event = JSONObject().apply {
            put("timestamp", System.currentTimeMillis())
            put("name", name)
            put("value", value)
            extra?.keys()?.forEach { k -> put(k, extra.get(k)) }
        }
        val arr = samples.get() ?: JSONArray()
        val next = JSONArray()
        val start = if (arr.length() >= 64) arr.length() - 63 else 0
        for (i in start until arr.length()) next.put(arr.get(i))
        next.put(event)
        samples.set(next)
    }

    private fun JSONObject.putOptMs(key: String, value: Long) {
        if (value >= 0) put(key, value) else put(key, JSONObject.NULL)
    }

    private fun usedMemoryBytes(): Long {
        val rt = Runtime.getRuntime()
        return (rt.totalMemory() - rt.freeMemory()).coerceAtLeast(0L)
    }

    private fun nowElapsedMs(): Long =
        try {
            SystemClock.elapsedRealtime()
        } catch (_: Throwable) {
            System.nanoTime() / 1_000_000L
        }

    private fun nowElapsedNs(): Long =
        try {
            SystemClock.elapsedRealtimeNanos()
        } catch (_: Throwable) {
            System.nanoTime()
        }
}
