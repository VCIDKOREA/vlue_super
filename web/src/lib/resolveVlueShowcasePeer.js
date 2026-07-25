/**
 * 검색·팔로우 피어 쇼케이스 — userId 기준 카드 + 라이브 스타일
 * (로컬 내 쇼케이스/명함을 상대 카드로 넣지 않음)
 */
import { normalizeLetteringCard } from "./letteringCardNormalize.js";
import { formatLetteringPhoneDisplay } from "./letteringPhoneMatch.js";
import { isPaidLetteringTier } from "./letteringMembership.js";
import { fetchFollowProfile } from "./followApi.js";
import { lookupUserByHandle } from "./showcase/showcaseSocialApi.js";
import { fetchPeerShowcaseStyleBundle } from "./showcase/showcaseStyleApi.js";
import { createDefaultShowcaseStyle } from "./showcase/showcaseStyleStorage.js";
import { resolveVlueShowcaseByPhone } from "./resolveVlueShowcaseByPhone.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @param {{
 *   userId?: string,
 *   handle?: string,
 *   phone?: string,
 *   displayName?: string,
 *   membershipTier?: string,
 *   avatarUrl?: string
 * }} input
 */
export async function resolveVlueShowcasePeer(input = {}) {
  let userId = String(input.userId || "").trim();
  const handle = String(input.handle || "")
    .replace(/^@+/, "")
    .trim();
  const phoneHint = String(input.phone || "").trim();

  if (!UUID_RE.test(userId) && handle) {
    const looked = await lookupUserByHandle(handle);
    if (looked.ok && looked.user?.id) userId = String(looked.user.id).trim();
  }

  let phoneDisplay = phoneHint ? formatLetteringPhoneDisplay(phoneHint) || phoneHint : "";
  let tier = String(input.membershipTier || "free").toLowerCase();
  let name = String(input.displayName || "").trim();
  let photoUrl = String(input.avatarUrl || "").trim();
  let organization = "";
  let title = "";
  let department = "";
  let email = "";
  let website = "";
  let fax = "";
  let address = "";
  let publicHandle = handle;
  let logoUrl = "";
  let photoFocus = "center";
  let activityName = "";
  let authCycleEndAt = null;
  let authPaidAt = null;

  if (UUID_RE.test(userId)) {
    const [profRes, styleRes] = await Promise.all([
      fetchFollowProfile(userId),
      fetchPeerShowcaseStyleBundle(userId)
    ]);

    if (profRes.ok) {
      const profile = profRes.profile || {};
      const exp = profRes.cardExport && typeof profRes.cardExport === "object" ? profRes.cardExport : null;

      name =
        String(exp?.name || profile.displayName || profile.legalName || "").trim() ||
        (profile.publicHandle ? `@${String(profile.publicHandle).replace(/^@/, "")}` : "") ||
        name;
      if (profile.phoneE164) {
        phoneDisplay = formatLetteringPhoneDisplay(profile.phoneE164) || phoneDisplay;
      }
      organization =
        String(exp?.organization || profile.companyName || "").trim() || organization;
      title = String(exp?.title || profile.jobTitle || "").trim() || title;
      department = String(exp?.department || "").trim();
      email = String(exp?.email || "").trim();
      website = String(exp?.website || "").trim();
      fax = String(exp?.fax || "").trim();
      address = String(exp?.address || "").trim();
      publicHandle = String(profile.publicHandle || handle || "")
        .replace(/^@/, "")
        .trim();
      logoUrl = String(exp?.logoUrl || "").trim();
      photoFocus = String(exp?.photoFocus || "center").trim() || "center";
      activityName = String(exp?.activityName || "").trim();
      /* photo ≠ logo — 로고를 프로필 사진으로 쓰지 않음 */
      photoUrl =
        String(exp?.photoUrl || profile.photoUrl || photoUrl).trim() || photoUrl;
      if (profile.membershipTier || profRes.membershipTier) {
        tier = String(profile.membershipTier || profRes.membershipTier).toLowerCase();
      }
      authCycleEndAt = profRes.authCycleEndAt || null;
      authPaidAt = profRes.authPaidAt || null;
    }

    const live = styleRes.ok && styleRes.live && typeof styleRes.live === "object" ? styleRes.live : null;
    const showcaseStyle = live || createDefaultShowcaseStyle();

    const card = normalizeLetteringCard({
      userId,
      ownerUserId: userId,
      name,
      title,
      department,
      organization,
      phone: phoneDisplay,
      email,
      website,
      fax,
      address,
      publicHandle,
      loginId: publicHandle,
      handle: publicHandle,
      activityName: activityName || name,
      photoUrl,
      photoFocus,
      logoUrl,
      membershipTier: tier,
      authCycleEndAt,
      authPaidAt,
      cycleEndAt: authCycleEndAt,
      verificationItems: ["VLUE 인증"],
      showcaseStyle
    });

    return {
      phone: phoneDisplay,
      verified: true,
      source: "peer",
      isPaid: isPaidLetteringTier(tier),
      card: {
        ...card,
        userId,
        ownerUserId: userId,
        showcaseStyle,
        photoFocus: card.photoFocus,
        logoUrl: card.logoUrl,
        authCycleEndAt,
        authPaidAt,
        cycleEndAt: authCycleEndAt
      },
      showcaseStyle
    };
  }

  /* userId 없으면 전화 폴백 (검색 히트에 번호가 있을 때만) — 스타일은 로컬 미사용 */
  if (phoneHint) {
    const byPhone = await resolveVlueShowcaseByPhone(phoneHint);
    const uid = String(byPhone.card?.userId || "").trim();
    if (UUID_RE.test(uid)) {
      return resolveVlueShowcasePeer({
        ...input,
        userId: uid,
        phone: byPhone.phone || phoneHint
      });
    }
    const emptyStyle = createDefaultShowcaseStyle();
    return {
      ...byPhone,
      showcaseStyle: emptyStyle,
      card: {
        ...byPhone.card,
        showcaseStyle: emptyStyle
      }
    };
  }

  return {
    phone: phoneDisplay,
    verified: false,
    source: "none",
    isPaid: false,
    showcaseStyle: createDefaultShowcaseStyle(),
    card: normalizeLetteringCard({
      name: name || (handle ? `@${handle}` : ""),
      phone: phoneDisplay,
      publicHandle: handle,
      membershipTier: tier,
      photoUrl
    })
  };
}
