/** 레터링 명함 — 사용자 편집 필드 (회사명·성명·전화는 가입 고정) */

import { formatPhoneE164ForKoreaDisplay } from "./phoneDisplay.js";
import { fitImageFile } from "./fitImageFile.js";
import { compressAndUploadBizcardImage } from "./bizcardImageUpload.js";

export const LETTERING_BIZCARD_STORAGE_KEY = "vlue_lettering_bizcard_v1";
/** 대용량 data URL — 본문 JSON과 분리해 QuotaExceeded 방지 */
export const LETTERING_BIZCARD_LOGO_KEY = "vlue_lettering_logo_data_v1";
export const LETTERING_BIZCARD_PHOTO_KEY = "vlue_lettering_photo_data_v1";
export const LETTERING_BIZCARD_COVER_KEY = "vlue_lettering_cover_data_v1";
export const LETTERING_BIZCARD_CHANGED_EVENT = "vlue-lettering-bizcard-changed";
/** 홈·미리보기에서 디지털 인증명함 설정(프로필 letteringBizcard) 열기 */
export const LETTERING_OPEN_BIZCARD_SETTINGS_EVENT = "vlue-open-lettering-bizcard-settings";

/** 명함 앞면 E 한 줄 표시 기준 (초과 시 줄바꿈·밀림) */
export const LETTERING_BIZCARD_EMAIL_MAX = 26;
export const LETTERING_BIZCARD_EMAIL_WARN = 22;

export function compactLetteringMemberEmail(raw) {
  const email = String(raw ?? "").trim();
  if (!email) return "";

  const legacy = email.match(/^member\.([0-9a-f]+)(?:@member(?:\.vlue\.kr)?)?/i);
  if (legacy) {
    const digits = legacy[1].replace(/^0+/, "") || legacy[1].slice(-4) || "1";
    const tail = digits.slice(-4).padStart(4, "0");
    return `m.${tail}@vlue.kr`;
  }

  if (/^m\.[a-z0-9]{1,8}@vlue\.kr$/i.test(email)) {
    return email.toLowerCase();
  }

  return email;
}

/** 연락처 한 줄 표시용 — 긴 주소는 가운데 생략 */
export function formatLetteringContactEmailDisplay(raw) {
  const email = compactLetteringMemberEmail(raw);
  if (!email) return "";
  if (email.length <= 24) return email;
  const at = email.indexOf("@");
  if (at < 1) return `${email.slice(0, 22)}…`;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (local.length <= 10) return email;
  return `${local.slice(0, 7)}…@${domain}`;
}

export function clampLetteringBizcardEmail(raw) {
  return compactLetteringMemberEmail(raw).slice(0, LETTERING_BIZCARD_EMAIL_MAX);
}

export function isLetteringBizcardEmailLong(raw) {
  return String(raw ?? "").trim().length > LETTERING_BIZCARD_EMAIL_WARN;
}

/** 도로명·지번 + 상세주소 → 명함 표시용 한 줄 */
export function combineLetteringBizcardAddress(road, detail) {
  const r = String(road ?? "").trim();
  const d = String(detail ?? "").trim();
  if (r && d) return `${r} ${d}`;
  return r || d;
}

/** 저장값 → 주소 입력 폼 필드 (기존 address 단일 필드 호환) */
export function readLetteringBizcardAddressFields(ed = {}) {
  const road = String(ed.addressRoad ?? "").trim();
  const detail = String(ed.addressDetail ?? "").trim();
  if (road || detail) return { road, detail };
  const legacy = String(ed.address ?? "").trim();
  return { road: legacy, detail: "" };
}

export const LETTERING_PHOTO_RULES = {
  fileNamePrefix: "lettering-profile-photo",
  maxBytes: 900 * 1024,
  maxWidth: 1920,
  maxHeight: 1920,
  accept: "image/png,image/jpeg,image/webp",
  acceptLabel: "PNG, JPG, WEBP"
};

