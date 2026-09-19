package kr.vlue.calloverlay.dcp

/**
 * 공공·학교·우체국 등 VLUE 디렉터리 매칭 — 안심팝업 (신고/제보 없음).
 * 기기 주소록 안심케어([ContactSafeCarePayload])와 동일 UI 경로.
 */
object PublicDirectorySafePayload {
    const val PROFILE_KIND = "public_directory_safe"
    /** 디렉터리 신뢰 라벨 — VLUÉ 회원 인증마크와 혼동되지 않게 */
    const val AUTH_LABEL = "안심 디렉터리"
}
