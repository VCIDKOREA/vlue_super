const STORAGE_KEY = "vlue_b2b_pipeline_log_v1";

/** 클라이언트 E2E 파이프라인 로그 (콘솔 + localStorage) */
export function logB2bPipeline(stage, detail = {}) {
  const entry = { stage, detail, at: new Date().toISOString() };
  if (typeof console !== "undefined" && console.info) {
    console.info("[VLUE B2B Pipeline]", entry);
  }
  try {
    const prev = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    prev.push(entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prev.slice(-80)));
  } catch {
    /* ignore */
  }
  return entry;
}

export function readB2bPipelineLog() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function clearB2bPipelineLog() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