export const LETTERING_LOGO_RULES = {
  fileNamePrefix: "lettering-company-logo",
  maxBytes: 400 * 1024,
  maxWidth: 512,
  maxHeight: 512,
  displayPx: 128,
  accept: "image/png,image/jpeg,image/webp",
  acceptLabel: "PNG, JPG, WEBP"
};

/** 프로필 사진 배경(히어로) 세로 초점 — object-position */
export const PHOTO_FOCUS_OPTIONS = [
  { id: "top", label: "상단", css: "center top" },
  { id: "center", label: "중앙", css: "center center" },
  { id: "bottom", label: "하단", css: "center bottom" }
];

export function normalizePhotoFocus(raw) {
  const v = String(raw || "")
    .trim()
    .toLowerCase();
  /* middle 별칭 → center (일부 클라이언트/스냅샷 호환) */
  if (v === "middle") return "center";
  if (v === "center" || v === "bottom" || v === "top") return v;
  return "top";
}

export function photoFocusToCss(raw) {
  const rawStr = String(raw ?? "").trim();
  /* 미설정 시 상단 강제 금지 — 수신/통화 쇼케이스는 중앙이 안전한 기본 */
  if (!rawStr) return "center center";
  const id = normalizePhotoFocus(rawStr);
  return PHOTO_FOCUS_OPTIONS.find((o) => o.id === id)?.css || "center center";
}

const DEFAULT_EDITABLE = {
  designTemplate: "classic-light",
  title: "",
  department: "",
  fax: "",
  email: "",
  website: "",
  companyIntro: "",
  customBackText: "",
  address: "",
  addressRoad: "",
  addressDetail: "",
  logoDataUrl: "",
  logoFileName: "",
  photoDataUrl: "",
  photoFileName: "",
  /** 히어로 배경 초점: top | center | bottom */
  photoFocus: "top",
  noProfilePhoto: false,
  noCompanyLogo: false,
  noFax: false,
  noWebsite: false,
  /** 담당자 스위칭용 표시명 — 없으면 가입 실명 */
  displayName: "",
  /** 카카오 피드 카드 헤더 배경(커버) data URL */
  kakaoFeedBgDataUrl: "",
  approvedTitle: "",
  approvedDepartment: "",
  titleDeptApprovalStatus: "",
  titleDeptPendingTitle: "",
  titleDeptPendingDepartment: "",
  titleDeptVerifyDocKind: "",
  titleDeptVerifyDocName: "",
  titleDeptVerifyDocDataUrl: "",
  titleDeptVerifyDocIssuedAt: "",
  titleDeptSubmittedAt: "",
  orgChangeApprovalStatus: "",
  orgChangePendingName: "",
  orgChangeEvidenceKind: "",
  orgChangeEvidenceName: "",
  orgChangeEvidenceDataUrl: "",
  orgChangeSubmittedAt: ""
};

export const ORG_CHANGE_EVIDENCE_KINDS = [
  { id: "storefront", label: "가게 간판 사진" },
  { id: "web_app", label: "서비스 웹/앱 화면" }
];

export const ORG_CHANGE_APPROVAL = {
  NONE: "",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected"
};

/** 상호 변경 신청 접수 */
export function submitOrgChangeRequest({
  pendingName = "",
  evidenceKind = "",
  evidenceName = "",
  evidenceDataUrl = ""
} = {}) {
  const name = String(pendingName || "").trim();
  if (!name) return { ok: false, error: "변경할 상호를 입력해 주세요." };
  if (!evidenceKind || !ORG_CHANGE_EVIDENCE_KINDS.some((k) => k.id === evidenceKind)) {
    return { ok: false, error: "증빙 종류(간판·웹/앱)를 선택해 주세요." };
  }
  if (!evidenceDataUrl) {
    return { ok: false, error: "증빙 사진을 첨부해 주세요." };
  }
  writeLetteringBizcardEditable({
    orgChangeApprovalStatus: ORG_CHANGE_APPROVAL.PENDING,
    orgChangePendingName: name,
    orgChangeEvidenceKind: evidenceKind,
    orgChangeEvidenceName: String(evidenceName || "").trim(),
    orgChangeEvidenceDataUrl: String(evidenceDataUrl || ""),
    orgChangeSubmittedAt: new Date().toISOString()
  });
  return { ok: true };
}

