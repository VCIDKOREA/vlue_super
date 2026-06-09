package kr.vlue.calloverlay.family.bank

/** 은행 앱 푸시 알림 파싱 — 계좌번호 마스킹 */
object FamilyBankNotificationParser {
    data class Parsed(
        val direction: String,
        val amountKrw: Long,
        val maskedSummary: String,
        val bankLabel: String
    )

    private val BANK_PACKAGES = mapOf(
        "com.kbstar.kbbank" to "KB국민",
        "com.shinhan.sbanking" to "신한",
        "com.kebhana.hanapush" to "하나",
        "com.wooribank.smart" to "우리",
        "nh.smart" to "NH",
        "com.ibk.android.ionebank" to "IBK",
        "com.kakaobank.channel" to "카카오뱅크",
        "viva.republica.toss" to "토스",
        "com.citibank.citimobile" to "씨티"
    )

    fun bankLabel(packageName: String): String {
        val pkg = packageName.lowercase()
        for ((key, label) in BANK_PACKAGES) {
            if (pkg.contains(key.lowercase())) return label
        }
        return "은행"
    }

    fun isBankPackage(packageName: String): Boolean {
        val pkg = packageName.lowercase()
        return BANK_PACKAGES.keys.any { pkg.contains(it.lowercase()) } ||
            pkg.contains("bank") || pkg.contains("banking")
    }

    fun parse(title: String, body: String, packageName: String): Parsed? {
        val text = "$title $body".trim()
        if (text.isBlank()) return null

        val direction = when {
            text.contains("입금") || text.contains("받으") -> "deposit"
            text.contains("출금") || text.contains("이체") || text.contains("결제") || text.contains("인출") -> "withdraw"
            else -> "unknown"
        }

        val amount = Regex("""([\d,]+)\s*원""").find(text)?.groupValues?.get(1)
            ?.replace(",", "")
            ?.toLongOrNull() ?: 0L

        val masked = maskAccounts(text)
        val bank = bankLabel(packageName)
        val summary = when (direction) {
            "deposit" -> "입금 $masked${if (amount > 0) " · ${amount}원" else ""}"
            "withdraw" -> "출금 $masked${if (amount > 0) " · ${amount}원" else ""}"
            else -> "$bank $masked"
        }

        return Parsed(direction, amount, summary.trim(), bank)
    }

    private fun maskAccounts(text: String): String {
        return text
            .replace(Regex("""\d{3,4}-\d{2,4}-\d{4,6}"""), "***-**-****")
            .replace(Regex("""\d{10,14}""")) { m ->
                val s = m.value
                if (s.length >= 8) "${s.take(3)}***${s.takeLast(4)}" else "***"
            }
    }
}
