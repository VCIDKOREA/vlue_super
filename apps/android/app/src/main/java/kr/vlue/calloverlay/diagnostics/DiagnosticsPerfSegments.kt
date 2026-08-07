package kr.vlue.calloverlay.diagnostics

import org.json.JSONArray
import org.json.JSONObject

/**
 * Timeline 성능 구간 정의 + 이벤트에서 세그먼트 계산.
 * 목표: Showcase 지연 병목을 구간별로 계측.
 */
object DiagnosticsPerfSegments {
    const val KPI_BIG_PUSH_VISIBLE_MS = 300
    /** React Showcase Visible (콘텐츠) — layout commit KPI는 OverlayDiagTracker 500ms */
    const val KPI_SHOWCASE_VISIBLE_MS = 1000
    const val KPI_ANSWER_TO_SHOWCASE_LAYOUT_MS = OverlayDiagTracker.KPI_ANSWER_TO_SHOWCASE_LAYOUT_MS

    /** 마일스톤 코드 → 타임라인 표시명 */
    val MILESTONE_LABELS = linkedMapOf(
        "INCOMING_CALL" to "Incoming",
        "BIG_PUSH_REQUESTED" to "BigPush Requested",
        "BIG_PUSH_VISIBLE" to "BigPush Visible",
        "ANSWER_DETECTED" to "Answer Detected",
        "SHOWCASE_REQUESTED" to "Showcase Requested",
        "OVERLAY_ATTACHED" to "Overlay Attached",
        "SCREEN_CHANGED" to "Screen Changed",
        "REACT_ROOT_READY" to "React Root Ready",
        "DCC_BOUND" to "DCC Bound",
        "SHOWCASE_VISIBLE" to "Showcase Visible",
        "CALL_END" to "Call End"
    )

    data class SegmentDef(
        val id: String,
        val label: String,
        val fromCode: String,
        val toCode: String,
        val kpiMs: Int? = null
    )

    val SEGMENT_DEFS = listOf(
        SegmentDef("incoming_to_bigpush_requested", "Incoming → BigPush Requested", "INCOMING_CALL", "BIG_PUSH_REQUESTED"),
        SegmentDef("bigpush_requested_to_visible", "BigPush Requested → Visible", "BIG_PUSH_REQUESTED", "BIG_PUSH_VISIBLE", KPI_BIG_PUSH_VISIBLE_MS),
        SegmentDef("incoming_to_bigpush_visible", "Incoming → BigPush Visible", "INCOMING_CALL", "BIG_PUSH_VISIBLE", KPI_BIG_PUSH_VISIBLE_MS),
        SegmentDef("answer_to_showcase_requested", "Answer → Showcase Requested", "ANSWER_DETECTED", "SHOWCASE_REQUESTED"),
        SegmentDef("showcase_requested_to_overlay", "Showcase Requested → Overlay Attached", "SHOWCASE_REQUESTED", "OVERLAY_ATTACHED"),
        SegmentDef("overlay_to_react", "Overlay Attached → React Root", "OVERLAY_ATTACHED", "REACT_ROOT_READY"),
        SegmentDef("react_to_dcc", "React Root → DCC Bound", "REACT_ROOT_READY", "DCC_BOUND"),
        SegmentDef("dcc_to_showcase_visible", "DCC Bound → Showcase Visible", "DCC_BOUND", "SHOWCASE_VISIBLE"),
        SegmentDef("answer_to_showcase_visible", "Answer → Showcase Visible", "ANSWER_DETECTED", "SHOWCASE_VISIBLE", KPI_SHOWCASE_VISIBLE_MS),
        SegmentDef("total_showcase", "Total Showcase (Answer→Visible)", "ANSWER_DETECTED", "SHOWCASE_VISIBLE", KPI_SHOWCASE_VISIBLE_MS)
    )

    /**
     * @param events list of maps with code + elapsedMs (first occurrence wins per code)
     */
    fun compute(events: List<Pair<String, Int>>): JSONObject {
        val firstAt = linkedMapOf<String, Int>()
        for ((code, elapsed) in events) {
            if (!firstAt.containsKey(code)) firstAt[code] = elapsed
            /* aliases */
            when (code) {
                "REACT_ROOT_MOUNTED" -> firstAt.putIfAbsent("REACT_ROOT_READY", elapsed)
                "ADD_VIEW_SUCCESS" -> firstAt.putIfAbsent("BIG_PUSH_VISIBLE", elapsed)
                "SHOW_OVERLAY", "COORDINATOR_START_OVERLAY" ->
                    firstAt.putIfAbsent("BIG_PUSH_REQUESTED", elapsed)
            }
        }

        val segments = JSONArray()
        for (def in SEGMENT_DEFS) {
            val from = firstAt[def.fromCode]
            val to = firstAt[def.toCode]
            if (from == null || to == null) continue
            val ms = (to - from).coerceAtLeast(0)
            segments.put(
                JSONObject().apply {
                    put("id", def.id)
                    put("label", def.label)
                    put("fromCode", def.fromCode)
                    put("toCode", def.toCode)
                    put("elapsedMs", ms)
                    if (def.kpiMs != null) {
                        put("kpiMs", def.kpiMs)
                        put("kpiPass", ms <= def.kpiMs)
                    }
                }
            )
        }

        val summary = JSONObject().apply {
            fun seg(id: String): Int? =
                (0 until segments.length())
                    .map { segments.getJSONObject(it) }
                    .firstOrNull { it.optString("id") == id }
                    ?.optInt("elapsedMs")
                    ?.takeIf { segments.length() > 0 }

            put("incomingToBigPushMs", seg("incoming_to_bigpush_visible") ?: seg("incoming_to_bigpush_requested"))
            put("bigPushVisibleMs", seg("bigpush_requested_to_visible"))
            put("answerToShowcaseMs", seg("answer_to_showcase_visible") ?: seg("answer_to_showcase_requested"))
            put("reactInitMs", seg("overlay_to_react"))
            put("dccBindMs", seg("react_to_dcc"))
            put("totalShowcaseMs", seg("total_showcase"))
            put("kpiBigPushVisibleMs", KPI_BIG_PUSH_VISIBLE_MS)
            put("kpiShowcaseVisibleMs", KPI_SHOWCASE_VISIBLE_MS)
            val bp = seg("incoming_to_bigpush_visible")
            val sc = seg("total_showcase")
            if (bp != null) put("kpiBigPushPass", bp <= KPI_BIG_PUSH_VISIBLE_MS)
            if (sc != null) put("kpiShowcasePass", sc <= KPI_SHOWCASE_VISIBLE_MS)
        }

        return JSONObject().apply {
            put("milestones", JSONObject().also { o ->
                for ((k, v) in firstAt) o.put(k, v)
            })
            put("segments", segments)
            put("summary", summary)
            put(
                "kpi",
                JSONObject().apply {
                    put("bigPushVisibleMaxMs", KPI_BIG_PUSH_VISIBLE_MS)
                    put("showcaseVisibleMaxMs", KPI_SHOWCASE_VISIBLE_MS)
                }
            )
        }
    }
}
