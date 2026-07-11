import { normalizeLetteringCard } from "./letteringCardNormalize.js";
import { formatLetteringPhoneDisplay, normalizePhoneDigits } from "./letteringPhoneMatch.js";
import { isPaidLetteringTier } from "./letteringMembership.js";

function mapLookupToCard(body, phoneDisplay) {
  const profile = body.profile && typeof body.profile === "object" ? body.profile : {};
  return normalizeLetteringCard({
    name: body.displayName || profile.name || "",
    title: body.jobTitle || profile.title || "",
    organization: body.companyName || profile.organization || "",
    department: profile.department || "",
    phone: phoneDisplay,
    photoUrl: body.image_url || profile.photoUrl || profile.image_url || "",
    website: profile.website || "",
    companyIntro: profile.companyIntro || profile.intro || "",
    membershipTier: body.is_premium_line ? "premium" : "paid",
    verificationItems: ["VLUE 인증 완료", "전화번호 일치 확인"]
  });
}

async function fetchCardFromApi(phoneRaw) {
  try {
    const q = encodeURIComponent(phoneRaw);
    const res = await fetch(`/api/cards/lookup?number=${q}`, { credentials: "same-origin" });
    if (!res.ok) return null;
    const body = await res.json();
    if (!body?.matched) return null;
    const phoneDisplay = formatLetteringPhoneDisplay(phoneRaw);
    return {
      card: mapLookupToCard(body, phoneDisplay),
      verified: Boolean(body.is_verified),
      source: "api"
    };
  } catch {
    return null;
  }
}

/**
 * :phone 파라미터 → VLUE Showcase 웹뷰 페이로드
 * API 매칭만 사용. 미매칭 시 데모/내 명함을 상대 카드로 넣지 않음.
 */
export async function resolveVlueShowcaseByPhone(phoneRaw) {
  const digits = normalizePhoneDigits(phoneRaw);
  const phoneDisplay = formatLetteringPhoneDisplay(phoneRaw) || phoneRaw || "—";

  const apiHit = await fetchCardFromApi(phoneRaw);
  if (apiHit) {
    const tier = apiHit.card.membershipTier || "paid";
    return {
      phone: phoneDisplay,
      phoneDigits: digits,
      verified: apiHit.verified,
      source: apiHit.source,
      isPaid: isPaidLetteringTier(tier),
      card: { ...apiHit.card, phone: phoneDisplay, membershipTier: tier },
      attachments: [],
      outlinks: []
    };
  }

  return {
    phone: phoneDisplay,
    phoneDigits: digits,
    verified: false,
    source: "none",
    isPaid: false,
    card: normalizeLetteringCard({
      name: "",
      phone: phoneDisplay,
      membershipTier: "free"
    }),
    attachments: [],
    outlinks: []
  };
}
