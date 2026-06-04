export type DocumentTemplateCategory = "business" | "life" | "legal_other";

export type DocumentTemplateStatus = "available" | "coming_soon";

export type DocumentTemplateItem = {
  id: string;
  category: DocumentTemplateCategory;
  title: string;
  description: string;
  status: DocumentTemplateStatus;
  isPaidOnly: boolean;
  fileFormat?: "pdf" | "docx" | "hwp";
  /** 브라우저·Vite public 기준 경로 */
  downloadUrl?: string;
  /** API/스토리지 상대 경로 */
  downloadPath?: string;
  tags?: string[];
};

export const DOCUMENT_TEMPLATE_CATEGORIES = [
  { id: "all", label: "전체" },
  { id: "business", label: "비즈니스/업무" },
  { id: "life", label: "일상/생활" },
  { id: "legal_other", label: "내용증명/기타" }
] as const;

const PUBLIC_BASE = "/documents/templates";

/** VLUER 전문가 검수 후 순차 공개 — mock/정적 카탈로그 */
export const DOCUMENT_TEMPLATES: DocumentTemplateItem[] = [
  {
    id: "biz-power-of-attorney",
    category: "business",
    title: "위임장 (기본)",
    description: "업무 대리·서류 제출 등에 쓰는 표준 위임장 양식입니다.",
    status: "available",
    isPaidOnly: false,
    fileFormat: "pdf",
    downloadUrl: `${PUBLIC_BASE}/power-of-attorney.pdf`,
    downloadPath: "power-of-attorney.pdf",
    tags: ["위임", "대리"]
  },
  {
    id: "biz-employment-contract",
    category: "business",
    title: "표준근로계약서",
    description: "근로기준법 안내에 맞춘 기본 근로계약서 템플릿(샘플)입니다.",
    status: "available",
    isPaidOnly: false,
    fileFormat: "pdf",
    downloadUrl: `${PUBLIC_BASE}/standard-employment-contract.pdf`,
    downloadPath: "standard-employment-contract.pdf",
    tags: ["근로", "계약"]
  },
  {
    id: "biz-expense-report",
    category: "business",
    title: "지출결의서 · 출장비 정산",
    description: "프리랜서·소규모 팀용 지출·출장 정산 서식.",
    status: "coming_soon",
    isPaidOnly: false,
    tags: ["정산", "출장"]
  },
  {
    id: "biz-nda-premium",
    category: "business",
    title: "비밀유지계약서 (NDA) — 검수본",
    description: "B2B 거래·프로젝트용 NDA 전문 검수 버전.",
    status: "coming_soon",
    isPaidOnly: true,
    tags: ["NDA", "계약"]
  },
  {
    id: "life-move-out",
    category: "life",
    title: "이사·해지 통지서",
    description: "전입·전출, 통신/관리비 해지 안내용 생활 서식.",
    status: "coming_soon",
    isPaidOnly: false,
    tags: ["이사", "해지"]
  },
  {
    id: "life-rental-checklist",
    category: "life",
    title: "전·월세 체크리스트",
    description: "계약 전 확인 항목·특약 메모용 체크리스트.",
    status: "coming_soon",
    isPaidOnly: false,
    tags: ["전세", "월세"]
  },
  {
    id: "life-neighbor-notice",
    category: "life",
    title: "층간소음 · 이웃 안내 문구",
    description: "아파트·오피스텔 이웃 안내·양해 요청 문구 모음.",
    status: "coming_soon",
    isPaidOnly: true,
    tags: ["생활", "안내"]
  },
  {
    id: "legal-content-cert",
    category: "legal_other",
    title: "내용증명 기본양식",
    description: "채권·계약 분쟁 등에 활용하는 내용증명 작성 가이드·기본 서식.",
    status: "available",
    isPaidOnly: false,
    fileFormat: "pdf",
    downloadUrl: `${PUBLIC_BASE}/content-certificate-basic.pdf`,
    downloadPath: "content-certificate-basic.pdf",
    tags: ["내용증명", "분쟁"]
  },
  {
    id: "legal-mediation-request",
    category: "legal_other",
    title: "조정·중재 신청서",
    description: "분쟁 조정·중재 절차용 신청 서식.",
    status: "coming_soon",
    isPaidOnly: false,
    tags: ["조정", "중재"]
  },
  {
    id: "legal-attorney-letter",
    category: "legal_other",
    title: "변호사 의견서 · 경고장",
    description: "전문 검수 경고장·의견서 템플릿.",
    status: "coming_soon",
    isPaidOnly: true,
    tags: ["법률", "경고"]
  }
];

export function listDocumentTemplates(categoryFilter?: string | null) {
  const raw = String(categoryFilter || "all").trim().toLowerCase();
  const templates =
    raw === "all" || !raw
      ? DOCUMENT_TEMPLATES
      : DOCUMENT_TEMPLATES.filter((t) => t.category === raw);

  return {
    categories: DOCUMENT_TEMPLATE_CATEGORIES,
    templates,
    meta: {
      total: templates.length,
      available: templates.filter((t) => t.status === "available").length,
      comingSoon: templates.filter((t) => t.status === "coming_soon").length,
      updatedAt: "2026-05-21"
    },
    notice:
      "안전한 거래와 서식을 위해 VLUER 전문가 검수를 거쳐 순차적으로 업데이트 중입니다."
  };
}
