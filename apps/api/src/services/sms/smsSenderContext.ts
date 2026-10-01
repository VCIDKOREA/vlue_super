import { prisma } from "../../db/client.js";
import { normalizeToE164KR } from "../../lib/phoneE164.js";
import { searchKakaoLocalDetailed } from "../../integrations/kakao/kakaoLocalSearch.js";
import { searchNaverLocalList } from "../../integrations/naver/naverLocalSearch.js";
import { findSmallBusinessStore } from "../../integrations/publicData/smallBusinessStoreSearch.js";
import { lookupPublicDirectoryByPhone } from "../search/publicDirectoryService.js";

export type SenderBand = "international" | "internet" | "virtual" | "mobile" | "landline" | "tollfree" | "unknown";
export type SenderBadge = "safe" | "suspect" | "phishing";

export type SmsLookupHit = {
  status: "matched" | "miss" | "unavailable";
  name: string;
  category: string;
  note: string;
};

export type SmsSenderContext = {
  ok: true;
  phone: string;
  band: SenderBand;
  bandLabel: string;
  badge: SenderBadge;
  escalate: "SAFE" | "SUSPICIOUS" | "DANGER";
  dangerFloor: number;
  reason: string;
  impersonation: boolean;
  smishingUrl: boolean;
  lookups: {
    reports: { total: number; phishing: number; reasons: string[] };
    directory: SmsLookupHit;
    kakao: SmsLookupHit;
    naver: SmsLookupHit;
    publicData: SmsLookupHit;
  };
};

const PHISHING_REASONS = new Set([
  "impersonation_vishing",
  "illegal_gambling",
  "illegal_loan_fraud",
  "smishing_malware",
  "fraud"
]);

const REASON_LABELS: Record<string, string> = {
  impersonation_vishing: "사칭·보이스피싱",
  illegal_gambling: "불법 도박",
  illegal_loan_fraud: "불법 대출·금융사기",
  smishing_malware: "스미싱",
  fraud: "사기·피싱",
  spam: "스팸",
  abuse: "욕설·협박"
};

const IMPERSONATION_RE =
  /우체국|경찰|검찰|국세|세무서|택배|배송조회|배송|청첩장|과태료|법원|건강보험|국민건강|관세|금융감독|은행|카드사|대출|계좌이체|송금|결제요청/i;

const SHORT_URL_RE = /(?:bit\.ly|vo\.la|me2\.do|han\.gl|url\.kr|cutt\.ly|gg\.gg|t\.ly|buly\.kr)\//i;

function digitsOnly(raw: string) {
  return String(raw || "").replace(/\D/g, "");
}

function phonesMatch(left: string, right: string) {
  const a = digitsOnly(left);
  const b = digitsOnly(right);
  if (a.length < 8 || b.length < 8) return false;
  const norm = (value: string) => (value.startsWith("82") ? value.slice(2).replace(/^0/, "") : value.replace(/^0/, ""));
  return norm(a) === norm(b);
}

export function classifySender(raw: string): { band: SenderBand; bandLabel: string; digits: string } {
  const digits = digitsOnly(raw);
  const trimmed = String(raw || "").trim();
  const internationalPrefix = /^(00[1235678]|00700)/.test(digits);
  const plusForeign = trimmed.startsWith("+") && !trimmed.startsWith("+82");
  if (internationalPrefix || plusForeign) {
    const prefix = digits.slice(0, 3);
    const known = ["001", "002", "003", "005", "006", "007", "008"].find((item) => digits.startsWith(item));
    return {
      band: "international",
      bandLabel: known ? `국제전화 ${known} 대역` : "국외발신 대역",
      digits
    };
  }
  if (digits.startsWith("070")) return { band: "internet", bandLabel: "070 인터넷전화", digits };
  if (digits.startsWith("050")) return { band: "virtual", bandLabel: "050 안심·가상번호", digits };
  if (digits.startsWith("080") || digits.startsWith("060")) {
    return { band: "tollfree", bandLabel: digits.startsWith("080") ? "080 수신거부" : "060 정보이용료", digits };
  }
  if (digits.startsWith("010") || digits.startsWith("011") || digits.startsWith("016") || digits.startsWith("017") || digits.startsWith("018") || digits.startsWith("019")) {
    return { band: "mobile", bandLabel: "일반 010 이동전화", digits };
  }
  if (/^0(2|3[1-3]|4[1-4]|5[1-5]|6[1-4])/.test(digits)) {
    return { band: "landline", bandLabel: "시내·지역 유선", digits };
  }
  return { band: "unknown", bandLabel: digits ? "일반 발신번호" : "발신번호 없음", digits };
}

