package kr.vlue.calloverlay

/**
 * 한국 번호 유형 — 일반내선 · 대표번호 · 휴대폰
 * (가족보호 장시간 통화 알림용)
 */
object KrPhoneKindClassifier {
    enum class Kind(val wire: String, val labelKo: String) {
        MOBILE("mobile", "휴대폰번호"),
        REPRESENTATIVE("representative", "대표번호"),
        LANDLINE("landline", "일반내선")
    }

    fun isNationwideRepresentativeDigits(d: String): Boolean =
        Regex("^1[3-9]\\d{6}$").matches(d)

    fun classify(rawPhone: String): Kind {
        var d = ContactPhoneKeys.localDigits(rawPhone)
        if (d.isEmpty()) return Kind.LANDLINE
        if (d.length == 9 && d.startsWith("0") && isNationwideRepresentativeDigits(d.substring(1))) {
            d = d.substring(1)
        }
        if (isNationwideRepresentativeDigits(d)) return Kind.REPRESENTATIVE
        if (d.startsWith("080")) return Kind.REPRESENTATIVE
        if (Regex("^01[016789]\\d{7,8}$").matches(d)) return Kind.MOBILE
        return Kind.LANDLINE
    }
}
