/**
 * 통화목록 탭 — 최소 RTT 로 상대 쇼케이스 (by-number 1회 + profile·live 병렬)
 */
import { normalizeLetteringCard } from "./letteringCardNormalize.js";
import { formatLetteringPhoneDisplay } from "./letteringPhoneMatch.js";
import { isPaidLetteringTier } from "./letteringMembership.js";
import { fetchFollowProfile } from "./followApi.js";
import { fetchPeerLiveStylePublic } from "./showcase/showcaseStyleApi.js";
import { createDefaultShowcaseStyle } from "./showcase/showcaseStyleStorage.js";
import { resolveVlueShowcaseByPhone } from "./resolveVlueShowcaseByPhone.js";
import { isNationalAgencyDcpCard } from "./nationalAgencyDcpClient.js";
import { applyShowcaseStyleToCard } from "./showcase/applyShowcaseStyleToCard.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function mergeCardFromProfile(baseCard, profRes) {
  if (!profRes?.ok) return baseCard;
  const profile = profRes.profile || {};
  const exp = profRes.cardExport && typeof profRes.cardExport === "object" ? profRes.cardExport : null;
  const tier = String(
    profile.membershipTier || profRes.membershipTier || baseCard?.membershipTier || "free"
  ).toLowerCase();
  return normalizeLetteringCard({
    ...baseCard,
    name:
      String(exp?.name || profile.displayName || profile.legalName || baseCard?.name || "").trim() ||
      baseCard?.name,
    title: String(exp?.title || profile.jobTitle || baseCard?.title || "").trim(),
    department: String(exp?.department || baseCard?.department || "").trim(),
    organization:
      String(exp?.organization || profile.companyName || baseCard?.organization || "").trim(),
    email: String(exp?.email || baseCard?.email || "").trim(),
    website: String(exp?.website || baseCard?.website || "").trim(),
    fax: String(exp?.fax || baseCard?.fax || "").trim(),
    address: String(profile.address || exp?.address || baseCard?.address || "").trim(),
    photoUrl: String(exp?.photoUrl || profile.photoUrl || baseCard?.photoUrl || "").trim(),
    titlePhotoUrl: String(exp?.titlePhotoUrl || baseCard?.titlePhotoUrl || "").trim(),
    noTitlePhoto: Boolean(exp?.noTitlePhoto ?? baseCard?.noTitlePhoto),
    logoUrl: String(exp?.logoUrl || baseCard?.logoUrl || "").trim(),
    photoFocus: String(exp?.photoFocus || baseCard?.photoFocus || "center").trim(),
    publicHandle: String(profile.publicHandle || baseCard?.publicHandle || "")
      .replace(/^@/, "")
      .trim(),
    membershipTier: tier,
    authCycleEndAt: profRes.authCycleEndAt || baseCard?.authCycleEndAt || null,
    authPaidAt: profRes.authPaidAt || baseCard?.authPaidAt || null,
    cycleEndAt: profRes.authCycleEndAt || baseCard?.cycleEndAt || null
  });
}

function normalizeReplayStyle(style, tier) {
  const base = style && typeof style === "object" ? style : createDefaultShowcaseStyle();
  if (!isPaidLetteringTier(tier)) return base;
  return { ...base, includeDigitalCard: true };
}

/**
 * @param {string} phoneRaw
 * @param {{ force?: boolean, displayName?: string, avatarUrl?: string }} [opts]
 */
export async function resolveCallHistoryShowcasePeer(phoneRaw, opts = {}) {
  const phoneHint = String(phoneRaw || "").trim();
  const phoneDisplay = formatLetteringPhoneDisplay(phoneHint) || phoneHint;

  const byPhone = await resolveVlueShowcaseByPhone(phoneHint);
  if (isNationalAgencyDcpCard(byPhone.card)) {
    const style = createDefaultShowcaseStyle();
    const card = applyShowcaseStyleToCard(
      { ...byPhone.card, phone: phoneDisplay, showcaseStyle: style },
      "paid",
      { peerMode: true, style }
    );
    return { phone: phoneDisplay, verified: true, card, showcaseStyle: style };
  }

  const userId = String(byPhone.card?.userId || "").trim();
  if (!UUID_RE.test(userId)) {
    const style = createDefaultShowcaseStyle();
    const tier = byPhone.card?.membershipTier || "free";
    const card = applyShowcaseStyleToCard(
      {
        ...(byPhone.card || {}),
        phone: phoneDisplay,
        name: byPhone.card?.name || opts.displayName || "",
        membershipTier: tier,
        showcaseStyle: style
      },
      isPaidLetteringTier(tier) ? tier : "free",
      { peerMode: true, style }
    );
    return {
      phone: phoneDisplay,
      verified: Boolean(byPhone.verified),
      card,
      showcaseStyle: style
    };
  }

  const [profRes, live] = await Promise.all([
    fetchFollowProfile(userId, { purpose: "full" }),
    fetchPeerLiveStylePublic(userId, {
      force: Boolean(opts.force),
      number: phoneHint
    })
  ]);

  let merged = mergeCardFromProfile(
    {
      ...byPhone.card,
      userId,
      ownerUserId: userId,
      phone: phoneDisplay,
      photoUrl: byPhone.card?.photoUrl || opts.avatarUrl || "",
      avatarUrl: byPhone.card?.avatarUrl || byPhone.card?.photoUrl || opts.avatarUrl || ""
    },
    profRes
  );

  const tier = merged.membershipTier || "free";
  const peerStyle = normalizeReplayStyle(live || createDefaultShowcaseStyle(), tier);
  const card = applyShowcaseStyleToCard(
    {
      ...merged,
      userId,
      ownerUserId: userId,
      name: merged.name || opts.displayName || "",
      showcaseStyle: peerStyle,
      verificationItems: ["VLUE 인증"]
    },
    isPaidLetteringTier(tier) ? tier : "free",
    { peerMode: true, style: peerStyle }
  );

  return {
    phone: phoneDisplay,
    verified: true,
    card,
    showcaseStyle: peerStyle
  };
}
