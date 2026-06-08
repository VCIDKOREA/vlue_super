import { fetchB2bMembershipUiContext } from "./b2bEnterpriseApi.js";
import { fetchDigitalCardMeta } from "./digitalCardApi.js";
import { formatPhoneE164ForKoreaDisplay } from "./phoneDisplay.js";
import { normalizeMembershipKind } from "./membershipBm.js";

export const DIGITAL_CARD_ACTIVE_KEY = "vlue_digital_card_active";
export const ONBOARDING_DONE_KEY = "vlue_onboarding_complete_v1";

export function readMembershipTier() {
  try {
    const raw =
      localStorage.getItem("vlue_membership_kind") ||
      localStorage.getItem("vlue_membership_tier") ||
      localStorage.getItem("membershipTier") ||
      "free";
    return normalizeMembershipKind(raw);
  } catch {
    return "free";
  }
}

export function readDigitalCardActive() {
  try {
    const v = localStorage.getItem(DIGITAL_CARD_ACTIVE_KEY);
    if (v === "1") return true;
    if (v === "0") return false;
    return localStorage.getItem(ONBOARDING_DONE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeDigitalCardActive(on) {
  try {
    localStorage.setItem(DIGITAL_CARD_ACTIVE_KEY, on ? "1" : "0");
    window.dispatchEvent(new Event("vlue-vcid-changed"));
    window.dispatchEvent(new CustomEvent("vlue-digital-card-changed"));
  } catch {
    /* ignore */
  }
}

export function readVcidBroadcastOn() {
  try {
    const v = localStorage.getItem("vcid");
    if (v === "false") return false;
    if (v === "true") return true;
    return readDigitalCardActive();
  } catch {
    return false;
  }
}

export function writeVcidBroadcastOn(on) {
  try {
    localStorage.setItem("vcid", String(on));
    window.dispatchEvent(new Event("vlue-vcid-changed"));
  } catch {
    /* ignore */
  }
}

function persistLoginProfileFields(data) {
  if (!data || typeof data !== "object") return;
  try {
    if (data.phoneE164) {
      const display = formatPhoneE164ForKoreaDisplay(data.phoneE164);
      if (display) localStorage.setItem("myCardPhone", display);
      localStorage.setItem("vlue_phone_e164", String(data.phoneE164));
    }
    if (data.legalName) localStorage.setItem("vlue_legal_name", String(data.legalName).trim());
    if (data.enterpriseRole) localStorage.setItem("vlue_enterprise_role", String(data.enterpriseRole));
    if (data.lineType) localStorage.setItem("vlue_line_type", String(data.lineType));
    if (data.membershipKind || data.membershipTier) {
      const tier = normalizeMembershipKind(data.membershipKind || data.membershipTier);
      localStorage.setItem("vlue_membership_kind", tier);
      localStorage.setItem("membershipTier", tier);
    }
  } catch {
    /* ignore */
  }
}

/** 로그인 응답 필드 → 명함 localStorage (웹·앱 공통) */
export function hydrateBizcardFromLoginPayload(data) {
  persistLoginProfileFields(data);
}

/** 웹 명함 설정 진입 시 서버 프로필·기업·명함 메타 동기화 */
export async function syncBizcardAccountFromApi() {
  const [ctx, meta] = await Promise.all([
    fetchB2bMembershipUiContext().catch(() => null),
    fetchDigitalCardMeta().catch(() => ({ issued: false, cardId: null }))
  ]);

  if (ctx?.company?.company_name) {
    try {
      localStorage.setItem("vlue_company_locked", ctx.company.company_name);
      localStorage.setItem("myCardOrganization", ctx.company.company_name);
    } catch {
      /* ignore */
    }
  }

  const cards = Array.isArray(ctx?.business_cards) ? ctx.business_cards : [];
  const primary =
    cards.find((c) => c.kind === "mobile") ||
    cards.find((c) => c.kind === "personal") ||
    cards[0];

  if (primary?.phone_e164) {
    try {
      const display = formatPhoneE164ForKoreaDisplay(primary.phone_e164);
      if (display) localStorage.setItem("myCardPhone", display);
    } catch {
      /* ignore */
    }
  }

  if (primary?.display_name) {
    try {
      const name = String(primary.display_name).trim();
      if (name && !localStorage.getItem("vlue_legal_name")) {
        localStorage.setItem("vlue_legal_name", name);
      }
    } catch {
      /* ignore */
    }
  }

  if (meta?.issued && meta?.cardId) {
    try {
      if (localStorage.getItem(DIGITAL_CARD_ACTIVE_KEY) == null) {
        localStorage.setItem(DIGITAL_CARD_ACTIVE_KEY, "1");
      }
    } catch {
      /* ignore */
    }
  }

  window.dispatchEvent(new CustomEvent("vlue-bizcard-account-synced", { detail: { ctx, meta } }));

  return {
    membershipCtx: ctx,
    digitalMeta: meta,
    businessCards: cards,
    membershipTier: readMembershipTier()
  };
}
