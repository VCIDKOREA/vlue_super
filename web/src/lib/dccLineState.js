export const DCC_LINE_ID_KEY = "vlue_dcc_line_id";
export const DCC_LINE_PREVIEW_KEY = "vlue_dcc_line_preview";
export const DCC_LINE_CHANGED_EVENT = "vlue-dcc-line-changed";

export function readSelectedDccLineId() {
  try {
    return String(sessionStorage.getItem(DCC_LINE_ID_KEY) || "").trim();
  } catch {
    return "";
  }
}

export function readDccLinePreview() {
  try {
    const raw = sessionStorage.getItem(DCC_LINE_PREVIEW_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function emitLineChanged(detail) {
  try {
    window.dispatchEvent(new CustomEvent(DCC_LINE_CHANGED_EVENT, { detail: detail || {} }));
  } catch {
    /* ignore */
  }
}

export function writeDccLinePreview(preview) {
  const next = preview && typeof preview === "object" ? preview : null;
  try {
    if (!next?.id) sessionStorage.removeItem(DCC_LINE_PREVIEW_KEY);
    else sessionStorage.setItem(DCC_LINE_PREVIEW_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  emitLineChanged({ lineId: String(next?.id || ""), preview: next });
  return next;
}

export function writeDccLinePreviewFromBundle(bundle) {
  const line = bundle?.line;
  if (!line?.id) return null;
  const prev = readDccLinePreview();
  const agent = bundle?.agent || {};
  const dcc = bundle?.dcc && typeof bundle.dcc === "object" ? bundle.dcc : {};
  const keepSameLine = prev?.id === line.id;
  return writeDccLinePreview({
    id: line.id,
    displayPhone: String(line.displayPhone || (keepSameLine ? prev?.displayPhone : "") || "").trim(),
    displayName: String(
      line.displayName || agent.displayName || dcc.name || dcc.displayName || (keepSameLine ? prev?.displayName : "") || ""
    ).trim(),
    title: String(line.jobTitle || agent.title || dcc.title || "").trim(),
    department: String(line.department || agent.department || dcc.department || "").trim(),
    photoUrl: String(
      line.photoUrl || dcc.photoUrl || agent.photoUrl || (keepSameLine ? prev?.photoUrl : "") || ""
    ).trim(),
    photoFocus: String(line.photoFocus || dcc.photoFocus || (keepSameLine ? prev?.photoFocus : "") || "center").trim() || "center",
    kindLabel: String(line.kindLabel || (keepSameLine ? prev?.kindLabel : "") || "").trim(),
    isCertified: Boolean(line.isCertified)
  });
}

export function writeSelectedDccLineId(id) {
  const next = String(id || "").trim();
  try {
    if (next) sessionStorage.setItem(DCC_LINE_ID_KEY, next);
    else {
      sessionStorage.removeItem(DCC_LINE_ID_KEY);
      sessionStorage.removeItem(DCC_LINE_PREVIEW_KEY);
    }
  } catch {
    /* ignore */
  }
  emitLineChanged({ lineId: next, preview: next ? readDccLinePreview() : null });
  return next;
}