/** 승인 시 상호 자동 반영 */
export function applyApprovedOrgChange(approvedName) {
  const name = String(approvedName || "").trim();
  if (!name) return false;
  try {
    localStorage.setItem("vlue_company_locked", name);
    localStorage.setItem("myCardOrganization", name);
  } catch {
    return false;
  }
  writeLetteringBizcardEditable({
    orgChangeApprovalStatus: ORG_CHANGE_APPROVAL.APPROVED,
    orgChangePendingName: "",
    orgChangeEvidenceKind: "",
    orgChangeEvidenceName: "",
    orgChangeEvidenceDataUrl: "",
    orgChangeSubmittedAt: ""
  });
  return true;
}

/**
 * 승인 상태 반영 — pending 요청이 approved로 바뀌면 상호 자동 변경
 * @param {{ status: string, approvedName?: string }} result
 */
export function syncOrgChangeApprovalResult(result = {}) {
  const status = String(result.status || "").trim();
  const ed = readLetteringBizcardEditable();
  if (status === ORG_CHANGE_APPROVAL.APPROVED) {
    const name = String(result.approvedName || ed.orgChangePendingName || "").trim();
    return applyApprovedOrgChange(name);
  }
  if (status === ORG_CHANGE_APPROVAL.REJECTED) {
    writeLetteringBizcardEditable({
      orgChangeApprovalStatus: ORG_CHANGE_APPROVAL.REJECTED
    });
    return false;
  }
  if (status === ORG_CHANGE_APPROVAL.PENDING) {
    writeLetteringBizcardEditable({
      orgChangeApprovalStatus: ORG_CHANGE_APPROVAL.PENDING
    });
  }
  return false;
}

export function readLetteringFixedIdentity() {
  let organization = "";
  let name = "";
  let phone = "";
  try {
    const handle = String(localStorage.getItem("vlue_member_handle") || "")
      .trim()
      .toLowerCase()
      .replace(/^@/, "");

    /* 플랫폼 ceo — 이름/회사/직책·번호 고정 */
    if (handle === "ceo") {
      const ceoName = "이종근";
      const ceoOrg = "VCID KOREA";
      localStorage.setItem("vlue_phone_e164", "+821080144666");
      localStorage.setItem("myCardPhone", "010-8014-4666");
      localStorage.setItem("myCardDisplayName", ceoName);
      localStorage.setItem("vlue_legal_name", ceoName);
      localStorage.setItem("myCardOrganization", ceoOrg);
      if (!String(localStorage.getItem("vlue_company_locked") || "").trim()) {
        localStorage.setItem("vlue_company_locked", ceoOrg);
      }
      phone = "010-8014-4666";
      name = ceoName;
      organization = ceoOrg;
      ensureCeoLetteringTitle();
    } else {
      organization =
        String(localStorage.getItem("vlue_company_locked") || "").trim() ||
        String(localStorage.getItem("myCardOrganization") || "").trim();
      name =
        String(localStorage.getItem("vlue_legal_name") || "").trim() ||
        String(localStorage.getItem("myCardDisplayName") || "").trim();
      const e164 = String(localStorage.getItem("vlue_phone_e164") || "").trim();
      const fromE164 = e164 ? formatPhoneE164ForKoreaDisplay(e164) : "";
      phone = fromE164 || String(localStorage.getItem("myCardPhone") || "").trim();
      if (fromE164) {
        localStorage.setItem("myCardPhone", fromE164);
        phone = fromE164;
      }
    }
  } catch {
    /* ignore */
  }
  return { organization, name, phone };
}

