import {
  LETTERING_BIZCARD_CHANGED_EVENT,
  writeLetteringBizcardEditable,
  readLetteringFixedIdentity
} from "./letteringBizcardStorage.js";
import { TITLE_DEPT_APPROVAL } from "./letteringBizcardVerification.js";

export const DCC_AGENT_CHANGED_EVENT = "vlue-dcc-agent-changed";

const EDITING_PROFILE_KEY = "vlue_multi_dcc_editing_profile_id";

export function writeEditingMultiDccProfileId(id) {
  try {
    if (id) localStorage.setItem(EDITING_PROFILE_KEY, String(id));
    else localStorage.removeItem(EDITING_PROFILE_KEY);
  } catch {
    /* ignore */
  }
}

export function readEditingMultiDccProfileId() {
  try {
    return String(localStorage.getItem(EDITING_PROFILE_KEY) || "").trim();
  } catch {
    return "";
  }
}

function str(v) {
  return String(v ?? "").trim();
}

/**
 * 프로필 전환 — 전화번호·계정 이름만 유지, 그 외 DCC 필드는 번들로 교체(빈 값도 반영).
 */
export function applyDccAgentBundleToLocalCard(profile, bundle = null, opts = {}) {
  if (!profile || typeof profile !== "object") return null;
  const fixed = readLetteringFixedIdentity();
  const sharedName = str(fixed.name) || str(profile.displayName || profile.name);
  const hasBundle = bundle && typeof bundle === "object";
  const dcc =
    hasBundle && bundle.dcc && typeof bundle.dcc === "object" ? bundle.dcc : null;
  const title = str(profile.title ?? dcc?.title);
  const department = str(profile.department ?? dcc?.department);
  const photoUrl = str(profile.photoUrl || dcc?.photoUrl);
  const photoFocus = str(profile.photoFocus || dcc?.photoFocus || "center") || "center";

  try {
    if (sharedName) localStorage.setItem("myCardDisplayName", sharedName);
  } catch {
    /* ignore */
  }

  /* 번들 로드 실패 시에는 신원(이름·직함·사진)만 바꾸고 연락처를 비우지 않음 */
  if (!hasBundle || dcc == null) {
    const patchLite = {
      displayName: sharedName,
      title,
      department,
      approvedTitle: title,
      approvedDepartment: department,
      titleDeptApprovalStatus: TITLE_DEPT_APPROVAL.APPROVED,
      titleDeptPendingTitle: "",
      titleDeptPendingDepartment: "",
      photoDataUrl: photoUrl,
      photoUrl,
      photoFocus,
      noProfilePhoto: !photoUrl
    };
    const written = writeLetteringBizcardEditable(patchLite);
    try {
      window.dispatchEvent(new Event(LETTERING_BIZCARD_CHANGED_EVENT));
      window.dispatchEvent(new Event("vlue-digital-card-changed"));
    } catch {
      /* ignore */
    }
    return written?.data ?? null;
  }

  const titlePhotoUrl = str(dcc.titlePhotoUrl);
  const logoUrl = str(dcc.logoUrl);
  const website = str(dcc.website);
  const fax = str(dcc.fax);
  const email = str(dcc.email);
  const address = str(dcc.address);
  const addressRoad = str(dcc.addressRoad);
  const addressDetail = str(dcc.addressDetail);
  const dccHasAccount = Boolean(
    str(dcc.accountType) || str(dcc.bankName) || str(dcc.accountNumber)
  );
  /* 멀티 프로필 전환(replaceAccount)이거나 번들에 계좌가 있을 때만 계좌 필드를 덮어씀 */
  const replaceAccount = Boolean(opts.replaceAccount) || dccHasAccount;

  try {
    const org = str(dcc.organization || dcc.companyName);
    if (org) localStorage.setItem("myCardOrganization", org);
    else localStorage.removeItem("myCardOrganization");
  } catch {
    /* ignore */
  }

  const patch = {
    displayName: sharedName,
    title,
    department,
    approvedTitle: title,
    approvedDepartment: department,
    titleDeptApprovalStatus: TITLE_DEPT_APPROVAL.APPROVED,
    titleDeptPendingTitle: "",
    titleDeptPendingDepartment: "",
    photoDataUrl: photoUrl,
    photoUrl,
    photoFocus,
    noProfilePhoto: !photoUrl,
    titlePhotoDataUrl: titlePhotoUrl,
    noTitlePhoto: dcc.noTitlePhoto != null ? Boolean(dcc.noTitlePhoto) : !titlePhotoUrl,
    logoDataUrl: logoUrl,
    noCompanyLogo: dcc.noCompanyLogo != null ? Boolean(dcc.noCompanyLogo) : !logoUrl,
    email,
    website,
    noWebsite: dcc.noWebsite != null ? Boolean(dcc.noWebsite) : !website,
    fax,
    noFax: dcc.noFax != null ? Boolean(dcc.noFax) : !fax,
    address: address || [addressRoad, addressDetail].filter(Boolean).join(" "),
    addressRoad: addressRoad || address,
    addressDetail,
    companyIntro: str(dcc.companyIntro),
    customBackText: str(dcc.customBackText || dcc.salesContent),
    ...(replaceAccount
      ? {
          accountType: str(dcc.accountType),
          bankName: str(dcc.bankName),
          accountNumber: str(dcc.accountNumber).replace(/\D/g, ""),
          accountHolder: str(dcc.accountHolder),
          isGroupVerified: Boolean(dcc.isGroupVerified),
          accountGroupDocName: str(dcc.accountGroupDocName)
        }
      : {})
  };

  const written = writeLetteringBizcardEditable(patch);

  try {
    window.dispatchEvent(new Event(LETTERING_BIZCARD_CHANGED_EVENT));
    window.dispatchEvent(new Event("vlue-digital-card-changed"));
  } catch {
    /* ignore */
  }

  return written?.data ?? null;
}

/** @deprecated use applyDccAgentBundleToLocalCard */
export function applyDccAgentToLocalCard(profile, opts = {}) {
  if (opts.keepPhoto) {
    const fixed = readLetteringFixedIdentity();
    const displayName = str(fixed.name) || str(profile?.displayName);
    const title = str(profile?.title);
    const department = str(profile?.department);
    return (
      writeLetteringBizcardEditable({
        displayName,
        title,
        department,
        approvedTitle: title,
        approvedDepartment: department,
        titleDeptApprovalStatus: TITLE_DEPT_APPROVAL.APPROVED
      })?.data ?? null
    );
  }
  return applyDccAgentBundleToLocalCard(profile, null);
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

export function cacheBustMediaUrl(url, version) {
  const u = String(url || "").trim();
  if (!u || u.startsWith("data:") || u.startsWith("blob:")) return u;
  const v = String(version || "").trim();
  if (!v) return u;
  const sep = u.includes("?") ? "&" : "?";
  return `${u}${sep}v=${encodeURIComponent(v)}`;
}
