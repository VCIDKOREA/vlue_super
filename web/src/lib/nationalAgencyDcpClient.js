/**
 * 국가기관 공식 단축번호 — 웹 통화목록·조회 폴백.
 * 서버 seed / Android NationalAgencyWhitelist 와 동일 번호 집합.
 */
export const NATIONAL_AGENCY_WHITELIST = [
  { shortNumber: "112", agencyName: "경찰청", officialWebsite: "https://www.police.go.kr" },
  { shortNumber: "119", agencyName: "소방청", officialWebsite: "https://www.nfa.go.kr" },
  { shortNumber: "111", agencyName: "국가정보원", officialWebsite: "https://www.nis.go.kr" },
  { shortNumber: "122", agencyName: "해양경찰청", officialWebsite: "https://www.kcg.go.kr" },
  { shortNumber: "182", agencyName: "경찰청 민원", officialWebsite: "https://www.minwon.police.go.kr" },
  { shortNumber: "1332", agencyName: "금융감독원", officialWebsite: "https://www.fss.or.kr" },
  { shortNumber: "1394", agencyName: "경찰청 전기통신금융사기 통합신고대응단", officialWebsite: "https://www.police.go.kr" },
  { shortNumber: "1397", agencyName: "서민금융진흥원", officialWebsite: "https://www.kinfa.or.kr" },
  { shortNumber: "1369", agencyName: "금융결제원", officialWebsite: "https://www.kftc.or.kr" },
  { shortNumber: "1301", agencyName: "검찰청", officialWebsite: "https://www.spo.go.kr" },
  { shortNumber: "110", agencyName: "국민권익위원회 국민콜110", officialWebsite: "https://www.110.go.kr" },
  { shortNumber: "1303", agencyName: "국방부 국방헬프콜", officialWebsite: "https://www.mnd.go.kr" },
  { shortNumber: "1331", agencyName: "국가인권위원회", officialWebsite: "https://www.humanrights.go.kr" },
  { shortNumber: "1345", agencyName: "법무부 외국인종합안내센터", officialWebsite: "https://www.immigration.go.kr" },
  { shortNumber: "126", agencyName: "국세청", officialWebsite: "https://www.nts.go.kr" },
  { shortNumber: "1390", agencyName: "중앙선거관리위원회", officialWebsite: "https://www.nec.go.kr" },
  { shortNumber: "117", agencyName: "학교폭력신고센터", officialWebsite: "https://www.safe182.go.kr" },
  { shortNumber: "118", agencyName: "한국인터넷진흥원", officialWebsite: "https://www.kisa.or.kr" },
  { shortNumber: "129", agencyName: "보건복지상담센터", officialWebsite: "https://www.129.go.kr" },
  { shortNumber: "1339", agencyName: "질병관리청", officialWebsite: "https://kdca.go.kr" },
  { shortNumber: "1382", agencyName: "행정안전부 주민등록 진위확인", officialWebsite: "https://www.mois.go.kr" },
  { shortNumber: "1393", agencyName: "자살예방핫라인", officialWebsite: "https://www.spckorea.or.kr" },
  { shortNumber: "1399", agencyName: "식품의약품안전처", officialWebsite: "https://www.mfds.go.kr" }
];

const BY_SHORT = new Map(NATIONAL_AGENCY_WHITELIST.map((a) => [a.shortNumber, a]));

export function agencyShortNumberCandidates(raw) {
  const d = String(raw || "").replace(/\D/g, "");
  if (!d) return [];
  const out = [];
  const add = (v) => {
    if (v && !out.includes(v)) out.push(v);
  };
  add(d);
  if (d.startsWith("82") && d.length > 2) add(d.slice(2));
  if (d.startsWith("0") && d.length > 1) add(d.slice(1));
  return out;
}

export function matchNationalAgency(raw) {
  for (const c of agencyShortNumberCandidates(raw)) {
    const hit = BY_SHORT.get(c);
    if (hit) return hit;
  }
  return null;
}

export function isNationalAgencyDcpCard(card) {
  if (!card || typeof card !== "object") return false;
  if (String(card.profileKind || "").trim() === "dcp") return true;
  return Boolean(card.dcp && typeof card.dcp === "object");
}

/** 통화목록·조회 폴백용 DCP 카드 (정상 루트) */
export function buildNationalAgencyDcpCard(agency, extra = {}) {
  if (!agency) return null;
  const routeStatus = String(extra.routeStatus || "normal").trim() || "normal";
  const logoUrl = String(extra.logoUrl || agency.logoUrl || "").trim();
  const dcp = {
    id: String(extra.id || "").trim(),
    agencyName: agency.agencyName,
    shortNumber: agency.shortNumber,
    officialWebsite: agency.officialWebsite,
    logoUrl,
    logoResourceName: String(extra.logoResourceName || "").trim(),
    routeStatus,
    warning: String(extra.warning || "").trim()
  };
  return {
    profileKind: "dcp",
    name: agency.agencyName,
    displayName: agency.agencyName,
    organization: agency.agencyName,
    title: "디지털인증프로필",
    phone: agency.shortNumber,
    website: agency.officialWebsite,
    logoUrl,
    photoUrl: logoUrl,
    membershipTier: "paid",
    verificationItems: ["VLUE 디지털인증프로필", "국가기관 공식 번호"],
    dcp
  };
}
