package kr.vlue.calloverlay.dcp

import kr.vlue.calloverlay.companion.OverlayState
import org.json.JSONObject

/**
 * VLUE 인증 회원 · 공개 DCC/쇼케이스 없음 → 수화 후 「경로 검증 · 정상」스타일 팝업.
 * 링잉 빅푸시에서는 표시하지 않음 (웹 fixed 모달이 156dp 바에 끼어 깨지는 문제 방지).
 */
object VlueAuthMemberPopupPolicy {
    const val MESSAGE =
        "VLUE 인증 회원으로 확인되었습니다. 공개 설정된 디지털인증명함·쇼케이스가 없습니다."

    fun shouldShow(overlayState: OverlayState, popupOnlyTest: Boolean = false): Boolean {
        if (popupOnlyTest) return true
        return overlayState == OverlayState.SHOWCASE
    }

    fun isAuthMemberOnly(cardJson: String?, verified: Boolean): Boolean {
        if (cardJson.isNullOrBlank()) return false
        if (!verified && !jsonVerified(cardJson)) return false
        val root = parse(cardJson) ?: return false
        val card = root.optJSONObject("card") ?: root
        val profileKind =
            firstNonBlank(root.optString("profileKind"), card.optString("profileKind")).orEmpty()
        if (profileKind == ContactSafeCarePayload.PROFILE_KIND) return false
        if (profileKind == "expired_line") return false
        if (profileKind == "national_agency" || profileKind == "gov_agency") return false
        if (root.optBoolean("dcpAgency", false) || card.optBoolean("dcpAgency", false)) return false
        /* 매칭된 VLUE 회원만 — unmatched/비회원 경로 제외 */
        val matched =
            root.optBoolean("matched", false) ||
                jsonVerified(cardJson) ||
                verified
        if (!matched) return false
        return !hasPublicDccOrShowcase(root, card)
    }

    fun displayName(cardJson: String?, phoneFallback: String): String {
        val root = parse(cardJson) ?: return phoneFallback
        val card = root.optJSONObject("card") ?: root
        return firstNonBlank(
            card.optString("displayName"),
            root.optString("displayName"),
            card.optString("name"),
            card.optString("legalName"),
            phoneFallback
        ).orEmpty().ifBlank { phoneFallback }
    }

    private fun jsonVerified(cardJson: String?): Boolean {
        val root = parse(cardJson) ?: return false
        val card = root.optJSONObject("card") ?: root
        return root.optBoolean("is_verified", false) ||
            root.optBoolean("verified", false) ||
            card.optBoolean("verified", false) ||
            card.optBoolean("is_verified", false) ||
            root.optBoolean("matched", false)
    }

    private fun hasPublicDccOrShowcase(root: JSONObject, card: JSONObject): Boolean {
        val style =
            card.optJSONObject("showcaseStyle")
                ?: root.optJSONObject("showcaseStyle")
                ?: card.optJSONObject("showcase_style")
        val broadcastOn =
            style?.optBoolean("includeDigitalCard", false) == true ||
                card.optBoolean("digitalCardActive", false) ||
                root.optBoolean("digitalCardActive", false)
        if (!broadcastOn) return false
        if (styleHasMedia(style)) return true
        return firstNonBlank(
            card.optString("organization"),
            card.optString("companyName"),
            card.optString("titlePhotoUrl"),
            card.optString("email"),
            card.optString("logoUrl"),
            card.optString("website"),
            card.optString("title")
        ) != null
    }

    private fun styleHasMedia(style: JSONObject?): Boolean {
        if (style == null) return false
        val pages = style.optJSONArray("pages")
        if (pages != null) {
            for (i in 0 until pages.length()) {
                val p = pages.optJSONObject(i) ?: continue
                if (firstNonBlank(
                        p.optString("imageUrl"),
                        p.optString("mediaUrl"),
                        p.optString("photoUrl"),
                        p.optString("videoUrl")
                    ) != null
                ) {
                    return true
                }
                val blocks = p.optJSONArray("blocks")
                if (blocks != null && blocks.length() > 0) return true
            }
        }
        val gallery = style.optJSONObject("gallery")
        val photos = gallery?.optJSONArray("photos")
        if (photos != null && photos.length() > 0) return true
        val bgm = style.optJSONObject("bgm")
        if (bgm != null && firstNonBlank(bgm.optString("audioUrl")) != null) return true
        return false
    }

    private fun parse(raw: String?): JSONObject? {
        if (raw.isNullOrBlank()) return null
        return try {
            JSONObject(raw)
        } catch (_: Exception) {
            null
        }
    }

    private fun firstNonBlank(vararg values: String?): String? {
        for (v in values) {
            val t = v?.trim().orEmpty()
            if (t.isNotEmpty() && t != "null") return t
        }
        return null
    }
}
