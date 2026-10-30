package kr.vlue.calloverlay

/**
 * 기기 주소록 매칭용 KR 번호 키 (010 / 82 / +82).
 * Google 동기화(+82 010-xxxx)도 동일 키로 묶는다.
 * Android API 없이 단위 테스트 가능.
 */
object ContactPhoneKeys {
    fun digitsOnly(raw: String?): String = raw?.filter { it.isDigit() }.orEmpty()

    fun localDigits(raw: String?): String {
        var d = digitsOnly(raw)
        if (d.isEmpty()) return ""
        if (d.startsWith("00")) d = d.substring(2)
        if (d.startsWith("82") && d.length >= 11) {
            val rest = d.substring(2)
            return if (rest.startsWith("0")) rest else "0$rest"
        }
        if (d.startsWith("0")) return d
        if (d.length in 9..11) return "0$d"
        return d
    }

    fun keys(raw: String?): Set<String> {
        val local = localDigits(raw)
        val digits = digitsOnly(raw)
        if (local.length < 8 && digits.length < 8) return emptySet()
        val out = linkedSetOf<String>()
        if (digits.isNotEmpty()) out.add(digits)
        if (local.isNotEmpty()) {
            out.add(local)
            if (local.startsWith("0") && local.length >= 10) {
                out.add("82${local.substring(1)}")
                /* 국내 0 제거 키 (8210… 과 동일 매칭) */
                out.add(local.substring(1))
            }
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
