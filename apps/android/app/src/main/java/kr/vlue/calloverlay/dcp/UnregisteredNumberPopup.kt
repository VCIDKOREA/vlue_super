package kr.vlue.calloverlay.dcp

import org.json.JSONObject

/**
 * 미등록 번호 안심팝업 (v2) — DB 미등록 · 조회 타임아웃 · 신고/제보 대상.
 *
 * 쇼케이스를 띄우지 않고 이 2줄 팝업 + 제보/신고 버튼으로 일원화한다.
 * 카피는 규격(CALL_OVERLAY_CONTRACT.md §3a rule 6)과 1:1 이며 UI/테스트가 이 상수만 참조한다.
 */
object UnregisteredNumberPopup {
    const val LINE_PATH_NORMAL = "• 발신경로 정상 (VLUE 미등록 번호)"
    const val LINE_MONEY_CAUTION = "• 유선상 금전요구는 주의바랍니다."

    /** 한 줄 발신자 제보(예: 삼성카드) — 제보 패널로 연다. */
    const val TIP_BUTTON = "제보하기"

    /** 스팸/피싱 신고(+차단) 시트 — 신고 시트로 연다. */
    const val REPORT_BUTTON = "신고하기"

    /** 경찰청 피싱안심SOS 외부 제보 페이지. */
    const val SOS_BUTTON = "피싱안심SOS"
    const val SOS_URL = "https://www.counterscam112.go.kr/report/reportTerms.do?type=vop"

    const val CLOSE_BUTTON = "닫기"

    /** 2줄 본문 (줄바꿈으로 결합). */
    val BODY: String = "$LINE_PATH_NORMAL\n$LINE_MONEY_CAUTION"

    const val PROFILE_KIND = "unverified"
    const val SOURCE = "unmatched"

    /**
     * 미등록 확정 카드 JSON — [VlueAuthMemberPopupPolicy.isUnverifiedResolved] 가 true 가 되는 형태.
     * `lookup_pending` 을 대체해 조회 대기 고착을 원천 차단한다.
     */
    fun json(phone: String): String =
        JSONObject()
            .put("matched", false)
            .put("is_verified", false)
            .put("phoneE164", phone)
            .put("source", SOURCE)
            .put("profileKind", PROFILE_KIND)
            .toString()
}
