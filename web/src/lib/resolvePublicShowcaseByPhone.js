import { apiUrl } from "../apiBase.js";
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
  let styleRes = await publicGetJson(`/api/lettering/showcase/style/${encodeURIComponent(userId)}`);
  if (!styleRes.ok || !styleRes.data?.live) {
    await new Promise((r) => setTimeout(r, 400));
    styleRes = await publicGetJson(`/api/lettering/showcase/style/${encodeURIComponent(userId)}`);
  }

  const live =
    styleRes.ok && styleRes.data?.live && typeof styleRes.data.live === "object"
      ? styleRes.data.live
      : null;
  const showcaseStyle = live || createDefaultShowcaseStyle();

  const tier = body.is_premium_line
    ? "premium"
    : body.digitalCardActive
      ? "paid"
      : "free";
  const handle = String(body.publicHandle || "").trim().replace(/^@/, "");

  const card = normalizeLetteringCard({
    userId,
    ownerUserId: userId,
    name: body.displayName || "",
    title: body.jobTitle || "",
    organization: body.companyName || "",
    phone: phoneDisplay,
    publicHandle: handle,
    loginId: handle,
    handle,
    photoUrl: body.image_url || "",
    membershipTier: tier,
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
    error: live ? null : "style_empty"
  };
}
