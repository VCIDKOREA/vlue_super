/**
 * 통화목록 탭 — 최소 RTT 로 상대 쇼케이스 (by-number 1회 + profile·live 병렬, 타임아웃)
 */
import { normalizeLetteringCard } from "./letteringCardNormalize.js";
import { formatLetteringPhoneDisplay } from "./letteringPhoneMatch.js";
import { isPaidLetteringTier } from "./letteringMembership.js";
import { fetchFollowProfile, writeFollowStateCache } from "./followApi.js";
import { fetchPeerLiveStylePublic } from "./showcase/showcaseStyleApi.js";
import { createDefaultShowcaseStyle } from "./showcase/showcaseStyleStorage.js";
import { resolveVlueShowcaseByPhone } from "./resolveVlueShowcaseByPhone.js";
import { isNationalAgencyDcpCard } from "./nationalAgencyDcpClient.js";
import { applyShowcaseStyleToCard } from "./showcase/applyShowcaseStyleToCard.js";
import { peerShowcaseBroadcastOn } from "./peerShowcaseContent.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** profile/live 가 길어도 통화목록 탭은 이 안에 반드시 페인트 */
const ENRICH_TIMEOUT_MS = 2800;

function withTimeout(promise, ms, fallback) {
  let timer;
  return Promise.race([
    Promise.resolve(promise).finally(() => {
      if (timer) clearTimeout(timer);
    }),
    new Promise((resolve) => {
      timer = setTimeout(() => resolve(fallback), ms);
    })
  ]);
}

function mergeCardFromProfile(baseCard, profRes) {
  if (!profRes?.ok) return baseCard;
  const profile = profRes.profile || {};
  const exp = profRes.cardExport && typeof profRes.cardExport === "object" ? profRes.cardExport : null;
  const tier = String(
    profile.membershipTier || profRes.membershipTier || baseCard?.membershipTier || "free"
  ).toLowerCase();
  const logoUrl = String(exp?.logoUrl || baseCard?.logoUrl || "").trim();
  const pickPhoto = (...vals) => {
    for (const v of vals) {
      const s = String(v || "").trim();
      if (!s || !/^https:\/\//i.test(s)) continue;
      if (logoUrl && s === logoUrl) continue;
      if (/vlue-brand-logo|vlue-shield|avatar-person-silhouette/i.test(s)) continue;
      return s;
    }
    return "";
  };
  const photoUrl =
    pickPhoto(
      profRes.photoUrl,
      exp?.photoUrl,
      profile.photoUrl,
      baseCard?.photoUrl,
      baseCard?.avatarUrl
    ) || "";
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
    photoUrl,
    avatarUrl: photoUrl || String(baseCard?.avatarUrl || "").trim(),
    titlePhotoUrl: String(exp?.titlePhotoUrl || baseCard?.titlePhotoUrl || "").trim(),
    noTitlePhoto: Boolean(exp?.noTitlePhoto ?? baseCard?.noTitlePhoto),
    logoUrl,
    photoFocus: String(exp?.photoFocus || baseCard?.photoFocus || "center").trim(),
    companyIntro: String(
      exp?.companyIntro || profile.companyIntro || profile.intro || baseCard?.companyIntro || ""
    ).trim(),
    customBackText: String(
      exp?.customBackText ||
        profile.customBackText ||
        profile.backText ||
        baseCard?.customBackText ||
        ""
    ).trim(),
    publicHandle: String(profile.publicHandle || baseCard?.publicHandle || "")
      .replace(/^@/, "")
      .trim(),
    accountType: String(exp?.accountType || baseCard?.accountType || "").trim(),
    bankName: String(exp?.bankName || baseCard?.bankName || "").trim(),
    accountNumber: String(exp?.accountNumber || baseCard?.accountNumber || "").replace(/\D/g, ""),
    accountHolder: String(exp?.accountHolder || baseCard?.accountHolder || "").trim(),
    isGroupVerified:
      exp?.isGroupVerified != null
        ? Boolean(exp.isGroupVerified)
        : Boolean(baseCard?.isGroupVerified),
    membershipTier: tier,
    authCycleEndAt: profRes.authCycleEndAt || baseCard?.authCycleEndAt || null,
    authPaidAt: profRes.authPaidAt || baseCard?.authPaidAt || null,
    cycleEndAt: profRes.authCycleEndAt || baseCard?.cycleEndAt || null
  });
}

