import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch } from "./vlueAuthHeaders.js";

export async function fetchExcelTemplates() {
  const res = await vlueAuthFetch(apiUrl("/api/office/excel/templates"));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "템플릿을 불러오지 못했습니다.");
  return data;
}

export async function fetchExcelWorkbooks() {
  const res = await vlueAuthFetch(apiUrl("/api/office/excel/workbooks"));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "워크북 목록을 불러오지 못했습니다.");
  return data;
}

export async function fetchExcelWorkbook(workbookId) {
  const res = await vlueAuthFetch(apiUrl(`/api/office/excel/workbooks/${workbookId}`));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "워크북을 불러오지 못했습니다.");
  return data;
}

export async function createExcelWorkbook({ title, templateId } = {}) {
  const res = await vlueAuthFetch(apiUrl("/api/office/excel/workbooks"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, templateId })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "워크북 생성에 실패했습니다.");
  return data;
}

export async function generateExcelWorkbook({ prompt, promptText, templateId, workbookId } = {}) {
  const res = await vlueAuthFetch(apiUrl("/api/office/excel/workbooks/generate"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: prompt || promptText,
      promptText: promptText || prompt,
      templateId,
      workbookId
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "AI 생성에 실패했습니다.");
  return data;
}

export async function saveExcelWorkbook(workbookId, { baseRevisionNum, model, changeSummary } = {}) {
  const res = await vlueAuthFetch(apiUrl(`/api/office/excel/workbooks/${workbookId}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ baseRevisionNum, model, changeSummary })
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 409) {
    const err = new Error(data?.error || "다른 기기에서 수정되었습니다.");
    err.code = "REVISION_CONFLICT";
    err.current = data?.current;
    throw err;
  }
  if (!res.ok) throw new Error(data?.error || "저장에 실패했습니다.");
  return data;
}
