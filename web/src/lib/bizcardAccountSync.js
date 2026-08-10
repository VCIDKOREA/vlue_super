import { fetchB2bMembershipUiContext } from "./b2bEnterpriseApi.js";
import {
  fetchDigitalCardMeta,
  needsDigitalCardLocalRestore,
  restoreDigitalCardFromServer
} from "./digitalCardApi.js";
import { formatPhoneE164ForKoreaDisplay } from "./phoneDisplay.js";
import { normalizeMembershipKind } from "./membershipBm.js";

export const DIGITAL_CARD_ACTIVE_KEY = "vlue_digital_card_active";
/** 쇼케이스에 DCC(디지털인증명함) 송출 — 발급(active)과 별개 */
export const DCC_BROADCAST_KEY = "vlue_dcc_broadcast_on";
export const DCC_BROADCAST_CHANGED_EVENT = "vlue-dcc-broadcast-changed";
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

/** 명함 신청(또는 서버 발급) 완료 시에만 true — 온보딩 완료만으로는 켜지지 않음 */
export function readDigitalCardActive() {
  try {
    return localStorage.getItem(DIGITAL_CARD_ACTIVE_KEY) === "1";
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

/**
 * 쇼케이스 DCC 송출 ON/OFF (명함 발급 여부와 독립).
 * 미설정이면 발급된 경우 ON.
 */
export function readDccBroadcastOn() {
  try {
    const v = localStorage.getItem(DCC_BROADCAST_KEY);
    if (v === "0") return false;
    if (v === "1") return true;
    return readDigitalCardActive();
  } catch {
    return true;
  }
}

export function writeDccBroadcastOn(on) {
  const next = Boolean(on);
  try {
    localStorage.setItem(DCC_BROADCAST_KEY, next ? "1" : "0");
  } catch {
    /* ignore */
  }
  try {
    import("./showcase/showcaseStyleStorage.js")
      .then((m) => {
        try {
          m.writeShowcaseStyle({ includeDigitalCard: next });
        } catch {
          /* ignore */
        }
        try {
          const live = m.readLiveShowcaseStyle();
          if (live) {
            m.writeLiveShowcaseStyle({ ...live, includeDigitalCard: next }, { source: "editor" });
          } else {
            m.writeLiveShowcaseStyle(
              { ...m.readShowcaseStyle(), includeDigitalCard: next },
              { source: "editor" }
            );
          }
        } catch {
          /* ignore */
        }
      })
      .catch(() => {});
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent(DCC_BROADCAST_CHANGED_EVENT, { detail: { on: next } }));
    window.dispatchEvent(new Event("vlue-vcid-changed"));
    window.dispatchEvent(new CustomEvent("vlue-digital-card-changed"));
  } catch {
    /* ignore */
  }
}

/** 서버 hydrate 후 로컬 송출 키를 스타일과 맞춤 (이벤트·스타일 재기록 없음) */
export function syncDccBroadcastKeyFromStyle(style) {
  if (!style || typeof style !== "object") return;
  try {
    const next = style.includeDigitalCard === false ? "0" : "1";
    if (localStorage.getItem(DCC_BROADCAST_KEY) === next) return;
    localStorage.setItem(DCC_BROADCAST_KEY, next);
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
export async function syncBizcardAccountFromApi(opts = {}) {
  const force = Boolean(opts.force);
  /* 재설치·빈 로컬이면 반드시 full snapshot 복원 (lite 는 사진·이메일 생략) */
  const restoreNeeded = force || needsDigitalCardLocalRestore();

  const [ctx, meta] = await Promise.all([
    fetchB2bMembershipUiContext().catch(() => null),
    restoreNeeded
      ? restoreDigitalCardFromServer({ force: true }).catch(() => ({ issued: false, cardId: null }))
      : fetchDigitalCardMeta({ force, lite: true }).catch(() => ({ issued: false, cardId: null }))
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
      if (name && (force || !localStorage.getItem("vlue_legal_name"))) {
        localStorage.setItem("vlue_legal_name", name);
      }
    } catch {
      /* ignore */
    }
  }

  if (meta?.issued && meta?.cardId) {
    try {
      localStorage.setItem(DIGITAL_CARD_ACTIVE_KEY, "1");
    } catch {
      /* ignore */
    }
  } else if (force) {
    try {
      localStorage.setItem(DIGITAL_CARD_ACTIVE_KEY, "0");
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
