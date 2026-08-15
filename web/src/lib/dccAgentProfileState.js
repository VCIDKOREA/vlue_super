import {
  LETTERING_BIZCARD_CHANGED_EVENT,
  writeLetteringBizcardEditable
} from "./letteringBizcardStorage.js";
import { TITLE_DEPT_APPROVAL } from "./letteringBizcardVerification.js";

export const DCC_AGENT_CHANGED_EVENT = "vlue-dcc-agent-changed";

export function applyDccAgentToLocalCard(profile, opts = {}) {
  if (!profile || typeof profile !== "object") return null;
  const displayName = String(profile.displayName || profile.name || "").trim();
  const title = String(profile.title || "").trim();
  const department = String(profile.department || "").trim();
  const photoUrl = String(profile.photoUrl || "").trim();
  const photoFocus = String(profile.photoFocus || "center").trim() || "center";
  const keepPhoto = Boolean(opts.keepPhoto);

  try {
    if (displayName) localStorage.setItem("myCardDisplayName", displayName);
  } catch {
    /* ignore */
  }

  const patch = {
    displayName,
    title,
    department,
    approvedTitle: title,
    approvedDepartment: department,
    titleDeptApprovalStatus: TITLE_DEPT_APPROVAL.APPROVED,
    titleDeptPendingTitle: "",
    titleDeptPendingDepartment: ""
  };
  if (!keepPhoto) {
    patch.photoDataUrl = photoUrl;
    patch.photoUrl = photoUrl;
    patch.photoFocus = photoFocus;
    patch.noProfilePhoto = !photoUrl;
  }

  const written = writeLetteringBizcardEditable(patch);

  try {
    window.dispatchEvent(new Event(LETTERING_BIZCARD_CHANGED_EVENT));
    window.dispatchEvent(new Event("vlue-digital-card-changed"));
  } catch {
    /* ignore */
  }

  return written?.data ?? null;
}

export function agentOptionLabel(profile) {
  if (!profile) return "담당자";
  const label = String(profile.label || "").trim();
  if (label) return label;
  const name = String(profile.displayName || "").trim();
  const title = String(profile.title || "").trim();
  if (name && title) return `${name} · ${title}`;
  return name || title || "담당자";
}
