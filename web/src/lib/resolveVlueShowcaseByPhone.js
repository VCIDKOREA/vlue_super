import { normalizeLetteringCard } from "./letteringCardNormalize.js";
import { formatLetteringPhoneDisplay, normalizePhoneDigits } from "./letteringPhoneMatch.js";
import { isPaidLetteringTier } from "./letteringMembership.js";
import { resolveVlueShowcaseCard } from "./vlueShowcaseCard.js";

/** 데모·로컬 Mock — 번호별 Showcase 페이로드 */
const SHOWCASE_PHONE_MOCK = {
  "01090000003": {
    membershipTier: "premium",
    attachments: [
      {
        id: "contract-draft",
        label: "계약서 초안",
        fileName: "vlue-contract-draft.pdf",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
      }
    ],
    outlinks: {
      instagram: "https://instagram.com/vlue.official",
      youtube: "https://www.youtube.com/@vlue"
    }
  },
  "01012345678": {
    membershipTier: "premium",
    attachments: [],
    outlinks: {
      instagram: "https://instagram.com/vlue.official",
      youtube: "https://www.youtube.com/@vlue"
    }
  }
};

const DEFAULT_FREE_OUTLINKS = {
  instagram: "https://instagram.com/vlue.official",
  youtube: "https://www.youtube.com/@vlue"
};

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

function buildOutlinks(mockExtras = {}) {
  const links = [];
  const ig = String(mockExtras.instagram || "").trim();
  const yt = String(mockExtras.youtube || "").trim();
  if (ig) links.push({ id: "instagram", platform: "instagram", label: "Instagram", url: ig });
  if (yt) links.push({ id: "youtube", platform: "youtube", label: "YouTube 구독", url: yt });
  return links;
}

/**
 * :phone 파라미터 → VLUE Showcase 웹뷰 페이로드
 * resolveVlueShowcaseCard() 재사용 + API/Mock 보강
 */
export async function resolveVlueShowcaseByPhone(phoneRaw) {
  const digits = normalizePhoneDigits(phoneRaw);
  const phoneDisplay = formatLetteringPhoneDisplay(phoneRaw) || phoneRaw || "—";
  const mockExtras = SHOWCASE_PHONE_MOCK[digits] || null;

  const apiHit = await fetchCardFromApi(phoneRaw);
  if (apiHit) {
    const tier = apiHit.card.membershipTier || (mockExtras?.membershipTier ?? "paid");
    return {
      phone: phoneDisplay,
      phoneDigits: digits,
      verified: apiHit.verified,
      source: apiHit.source,
      isPaid: isPaidLetteringTier(tier),
      card: { ...apiHit.card, phone: phoneDisplay, membershipTier: tier },
      attachments: mockExtras?.attachments || [],
      outlinks: buildOutlinks(mockExtras?.outlinks || DEFAULT_FREE_OUTLINKS)
    };
  }

  const tier = mockExtras?.membershipTier || (digits === "01090000003" ? "premium" : "free");
  const base = resolveVlueShowcaseCard({ membershipTier: tier });
  const card = normalizeLetteringCard({
    ...base,
    phone: phoneDisplay,
    membershipTier: tier
  });

  return {
    phone: phoneDisplay,
    phoneDigits: digits,
    verified: true,
    source: mockExtras ? "mock" : "fallback",
    isPaid: isPaidLetteringTier(tier),
    card,
    attachments: mockExtras?.attachments || (tier === "free" ? [] : []),
    outlinks: buildOutlinks(mockExtras?.outlinks || DEFAULT_FREE_OUTLINKS)
  };
}
