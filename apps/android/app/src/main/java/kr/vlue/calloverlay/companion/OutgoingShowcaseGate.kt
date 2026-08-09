package kr.vlue.calloverlay.companion

/**
 * 발신 다이얼 OFFHOOK 과 Showcase 진입을 분리.
 * 발신은 remoteConnected(상대 응답) 전까지 BigPush 만 허용.
 */
object OutgoingShowcaseGate {
    fun shouldEnterShowcaseNow(
        outgoing: Boolean,
        remoteConnected: Boolean,
        inCallOverlayState: Boolean,
        telephonyOffhook: Boolean
    ): Boolean {
        if (inCallOverlayState) return true
        if (remoteConnected) return true
        if (outgoing) return false
        return telephonyOffhook
    }
}
