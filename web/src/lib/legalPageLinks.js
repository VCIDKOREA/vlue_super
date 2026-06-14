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
    return `${window.location.origin}/${hash}`;
  }
  return `https://www.vlue.kr/${hash}`;
}
