package kr.vlue.calloverlay.dcp

/**
 * 화이트리스트 통화 1회 세션의 경로 판정.
 * 테스트 버튼은 [armMock] 으로 실제 센서 검사를 건너뛴다.
 */
object CallPathSession {
    @Volatile
    private var mock: CallPathVerdict? = null

    @Volatile
    var lastVerdict: CallPathVerdict? = null
        private set

    fun armMock(abnormal: Boolean) {
        mock = if (abnormal) {
            CallPathVerdict.abnormal(
                reasons = listOf("mock_abnormal_test"),
                fromMock = true
            )
        } else {
            CallPathVerdict.normal(fromMock = true)
        }
    }

    fun consumeMock(): CallPathVerdict? {
        val pending = mock
        mock = null
        if (pending != null) lastVerdict = pending
        return pending
    }

    fun consumeOrVerify(context: android.content.Context): CallPathVerdict {
        val pending = consumeMock()
        if (pending != null) return pending
        val verdict = CallPathVerificationEngine.verify(context)
        lastVerdict = verdict
        return verdict
    }

    fun clear() {
        mock = null
        lastVerdict = null
    }
}
