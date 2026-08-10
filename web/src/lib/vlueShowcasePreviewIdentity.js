import { readBusinessMemberFlag } from "./businessMemberAccess.js";
import {
  readLetteringBizcardEditable,
  readLetteringFixedIdentity
} from "./letteringBizcardStorage.js";
import { readDigitalCardActive, readDccBroadcastOn } from "./bizcardAccountSync.js";
import { scrubLetteringDemoPollution } from "./letteringDemoPollution.js";

/** 홈 쇼케이스 미리보기 — 설정 전 예시 브랜드 */
export const VLUE_PREVIEW_EXAMPLE_BRAND = "VLUE";

/** 접힘(첫화면) 미리보기에 반드시 노출 */
export const VLUE_PREVIEW_CARD_APPLY_HINT = "명함 신청 시 반영됩니다";

/** 직함·부서 미입력 시 자리 안내 (실제 값은 `formatTitleDeptLine`) */
export const VLUE_PREVIEW_TITLE_DEPT_PLACEHOLDER = "직함 ㅣ 부서명";

/** 앞면 주소 미입력 안내 (선택) — 미입력 시 행 자체 미표시 권장 */
export const VLUE_PREVIEW_ADDRESS_PLACEHOLDER = "주소를 입력할 수 있습니다.";

/** 앞면 이메일 미입력 안내 (필수) */
export const VLUE_PREVIEW_EMAIL_PLACEHOLDER = "이메일을 입력할 수 있습니다.";

/** 앞면 웹사이트 미입력 안내 (선택) — 미입력 시 행 자체 미표시 권장 */
export const VLUE_PREVIEW_WEBSITE_PLACEHOLDER = "웹사이트를 입력할 수 있습니다.";

/** 앞면 팩스 미입력 안내 (선택) — 미입력 시 행 자체 미표시 권장 */
export const VLUE_PREVIEW_FAX_PLACEHOLDER = "팩스를 입력할 수 있습니다.";

const DEMO_ORG_POLLUTION = new Set(["VCID KOREA", "삼성생명"]);
const DEMO_TITLE_POLLUTION = new Set(["CEO", "VLUE"]);

function readOnboardingAddress() {
  try {
    const road = String(localStorage.getItem("vlue_onboarding_address") || "").trim();
    const detail = String(localStorage.getItem("vlue_onboarding_address_detail") || "").trim();
    if (road && detail) return `${road} ${detail}`;
    return road || detail;
  } catch {
    return "";
  }
}

function hasLetteringSavedAddress(ed = {}) {
  return Boolean(
    String(ed.addressRoad || "").trim() ||
      String(ed.addressDetail || "").trim() ||
      String(ed.address || "").trim()
  );
}

/** 직함 ㅣ 부서명 한 줄 — 비어 있으면 플레이스홀더 */
export function formatTitleDeptLine(title = "", department = "", opts = {}) {
  const t = String(title ?? "").trim();
  const d = String(department ?? "").trim();
  if (!t && !d) {
    return opts.allowEmpty ? "" : VLUE_PREVIEW_TITLE_DEPT_PLACEHOLDER;
  }
  if (t && d) return `${t} ㅣ ${d}`;
  return t || d;
}

/**
 * 디지털 인증명함 — 이름 / 부서 / 직책 가로 한 줄
 * 예: 이종근 ｜ 영업팀 ｜ CEO  /  이종근 ｜ CEO
 */
export function formatNameDeptTitleLine(name = "", department = "", title = "") {
  const parts = [name, department, title].map((v) => String(v ?? "").trim()).filter(Boolean);
  return parts.join(" ｜ ");
}

export function readPlatformCeoHandle() {
  try {
    return (
      String(localStorage.getItem("vlue_member_handle") || "")
        .trim()
        .toLowerCase()
        .replace(/^@/, "") === "ceo"
    );
  } catch {
    return false;
  }
}

/** 직책·부서를 명함 설정에서 실제로 신청/승인했는지 */
export function hasConfiguredTitleDept(ed = readLetteringBizcardEditable()) {
  const status = String(ed?.titleDeptApprovalStatus || "").toLowerCase();
  const approved = String(ed?.approvedTitle || "").trim();
  const pending = String(ed?.titleDeptPendingTitle || "").trim();
  const draft = String(ed?.title || "").trim();
  if (status === "approved" && approved) return true;
  if (status === "pending" && (pending || draft || approved)) return true;
  return false;
}

