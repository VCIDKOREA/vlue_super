/**
 * 검색·팔로우 피어 쇼케이스 — userId 기준 카드 + 라이브 스타일
 * (로컬 내 쇼케이스/명함을 상대 카드로 넣지 않음)
 */
import { normalizeLetteringCard } from "./letteringCardNormalize.js";
import { formatLetteringPhoneDisplay } from "./letteringPhoneMatch.js";
import { isPaidLetteringTier } from "./letteringMembership.js";
import { fetchFollowProfile } from "./followApi.js";
import { lookupUserByHandle } from "./showcase/showcaseSocialApi.js";
import {
  fetchPeerLiveStylePublic,
  fetchPeerShowcaseStyleBundle
} from "./showcase/showcaseStyleApi.js";
import { createDefaultShowcaseStyle } from "./showcase/showcaseStyleStorage.js";
import { resolveVlueShowcaseByPhone } from "./resolveVlueShowcaseByPhone.js";
import { isNationalAgencyDcpCard } from "./nationalAgencyDcpClient.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function styleHasShowcaseContent(style) {
  if (!style || typeof style !== "object") return false;
  if (Array.isArray(style.pages) && style.pages.some((p) => p && typeof p === "object")) return true;
  if (Array.isArray(style.gallery?.photos) && style.gallery.photos.length > 0) return true;
  return false;
}

function mergePeerLiveStyle(base, live) {
  if (!live || typeof live !== "object") return base;
  if (!base || typeof base !== "object") return live;
  return {
    ...base,
    ...live,
    bgm: live.bgm || base.bgm,
    pages:
      Array.isArray(live.pages) && live.pages.length
        ? live.pages
        : base.pages,
    gallery: live.gallery || base.gallery
  };
}

/**
 * @param {{
 *   userId?: string,
 *   handle?: string,
 *   phone?: string,
 *   displayName?: string,
 *   membershipTier?: string,
 *   avatarUrl?: string,
 *   viewContext?: 'search'|'follow'|'full',
 */
/** 통화기록 스냅샷 userId 오염 시 — 번호 조회가 SoT */
async function reconcilePeerUserIdFromPhone(userId, phoneHint) {
  const phone = String(phoneHint || "").trim();
  if (!phone) return userId;
  const byPhone = await resolveVlueShowcaseByPhone(phone);
  const ownerId = String(byPhone.card?.userId || "").trim();
  if (!UUID_RE.test(ownerId)) return userId;
  if (UUID_RE.test(userId) && userId !== ownerId) return ownerId;
  if (!UUID_RE.test(userId)) return ownerId;
  return userId;
}

export async function resolveVlueShowcasePeer(input = {}) {
  let userId = String(input.userId || "").trim();
  const handle = String(input.handle || "")
    .replace(/^@+/, "")
    .trim();
  const phoneHint = String(input.phone || "").trim();

  userId = await reconcilePeerUserIdFromPhone(userId, phoneHint);

  if (!UUID_RE.test(userId) && handle) {
    const looked = await lookupUserByHandle(handle);
    if (looked.ok && looked.user?.id) userId = String(looked.user.id).trim();
  }

  let phoneDisplay = phoneHint ? formatLetteringPhoneDisplay(phoneHint) || phoneHint : "";
  let tier = String(input.membershipTier || "free").toLowerCase();
  let name = String(input.displayName || "").trim();
  let photoUrl = String(input.avatarUrl || "").trim();
  let titlePhotoUrl = "";
  let noTitlePhoto = false;
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
  let phoneDialEnabled = true;

  if (UUID_RE.test(userId)) {
    const viewContext =
      input.viewContext === "search" || input.viewContext === "follow" ? input.viewContext : "full";
    const [profRes, styleRes] = await Promise.all([
      fetchFollowProfile(userId, { purpose: viewContext }),
      fetchPeerShowcaseStyleBundle(userId, { force: Boolean(input.forceStyle) })
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
      } else if (profile.phoneDisplay) {
        phoneDisplay = String(profile.phoneDisplay).trim() || phoneDisplay;
      }
      if (typeof profile.phoneDialEnabled === "boolean") {
        phoneDialEnabled = profile.phoneDialEnabled;
      } else if (profile.phoneVisible === false) {
        phoneDialEnabled = false;
      }
      organization =
        String(exp?.organization || profile.companyName || "").trim() || organization;
      title = String(exp?.title || profile.jobTitle || "").trim() || title;
      department = String(exp?.department || "").trim();
      email = String(exp?.email || "").trim();
      website = String(exp?.website || "").trim();
      fax = String(exp?.fax || "").trim();
      address = String(profile.address || exp?.address || "").trim() || address;
      publicHandle = String(profile.publicHandle || handle || "")
        .replace(/^@/, "")
        .trim();
      logoUrl = String(exp?.logoUrl || "").trim();
      photoFocus = String(exp?.photoFocus || "center").trim() || "center";
      activityName = String(exp?.activityName || "").trim();
      /* photo ≠ logo — 로고를 프로필 사진으로 쓰지 않음 */
      photoUrl =
        String(exp?.photoUrl || profile.photoUrl || photoUrl).trim() || photoUrl;
      titlePhotoUrl = String(exp?.titlePhotoUrl || "").trim();
      noTitlePhoto = Boolean(exp?.noTitlePhoto);
      if (profile.membershipTier || profRes.membershipTier) {
        tier = String(profile.membershipTier || profRes.membershipTier).toLowerCase();
      }
      authCycleEndAt = profRes.authCycleEndAt || null;
      authPaidAt = profRes.authPaidAt || null;
    }

    let live =
      styleRes.ok && styleRes.live && typeof styleRes.live === "object" ? styleRes.live : null;
    /* 캐시·auth 응답에 콘텐츠 페이지가 없으면 공개 라이브로 한 번 더 보강 */
    if (!styleHasShowcaseContent(live)) {
      const pub = await fetchPeerLiveStylePublic(userId, {
        force: Boolean(input.forceStyle) || !live,
        number: phoneHint
      });
      if (pub && typeof pub === "object") {
        live = mergePeerLiveStyle(live, pub);
      }
    }
    const showcaseStyle = live || createDefaultShowcaseStyle();

    const card = normalizeLetteringCard({
      userId,
      ownerUserId: userId,
      name,
      title,
      department,
      organization,
      phone: phoneDisplay,
      phoneDialEnabled,
      email,
      website,
      fax,
      address,
      publicHandle,
      loginId: publicHandle,
      handle: publicHandle,
      activityName: activityName || name,
      photoUrl,
      titlePhotoUrl,
      noTitlePhoto,
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

  /* userId 없으면 전화 폴백 — 112 등 DCP는 UUID 없이 쇼케이스 */
  if (phoneHint) {
    const byPhone = await resolveVlueShowcaseByPhone(phoneHint);
    if (isNationalAgencyDcpCard(byPhone.card)) {
      const emptyStyle = createDefaultShowcaseStyle();
      return {
        ...byPhone,
        verified: true,
        source: byPhone.source || "national_agency_dcp",
        isPaid: true,
        showcaseStyle: emptyStyle,
        card: {
          ...byPhone.card,
          showcaseStyle: emptyStyle
        }
      };
    }
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
