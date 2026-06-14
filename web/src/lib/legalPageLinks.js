/**
 * 약관·개인정보 독립 페이지 URL (www 마케팅 해시 라우트)
 * @param {'terms' | 'privacy'} kind
 */
export function marketingLegalHash(kind) {
  return kind === "terms" ? "#terms" : "#privacy";
}

/** @param {'terms' | 'privacy'} kind */
export function marketingLegalUrl(kind) {
  if (typeof window === "undefined") {
    return kind === "terms" ? "https://www.vlue.kr/#terms" : "https://www.vlue.kr/#privacy";
  }
  const host = window.location.hostname.toLowerCase();
  const hash = marketingLegalHash(kind);
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
