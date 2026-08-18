package kr.vlue.calloverlay.dcp

import org.json.JSONObject

/** VLUE 비회원 · 기기 주소록 — 안심케어 팝업용 lookup JSON */
object ContactSafeCarePayload {
    const val PROFILE_KIND = "contact_safe_care"

    const val NORMAL_MESSAGE =
        "기기에 저장된 번호입니다. VLUE 비회원 · 안심케어 정상 경로입니다."

    fun toJson(
        phone: String,
        contactName: String,
        verdict: CallPathVerdict
    ): String {
        val route = verdict.routeQuery
        val warning =
            if (verdict.isAbnormal) CallPathReasonCopy.summary(verdict.reasons) else ""
        val dcp = JSONObject()
            .put("routeStatus", route)
            .put("warning", warning)
            .put("pathVerify", verdict.isAbnormal)
            .put("contactSafeCare", true)
            .put("contactName", contactName)
        if (verdict.reasons.isNotEmpty()) {
            dcp.put("reasons", org.json.JSONArray(verdict.reasons))
        }
        return JSONObject()
            .put("matched", false)
            .put("is_verified", false)
            .put("source", "device_contact_safe_care")
            .put("profileKind", PROFILE_KIND)
            .put("displayName", contactName)
            .put("contactName", contactName)
            .put("phoneE164", phone)
            .put("publicHandle", "")
            .put("membershipTier", "free")
            .put("dcp", dcp)
            .toString()
    }
}