function hasSmishingUrl(text: string) {
  if (SHORT_URL_RE.test(text)) return true;
  return /https?:\/\/(?!(?:www\.)?(?:[a-z0-9-]+\.)*(?:go\.kr|or\.kr|korea\.kr|epost\.kr|gov|bank|kftc\.or\.kr))/i.test(text) &&
    IMPERSONATION_RE.test(text);
}

function searchQuery(raw: string, digits: string, band: SenderBand) {
  if (band === "international") return digits || raw.trim();
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10 && digits.startsWith("02")) return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return raw.trim() || digits;
}

function miss(note = ""): SmsLookupHit {
  return { status: "miss", name: "", category: "", note };
}

function unavailable(note: string): SmsLookupHit {
  return { status: "unavailable", name: "", category: "", note };
}

function matched(name: string, category: string): SmsLookupHit {
  return { status: "matched", name, category, note: "" };
}

async function withTimeout<T>(work: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work.catch(() => fallback),
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function composeReason(input: {
  band: SenderBand;
  bandLabel: string;
  impersonation: boolean;
  smishingUrl: boolean;
  reportPhishing: number;
  reportTotal: number;
  mismatch: boolean;
  knownName: string;
}) {
  const bits: string[] = [];
  if (input.reportPhishing > 0) bits.push("VLUÉ에 스미싱·사기 신고 이력이 있는 번호");
  else if (input.reportTotal > 0) bits.push("VLUÉ 신고 이력이 있는 번호");
  if (input.impersonation && input.band === "mobile") {
    bits.push("기관·택배·금융 안내를 일반 010 번호로 보냈습니다");
  } else if (input.impersonation && input.band === "international") {
    bits.push(`기관·택배·금융 안내가 ${input.bandLabel}으로 왔습니다`);
  } else if (input.impersonation && (input.band === "internet" || input.band === "virtual")) {
    bits.push(`기관·택배·금융 안내가 ${input.bandLabel}으로 왔습니다`);
  }
  if (input.smishingUrl) bits.push("스미싱으로 의심되는 주소가 본문에 있습니다");
  if (input.mismatch) bits.push("문자 내용과 조회된 상호가 다릅니다");
  if (bits.length) return `${bits.join(". ")}.`;
  if (input.knownName) return `${input.knownName}으로 조회되는 번호입니다.`;
  return "발신번호와 본문에서 사칭·신고 징후는 보이지 않습니다.";
}

export function judgeSenderSignals(input: {
  rawPhone: string;
  messageText: string;
  reports: { total: number; phishing: number; reasons: string[] };
  directory: SmsLookupHit;
  kakao: SmsLookupHit;
  naver: SmsLookupHit;
  publicData: SmsLookupHit;
}): Pick<SmsSenderContext, "band" | "bandLabel" | "badge" | "escalate" | "dangerFloor" | "reason" | "impersonation" | "smishingUrl"> {
  const classified = classifySender(input.rawPhone);
  const text = String(input.messageText || "");
  const impersonation = IMPERSONATION_RE.test(text);
  const smishingUrl = hasSmishingUrl(text);
  const known = [input.directory, input.kakao, input.naver, input.publicData].find((row) => row.status === "matched");
  const knownName = known?.name || "";
  const claimsAgency = /우체국|경찰|검찰|국세|세무서|법원|건강보험|은행/.test(text);
  const mismatch = Boolean(knownName) && claimsAgency && !text.replace(/\s/g, "").includes(knownName.replace(/\s/g, "").slice(0, 4));
  const personalImpersonation =
    impersonation && (classified.band === "mobile" || classified.band === "international" || classified.band === "internet" || classified.band === "virtual");
  const highest = personalImpersonation && (classified.band === "mobile" || classified.band === "international");

  let badge: SenderBadge = "safe";
  let dangerFloor = 8;
  if (highest || (personalImpersonation && (smishingUrl || input.reports.phishing > 0)) || (smishingUrl && input.reports.phishing > 0)) {
    badge = "phishing";
    dangerFloor = 98;
  } else if (personalImpersonation || smishingUrl || input.reports.phishing > 0 || mismatch) {
    badge = "phishing";
    dangerFloor = input.reports.phishing > 0 || smishingUrl ? 90 : 86;
  } else if (input.reports.total > 0 || classified.band === "international" || classified.band === "virtual") {
    badge = "suspect";
    dangerFloor = 58;
  }

  const escalate = badge === "phishing" ? "DANGER" : badge === "suspect" ? "SUSPICIOUS" : "SAFE";
  return {
    band: classified.band,
    bandLabel: classified.bandLabel,
    badge,
    escalate,
    dangerFloor,
    impersonation,
    smishingUrl,
    reason: composeReason({
      band: classified.band,
      bandLabel: classified.bandLabel,
      impersonation: personalImpersonation,
      smishingUrl,
      reportPhishing: input.reports.phishing,
      reportTotal: input.reports.total,
      mismatch,
      knownName: badge === "safe" ? knownName : ""
    })
  };
}

async function loadReports(raw: string) {
  const empty = { total: 0, phishing: 0, reasons: [] as string[] };
  const e164 = normalizeToE164KR(raw);
  if (!e164) return empty;
  const rows = await prisma.letteringPhoneReport.findMany({
    where: { phoneE164: e164 },
    select: { reasonId: true },
    take: 40,
    orderBy: { createdAt: "desc" }
  });
  const reasons = [...new Set(rows.map((row) => REASON_LABELS[row.reasonId] || row.reasonId))].slice(0, 4);
  return {
    total: rows.length,
    phishing: rows.filter((row) => PHISHING_REASONS.has(row.reasonId)).length,
    reasons
  };
}

async function loadKakao(query: string, phone: string): Promise<SmsLookupHit> {
  if (!String(process.env.KAKAO_REST_API_KEY || process.env.KAKAO_CLIENT_ID || "").trim()) {
    return unavailable("카카오 키 없음");
  }
  const found = await searchKakaoLocalDetailed(query);
  if (!found.item) return miss(found.unavailable_reason || "");
  if (!phonesMatch(found.item.telephone, phone)) return miss("전화번호 불일치");
  return matched(found.item.place_name, found.item.category);
}

async function loadNaver(query: string, phone: string): Promise<SmsLookupHit> {
  if (!String(process.env.NAVER_CLIENT_ID || "").trim() || !String(process.env.NAVER_CLIENT_SECRET || "").trim()) {
    return unavailable("네이버 키 없음");
  }
  const list = await searchNaverLocalList(query, 5);
  const hit = list.find((item) => phonesMatch(item.telephone, phone));
  if (!hit) return miss(list.length ? "전화번호 불일치" : "");
  return matched(hit.title, hit.category);
}

async function loadDirectory(phone: string): Promise<SmsLookupHit> {
  const hit = await lookupPublicDirectoryByPhone(phone);
  if (!hit) return miss("");
  return matched(hit.displayName, hit.category || hit.sourceKind);
}

async function loadPublicStore(name: string, phone: string): Promise<SmsLookupHit> {
  if (!name) return miss("");
  const found = await findSmallBusinessStore({ storeName: name, telephone: phone, roadAddress: "" });
  if (!found || found.source !== "small_business_api") return miss("");
  if (found.telephone && !phonesMatch(found.telephone, phone)) return miss("전화번호 불일치");
  return matched(found.storeName, found.industry || found.source);
}

/** 발신번호·본문을 VLUE 신고 DB, 공공 디렉터리, 카카오, 네이버, 공공데이터 상가와 대조한다. */
export async function buildSmsSenderContext(rawPhone: string, messageText: string): Promise<SmsSenderContext> {
  const phone = String(rawPhone || "").trim().slice(0, 40);
  const text = String(messageText || "").slice(0, 2000);
  const classified = classifySender(phone);
  const query = searchQuery(phone, classified.digits, classified.band);

  const [reports, directory, kakao, naver] = await Promise.all([
    withTimeout(loadReports(phone), 2500, { total: 0, phishing: 0, reasons: [] }),
    withTimeout(loadDirectory(phone), 2500, miss("")),
    withTimeout(loadKakao(query, phone), 2500, unavailable("시간 초과")),
    withTimeout(loadNaver(query, phone), 2500, unavailable("시간 초과"))
  ]);

  const placeName = kakao.status === "matched" ? kakao.name : naver.status === "matched" ? naver.name : "";
  const publicData = await withTimeout(loadPublicStore(placeName, phone), 2200, miss(""));
  const judged = judgeSenderSignals({
    rawPhone: phone,
    messageText: text,
    reports,
    directory,
    kakao,
    naver,
    publicData
  });

  return {
    ok: true,
    phone,
    lookups: { reports, directory, kakao, naver, publicData },
    ...judged
  };
}
