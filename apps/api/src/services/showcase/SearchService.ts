/**
 * V1 쇼케이스 검색 서비스 — 프라이버시 마스킹 + 해시태그/이름/전화/ID 쿼리
 * PII는 허용 플래그가 true일 때만 응답에 포함 (DB에서 꺼낼 때부터 가공)
 */
import { prisma } from "../../db/client.js";
import { normalizeToE164KR } from "../../lib/phoneE164.js";
import { isPaidMember } from "../membership/paidMemberGate.js";
import { normalizeShowcaseTag } from "./showcaseTagsService.js";

export type ShowcaseSearchMode = "hashtag" | "phone" | "name" | "id";

export type MaskedShowcaseHit = {
  userId: string;
  tags: string[];
  membershipTier: string;
  organization: string;
  title: string;
  logoUrl: string;
  /** 마스킹된 표시명 — 비허용 시 "비공개 회원" */
  displayName: string;
  nameVisible: boolean;
  /** 허용 시에만 실번호, 아니면 빈 문자열 */
  phone: string;
  phoneVisible: boolean;
  /** ID 문의 버튼용 — 허용 시 publicHandle */
  publicHandle: string;
  idInquiryEnabled: boolean;
  privacy: {
    isPhoneSearchAllowed: boolean;
    isNameSearchAllowed: boolean;
    isIdSearchAllowed: boolean;
  };
};

const MASKED_NAME = "비공개 회원";

type UserSearchRow = {
  id: string;
  phoneE164: string | null;
  legalName: string | null;
  publicHandle: string | null;
  showcaseTags: string[];
  hasActiveShowcase: boolean;
  identityVerified: boolean;
  accountStatus: string;
  status: string;
  isPhoneSearchAllowed: boolean;
  isNameSearchAllowed: boolean;
  isIdSearchAllowed: boolean;
  businessProfile: { companyName: string | null; jobTitle: string | null } | null;
  digitalCard: {
    membershipTierSnapshot: string | null;
    exportSnapshotJson: unknown;
  } | null;
};

/**
 * 본인인증 + 쇼케이스 유무로 has_active_showcase 동기화
 */
export async function refreshHasActiveShowcase(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      identityVerified: true,
      accountStatus: true,
      status: true,
      showcaseTags: true,
      hasActiveShowcase: true,
      digitalCard: { select: { id: true } }
    }
  });
  if (!user) return false;

  const eligible =
    user.identityVerified &&
    user.accountStatus === "active" &&
    user.status === "ACTIVE" &&
    ((user.showcaseTags?.length || 0) > 0 || Boolean(user.digitalCard));

  if (user.hasActiveShowcase !== eligible) {
    await prisma.user
      .update({
        where: { id: userId },
        data: { hasActiveShowcase: eligible }
      })
      .catch(() => undefined);
  }
  return eligible;
}

/** 태그 등록·프라이버시 저장 후 호출 — 검색권 갱신 */
export async function markShowcaseActiveIfEligible(userId: string): Promise<boolean> {
  return refreshHasActiveShowcase(userId);
}

