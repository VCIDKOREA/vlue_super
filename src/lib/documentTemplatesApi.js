import { apiUrl } from "./apiBase.js";

export async function fetchDocumentTemplates(category = "all") {
  const q = encodeURIComponent(category || "all");
  const res = await fetch(apiUrl(`/api/documents/templates?category=${q}`));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `서류 양식 목록 조회 실패 (${res.status})`);
  }
  return data;
}
