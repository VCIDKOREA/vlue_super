package kr.vlue.calloverlay.dcp

import org.json.JSONObject

/** 오버레이 WebView / lookup 주입용 DCP JSON — API `buildAgencyDcpLookupBody` 와 동일 형태 */
object DcpLookupPayload {
    fun toJson(
        agency: NationalAgencyWhitelist.Agency,
        verdict: CallPathVerdict
    ): String {
        val route = verdict.routeQuery
        val warning = if (verdict.isAbnormal) NationalAgencyWhitelist.ABNORMAL_WARNING else ""
        val dcp = JSONObject()
            .put("id", "local-${agency.shortNumber}")
            .put("agencyName", agency.agencyName)
            .put("shortNumber", agency.shortNumber)
            .put("officialWebsite", agency.officialWebsite)
            .put("logoUrl", "")
            .put("logoResourceName", "dcp_logo_${agency.shortNumber}")
            .put("routeStatus", route)
            .put("warning", warning)
        val profile = JSONObject()
            .put("website", agency.officialWebsite)
            .put("logoUrl", "")
            .put("photoUrl", "")
            .put("organization", agency.agencyName)
            .put(
                "verificationItems",
                org.json.JSONArray().put("VLUE 디지털인증프로필").put("국가기관 공식 번호")
            )
        return JSONObject()
            .put("matched", true)
            .put("is_verified", true)
            .put("source", "national_agency_dcp")
            .put("profileKind", "dcp")
            .put("displayName", agency.agencyName)
            .put("jobTitle", "디지털인증프로필")
            .put("companyName", agency.agencyName)
            .put("email", "")
            .put("website", agency.officialWebsite)
            .put("image_url", "")
            .put("logo_url", "")
            .put("phoneE164", agency.shortNumber)
            .put("publicHandle", "")
            .put("membershipTier", "paid")
            .put("digitalCardActive", true)
            .put("profile", profile)
            .put("dcp", dcp)
            .toString()
    }
}
