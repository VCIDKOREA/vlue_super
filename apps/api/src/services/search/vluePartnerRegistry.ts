/** VLUE 정식 파트너 목록 (추후 DB 연동) */
export type VluePartnerRecord = {
  id: string;
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

const PARTNERS: VluePartnerRecord[] = [
  {
    id: "vlue-002",
    name: "다다오피스",
    aliases: ["다다오피스", "dada office", "dadaoffice"],
    cert_number: "VLUE-BIZ-2024-0087",
    category: "비즈니스 서비스 / 공유오피스",
    phone: "02-9876-5432",
    address: "서울특별시 마포구 월드컵북로 56길 19, 다다타워 2층",
    representative: "박다다",
    business_number: "234-56-78901",
    safety_score: 96
  },
  {
    id: "vlue-001",
    name: "명경채 요양병원",
    aliases: ["명경채", "명경채요양병원"],
    cert_number: "VLUE-MED-2024-0031",
    category: "의료기관 / 요양병원",
    phone: "02-1234-5678",
    address: "서울특별시 강남구 테헤란로 123, 명경채빌딩 3-5층",
    representative: "김명경",
    business_number: "123-45-67890",
    safety_score: 94
  },
  {
    id: "vlue-003",
    name: "한국신뢰금융",
    aliases: ["한국신뢰금융", "신뢰금융"],
    cert_number: "VLUE-FIN-2025-0012",
    category: "금융기관 / 대출중개",
    phone: "02-5555-7777",
    address: "서울특별시 중구 을지로 100, 한국신뢰빌딩 8층",
    representative: "이신뢰",
    business_number: "345-67-89012",
    safety_score: 92
  }
];

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