function snapOf(u: UserSearchRow): Record<string, unknown> {
  const raw = u.digitalCard?.exportSnapshotJson;
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

/**
 * Case A/B 마스킹 — 허용되지 않은 PII는 응답에 절대 넣지 않음
 */
export function maskShowcaseHit(u: UserSearchRow): MaskedShowcaseHit {
  const snap = snapOf(u);
  const phoneAllowed = Boolean(u.isPhoneSearchAllowed);
  const nameAllowed = Boolean(u.isNameSearchAllowed);
  const idAllowed = Boolean(u.isIdSearchAllowed);

  const rawName = String(u.legalName || snap.name || "").trim();
  const rawPhone = String(u.phoneE164 || snap.phone || "").trim();
  const handle = String(u.publicHandle || "").trim();

  return {
    userId: u.id,
    tags: u.showcaseTags || [],
    membershipTier: u.digitalCard?.membershipTierSnapshot || "free",
    organization: String(u.businessProfile?.companyName || snap.organization || ""),
    title: String(u.businessProfile?.jobTitle || snap.title || ""),
    logoUrl: String(snap.logoUrl || ""),
    displayName: nameAllowed && rawName ? rawName : MASKED_NAME,
    nameVisible: nameAllowed && Boolean(rawName),
    phone: phoneAllowed ? rawPhone : "",
    phoneVisible: phoneAllowed && Boolean(rawPhone),
    publicHandle: idAllowed ? handle : "",
    idInquiryEnabled: idAllowed && Boolean(handle),
    privacy: {
      isPhoneSearchAllowed: phoneAllowed,
      isNameSearchAllowed: nameAllowed,
      isIdSearchAllowed: idAllowed
    }
  };
}

const searchSelect = {
  id: true,
  phoneE164: true,
  legalName: true,
  publicHandle: true,
  showcaseTags: true,
  hasActiveShowcase: true,
  identityVerified: true,
  accountStatus: true,
  status: true,
  isPhoneSearchAllowed: true,
  isNameSearchAllowed: true,
  isIdSearchAllowed: true,
  businessProfile: { select: { companyName: true, jobTitle: true } },
  digitalCard: { select: { membershipTierSnapshot: true, exportSnapshotJson: true } }
} as const;

function baseTargetWhere() {
  return {
    hasActiveShowcase: true,
    identityVerified: true,
    accountStatus: "active" as const,
    status: "ACTIVE" as const
  };
}

async function filterPaidTargets(rows: UserSearchRow[]): Promise<UserSearchRow[]> {
  const out: UserSearchRow[] = [];
  for (const u of rows) {
    const paid = await isPaidMember(u.id);
    if (paid.ok) out.push(u);
  }
  return out;
}

/**
 * #해시태그 검색 — 리스트는 노출하되 카드 PII는 마스킹
 */
export async function searchByHashtag(query: string, limit = 24): Promise<MaskedShowcaseHit[]> {
  const tag = normalizeShowcaseTag(query);
  const bare = tag.replace(/^#/, "").toLowerCase();
  if (!bare) return [];

  const users = (await prisma.user.findMany({
    where: {
      ...baseTargetWhere(),
      showcaseTags: { isEmpty: false }
    },
    select: searchSelect,
    take: 200
  })) as UserSearchRow[];

  const matched = users.filter((u) =>
    (u.showcaseTags || []).some((t) => {
      const n = String(t).toLowerCase().replace(/^#/, "");
      return n === bare || n.includes(bare) || bare.includes(n);
    })
  );

  const paid = await filterPaidTargets(matched);
  return paid.slice(0, limit).map(maskShowcaseHit);
}

/**
 * 전화번호 다이렉트 검색 — isPhoneSearchAllowed=true 대상만
 */
export async function searchByPhone(rawPhone: string, limit = 12): Promise<MaskedShowcaseHit[]> {
  const e164 = normalizeToE164KR(rawPhone);
  if (!e164) return [];

  const users = (await prisma.user.findMany({
    where: {
      ...baseTargetWhere(),
      isPhoneSearchAllowed: true,
      phoneE164: e164
    },
    select: searchSelect,
    take: limit
  })) as UserSearchRow[];

  const paid = await filterPaidTargets(users);
  return paid.map(maskShowcaseHit);
}

/**
 * 실명 검색 — isNameSearchAllowed=true 대상만
 */
export async function searchByName(rawName: string, limit = 24): Promise<MaskedShowcaseHit[]> {
  const name = String(rawName || "").trim();
  if (name.length < 2) return [];

  const users = (await prisma.user.findMany({
    where: {
      ...baseTargetWhere(),
      isNameSearchAllowed: true,
      legalName: { contains: name, mode: "insensitive" }
    },
    select: searchSelect,
    take: 80
  })) as UserSearchRow[];

  const paid = await filterPaidTargets(users);
  return paid.slice(0, limit).map(maskShowcaseHit);
}

/**
 * 플랫폼 ID(publicHandle) 검색 — isIdSearchAllowed=true 대상만
 */
export async function searchByPublicId(rawId: string, limit = 12): Promise<MaskedShowcaseHit[]> {
  const handle = String(rawId || "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
  if (handle.length < 2) return [];

  const users = (await prisma.user.findMany({
    where: {
      ...baseTargetWhere(),
      isIdSearchAllowed: true,
      publicHandle: handle
    },
    select: searchSelect,
    take: limit
  })) as UserSearchRow[];

  const paid = await filterPaidTargets(users);
  return paid.map(maskShowcaseHit);
}

export type PrivacyPatch = {
  isPhoneSearchAllowed?: boolean;
  isNameSearchAllowed?: boolean;
  isIdSearchAllowed?: boolean;
};

export async function updateSearchPrivacy(userId: string, patch: PrivacyPatch) {
  const data: Record<string, boolean> = {};
  if (typeof patch.isPhoneSearchAllowed === "boolean") {
    data.isPhoneSearchAllowed = patch.isPhoneSearchAllowed;
  }
  if (typeof patch.isNameSearchAllowed === "boolean") {
    data.isNameSearchAllowed = patch.isNameSearchAllowed;
  }
  if (typeof patch.isIdSearchAllowed === "boolean") {
    data.isIdSearchAllowed = patch.isIdSearchAllowed;
  }
  if (!Object.keys(data).length) {
    const cur = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        isPhoneSearchAllowed: true,
        isNameSearchAllowed: true,
        isIdSearchAllowed: true,
        hasActiveShowcase: true
      }
    });
    return cur;
  }
  return prisma.user.update({
    where: { id: userId },
    data,
    select: {
      isPhoneSearchAllowed: true,
      isNameSearchAllowed: true,
      isIdSearchAllowed: true,
      hasActiveShowcase: true
    }
  });
}

export async function getSearchPrivacy(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      isPhoneSearchAllowed: true,
      isNameSearchAllowed: true,
      isIdSearchAllowed: true,
      hasActiveShowcase: true,
      identityVerified: true
    }
  });
}

/** 통합 진입 — mode에 따라 분기 */
export async function runShowcaseSearch(opts: {
  mode: ShowcaseSearchMode;
  query: string;
  limit?: number;
}): Promise<{ mode: ShowcaseSearchMode; items: MaskedShowcaseHit[] }> {
  const limit = opts.limit ?? 24;
  const q = String(opts.query || "").trim();
  switch (opts.mode) {
    case "phone":
      return { mode: "phone", items: await searchByPhone(q, limit) };
    case "name":
      return { mode: "name", items: await searchByName(q, limit) };
    case "id":
      return { mode: "id", items: await searchByPublicId(q, limit) };
    case "hashtag":
    default:
      return { mode: "hashtag", items: await searchByHashtag(q, limit) };
  }
}
