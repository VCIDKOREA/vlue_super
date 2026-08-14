package kr.vlue.calloverlay.dcp

/**
 * 국가기관 공식 단축번호 화이트리스트 (클라이언트 즉시 매칭).
 * 서버 `nationalAgencyWhitelist.seed` 와 동일 번호 집합.
 */
object NationalAgencyWhitelist {
    data class Agency(
        val shortNumber: String,
        val agencyName: String,
        val officialWebsite: String
    )

    const val ABNORMAL_WARNING =
        "🚨 현재 번호는 비정상 발신 번호로 의심됩니다! 즉시 통화를 종료하고 공식 정보를 확인하세요!!"

    /** 비정상 경로 확인 → 경찰청 피싱안심SOS 공식 제보 */
    const val ABNORMAL_REPORT_URL =
        "https://www.counterscam112.go.kr/report/reportGuide.do?type=itg"

    val AGENCIES: List<Agency> = listOf(
        Agency("112", "경찰청", "https://www.police.go.kr"),
        Agency("119", "소방청", "https://www.nfa.go.kr"),
        Agency("111", "국가정보원", "https://www.nis.go.kr"),
        Agency("122", "해양경찰청", "https://www.kcg.go.kr"),
        Agency("182", "경찰청 민원", "https://www.minwon.police.go.kr"),
        Agency("1332", "금융감독원", "https://www.fss.or.kr"),
        Agency("1394", "경찰청 전기통신금융사기 통합신고대응단", "https://www.police.go.kr"),
        Agency("1397", "서민금융진흥원", "https://www.kinfa.or.kr"),
        Agency("1369", "금융결제원", "https://www.kftc.or.kr"),
        Agency("1301", "검찰청", "https://www.spo.go.kr"),
        Agency("110", "국민권익위원회 국민콜110", "https://www.110.go.kr"),
        Agency("1303", "국방부 국방헬프콜", "https://www.mnd.go.kr"),
        Agency("1331", "국가인권위원회", "https://www.humanrights.go.kr"),
        Agency("1345", "법무부 외국인종합안내센터", "https://www.immigration.go.kr"),
        Agency("126", "국세청", "https://www.nts.go.kr"),
        Agency("1390", "중앙선거관리위원회", "https://www.nec.go.kr"),
        Agency("117", "학교폭력신고센터", "https://www.safe182.go.kr"),
        Agency("118", "한국인터넷진흥원", "https://www.kisa.or.kr"),
        Agency("129", "보건복지상담센터", "https://www.129.go.kr"),
        Agency("1339", "질병관리청", "https://kdca.go.kr"),
        Agency("1382", "행정안전부 주민등록 진위확인", "https://www.mois.go.kr"),
        Agency("1393", "자살예방핫라인", "https://www.spckorea.or.kr"),
        Agency("1399", "식품의약품안전처", "https://www.mfds.go.kr")
    )

    private val byShort: Map<String, Agency> = AGENCIES.associateBy { it.shortNumber }

    fun digitsOnly(raw: String?): String = raw?.filter { it.isDigit() }.orEmpty()

    /** +82112 / 112 / 82-112 등에서 화이트리스트 단축번호 후보 */
    fun shortNumberCandidates(raw: String?): List<String> {
        val d = digitsOnly(raw)
        if (d.isEmpty()) return emptyList()
        val out = LinkedHashSet<String>()
        out.add(d)
        if (d.startsWith("82") && d.length > 2) {
            val rest = d.drop(2)
            if (rest.isNotEmpty()) out.add(rest)
        }
        if (d.startsWith("0") && d.length > 1) {
            out.add(d.drop(1))
        }
        return out.toList()
    }

    fun match(raw: String?): Agency? {
        for (c in shortNumberCandidates(raw)) {
            byShort[c]?.let { return it }
        }
        return null
    }

    fun isWhitelisted(raw: String?): Boolean = match(raw) != null

    /**
     * 이번 통화에 붙일 DCP 경로.
     * 화이트리스트가 아니면 빈 값 — 직전 112 테스트의 abnormal 이 CEO 통화에 남으면 안 된다.
     */
    fun routeForCall(phone: String?, requested: String?, cardRoute: String? = ""): String {
        if (match(phone) == null) return ""
        val req = requested?.trim()?.lowercase().orEmpty()
        if (req == "normal" || req == "abnormal") return req
        val card = cardRoute?.trim()?.lowercase().orEmpty()
        if (card == "normal" || card == "abnormal") return card
        return ""
    }
}
