/**
 * 쇼케이스·프로필 조회 시 팔로우·검색 공개 설정 기반 PII 필터링
 */
export type ProfileField = "phone" | "name" | "org" | "id";

export type UserPrivacyRow = {
  id: string;
  isShowcasePrivate: boolean;
  isPhoneSearchAllowed: boolean;
  isNameSearchAllowed: boolean;
  isOrgSearchAllowed: boolean;
  isIdSearchAllowed: boolean;
  isPhoneFollowersAllowed: boolean;
  isNameFollowersAllowed: boolean;
  isOrgFollowersAllowed: boolean;
  isIdFollowersAllowed: boolean;
  isAddressSearchAllowed?: boolean;
  isAddressFollowersAllowed?: boolean;
  dccExposureConfigured?: boolean;
};

export type ViewerAccessContext = {
  viewerId: string | null;
  ownerId: string;
  isOwner: boolean;
  isActiveFollower: boolean;
  isMutualFollow: boolean;
};

export const MASKED_NAME = "비공개 회원";

/** card lookup·follow profile — 마이그레이션 전 DB 호환 (DCC 주소 노출 컬럼 제외) */
export const privacySelect = {
  id: true,
  isShowcasePrivate: true,
  isPhoneSearchAllowed: true,
  isNameSearchAllowed: true,
  isOrgSearchAllowed: true,
  isIdSearchAllowed: true,
  isPhoneFollowersAllowed: true,
  isNameFollowersAllowed: true,
  isOrgFollowersAllowed: true,
  isIdFollowersAllowed: true
} as const;

/** DCC 주소 노출 설정 — 마이그레이션 적용 DB 전용 */
export const privacySelectDccExposure = {
  isAddressSearchAllowed: true,
  isAddressFollowersAllowed: true,
  dccExposureConfigured: true
} as const;

function searchAllowed(owner: UserPrivacyRow, field: ProfileField): boolean {
  switch (field) {
    case "phone":
      return Boolean(owner.isPhoneSearchAllowed);
    case "name":
      return Boolean(owner.isNameSearchAllowed);
    case "org":
      return Boolean(owner.isOrgSearchAllowed);
    case "id":
      return Boolean(owner.isIdSearchAllowed);
    default:
      return false;
  }
}

function followerAllowed(owner: UserPrivacyRow, field: ProfileField): boolean {
  switch (field) {
    case "phone":
      return Boolean(owner.isPhoneFollowersAllowed);
    case "name":
      return Boolean(owner.isNameFollowersAllowed);
    case "org":
      return Boolean(owner.isOrgFollowersAllowed);
    case "id":
      return Boolean(owner.isIdFollowersAllowed);
    default:
      return false;
  }
}

/** 팔로워·비공개·검색 공개 설정을 반영한 필드 노출 여부 */
export function canViewProfileField(
  owner: UserPrivacyRow,
  field: ProfileField,
  ctx: ViewerAccessContext
): boolean {
  if (ctx.isOwner) return true;

  if (ctx.isActiveFollower && followerAllowed(owner, field)) {
    return true;
  }

  if (owner.isShowcasePrivate) {
    return false;
  }

  return searchAllowed(owner, field);
}

export type MaskableProfile = {
  displayName?: string | null;
  legalName?: string | null;
  phoneE164?: string | null;
  publicHandle?: string | null;
  companyName?: string | null;
  jobTitle?: string | null;
};

export type MaskedProfileView = {
  displayName: string;
  nameVisible: boolean;
  phoneE164: string;
  phoneVisible: boolean;
  publicHandle: string;
  idVisible: boolean;
  companyName: string;
  orgVisible: boolean;
  jobTitle: string;
  access: {
    isOwner: boolean;
    isActiveFollower: boolean;
    isMutualFollow: boolean;
    isShowcasePrivate: boolean;
  };
  visibility: {
    phone: boolean;
    name: boolean;
    org: boolean;
    id: boolean;
  };
};

export function maskProfileForViewer(
  owner: UserPrivacyRow,
  raw: MaskableProfile,
  ctx: ViewerAccessContext
): MaskedProfileView {
  const rawName = String(raw.displayName || raw.legalName || "").trim();
  const rawPhone = String(raw.phoneE164 || "").trim();
  const rawHandle = String(raw.publicHandle || "").trim();
  const rawOrg = String(raw.companyName || "").trim();
  const rawTitle = String(raw.jobTitle || "").trim();

  const nameOk = canViewProfileField(owner, "name", ctx) && Boolean(rawName);
  const phoneOk = canViewProfileField(owner, "phone", ctx) && Boolean(rawPhone);
  const orgOk = canViewProfileField(owner, "org", ctx) && Boolean(rawOrg);
  const idOk = canViewProfileField(owner, "id", ctx) && Boolean(rawHandle);

  return {
    displayName: nameOk ? rawName : MASKED_NAME,
    nameVisible: nameOk,
    phoneE164: phoneOk ? rawPhone : "",
    phoneVisible: phoneOk,
    publicHandle: idOk ? rawHandle : "",
    idVisible: idOk,
    companyName: orgOk ? rawOrg : "",
    orgVisible: orgOk,
    jobTitle: orgOk ? rawTitle : "",
    access: {
      isOwner: ctx.isOwner,
      isActiveFollower: ctx.isActiveFollower,
      isMutualFollow: ctx.isMutualFollow,
      isShowcasePrivate: Boolean(owner.isShowcasePrivate)
    },
    visibility: {
      phone: phoneOk,
      name: nameOk,
      org: orgOk,
      id: idOk
    }
  };
}
