export const DCC_LINE_ID_KEY = "vlue_dcc_line_id";
export const DCC_LINE_CHANGED_EVENT = "vlue-dcc-line-changed";

export function readSelectedDccLineId() {
  try {
    return String(sessionStorage.getItem(DCC_LINE_ID_KEY) || "").trim();
  } catch {
    return "";
  }
}

export function writeSelectedDccLineId(id) {
  const next = String(id || "").trim();
  try {
    if (next) sessionStorage.setItem(DCC_LINE_ID_KEY, next);
    else sessionStorage.removeItem(DCC_LINE_ID_KEY);
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent(DCC_LINE_CHANGED_EVENT, { detail: { lineId: next } }));
  } catch {
    /* ignore */
  }
  return next;
}
