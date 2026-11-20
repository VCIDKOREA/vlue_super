const KEY = "vlue_space_records_v1";

export function normalizeSpaceRecord(record) {
  if (!record || typeof record !== "object") return null;
  return {
    ...record,
    observed: Array.isArray(record.observed) ? record.observed : [],
    review: Array.isArray(record.review) ? record.review : [],
    limits: Array.isArray(record.limits) ? record.limits : [],
    actions: Array.isArray(record.actions) ? record.actions : []
  };
}

function readAll() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeSpaceRecord).filter(Boolean);
  } catch {
    return [];
  }
}

export function readSpaceRecords(moduleId) {
  const all = readAll();
  if (!moduleId) return all;
  return all.filter((record) => record.moduleId === moduleId);
}

export function appendSpaceRecord(record) {
  const next = [{ ...record, id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}` }, ...readAll()].slice(0, 30);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next.filter((item) => item.moduleId === record.moduleId);
}