function authOnlyReplayStyle() {
  return {
    ...createDefaultShowcaseStyle(),
    includeDigitalCard: false,
    verifiedBadgeOn: true
  };
}

function normalizeReplayStyle(style) {
  if (!style || typeof style !== "object") return authOnlyReplayStyle();
  return style;
}

/**
 * @param {string} phoneRaw
 * @param {{ force?: boolean, displayName?: string, avatarUrl?: string, light?: boolean }} [opts]
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
    const style = authOnlyReplayStyle();
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
      verified: false,
      card,
      showcaseStyle: style
    };
  }

  /* light: by-number 만 — 목록 예열용. profile/live 는 탭 시에만 */
  if (opts.light) {
    const snapStyle =
      byPhone.card?.showcaseStyle && typeof byPhone.card.showcaseStyle === "object"
        ? normalizeReplayStyle(byPhone.card.showcaseStyle)
        : authOnlyReplayStyle();
    const tier = byPhone.card?.membershipTier || "free";
    const card = applyShowcaseStyleToCard(
      {
        ...byPhone.card,
        userId,
        ownerUserId: userId,
        phone: phoneDisplay,
        name: byPhone.card?.name || opts.displayName || "",
        showcaseStyle: snapStyle,
        verificationItems: ["VLUÉ 인증"]
      },
      isPaidLetteringTier(tier) ? tier : "free",
      { peerMode: true, style: snapStyle }
    );
    return {
      phone: phoneDisplay,
      verified: true,
      card,
      showcaseStyle: snapStyle
    };
  }

  const [profRes, live] = await Promise.all([
    withTimeout(
      fetchFollowProfile(userId, { purpose: "follow" }),
      ENRICH_TIMEOUT_MS,
      null
    ),
    withTimeout(
      fetchPeerLiveStylePublic(userId, {
        force: Boolean(opts.force),
        number: phoneHint
      }),
      ENRICH_TIMEOUT_MS,
      null
    )
  ]);

  if (profRes?.ok && profRes.follow?.relation) {
    writeFollowStateCache(userId, profRes.follow);
  }

  let merged = mergeCardFromProfile(
    {
      ...byPhone.card,
      userId,
      ownerUserId: userId,
      phone: phoneDisplay,
      photoUrl: byPhone.card?.photoUrl || "",
      avatarUrl: byPhone.card?.avatarUrl || byPhone.card?.photoUrl || ""
    },
    profRes
  );
  const seedAvatar = String(opts.avatarUrl || "").trim();
  if (
    !merged.photoUrl &&
    /^https:\/\//i.test(seedAvatar) &&
    !/vlue-brand-logo|vlue-shield/i.test(seedAvatar)
  ) {
    merged = { ...merged, photoUrl: seedAvatar, avatarUrl: seedAvatar };
  }

  const tier = merged.membershipTier || "free";
  let peerStyle =
    live && typeof live === "object" ? normalizeReplayStyle(live) : authOnlyReplayStyle();
  if (
    peerShowcaseBroadcastOn(peerStyle) &&
    !(Array.isArray(peerStyle.pages) && peerStyle.pages.some((p) => p && typeof p === "object")) &&
    byPhone.card?.showcaseStyle &&
    typeof byPhone.card.showcaseStyle === "object"
  ) {
    const snap = byPhone.card.showcaseStyle;
    peerStyle = normalizeReplayStyle({
      ...peerStyle,
      pages: snap.pages || peerStyle.pages,
      gallery: snap.gallery || peerStyle.gallery,
      bgm: snap.bgm || peerStyle.bgm,
      includeDigitalCard: peerStyle.includeDigitalCard
    });
  }
  const card = applyShowcaseStyleToCard(
    {
      ...merged,
      userId,
      ownerUserId: userId,
      name: merged.name || opts.displayName || "",
      showcaseStyle: peerStyle,
      verificationItems: ["VLUÉ 인증"]
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
