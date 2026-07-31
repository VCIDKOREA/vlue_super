import { apiUrl } from "./apiBase.js";
import { formatLetteringPhoneDisplay, normalizePhoneDigits } from "./letteringPhoneMatch.js";
import { normalizeLetteringCard } from "./letteringCardNormalize.js";
import { isPaidLetteringTier } from "./letteringMembership.js";
import { createDefaultShowcaseStyle } from "./showcase/showcaseStyleStorage.js";

/**
 * 공개 쇼케이스(미가입·카톡 링크)용 — 인증 헤더 없이 GET.
 * vlueAuthHeaders 의 Content-Type 이 붙으면 일부 WebView 에서 실패할 수 있어 분리.
 */
async function publicGetJson(path) {
  const url = apiUrl(path);
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "omit",
    cache: "no-store"
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function httpMediaUrl(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (s.startsWith("data:") || s.startsWith("blob:")) return "";
  if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("/")) return s;
  return "";
}

/**
 * /api/follow/profile — 게스트도 디지털 인증명함 송출 스냅샷(cardExport) 포함
 * @param {string} userId
 */
async function fetchPublicCardExport(userId) {
  const id = String(userId || "").trim();
  if (!id) return null;
  const res = await publicGetJson(`/api/follow/profile/${encodeURIComponent(id)}`);
  if (!res.ok || !res.data?.ok) return null;
  const exp =
    res.data.cardExport && typeof res.data.cardExport === "object" ? res.data.cardExport : null;
  const photoUrl =
    httpMediaUrl(exp?.photoUrl) ||
    httpMediaUrl(res.data.photoUrl) ||
    httpMediaUrl(res.data.profile?.photoUrl);
  return {
    photoUrl,
    logoUrl: httpMediaUrl(exp?.logoUrl),
    name: String(exp?.name || res.data.profile?.displayName || "").trim(),
    organization: String(exp?.organization || res.data.profile?.companyName || "").trim(),
    title: String(exp?.title || res.data.profile?.jobTitle || "").trim(),
    department: String(exp?.department || "").trim(),
    email: String(exp?.email || "").trim(),
    website: String(exp?.website || "").trim(),
    fax: String(exp?.fax || "").trim(),
    address: String(exp?.address || "").trim(),
    activityName: String(exp?.activityName || "").trim(),
    photoFocus: exp?.photoFocus || "center",
    membershipTier: String(
      res.data.membershipTier || res.data.profile?.membershipTier || ""
    ).toLowerCase(),
    digitalCardIssued: Boolean(res.data.digitalCardIssued),
    authCycleEndAt: res.data.authCycleEndAt || null,
    authPaidAt: res.data.authPaidAt || null
  };
}

/**
 * 전화번호 → 공개 쇼케이스 페이로드 (게스트 열람)
 * @param {string} phoneRaw
 */
export async function resolvePublicShowcaseByPhone(phoneRaw) {
  const digits = normalizePhoneDigits(phoneRaw);
  const phoneDisplay = formatLetteringPhoneDisplay(phoneRaw) || phoneRaw || "—";
  const local = digits.startsWith("82") && digits.length >= 10 ? `0${digits.slice(2)}` : digits;
  const lookupNumber = local || digits || String(phoneRaw || "").replace(/\D/g, "");

  if (!lookupNumber) {
    return {
      phone: phoneDisplay,
      verified: false,
      source: "none",
      isPaid: false,
      showcaseStyle: createDefaultShowcaseStyle(),
      card: normalizeLetteringCard({ phone: phoneDisplay, membershipTier: "free" }),
      error: "invalid_phone"
    };
  }

  const lookup = await publicGetJson(
    `/api/cards/lookup?number=${encodeURIComponent(lookupNumber)}`
  );
  const body = lookup.ok ? lookup.data : null;
  if (!body?.matched || !body.userId) {
    return {
      phone: phoneDisplay,
      verified: false,
      source: "none",
      isPaid: false,
      showcaseStyle: createDefaultShowcaseStyle(),
      card: normalizeLetteringCard({ phone: phoneDisplay, membershipTier: "free" }),
      error: lookup.ok ? "not_matched" : "lookup_failed"
    };
  }

  const userId = String(body.userId).trim();

  const [styleResFirst, exportSnap] = await Promise.all([
    publicGetJson(`/api/lettering/showcase/style/${encodeURIComponent(userId)}`),
    fetchPublicCardExport(userId)
  ]);

  let styleRes = styleResFirst;
  if (!styleRes.ok || !styleRes.data?.live) {
    await new Promise((r) => setTimeout(r, 400));
    styleRes = await publicGetJson(`/api/lettering/showcase/style/${encodeURIComponent(userId)}`);
  }

  const live =
    styleRes.ok && styleRes.data?.live && typeof styleRes.data.live === "object"
      ? styleRes.data.live
      : null;
  const showcaseStyle = live || createDefaultShowcaseStyle();

  const tierFromLookup = body.is_premium_line
    ? "premium"
    : body.digitalCardActive || exportSnap?.digitalCardIssued
      ? "paid"
      : "free";
  const tier = exportSnap?.membershipTier || tierFromLookup;
  const handle = String(body.publicHandle || "").trim().replace(/^@/, "");

  const card = normalizeLetteringCard({
    userId,
    ownerUserId: userId,
    name: exportSnap?.name || body.displayName || "",
    title: exportSnap?.title || body.jobTitle || "",
    department: exportSnap?.department || "",
    organization: exportSnap?.organization || body.companyName || "",
    phone: phoneDisplay,
    email: exportSnap?.email || "",
    website: exportSnap?.website || "",
    fax: exportSnap?.fax || "",
    address: exportSnap?.address || "",
    activityName: exportSnap?.activityName || "",
    publicHandle: handle,
    loginId: handle,
    handle,
    photoUrl: exportSnap?.photoUrl || body.image_url || "",
    photoFocus: exportSnap?.photoFocus || "center",
    logoUrl: exportSnap?.logoUrl || "",
    membershipTier: tier,
    authCycleEndAt: exportSnap?.authCycleEndAt || null,
    authPaidAt: exportSnap?.authPaidAt || null,
    cycleEndAt: exportSnap?.authCycleEndAt || null,
    verificationItems: ["VLUE 인증"],
    showcaseStyle
  });

  return {
    phone: phoneDisplay,
    verified: Boolean(body.is_verified),
    source: "public",
    isPaid: isPaidLetteringTier(tier),
    showcaseStyle,
    card: {
      ...card,
      userId,
      ownerUserId: userId,
      showcaseStyle
    },
    styleLoaded: Boolean(live),
    cardExportLoaded: Boolean(exportSnap?.photoUrl || exportSnap?.email || exportSnap?.name),
    error: live ? null : "style_empty"
  };
}
