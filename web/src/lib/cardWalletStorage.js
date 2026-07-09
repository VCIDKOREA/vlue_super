/** VLUE 명함 지갑 — localStorage + 탭 간 동기 이벤트 */

export const CARD_WALLET_STORAGE_KEY = "vlue_card_wallet";

export function readCardWallet() {
  try {
    const raw = localStorage.getItem(CARD_WALLET_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCardWallet(items) {
  try {
    localStorage.setItem(CARD_WALLET_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("vlue-card-wallet-changed"));
  } catch {
    /* ignore */
  }
}

/** 통화 쇼케이스 스크랩(업체 저장하기) 항목 여부 */
export function isShowcaseScrapWalletItem(item) {
  if (!item || typeof item !== "object") return false;
  if (item.source === "showcase_scrap") return true;
  return String(item.userId || "").startsWith("showcase-");
}

/** 명함저장 / 저장된케이스 분리 */
export function partitionCardWallet(wallet = []) {
  const showcases = [];
  const received = [];
  for (const item of wallet) {
    if (isShowcaseScrapWalletItem(item)) showcases.push(item);
    else received.push(item);
  }
  return { showcases, received };
}

/** 지갑 행 + 최신 프로필(있으면) 병합 — 오프라인/삭제된 방에도 저장 명함 표시 */
export function resolveWalletProfile(item, profileByRoomId) {
  const live = profileByRoomId[item.userId];
  const snap = item.snapshot && typeof item.snapshot === "object" ? item.snapshot : {};
  if (live) {
    return { ...snap, ...live, userId: item.userId };
  }
  if (Object.keys(snap).length > 0) {
    return {
      userId: item.userId,
      membershipTier: snap.membershipTier || "free",
      organization: snap.organization || "",
      title: snap.title || "",
      name: snap.name || "",
      phone: snap.phone || "",
      introBack: snap.introBack || "",
      legalName: snap.legalName || "",
      logoUrl: snap.logoUrl || "",
      email: snap.email || "",
      address: snap.address || "",
      landline: snap.landline || "",
      fax: snap.fax || "",
      backNote: snap.backNote || "",
      digitalCardId: snap.digitalCardId || "",
      vcidLettering: snap.vcidLettering !== false
    };
  }
  return {
    userId: item.userId,
    membershipTier: "free",
    organization: "",
    title: "",
    name: "",
    phone: "",
    introBack: "저장 시점 정보가 없습니다. 채팅에서 다시 저장해 주세요.",
    legalName: "",
    logoUrl: ""
  };
}

export function buildCardSnapshot(card) {
  if (!card || typeof card !== "object") return {};
  return {
    organization: String(card.organization || "").trim(),
    title: String(card.title || "").trim(),
    department: String(card.department || "").trim(),
    name: String(card.name || "").trim(),
    phone: String(card.phone || "").trim(),
    address: String(card.address || "").trim(),
    landline: String(card.landline || "").trim(),
    fax: String(card.fax || "").trim(),
    introBack: String(card.introBack || "").trim(),
    backNote: String(card.backNote || "").trim(),
    legalName: String(card.legalName || "").trim(),
    logoUrl: String(card.logoUrl || "").trim(),
    email: String(card.email || "").trim(),
    digitalCardId: String(card.digitalCardId || card.digital_card_id || "").trim(),
    membershipTier: card.membershipTier === "premium" || card.membershipTier === "standard" ? card.membershipTier : "free",
    vcidLettering: card.vcidLettering !== false
  };
}
