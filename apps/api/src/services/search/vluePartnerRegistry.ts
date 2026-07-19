/** VLUE 정식 파트너 목록 (추후 DB 연동). 데모 시드 없음 — 실등록만 추가. */
export type VluePartnerRecord = {
  id: string;
  /** VLUE 스토어 프로필 ID (쇼핑 탭 상점 연결) */
  store_id: string;
  name: string;
  aliases: string[];
  cert_number: string;
  category: string;
  phone: string;
  address: string;
  representative: string;
  business_number: string;
  safety_score: number;
};

const PARTNERS: VluePartnerRecord[] = [];

function normalize(raw: string): string {
  return String(raw || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();
}

export function findVluePartner(keyword: string, hintName = ""): VluePartnerRecord | null {
  const q = normalize(keyword);
  const hint = normalize(hintName);
  const tokens = String(keyword || "")
    .toLowerCase()
    .split(/\s+/)
    .map((t) => normalize(t))
    .filter((t) => t.length >= 2);

  for (const partner of PARTNERS) {
    const names = [partner.name, ...partner.aliases].map(normalize);
    for (const name of names) {
      if (!name) continue;
      if (q.includes(name) || name.includes(q)) return partner;
      if (hint && (hint.includes(name) || name.includes(hint))) return partner;
      if (tokens.some((t) => name.includes(t) || t.includes(name))) return partner;
    }
  }
  return null;
}