/** ceo 계정 — 직책 CEO, 데모 부서 제거 */
function ensureCeoLetteringTitle() {
  try {
    const raw = localStorage.getItem(LETTERING_BIZCARD_STORAGE_KEY);
    const prev = raw ? JSON.parse(raw) : {};
    if (!prev || typeof prev !== "object") return;
    const next = {
      ...prev,
      title: "CEO",
      department: "",
      approvedTitle: "CEO",
      approvedDepartment: "",
      titleDeptPendingTitle: "",
      titleDeptPendingDepartment: "",
      titleDeptApprovalStatus: "approved"
    };
    if (String(prev.companyIntro || "").trim() === "보안 솔루션 통합 플랫폼") {
      next.companyIntro = "";
    }
    const changed =
      String(prev.title || "") !== "CEO" ||
      String(prev.approvedTitle || "") !== "CEO" ||
      prev.department ||
      prev.approvedDepartment ||
      prev.titleDeptPendingTitle ||
      prev.titleDeptPendingDepartment ||
      String(prev.titleDeptApprovalStatus || "") !== "approved" ||
      next.companyIntro !== prev.companyIntro;
    if (changed) {
      localStorage.setItem(LETTERING_BIZCARD_STORAGE_KEY, JSON.stringify({ ...DEFAULT_EDITABLE, ...next }));
      window.dispatchEvent(new Event(LETTERING_BIZCARD_CHANGED_EVENT));
    }
  } catch {
    /* ignore */
  }
}

function readBlobKey(key) {
  try {
    return String(localStorage.getItem(key) || "");
  } catch {
    return "";
  }
}

function writeBlobKey(key, value) {
  const v = String(value || "");
  if (!v) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return { ok: true };
  }
  try {
    localStorage.setItem(key, v);
    return { ok: true };
  } catch (e) {
    const quota =
      e &&
      (e.name === "QuotaExceededError" ||
        e.code === 22 ||
        e.code === 1014 ||
        /quota/i.test(String(e.message || "")));
    return {
      ok: false,
      error: quota
        ? "저장 공간이 부족합니다. 사진·로고를 줄이거나 다른 이미지를 사용해 주세요."
        : "이미지 저장에 실패했습니다."
    };
  }
}

export function readLetteringBizcardEditable() {
  try {
    const raw = localStorage.getItem(LETTERING_BIZCARD_STORAGE_KEY);
    if (!raw) {
      return {
        ...DEFAULT_EDITABLE,
        logoDataUrl: readBlobKey(LETTERING_BIZCARD_LOGO_KEY),
        photoDataUrl: readBlobKey(LETTERING_BIZCARD_PHOTO_KEY),
        kakaoFeedBgDataUrl: readBlobKey(LETTERING_BIZCARD_COVER_KEY)
      };
    }
    const parsed = JSON.parse(raw);
    const base = { ...DEFAULT_EDITABLE, ...(parsed && typeof parsed === "object" ? parsed : {}) };
    /* 분리 키 우선 — 본문에 남아 있던 구버전 data URL도 흡수 */
    const logoSeparated = readBlobKey(LETTERING_BIZCARD_LOGO_KEY);
    const photoSeparated = readBlobKey(LETTERING_BIZCARD_PHOTO_KEY);
    const coverSeparated = readBlobKey(LETTERING_BIZCARD_COVER_KEY);
    const legacyLogo = String(base.logoDataUrl || base.logoUrl || "").trim();
    const legacyPhoto = String(base.photoDataUrl || base.photoUrl || "").trim();
    const legacyCover = String(base.kakaoFeedBgDataUrl || "").trim();
    /* 구버전 본문 data URL → 분리 키로 이전 */
    if (!logoSeparated && legacyLogo.startsWith("data:")) writeBlobKey(LETTERING_BIZCARD_LOGO_KEY, legacyLogo);
    if (!photoSeparated && legacyPhoto.startsWith("data:")) writeBlobKey(LETTERING_BIZCARD_PHOTO_KEY, legacyPhoto);
    if (!coverSeparated && legacyCover.startsWith("data:")) writeBlobKey(LETTERING_BIZCARD_COVER_KEY, legacyCover);
    return {
      ...base,
      photoFocus: normalizePhotoFocus(base.photoFocus),
      logoDataUrl: logoSeparated || legacyLogo,
      photoDataUrl: photoSeparated || legacyPhoto,
      kakaoFeedBgDataUrl: coverSeparated || legacyCover
    };
  } catch {
    return { ...DEFAULT_EDITABLE };
  }
}

