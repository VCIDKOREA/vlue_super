/** ASCII filename + RFC 5987 UTF-8 (한글 등 non-ASCII 헤더 오류 방지) */
export function attachmentDisposition(filename: string): string {
  const raw = String(filename || "download").trim() || "download";
  const ascii =
    raw.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_") || "download";
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(raw)}`;
}
