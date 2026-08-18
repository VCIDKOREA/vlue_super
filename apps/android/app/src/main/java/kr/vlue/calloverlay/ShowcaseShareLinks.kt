package kr.vlue.calloverlay

/**
 * 문자·외부 공유용 쇼케이스 URL.
 * SMS 미리보기(OG)는 m.vlue.kr 웹 경로를 쓴다. API `/api/v1/showcase/view/` 는 안드로이드 문자가 카드로 안 띄운다.
 */
object ShowcaseShareLinks {
    const val PUBLIC_ORIGIN = "https://m.vlue.kr"

    fun publicShowcasePath(ownerPhone: String?): String {
        val local = ContactPhoneKeys.localDigits(ownerPhone)
        return if (local.isEmpty()) "/showcase" else "/showcase/$local"
    }

    fun publicShowcaseUrl(ownerPhone: String?, origin: String = PUBLIC_ORIGIN): String {
        val base = origin.trim().trimEnd('/')
        return "$base${publicShowcasePath(ownerPhone)}"
    }

    fun smsBody(ownerPhone: String?, origin: String = PUBLIC_ORIGIN): String {
        val url = publicShowcaseUrl(ownerPhone, origin)
        return """
            [VLUE 쇼케이스]
            안전한 통화를 위한 VLUE 디지털 쇼케이스입니다.
            링크를 눌러 프로필을 확인해 주세요.

            $url
        """.trimIndent()
    }
}
