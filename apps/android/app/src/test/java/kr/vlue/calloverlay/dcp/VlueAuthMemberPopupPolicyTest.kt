package kr.vlue.calloverlay.dcp

import kr.vlue.calloverlay.companion.OverlayState
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class VlueAuthMemberPopupPolicyTest {
    @Test
    fun ringingBigPush_doesNotShowPopup() {
        assertFalse(
            VlueAuthMemberPopupPolicy.shouldShow(OverlayState.BIG_PUSH, popupOnlyTest = false)
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
    fun ceoWithOrgHint_withoutStyleKey_isNotAuthMemberOnly() {
        val json =
            """{"matched":true,"is_verified":true,"displayName":"이종근","digitalCardActive":true,"companyName":"VCID KOREA","logo_url":"https://www.vlue.kr/vlue-brand-logo.svg"}"""
        assertFalse(VlueAuthMemberPopupPolicy.isAuthMemberOnly(json, verified = true))
    }

    @Test
    fun ceoWithBroadcastOnAndContent_isNotAuthMemberOnly() {
        val json =
            """{"matched":true,"is_verified":true,"displayName":"이종근","digitalCardActive":true,"showcaseStyle":{"includeDigitalCard":true},"companyName":"VCID KOREA","logo_url":"https://www.vlue.kr/vlue-brand-logo.svg"}"""
        assertFalse(VlueAuthMemberPopupPolicy.isAuthMemberOnly(json, verified = true))
    }

    @Test
    fun photoOnly_withoutStyleKey_isAuthMemberOnly() {
        /* 프로필 사진만으로 풀 쇼케이스 금지 */
        val json =
            """{"matched":true,"is_verified":true,"displayName":"이종근","phoneE164":"+821080144666","image_url":"https://x/a.png"}"""
        assertTrue(VlueAuthMemberPopupPolicy.isAuthMemberOnly(json, verified = true))
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
    }

    @Test
    fun verifiedBroadcastOffWithOrgHints_isAuthMemberOnly() {
        val json =
            """{"matched":true,"is_verified":true,"displayName":"이상춘","showcaseStyle":{"includeDigitalCard":false},"card":{"organization":"테스트","image_url":"https://x"}}"""
        assertTrue(VlueAuthMemberPopupPolicy.isAuthMemberOnly(json, verified = true))
    }

    @Test
    fun seulgi_emailAndHandle_withoutBroadcast_isAuthMemberOnly() {
        /* rc33 회귀: email+handle+digitalCardActive 로 FULLSCREEN 빈화면 금지 */
        val json =
            """{"matched":true,"is_verified":true,"displayName":"이슬기","publicHandle":"seulgi1","email":"a@b.c","digitalCardActive":true}"""
        assertTrue(VlueAuthMemberPopupPolicy.isAuthMemberOnly(json, verified = true))
    }

    @Test
    fun jeonjungheeBroadcastOn_withPhoto_isNotAuthMemberOnly() {
        val json =
            """{"matched":true,"is_verified":true,"displayName":"전중희","showcaseStyle":{"includeDigitalCard":true},"photoUrl":"https://x/tree.png","email":"test@vlue.kr"}"""
        assertFalse(VlueAuthMemberPopupPolicy.isAuthMemberOnly(json, verified = true))
    }
}
