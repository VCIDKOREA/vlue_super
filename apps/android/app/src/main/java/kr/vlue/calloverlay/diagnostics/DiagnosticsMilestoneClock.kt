package kr.vlue.calloverlay.diagnostics

import java.util.concurrent.ConcurrentHashMap

/** 세션별 마일스톤 첫 시각(ms from base) — PERF 세그먼트 계산용 */
object DiagnosticsMilestoneClock {
    private val bySession = ConcurrentHashMap<String, ConcurrentHashMap<String, Int>>()

    /** @return true if first time this code was recorded for the session */
    fun note(sessionId: String, code: String, elapsedMs: Int): Boolean {
        val map = bySession.getOrPut(sessionId) { ConcurrentHashMap() }
        return map.putIfAbsent(code, elapsedMs.coerceAtLeast(0)) == null
    }

    fun snapshot(sessionId: String): List<Pair<String, Int>> {
        val map = bySession[sessionId] ?: return emptyList()
        return map.entries.map { it.key to it.value }.sortedBy { it.second }
    }

    fun clear(sessionId: String) {
        bySession.remove(sessionId)
    }

    fun clearAll() {
        bySession.clear()
    }
}
