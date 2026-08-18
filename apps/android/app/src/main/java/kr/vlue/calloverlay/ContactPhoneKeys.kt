package kr.vlue.calloverlay

/**
 * 기기 주소록 매칭용 KR 번호 키 (010 / 82 / +82).
 * Android API 없이 단위 테스트 가능.
 */
object ContactPhoneKeys {
    fun digitsOnly(raw: String?): String = raw?.filter { it.isDigit() }.orEmpty()

    fun localDigits(raw: String?): String {
        val d = digitsOnly(raw)
        if (d.isEmpty()) return ""
        return if (d.startsWith("82") && d.length >= 10) "0${d.substring(2)}" else d
    }

    fun keys(raw: String?): Set<String> {
        val digits = digitsOnly(raw)
        if (digits.length < 8) return emptySet()
        val out = linkedSetOf(digits)
        if (digits.startsWith("82") && digits.length >= 10) {
            out.add("0${digits.substring(2)}")
        }
        if (digits.startsWith("0") && digits.length >= 10) {
            out.add("82${digits.substring(1)}")
        }
        if (digits.length == 11 && digits.startsWith("010")) {
            out.add(digits.substring(1))
        }
        return out
    }

    fun matches(a: String?, b: String?): Boolean {
        val ka = keys(a)
        if (ka.isEmpty()) return false
        val kb = keys(b)
        return ka.any { it in kb }
    }
}
