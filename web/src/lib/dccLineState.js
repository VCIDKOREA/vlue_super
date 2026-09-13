import { formatLetteringPhoneDisplay } from "./letteringPhoneMatch.js";

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

export function writeDccLinePreviewFromBundle(bundle, opts = {}) {
  const line = bundle?.line;
  if (!line?.id) return null;
  const prev = readDccLinePreview();
  const agent = bundle?.agent || {};
  const dcc = bundle?.dcc && typeof bundle.dcc === "object" ? bundle.dcc : {};
  const keepSameLine = !opts.replaceMedia && prev?.id === line.id;
  const pick = (...vals) => {
    for (const v of vals) {
      const s = String(v ?? "").trim();
      if (s) return s;
    }
    return "";
  };
  const resolvedPhoto = opts.replaceMedia
    ? Object.prototype.hasOwnProperty.call(dcc, "photoUrl")
      ? String(dcc.photoUrl || "").trim()
      : pick(line.photoUrl, agent.photoUrl)
    : pick(line.photoUrl, dcc.photoUrl, keepSameLine ? prev?.photoUrl : "");
  const photoUrl = resolvedPhoto;
  return writeDccLinePreview({
    id: line.id,
    displayPhone:
      formatLetteringPhoneDisplay(
        pick(line.displayPhone, keepSameLine ? prev?.displayPhone : "", line.phoneE164)
      ) || pick(line.displayPhone, keepSameLine ? prev?.displayPhone : ""),
    displayName: pick(
      line.displayName,
      agent.displayName,
      dcc.name,
      dcc.displayName,
      keepSameLine ? prev?.displayName : ""
    ),
    title: pick(line.jobTitle, agent.title, dcc.title, keepSameLine ? prev?.title : ""),
    department: pick(
      line.department,
      agent.department,
      dcc.department,
      keepSameLine ? prev?.department : ""
    ),
    photoUrl,
    noProfilePhoto: !photoUrl,
    titlePhotoUrl: pick(
      opts.replaceMedia ? dcc.titlePhotoUrl : "",
      dcc.titlePhotoUrl,
      keepSameLine && !opts.replaceMedia ? prev?.titlePhotoUrl : ""
    ),
    noTitlePhoto:
      dcc.noTitlePhoto != null
        ? Boolean(dcc.noTitlePhoto)
        : Boolean(keepSameLine && !opts.replaceMedia ? prev?.noTitlePhoto : false),
    photoFocus:
      pick(line.photoFocus, dcc.photoFocus, keepSameLine ? prev?.photoFocus : "", "center") ||
      "center",
    kindLabel: pick(line.kindLabel, keepSameLine ? prev?.kindLabel : ""),
    isCertified: Boolean(line.isCertified),
    agentId: pick(line.agentId, agent.id, keepSameLine ? prev?.agentId : ""),
    email: pick(dcc.email, keepSameLine && !opts.replaceMedia ? prev?.email : ""),
    address: pick(dcc.address, keepSameLine && !opts.replaceMedia ? prev?.address : ""),
    website: pick(dcc.website, keepSameLine && !opts.replaceMedia ? prev?.website : ""),
    fax: pick(dcc.fax, keepSameLine && !opts.replaceMedia ? prev?.fax : ""),
    organization: pick(
      dcc.organization,
      dcc.companyName,
      keepSameLine && !opts.replaceMedia ? prev?.organization : ""
    ),
    logoUrl: pick(dcc.logoUrl, keepSameLine && !opts.replaceMedia ? prev?.logoUrl : ""),
    companyIntro: pick(
      dcc.companyIntro,
      keepSameLine && !opts.replaceMedia ? prev?.companyIntro : ""
    ),
    customBackText: pick(
      dcc.customBackText,
      dcc.salesContent,
      keepSameLine && !opts.replaceMedia ? prev?.customBackText : ""
    )
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
