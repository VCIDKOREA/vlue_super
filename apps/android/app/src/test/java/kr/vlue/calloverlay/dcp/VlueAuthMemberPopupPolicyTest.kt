package kr.vlue.calloverlay.dcp

import kr.vlue.calloverlay.companion.OverlayState
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class VlueAuthMemberPopupPolicyTest {
    @Test
    fun ringingBigPush_popupOnly_withoutAnswer_doesNotShow() {
        assertFalse(
            VlueAuthMemberPopupPolicy.shouldShow(
                OverlayState.BIG_PUSH,
                popupOnlyTest = true,
                callAnswered = false
            )
        )
    }

    @Test
    fun ringingBigPush_doesNotShowPopup() {
        assertFalse(
            VlueAuthMemberPopupPolicy.shouldShow(
                OverlayState.BIG_PUSH,
                popupOnlyTest = false,
                callAnswered = false
            )
        )
        assertFalse(
            VlueAuthMemberPopupPolicy.shouldShow(OverlayState.MINI_CASE, popupOnlyTest = false)
        )
    }

    @Test
    fun showcase_showsPopup() {
        assertTrue(
            VlueAuthMemberPopupPolicy.shouldShow(OverlayState.SHOWCASE, popupOnlyTest = false)
        )
    }

    @Test
    fun ceoWithOrgHint_withoutStyleKey_hasDcc_isNotAuthMemberOnly() {
        val json =
            """{"matched":true,"is_verified":true,"displayName":"이종근","digitalCardActive":true,"companyName":"VCID KOREA","logo_url":"https://www.vlue.kr/vlue-brand-logo.svg"}"""
        assertFalse(VlueAuthMemberPopupPolicy.isAuthMemberOnly(json, verified = true))
        assertTrue(VlueAuthMemberPopupPolicy.hasBroadcastShowcaseContent(json))
    }

    @Test
    fun ceoWithBroadcastOnAndContent_isNotAuthMemberOnly() {
        val json =
            """{"matched":true,"is_verified":true,"displayName":"이종근","digitalCardActive":true,"showcaseStyle":{"includeDigitalCard":true},"companyName":"VCID KOREA","logo_url":"https://www.vlue.kr/vlue-brand-logo.svg"}"""
        assertFalse(VlueAuthMemberPopupPolicy.isAuthMemberOnly(json, verified = true))
    }

    @Test
    fun photoOnly_withoutStyleKey_isDisplayableDcc() {
        val json =
            """{"matched":true,"is_verified":true,"displayName":"이종근","phoneE164":"+821080144666","image_url":"https://x/a.png"}"""
        assertFalse(VlueAuthMemberPopupPolicy.isAuthMemberOnly(json, verified = true))
        assertTrue(VlueAuthMemberPopupPolicy.hasBroadcastShowcaseContent(json))
    }

    @Test
    fun verifiedNameOnly_withoutContent_isAuthMemberOnly() {
        val json =
            """{"matched":true,"is_verified":true,"displayName":"이상춘"}"""
        assertTrue(VlueAuthMemberPopupPolicy.isAuthMemberOnly(json, verified = true))
    }

    @Test
    fun verifiedWithoutShowcase_isAuthMemberOnly() {
        val json =
            """{"matched":true,"is_verified":true,"displayName":"이상춘","digitalCardActive":false,"showcaseStyle":{"includeDigitalCard":false}}"""
        assertTrue(VlueAuthMemberPopupPolicy.isAuthMemberOnly(json, verified = true))
    }

    @Test
    fun verifiedWithShowcaseOn_isNotAuthMemberOnly() {
        val json =
            """{"matched":true,"is_verified":true,"displayName":"이상춘","showcaseStyle":{"includeDigitalCard":true},"card":{"organization":"테스트"}}"""
        assertFalse(VlueAuthMemberPopupPolicy.isAuthMemberOnly(json, verified = true))
    }

    @Test
    fun verifiedWithoutStyleKey_butOrgHint_isNotAuthMemberOnly() {
        val json =
            """{"matched":true,"is_verified":true,"displayName":"이상춘","card":{"name":"이상춘","organization":"테스트상호"}}"""
        assertFalse(VlueAuthMemberPopupPolicy.isAuthMemberOnly(json, verified = true))
        assertTrue(VlueAuthMemberPopupPolicy.hasBroadcastShowcaseContent(json))
    }

    @Test
    fun verifiedBroadcastOffWithOrgHints_isAuthMemberOnly() {
        val json =
            """{"matched":true,"is_verified":true,"displayName":"이상춘","showcaseStyle":{"includeDigitalCard":false},"card":{"organization":"테스트","image_url":"https://x"}}"""
        assertTrue(VlueAuthMemberPopupPolicy.isAuthMemberOnly(json, verified = true))
    }

    @Test
    fun memberWithDcc_withoutStyleKey_isNotAuthMemberOnly() {
        /* 키 누락 + 실 DCC(이메일·핸들·발급) → 쇼케이스. 인증팝업 고착 금지 */
        val json =
            """{"matched":true,"is_verified":true,"displayName":"이슬기","publicHandle":"seulgi1","email":"a@b.c","digitalCardActive":true}"""
        assertFalse(VlueAuthMemberPopupPolicy.isAuthMemberOnly(json, verified = true))
        assertTrue(VlueAuthMemberPopupPolicy.hasBroadcastShowcaseContent(json))
    }

    @Test
    fun gwangdeokLikeDcc_withoutIncludeKey_opensShowcase() {
        val json =
            """{"matched":true,"is_verified":true,"displayName":"김광덕","email":"zazajin@naver.com","digitalCardActive":true,"phoneE164":"+821020006466"}"""
        assertFalse(VlueAuthMemberPopupPolicy.isAuthMemberOnly(json, verified = true))
        assertTrue(VlueAuthMemberPopupPolicy.hasBroadcastShowcaseContent(json))
    }

    @Test
    fun jeonjungheeBroadcastOn_withPhoto_isNotAuthMemberOnly() {
        val json =
            """{"matched":true,"is_verified":true,"displayName":"전중희","showcaseStyle":{"includeDigitalCard":true},"photoUrl":"https://x/tree.png","email":"test@vlue.kr"}"""
        assertFalse(VlueAuthMemberPopupPolicy.isAuthMemberOnly(json, verified = true))
    }

    @Test
    fun broadcastOff_hasNoBroadcastContent() {
        val json =
            """{"matched":true,"is_verified":true,"displayName":"이상춘","showcaseStyle":{"includeDigitalCard":false}}"""
        assertFalse(VlueAuthMemberPopupPolicy.hasBroadcastShowcaseContent(json))
    }

    @Test
    fun broadcastOnWithOrg_hasBroadcastContent() {
        val json =
            """{"matched":true,"is_verified":true,"displayName":"이상춘","showcaseStyle":{"includeDigitalCard":true},"card":{"organization":"테스트"}}"""
        assertTrue(VlueAuthMemberPopupPolicy.hasBroadcastShowcaseContent(json))
    }

    @Test
    fun contactSafeCare_hasNoBroadcastContent() {
        val json =
            """{"profileKind":"contact_safe_care","displayName":"김진현","matched":false}"""
        assertFalse(VlueAuthMemberPopupPolicy.hasBroadcastShowcaseContent(json))
    }

    @Test
    fun unverifiedResolved_isDetected() {
        val json =
            """{"matched":false,"is_verified":false,"source":"unmatched","profileKind":"unverified","phoneE164":"+821012345678"}"""
        assertTrue(VlueAuthMemberPopupPolicy.isUnverifiedResolved(json))
        assertFalse(VlueAuthMemberPopupPolicy.hasBroadcastShowcaseContent(json))
    }

    @Test
    fun lookupPending_isNotUnverifiedResolved() {
        val json =
            """{"matched":false,"is_verified":false,"profileKind":"lookup_pending"}"""
        assertFalse(VlueAuthMemberPopupPolicy.isUnverifiedResolved(json))
    }
}
