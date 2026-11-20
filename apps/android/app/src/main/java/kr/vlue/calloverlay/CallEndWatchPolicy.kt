package kr.vlue.calloverlay

/**
 * 통화 종료 확정. Telephony IDLE 콜백이 없어도
 * 실제 통화 상태·오디오 모드가 조용하면 오버레이를 내린다.
 * 발신 직후 잠깐 IDLE 인 레이스로 로고를 지우지 않는다.
 */
object CallEndWatchPolicy {
    const val OUTGOING_GRACE_MS = 4_000L
    const val IDLE_STREAK_REQUIRED = 3

    data class Sample(
        val callIdle: Boolean,
        val telecomInCall: Boolean,
        val audioInCall: Boolean,
        val sawLiveCall: Boolean,
        val overlayAgeMs: Long,
        val priorIdleStreak: Int
    )

    data class Decision(val nextIdleStreak: Int, val dismiss: Boolean)

    fun decide(sample: Sample): Decision {
        val live = !sample.callIdle || sample.telecomInCall || sample.audioInCall
        if (live) return Decision(nextIdleStreak = 0, dismiss = false)
        val gracePassed = sample.sawLiveCall || sample.overlayAgeMs >= OUTGOING_GRACE_MS
        if (!gracePassed) return Decision(nextIdleStreak = 0, dismiss = false)
        val next = (sample.priorIdleStreak + 1).coerceAtLeast(1)
        return Decision(nextIdleStreak = next, dismiss = next >= IDLE_STREAK_REQUIRED)
    }
}
