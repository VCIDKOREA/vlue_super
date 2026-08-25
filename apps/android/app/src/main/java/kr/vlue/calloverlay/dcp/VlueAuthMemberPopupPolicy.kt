package kr.vlue.calloverlay.dcp

import kr.vlue.calloverlay.companion.OverlayState
import org.json.JSONObject

/**
 * VLUE 인증 회원 · 공개 DCC/쇼케이스 없음 → 수화 후 「경로 검증 · 정상」스타일 팝업.
 * DCC·쇼케이스가 있으면(또는 불확실하면) 쇼케이스 경로를 우선한다 — CEO 등 오탐 방지.
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
        val matched =
            root.optBoolean("matched", false) ||
                jsonVerified(cardJson) ||
                verified
        if (!matched) return false
        /* DCC·쇼케이스 있으면(또는 판단 불가하면) 인증-only 팝업 금지 */
        if (hasPublicDccOrShowcase(root, card)) return false
        return true
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
            when {
                card.has("showcaseStyle") -> card.optJSONObject("showcaseStyle")
                root.has("showcaseStyle") -> root.optJSONObject("showcaseStyle")
                card.has("showcase_style") -> card.optJSONObject("showcase_style")
                else -> null
            }
        /* 송출 OFF 가 명시되면 빈 쇼케이스 금지 → 인증 팝업만 */
        if (style != null && style.has("includeDigitalCard") && !style.optBoolean("includeDigitalCard", false)) {
            return false
        }
        val broadcastOn = style?.optBoolean("includeDigitalCard", false) == true
        if (!broadcastOn) {
            /*
             * 스타일 키 없음·digitalCardActive 만으로는 쇼케이스 경로로 단정하지 않음.
             * (예전: 키 없으면 true → 빈 VLUE Showcase 가 화면을 덮음)
             */
            return false
        }
        if (styleHasMedia(style)) return true
        if (hasDccOrMediaHints(root, card)) return true
        /* 송출 ON 이지만 실콘텐츠 없음 → 빈 쇼케이스 대신 인증 팝업 */
        return false
    }

    private fun hasDccOrMediaHints(root: JSONObject, card: JSONObject): Boolean {
        return firstNonBlank(
            card.optString("organization"),
            root.optString("organization"),
            card.optString("companyName"),
            root.optString("companyName"),
            card.optString("titlePhotoUrl"),
            root.optString("titlePhotoUrl"),
            card.optString("email"),
            root.optString("email"),
            card.optString("logoUrl"),
            root.optString("logoUrl"),
            card.optString("logo_url"),
            root.optString("logo_url"),
            card.optString("website"),
            root.optString("website"),
            card.optString("title"),
            root.optString("title"),
            card.optString("jobTitle"),
            root.optString("jobTitle"),
            card.optString("image_url"),
            root.optString("image_url"),
            card.optString("photoUrl"),
            root.optString("photoUrl"),
            card.optString("avatarUrl"),
            root.optString("avatarUrl")
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
