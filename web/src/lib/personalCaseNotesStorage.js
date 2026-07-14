/** 키패드·통화 중 저장한 번호 메모 — 개인케이스 · 내문서 */

export const PERSONAL_CASE_NOTES_KEY = "vlue_personal_case_notes";
export const PERSONAL_CASE_NOTES_CHANGED = "vlue-personal-case-notes-changed";

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   content: string,
 *   digits: string,
 *   savedAt: string,
 *   source?: string
 * }} PersonalCaseNote
 */

/** @returns {PersonalCaseNote[]} */
export function readPersonalCaseNotes() {
  try {
    const raw = localStorage.getItem(PERSONAL_CASE_NOTES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** @param {PersonalCaseNote[]} items */
export function writePersonalCaseNotes(items) {
  try {
    localStorage.setItem(PERSONAL_CASE_NOTES_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event(PERSONAL_CASE_NOTES_CHANGED));
  } catch {
    /* ignore */
  }
}

/**
 * @param {{ name: string, content: string, digits: string, source?: string }} input
 * @returns {PersonalCaseNote | null}
 */
export function addPersonalCaseNote(input) {
  const name = String(input?.name || "").trim();
  const content = String(input?.content || "").trim();
  const digits = String(input?.digits || "").trim();
  if (!name && !content && !digits) return null;

  const note = {
    id: `pcn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: name || "제목 없음",
    content,
    digits,
    savedAt: new Date().toISOString(),
    source: String(input?.source || "keypad").trim() || "keypad"
  };

  const next = [note, ...readPersonalCaseNotes()].slice(0, 200);
  writePersonalCaseNotes(next);
  return note;
}

/** @param {string} id */
export function removePersonalCaseNote(id) {
  const target = String(id || "").trim();
  if (!target) return;
  writePersonalCaseNotes(readPersonalCaseNotes().filter((n) => n.id !== target));
}
