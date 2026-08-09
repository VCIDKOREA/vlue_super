/** 실사용자 명함에 섞이면 안 되는 데모·플랫폼 예시 값 */

const POLLUTED_EMAILS = new Set([
  "vcid@vlue.kr",
  "ceo@vlue.kr",
  "hgildong@sam-life.co.kr",
  "user@vlue.kr"
]);

const POLLUTED_WEBSITES = new Set([
  "vlue.kr",
  "www.vlue.kr",
  "https://www.vlue.kr",
  "http://www.vlue.kr",
  "https://vlue.kr",
  "http://vlue.kr",
  "samsunglife.com",
  "https://samsunglife.com",
  "http://samsunglife.com"
]);

const POLLUTED_ORGS = new Set(["VCID KOREA", "삼성생명"]);

const POLLUTED_ADDRESS_RE = [
  /경북\s*구미시\s*인동/i,
  /삼성생명/i,
  /종로구\s*세종대로/i
];

const POLLUTED_COPY_RE = [
  /보이스피싱/i,
  /사칭사기/i,
  /재산과 개인정보/i,
  /모르는 번호에 속지 마라/i
];

function isPlatformCeoHandle() {
  try {
    return (
      String(localStorage.getItem("vlue_member_handle") || "")
        .trim()
        .toLowerCase()
        .replace(/^@/, "") === "ceo"
    );
  } catch {
    return false;
  }
}

function normalizeWebsiteKey(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\/+$/, "");
}

function isPollutedAddress(raw) {
  const v = String(raw || "").trim();
  if (!v) return false;
  return POLLUTED_ADDRESS_RE.some((re) => re.test(v));
}

function isPollutedCopy(raw) {
  const v = String(raw || "").trim();
  if (!v) return false;
  return POLLUTED_COPY_RE.some((re) => re.test(v));
}

function isCeoSubjectCard(card = {}) {
  const handle = String(
    card.publicHandle || card.loginId || card.handle || card.vlueId || card.memberHandle || ""
  )
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
  if (handle === "ceo") return true;
  const email = String(card.email || "").trim().toLowerCase();
  if (email === "ceo@vlue.kr") return true;
  const phone = String(card.phone || card.phoneE164 || "").replace(/\D/g, "");
  return phone === "821080144666" || phone === "01080144666";
}

/**
 * ceo 외 계정 — 데모·플랫폼 예시로 채워진 필드를 빈 칸으로 되돌림.
 * 카드 주체가 CEO 이면(상대 쇼케이스 송출) 절대 지우지 않음.
 * @param {Record<string, unknown>} card
 * @param {{ isCeo?: boolean }} [opts]
 */
export function scrubLetteringDemoPollution(card = {}, opts = {}) {
  const isCeo = opts.isCeo ?? (isCeoSubjectCard(card) || isPlatformCeoHandle());
  if (isCeo) return { ...card };

  const next = { ...card };
  const email = String(next.email || "").trim().toLowerCase();
  if (POLLUTED_EMAILS.has(email)) next.email = "";

  const website = normalizeWebsiteKey(next.website);
  if (POLLUTED_WEBSITES.has(website)) next.website = "";

  const org = String(next.organization || next.companyName || "").trim();
  if (POLLUTED_ORGS.has(org)) {
    next.organization = "";
    next.companyName = "";
  }

  if (isPollutedAddress(next.address)) next.address = "";
  if (isPollutedAddress(next.addressRoad)) next.addressRoad = "";
  if (isPollutedAddress(next.roadAddress)) next.roadAddress = "";
  if (isPollutedAddress(next.businessAddress)) next.businessAddress = "";

  if (isPollutedCopy(next.customBackText)) next.customBackText = "";
  if (isPollutedCopy(next.promo)) next.promo = "";
  if (isPollutedCopy(next.companyIntro)) next.companyIntro = "";
  if (isPollutedCopy(next.backNote)) next.backNote = "";
  if (isPollutedCopy(next.introBack)) next.introBack = "";

  const title = String(next.title || "").trim();
  if (title === "CEO" || title === "대리") next.title = "";

  const dept = String(next.department || "").trim();
  if (dept === "보안설계영업팀" || dept.includes("보안설계")) next.department = "";

  return next;
}

/** localStorage 편집 필드에서 데모 오염 제거 (ceo 제외) */
export function scrubLetteringEditablePollution(ed = {}, opts = {}) {
  return scrubLetteringDemoPollution(ed, opts);
}