export function isBusinessShowcaseMember() {
  if (readBusinessMemberFlag()) return true;
  try {
    const kind = String(localStorage.getItem("vlue_membership_kind") || "").toLowerCase();
    const line = String(localStorage.getItem("vlue_line_type") || "").toLowerCase();
    return kind === "b2b" || line === "enterprise" || line === "b2b";
  } catch {
    return false;
  }
}

/**
 * 미리보기 표시명
 * - 비즈니스: 상호(없으면 VLUE 예시)
 * - 일반: 가입 실명(없으면 VLUE 예시)
 */
export function resolveShowcasePreviewDisplayName(card = {}, opts = {}) {
  const isBusiness = opts.isBusiness ?? isBusinessShowcaseMember();
  const fixed = opts.fixed || readLetteringFixedIdentity();
  const org = String(card.organization || fixed.organization || "").trim();
  const name = String(card.name || fixed.name || "").trim();
  if (isBusiness) return org || name || VLUE_PREVIEW_EXAMPLE_BRAND;
  return name || VLUE_PREVIEW_EXAMPLE_BRAND;
}

function scrubDemoOrganization(org, isCeo) {
  const v = String(org || "").trim();
  if (!v) return "";
  if (isCeo) return v;
  if (DEMO_ORG_POLLUTION.has(v)) return "";
  return v;
}

/**
 * 홈·미리보기용 카드 — 설정 전 필드는 VLUE 예시로 채움
 * (실통화 수신 오버레이에는 적용하지 말 것)
 */
export function applyShowcasePreviewExampleIdentity(card = {}) {
  const isCeo = readPlatformCeoHandle();
  const isBusiness = isBusinessShowcaseMember();
  const fixed = readLetteringFixedIdentity();
  const ed = readLetteringBizcardEditable();
  const configuredRole = isCeo || hasConfiguredTitleDept(ed);

  let organization = scrubDemoOrganization(
    card.organization || fixed.organization || "",
    isCeo
  );
  let name = String(card.name || fixed.name || "").trim();
  let title = String(card.title || "").trim();
  let department = String(card.department || "").trim();

  if (isCeo) {
    organization = organization || "VCID KOREA";
    title = title || "CEO";
    name = name || fixed.name || "이종근";
  } else {
    if (DEMO_TITLE_POLLUTION.has(title)) title = "";
    if (!configuredRole) {
      title = "";
      department = "";
    }
  }

  const displayName = isBusiness
    ? organization || name || VLUE_PREVIEW_EXAMPLE_BRAND
    : name || VLUE_PREVIEW_EXAMPLE_BRAND;

  if (isBusiness) {
    organization = organization || VLUE_PREVIEW_EXAMPLE_BRAND;
    name = displayName;
  } else {
    name = displayName;
    /* 일반회원 접힘 헤더는 실명 우선 — 오염된 상호는 숨김 */
    if (!configuredRole) organization = "";
  }

  const showTitleDeptPlaceholder = !isCeo && (!title || (!configuredRole && !department));

  /** 명함 만들기에 저장한 주소만 표시 — 가입 주소·미설정 값은 미리보기에서 숨김 */
  let address = String(card.address || "").trim();
  const onboardingAddr = readOnboardingAddress();
  if (!isCeo) {
    if (!hasLetteringSavedAddress(ed)) address = "";
    else if (onboardingAddr && address === onboardingAddr && !readDigitalCardActive()) address = "";
  }

  const email = String(ed.email || card.email || "").trim();
  const website = ed.noWebsite ? "" : String(ed.website || card.website || "").trim();
  const fax = ed.noFax ? "" : String(ed.fax || card.fax || "").trim();
  const companyIntro = String(ed.companyIntro || card.companyIntro || "").trim();
  const customBackText = String(ed.customBackText || card.customBackText || "").trim();

  return scrubLetteringDemoPollution(
    {
      ...card,
      name,
      displayName: name,
      organization,
      title: showTitleDeptPlaceholder ? "" : title,
      department: showTitleDeptPlaceholder ? "" : department,
      address,
      email,
      website,
      fax,
      companyIntro,
      customBackText,
      previewExampleBrand: showTitleDeptPlaceholder,
      previewTitleDeptPlaceholder: showTitleDeptPlaceholder,
      previewBackPlaceholders: !isCeo,
      previewDigitalCardApplied: readDigitalCardActive()
    },
    { isCeo }
  );
}

export function readShowcasePreviewDigitalCardApplied() {
  return readDigitalCardActive() && readDccBroadcastOn();
}