/**
 * @returns {{ ok: boolean, data: object, error?: string }}
 */
export function writeLetteringBizcardEditable(patch = {}) {
  const prev = readLetteringBizcardEditable();
  const next = {
    ...prev,
    ...patch,
    ...(Object.prototype.hasOwnProperty.call(patch, "designTemplate")
      ? {
          designTemplate: String(patch.designTemplate || "classic-light").trim() || "classic-light"
        }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(patch, "email")
      ? { email: clampLetteringBizcardEmail(patch.email).trim() }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(patch, "photoFocus")
      ? { photoFocus: normalizePhotoFocus(patch.photoFocus) }
      : {})
  };

  let logoDataUrl = String(next.logoDataUrl || "").trim();
  let photoDataUrl = String(next.photoDataUrl || "").trim();
  const coverDataUrl = String(next.kakaoFeedBgDataUrl || "").trim();

  /* 로고·프로필 사진이 같은 값이면 혼용으로 보고 분리 */
  if (logoDataUrl && photoDataUrl && logoDataUrl === photoDataUrl) {
    if (Object.prototype.hasOwnProperty.call(patch, "logoDataUrl")) {
      photoDataUrl = "";
    } else if (Object.prototype.hasOwnProperty.call(patch, "photoDataUrl")) {
      logoDataUrl = "";
    } else {
      logoDataUrl = "";
    }
  }
  next.logoDataUrl = logoDataUrl;
  next.photoDataUrl = photoDataUrl;

  /* 본문 JSON에는 대용량 data URL을 넣지 않음 */
  const meta = {
    ...next,
    logoDataUrl: "",
    photoDataUrl: "",
    kakaoFeedBgDataUrl: "",
    logoUrl: undefined,
    photoUrl: undefined
  };
  delete meta.logoUrl;
  delete meta.photoUrl;

  const prevMetaRaw = localStorage.getItem(LETTERING_BIZCARD_STORAGE_KEY);

  try {
    const logoChanging =
      Object.prototype.hasOwnProperty.call(patch, "logoDataUrl") || logoDataUrl !== prev.logoDataUrl;
    const photoChanging =
      Object.prototype.hasOwnProperty.call(patch, "photoDataUrl") ||
      photoDataUrl !== prev.photoDataUrl;
    const coverChanging =
      Object.prototype.hasOwnProperty.call(patch, "kakaoFeedBgDataUrl") ||
      coverDataUrl !== prev.kakaoFeedBgDataUrl;

    /* 이미지 blob 먼저 저장 — 실패 시 파일명만 바뀌는 불일치 방지 */
    if (logoChanging) {
      const logoWrite = writeBlobKey(LETTERING_BIZCARD_LOGO_KEY, next.noCompanyLogo ? "" : logoDataUrl);
      if (!logoWrite.ok) {
        return { ok: false, data: prev, error: logoWrite.error };
      }
    }
    if (photoChanging) {
      const photoWrite = writeBlobKey(
        LETTERING_BIZCARD_PHOTO_KEY,
        next.noProfilePhoto ? "" : photoDataUrl
      );
      if (!photoWrite.ok) {
        if (logoChanging) {
          writeBlobKey(LETTERING_BIZCARD_LOGO_KEY, prev.noCompanyLogo ? "" : prev.logoDataUrl || "");
        }
        return { ok: false, data: prev, error: photoWrite.error };
      }
    }
    if (coverChanging) {
      const coverWrite = writeBlobKey(LETTERING_BIZCARD_COVER_KEY, coverDataUrl);
      if (!coverWrite.ok) {
        if (logoChanging) {
          writeBlobKey(LETTERING_BIZCARD_LOGO_KEY, prev.noCompanyLogo ? "" : prev.logoDataUrl || "");
        }
        if (photoChanging) {
          writeBlobKey(
            LETTERING_BIZCARD_PHOTO_KEY,
            prev.noProfilePhoto ? "" : prev.photoDataUrl || ""
          );
        }
        return { ok: false, data: prev, error: coverWrite.error };
      }
    }

    const nextMetaJson = JSON.stringify(meta);
    if (prevMetaRaw !== nextMetaJson) {
      localStorage.setItem(LETTERING_BIZCARD_STORAGE_KEY, nextMetaJson);
    }

    const merged = {
      ...meta,
      logoDataUrl: next.noCompanyLogo ? "" : logoDataUrl,
      photoDataUrl: next.noProfilePhoto ? "" : photoDataUrl,
      kakaoFeedBgDataUrl: coverDataUrl
    };
    window.dispatchEvent(new Event(LETTERING_BIZCARD_CHANGED_EVENT));
    return { ok: true, data: merged };
  } catch (e) {
    try {
      if (prevMetaRaw != null) localStorage.setItem(LETTERING_BIZCARD_STORAGE_KEY, prevMetaRaw);
      else localStorage.removeItem(LETTERING_BIZCARD_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    const quota =
      e &&
      (e.name === "QuotaExceededError" ||
        e.code === 22 ||
        e.code === 1014 ||
        /quota/i.test(String(e.message || "")));
    return {
      ok: false,
      data: prev,
      error: quota
        ? "저장 공간이 부족합니다. 사진·로고를 줄이거나 다시 시도해 주세요."
        : "명함 저장에 실패했습니다."
    };
  }
}

/** 로고·프로필 사진 — 초과 시 자동 리사이즈·압축 후 data URL 반환 */
async function prepareLetteringImageFromFile(file, rules, label = "이미지") {
  if (!file) return { ok: false, error: "파일을 선택해 주세요." };

  const type = String(file.type || "").toLowerCase();
  if (!rules.accept.split(",").includes(type)) {
    return { ok: false, error: `${rules.acceptLabel}만 업로드할 수 있습니다.` };
  }

  const fitRules = {
    maxWidth: rules.maxWidth,
    maxHeight: rules.maxHeight,
    maxBytes: rules.maxBytes,
    preferPng: Boolean(rules.preferPng ?? rules === LETTERING_LOGO_RULES),
    fileNamePrefix: rules.fileNamePrefix
  };
  const result = await fitImageFile(file, fitRules);
  if (!result.ok) {
    return { ok: false, error: result.error.replace(/^이미지/, label) };
  }
  return { ok: true, dataUrl: result.dataUrl, fileName: `${rules.fileNamePrefix}.${result.fileName.split(".").pop()}` };
}

/** 로고 파일 — 압축 후 R2(가능 시) / data URL */
export async function prepareLetteringLogoFromFile(file) {
  const result = await compressAndUploadBizcardImage(file, "logo");
  if (!result.ok) return { ok: false, error: result.error };
  /* 미리보기·저장: 로컬 dataUrl 우선 (R2 publicUrl 이 비거나 지연되면 예전 프로필 사진이 남는 문제 방지) */
  const localDataUrl = String(result.dataUrl || "").trim();
  const remoteUrl = String(result.url || "").trim();
  const previewUrl = localDataUrl || remoteUrl;
  if (!previewUrl) return { ok: false, error: "로고 이미지를 읽지 못했습니다." };
  return {
    ok: true,
    dataUrl: previewUrl,
    /** 서버·스냅샷용 — https 우선 */
    persistUrl: remoteUrl.startsWith("http") ? remoteUrl : previewUrl,
    fileName: result.fileName,
    via: result.via,
    uploadWarning: result.uploadWarning
  };
}

/** 프로필 사진 — 압축 후 R2(가능 시) / data URL */
export async function prepareLetteringPhotoFromFile(file) {
  const result = await compressAndUploadBizcardImage(file, "photo");
  if (!result.ok) return { ok: false, error: result.error };
  const localDataUrl = String(result.dataUrl || "").trim();
  const remoteUrl = String(result.url || "").trim();
  const previewUrl = localDataUrl || remoteUrl;
  if (!previewUrl) return { ok: false, error: "사진을 읽지 못했습니다." };
  return {
    ok: true,
    dataUrl: previewUrl,
    persistUrl: remoteUrl.startsWith("http") ? remoteUrl : previewUrl,
    fileName: result.fileName,
    via: result.via,
    uploadWarning: result.uploadWarning
  };
}
