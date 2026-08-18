package kr.vlue.calloverlay.dcp

import org.json.JSONArray
import org.json.JSONObject

/**
 * 로컬 경로 검증 + 상대 폰 원격 실행 신호를 lookup JSON 에 합친다.
 */
object CallPathLookupMerge {
    const val PROFILE_KIND = "path_verify"

    fun placeholderJson(phone: String, verdict: CallPathVerdict, outgoing: Boolean): String {
        val json = JSONObject()
            .put("matched", false)
            .put("is_verified", false)
            .put("source", "call_path_verify")
            .put("profileKind", PROFILE_KIND)
            .put("displayName", "")
            .put("phoneE164", phone)
        return merge(json.toString(), verdict, outgoing).json
    }

    data class Merged(
        val json: String,
        val route: String
    )

    fun merge(rawJson: String, local: CallPathVerdict?, outgoing: Boolean): Merged {
        val json = try {
            JSONObject(rawJson.ifBlank { "{}" })
        } catch (_: Exception) {
            JSONObject()
        }
        val dcp = json.optJSONObject("dcp") ?: JSONObject()
        val peerReasons = jsonArrayToList(dcp.optJSONArray("reasons"))
        val localReasons = local?.reasons.orEmpty()
        val reasons = (localReasons + peerReasons).distinct().filter { it.isNotBlank() }
        val peerAbnormal = dcp.optString("routeStatus").equals("abnormal", ignoreCase = true)
        val abnormal = local?.isAbnormal == true || peerAbnormal || reasons.isNotEmpty()
        if (!abnormal) {
            return Merged(json.toString(), "")
        }
        dcp.put("routeStatus", "abnormal")
        dcp.put("pathVerify", true)
        dcp.put("warning", CallPathReasonCopy.summary(reasons, outgoing))
        dcp.put("reasons", JSONArray(reasons))
        json.put("dcp", dcp)
        if (json.optString("profileKind").isBlank() && !json.optBoolean("matched", false)) {
            json.put("profileKind", PROFILE_KIND)
        }
        return Merged(json.toString(), "abnormal")
    }

    private fun jsonArrayToList(arr: JSONArray?): List<String> {
        if (arr == null) return emptyList()
        val out = ArrayList<String>(arr.length())
        for (i in 0 until arr.length()) {
            val s = arr.optString(i).trim()
            if (s.isNotEmpty()) out.add(s)
        }
        return out
    }
}
