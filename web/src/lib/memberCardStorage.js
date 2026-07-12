/** VLUE 디지털 명함 편집 필드 — localStorage */

export const VLUE_CARD_PROMO_MAX = 120;

export function getDefaultMemberVlueEmail() {
  try {
    const id = String(localStorage.getItem("vlue_server_user_id") || "").trim();
    const hex = id.replace(/-/g, "");
    const significant = hex.replace(/^0+/, "");
    const tail = (significant || hex).slice(-4).padStart(4, "0");
    return `m.${tail.toLowerCase()}@vlue.kr`;
  } catch {
    return "m.guest@vlue.kr";
  }
}

export function getMemberHandle() {
  try {
    const saved = localStorage.getItem("vlue_member_handle");
    if (saved) return saved;
    const id = localStorage.getItem("vlue_server_user_id");
    if (!id) return "@user";
    return `@vlue_${id.replace(/-/g, "").slice(0, 8)}`;
  } catch {
    return "@user";
  }
}

export function getLegalName() {
  try {
    return String(localStorage.getItem("vlue_legal_name") || "").trim();
  } catch {
    return "";
  }
}

const VLUE_NICKNAME_CHAT_KEY = "vlue_nickname_chat";
const VLUE_NICKNAME_FEED_KEY = "vlue_nickname_feed";

/** 채팅 목록·헤더 등에 쓰는 별도 닉네임 (미설정 시 아래 표시 우선순위로 대체) */
export const VLUE_NICKNAME_MAX = 32;

export function readChatNickname() {
  try {
    return String(localStorage.getItem(VLUE_NICKNAME_CHAT_KEY) || "").trim();
  } catch {
    return "";
  }
}

export function readFeedNickname() {
  try {
    return String(localStorage.getItem(VLUE_NICKNAME_FEED_KEY) || "").trim();
  } catch {
    return "";
  }
}

/** 채팅 닉 → 실명 → 명함/기본 표시명 */
export function getChatDisplayName(fallbackName = "") {
  const nick = scrubBrandDisplayName(readChatNickname());
  if (nick) return nick;
  const legal = scrubBrandDisplayName(getLegalName());
  if (legal) return legal;
  const fb = scrubBrandDisplayName(fallbackName);
  return fb || "회원";
}

/** 피드 닉 → 실명 → 기본 표시명 */
export function getFeedDisplayName(fallbackName = "") {
  const nick = scrubBrandDisplayName(readFeedNickname());
  if (nick) return nick;
  const legal = scrubBrandDisplayName(getLegalName());
  if (legal) return legal;
  const fb = scrubBrandDisplayName(fallbackName);
  return fb || "회원";
}

/** 브랜드명(VLUE) 오염 — 사용자 이름으로 취급하지 않음 */
export function isBrandDisplayName(name) {
  const s = String(name || "").trim();
  if (!s) return false;
  return /^vlue$/i.test(s) || /^vlue[\s_-]*official$/i.test(s);
}

export function scrubBrandDisplayName(name) {
  const s = String(name || "").trim();
  if (!s || isBrandDisplayName(s)) return "";
  return s;
}

/**
 * 프로필 패널 헤더용 — 실명/명함 이름 우선 (채팅 닉의 VLUE 오염 제외)
 */
export function getProfileHeaderName(fallbackName = "") {
  try {
    const nick = readChatNickname();
    if (isBrandDisplayName(nick)) {
      localStorage.removeItem(VLUE_NICKNAME_CHAT_KEY);
    }
    const feed = readFeedNickname();
    if (isBrandDisplayName(feed)) {
      localStorage.removeItem(VLUE_NICKNAME_FEED_KEY);
    }
  } catch {
    /* ignore */
  }

  const candidates = [
    getLegalName(),
    fallbackName,
    typeof localStorage !== "undefined" ? localStorage.getItem("myCardDisplayName") : "",
    readChatNickname(),
    readFeedNickname()
  ];
  for (const c of candidates) {
    const s = scrubBrandDisplayName(c);
    if (s) return s;
  }
  return "회원";
}

export function writeDisplayNicknames({ chat, feed } = {}) {
  try {
    if (chat != null) {
      const s = scrubBrandDisplayName(String(chat).trim().slice(0, VLUE_NICKNAME_MAX));
      if (s) localStorage.setItem(VLUE_NICKNAME_CHAT_KEY, s);
      else localStorage.removeItem(VLUE_NICKNAME_CHAT_KEY);
    }
    if (feed != null) {
      const s = scrubBrandDisplayName(String(feed).trim().slice(0, VLUE_NICKNAME_MAX));
      if (s) localStorage.setItem(VLUE_NICKNAME_FEED_KEY, s);
      else localStorage.removeItem(VLUE_NICKNAME_FEED_KEY);
    }
    window.dispatchEvent(new Event("vlue-nicknames-changed"));
  } catch {
    /* ignore */
  }
}

export function readCardFax() {
  try {
    return String(localStorage.getItem("vlue_card_fax") || "").trim();
  } catch {
    return "";
  }
}

export function readCardEmail() {
  try {
    return String(localStorage.getItem("vlue_card_email") || "").trim();
  } catch {
    return "";
  }
}

/** company | personal */
export function readCardEmailKind() {
  try {
    const v = localStorage.getItem("vlue_card_email_kind");
    return v === "personal" ? "personal" : "company";
  } catch {
    return "company";
  }
}

export function readCardPromo() {
  try {
    return String(localStorage.getItem("vlue_card_promo") || "").trim();
  } catch {
    return "";
  }
}

export function writeCardFields({ fax, email, emailKind, promo }) {
  try {
    if (fax != null) localStorage.setItem("vlue_card_fax", String(fax));
    if (email != null) localStorage.setItem("vlue_card_email", String(email).trim());
    if (emailKind === "company" || emailKind === "personal") {
      localStorage.setItem("vlue_card_email_kind", emailKind);
    }
    if (promo != null) localStorage.setItem("vlue_card_promo", String(promo).slice(0, VLUE_CARD_PROMO_MAX));
  } catch {
    /* ignore */
  }
}
