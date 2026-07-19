/**
 * 약관·개인정보·환불 독립 페이지 URL (www 마케팅 해시 라우트)
 * @param {'terms' | 'privacy' | 'refund'} kind
 */
export function marketingLegalHash(kind) {
  if (kind === "privacy") return "#privacy";
  if (kind === "refund") return "#refund";
  return "#terms";
}

/** @param {'terms' | 'privacy' | 'refund'} kind */
export function marketingLegalUrl(kind) {
  const hash = marketingLegalHash(kind);
  if (typeof window === "undefined") {
    return `https://www.vlue.kr${hash}`;
  }
  const host = window.location.hostname.toLowerCase();
  if (host === "www.vlue.kr" || host === "vlue.kr" || host === "localhost" || host === "127.0.0.1") {
    return `${window.location.origin}${hash}`;
  }
  return `https://www.vlue.kr${hash}`;
}

/** 만 14세 미만 아동 정책 — 개인정보처리방침 3조 */
export function marketingMinorPolicyUrl() {
  if (typeof window === "undefined") {
    return "https://www.vlue.kr/#privacy/legal-article-3";
  }
  const host = window.location.hostname.toLowerCase();
  if (host === "www.vlue.kr" || host === "vlue.kr" || host === "localhost" || host === "127.0.0.1") {
    return `${window.location.origin}#privacy/legal-article-3`;
  }
  return "https://www.vlue.kr/#privacy/legal-article-3";
}

/** 설정·온보딩용 법적 문서 목록 */
export const APP_LEGAL_LINKS = [
  { id: "terms", label: "이용약관", kind: "terms" },
  { id: "privacy", label: "개인정보 처리방침", kind: "privacy" },
  { id: "refund", label: "환불·청약철회 규정", kind: "refund" }
];
