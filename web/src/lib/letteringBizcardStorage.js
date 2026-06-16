/** 레터링 명함 — 사용자 편집 필드 (회사명·성명·전화는 가입 고정) */

export const LETTERING_BIZCARD_STORAGE_KEY = "vlue_lettering_bizcard_v1";
export const LETTERING_BIZCARD_CHANGED_EVENT = "vlue-lettering-bizcard-changed";

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
  maxBytes: 1024 * 1024,
  maxWidth: 1200,
  maxHeight: 1600,
  accept: "image/png,image/jpeg,image/webp",
  acceptLabel: "PNG, JPG, WEBP"
};

export const LETTERING_LOGO_RULES = {
  fileNamePrefix: "lettering-company-logo",
  maxBytes: 512 * 1024,
  maxWidth: 512,
  maxHeight: 512,
  displayPx: 128,
  accept: "image/png,image/jpeg,image/webp",
  acceptLabel: "PNG, JPG, WEBP"
};

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
  noProfilePhoto: false,
  noCompanyLogo: false,
  noFax: false,
  noWebsite: false,
  approvedTitle: "",
  approvedDepartment: "",
  titleDeptApprovalStatus: "",
  titleDeptPendingTitle: "",
  titleDeptPendingDepartment: "",
  titleDeptVerifyDocKind: "",
  titleDeptVerifyDocName: "",
  titleDeptVerifyDocDataUrl: "",
  titleDeptVerifyDocIssuedAt: "",
  titleDeptSubmittedAt: ""
};

export function readLetteringFixedIdentity() {
  let organization = "";
  let name = "";
  let phone = "";
  try {
    organization =
      String(localStorage.getItem("vlue_company_locked") || "").trim() ||
      String(localStorage.getItem("myCardOrganization") || "").trim();
    name =
      String(localStorage.getItem("vlue_legal_name") || "").trim() ||
      String(localStorage.getItem("myCardDisplayName") || "").trim();
    phone = String(localStorage.getItem("myCardPhone") || "").trim();
  } catch {
    /* ignore */
  }
  return { organization, name, phone };
}

export function readLetteringBizcardEditable() {
  try {
    const raw = localStorage.getItem(LETTERING_BIZCARD_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_EDITABLE };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_EDITABLE, ...(parsed && typeof parsed === "object" ? parsed : {}) };
  } catch {
    return { ...DEFAULT_EDITABLE };
  }
}

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
      : {})
  };
  try {
    localStorage.setItem(LETTERING_BIZCARD_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(LETTERING_BIZCARD_CHANGED_EVENT));
    return next;
  } catch {
    return prev;
  }
}

function readImageSize(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("이미지를 읽을 수 없습니다."));
    img.src = dataUrl;
  });
}

/** 로고·프로필 사진 파일 검증 후 data URL 반환 */
async function prepareLetteringImageFromFile(file, rules, label = "이미지") {
  if (!file) return { ok: false, error: "파일을 선택해 주세요." };

  const type = String(file.type || "").toLowerCase();
  if (!rules.accept.split(",").includes(type)) {
    return { ok: false, error: `${rules.acceptLabel}만 업로드할 수 있습니다.` };
  }
  if (file.size > rules.maxBytes) {
    return { ok: false, error: `파일 크기는 ${Math.round(rules.maxBytes / 1024)}KB 이하여야 합니다.` };
  }

  const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  const fileName = `${rules.fileNamePrefix}.${ext}`;

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("파일을 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });

  if (!dataUrl.startsWith("data:image/")) {
    return { ok: false, error: "이미지 형식이 올바르지 않습니다." };
  }

  try {
    const { width, height } = await readImageSize(dataUrl);
    if (width > rules.maxWidth || height > rules.maxHeight) {
      return {
        ok: false,
        error: `${label}은 가로·세로 각 ${rules.maxWidth}×${rules.maxHeight}px 이하여야 합니다. (현재 ${width}×${height})`
      };
    }
  } catch (e) {
    return { ok: false, error: e.message || "이미지 검증에 실패했습니다." };
  }

  return { ok: true, dataUrl, fileName };
}

/** 로고 파일 검증 후 data URL 반환 */
export async function prepareLetteringLogoFromFile(file) {
  return prepareLetteringImageFromFile(file, LETTERING_LOGO_RULES, "로고");
}

/** 프로필 사진 검증 후 data URL 반환 */
export async function prepareLetteringPhotoFromFile(file) {
  return prepareLetteringImageFromFile(file, LETTERING_PHOTO_RULES, "프로필 사진");
}
