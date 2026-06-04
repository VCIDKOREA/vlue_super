/**
 * 대한민국 공공·정부·긴급 기관 대표번호 (가족보호 — 노부모 통화 감지)
 * 숫자만 비교하며, 지역번호(02 등) 변형은 suffix 매칭.
 */
export type GovernmentHotline = {
  digits: string;
  label: string;
  category: "emergency" | "financial" | "tax" | "consumer" | "health" | "other";
};

/** E.164 없이 국내 발신 기준 — 앞 0 제거 후 비교 */
export const GOVERNMENT_HOTLINES: GovernmentHotline[] = [
  { digits: "112", label: "경찰청(112)", category: "emergency" },
  { digits: "119", label: "소방·구급(119)", category: "emergency" },
  { digits: "113", label: "실종아동(113)", category: "emergency" },
  { digits: "114", label: "번호안내(114)", category: "other" },
  { digits: "120", label: "다산콜센터(120)", category: "other" },
  { digits: "125", label: "안전신문고(125)", category: "other" },
  { digits: "129", label: "보건복지상담(129)", category: "health" },
  { digits: "1300", label: "응급의료정보(1300)", category: "health" },
  { digits: "1330", label: "관광통역(1330)", category: "other" },
  { digits: "1332", label: "금융감독·피해신고(1332)", category: "financial" },
  { digits: "1339", label: "보건복지(1339)", category: "health" },
  { digits: "1397", label: "보험범죄신고(1397)", category: "financial" },
  { digits: "1398", label: "금융사기피해(1398)", category: "financial" },
  { digits: "15881199", label: "금융감독원(1588-1199)", category: "financial" },
  { digits: "15881688", label: "금융감독원(1588-1688)", category: "financial" },
  { digits: "126", label: "국세상담(126)", category: "tax" },
  { digits: "15881260", label: "국세청(1588-1260)", category: "tax" },
  { digits: "1372", label: "소비자상담(1372)", category: "consumer" },
  { digits: "182", label: "분실신고(182)", category: "other" },
  { digits: "118", label: "국가인권(118)", category: "other" },
  { digits: "110", label: "검찰 민원(110)", category: "other" },
  { digits: "131", label: "해양경찰(131)", category: "emergency" },
  { digits: "122", label: "산림청(122)", category: "emergency" },
  { digits: "127", label: "범죄신고(127)", category: "emergency" },
  { digits: "1303", label: "여성긴급(1303)", category: "emergency" },
  { digits: "1366", label: "가정폭력(1366)", category: "emergency" },
  { digits: "1388", label: "청소년상담(1388)", category: "health" },
  { digits: "1391", label: "학교폭력(1391)", category: "health" },
  { digits: "1644", label: "정부24(1644-0020)", category: "other" },
  { digits: "16440020", label: "정부24(1644-0020)", category: "other" }
];

export function normalizePhoneDigits(raw: string): string {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("82") && d.length >= 10) d = `0${d.slice(2)}`;
  if (d.startsWith("001")) d = d.replace(/^001/, "0");
  return d;
}

export function matchGovernmentHotline(phone: string): GovernmentHotline | null {
  const d = normalizePhoneDigits(phone);
  if (!d) return null;
  for (const h of GOVERNMENT_HOTLINES) {
    if (d === h.digits || d.endsWith(h.digits) || h.digits.endsWith(d)) {
      return h;
    }
  }
  return null;
}
