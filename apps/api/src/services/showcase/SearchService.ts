/**
 * V1 쇼케이스 검색 서비스 — 프라이버시 마스킹 + 해시태그/이름·상호/전화/ID·활동명 쿼리
 * PII는 허용 플래그가 true일 때만 응답에 포함 (DB에서 꺼낼 때부터 가공)
 * 이름(실명)과 상호는 별도 옵트인
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/client.js";
import { isDataUrl, isHttpMediaUrl } from "../../lib/mediaUrlGuard.js";
import { normalizeToE164KR } from "../../lib/phoneE164.js";
import { isPlatformCeoHandle } from "../admin/platformAccountRoles.js";
import { normalizeShowcaseTag } from "./showcaseTagsService.js";

export type ShowcaseSearchMode = "hashtag" | "phone" | "name" | "id";

export type MaskedShowcaseHit = {
  userId: string;
  tags: string[];
  membershipTier: string;
  organization: string;
  orgVisible: boolean;
  title: string;
  /** 회사 로고 — 배지용 (사람 아바타로 쓰지 말 것) */
  logoUrl: string;
  /** 프로필 얼굴 사진 — 검색 아바타용 */
  photoUrl: string;
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
    isOrgSearchAllowed: boolean;
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
  isOrgSearchAllowed: boolean;
  isIdSearchAllowed: boolean;
  businessProfile: { companyName: string | null; jobTitle: string | null } | null;
  digitalCard: {
    membershipTierSnapshot: string | null;
  } | null;
  /** JSON path 로만 추출한 경량 스냅샷 (전체 exportSnapshotJson 금지 — egress) */
  searchSnap?: SearchSnapLite | null;
};

type SearchSnapLite = {
  logoUrl: string;
  photoUrl: string;
  name: string;
  displayName: string;
  phone: string;
  phoneE164: string;
  organization: string;
  companyName: string;
  title: string;
  activityName: string;
  activityDisplayName: string;
  nickname: string;
  handle: string;
};

/**
 * 본인인증 + 쇼케이스/명함/검색공개로 has_active_showcase 동기화
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
      isPhoneSearchAllowed: true,
      isNameSearchAllowed: true,
      isOrgSearchAllowed: true,
      isIdSearchAllowed: true,
      digitalCard: { select: { id: true } }
    }
  });
  if (!user) return false;

  const searchableOptIn =
    user.isPhoneSearchAllowed ||
    user.isNameSearchAllowed ||
    user.isOrgSearchAllowed ||
    user.isIdSearchAllowed;

  const eligible =
    user.identityVerified &&
    user.accountStatus === "active" &&
    user.status === "ACTIVE" &&
    ((user.showcaseTags?.length || 0) > 0 || Boolean(user.digitalCard) || searchableOptIn);

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
  const lite = u.searchSnap;
  if (!lite) return {};
  return {
    logoUrl: lite.logoUrl,
    name: lite.name,
    displayName: lite.displayName,
    phone: lite.phone,
    phoneE164: lite.phoneE164,
    organization: lite.organization,
    companyName: lite.companyName,
    title: lite.title,
    activityName: lite.activityName,
    activityDisplayName: lite.activityDisplayName,
    nickname: lite.nickname,
    handle: lite.handle
  };
}

/**
 * digital_cards.export_snapshot_json 전체 SELECT 금지.
 * 컬럼 + JSON path 짧은 문자열만 읽어 Postgres egress 를 급감시킨다.
 */
async function attachSearchSnapLites(rows: UserSearchRow[]): Promise<UserSearchRow[]> {
  const ids = [...new Set(rows.map((r) => r.id).filter(Boolean))];
  if (!ids.length) return rows;

  const liteRows = await prisma.$queryRaw<
    Array<{
      user_id: string;
      logo_url: string | null;
      photo_url: string | null;
      name: string | null;
      display_name: string | null;
      phone: string | null;
      phone_e164: string | null;
      organization: string | null;
      company_name: string | null;
      title: string | null;
      activity_name: string | null;
      activity_display_name: string | null;
      nickname: string | null;
      handle: string | null;
    }>
  >`
    SELECT
      user_id,
      COALESCE(
        NULLIF(TRIM(logo_url), ''),
        NULLIF(TRIM(export_snapshot_json->>'logoUrl'), '')
      ) AS logo_url,
      COALESCE(
        NULLIF(TRIM(photo_url), ''),
        NULLIF(TRIM(export_snapshot_json->>'photoUrl'), '')
      ) AS photo_url,
      NULLIF(TRIM(export_snapshot_json->>'name'), '') AS name,
      COALESCE(
        NULLIF(TRIM(display_name), ''),
        NULLIF(TRIM(export_snapshot_json->>'displayName'), '')
      ) AS display_name,
      NULLIF(TRIM(export_snapshot_json->>'phone'), '') AS phone,
      NULLIF(TRIM(export_snapshot_json->>'phoneE164'), '') AS phone_e164,
      COALESCE(
        NULLIF(TRIM(organization), ''),
        NULLIF(TRIM(export_snapshot_json->>'organization'), '')
      ) AS organization,
      NULLIF(TRIM(export_snapshot_json->>'companyName'), '') AS company_name,
      NULLIF(TRIM(export_snapshot_json->>'title'), '') AS title,
      COALESCE(
        NULLIF(TRIM(activity_name), ''),
        NULLIF(TRIM(export_snapshot_json->>'activityName'), '')
      ) AS activity_name,
      NULLIF(TRIM(export_snapshot_json->>'activityDisplayName'), '') AS activity_display_name,
      NULLIF(TRIM(export_snapshot_json->>'nickname'), '') AS nickname,
      NULLIF(TRIM(export_snapshot_json->>'handle'), '') AS handle
    FROM digital_cards
    WHERE user_id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))})
  `;

  const byUser = new Map<string, SearchSnapLite>();
  for (const r of liteRows) {
    const logoRaw = String(r.logo_url || "").trim();
    const photoRaw = String(r.photo_url || "").trim();
    byUser.set(r.user_id, {
      logoUrl: isHttpMediaUrl(logoRaw) && !isDataUrl(logoRaw) ? logoRaw : "",
      photoUrl: isHttpMediaUrl(photoRaw) && !isDataUrl(photoRaw) ? photoRaw : "",
      name: String(r.name || "").trim(),
      displayName: String(r.display_name || "").trim(),
      phone: String(r.phone || "").trim(),
      phoneE164: String(r.phone_e164 || "").trim(),
      organization: String(r.organization || "").trim(),
      companyName: String(r.company_name || "").trim(),
      title: String(r.title || "").trim(),
      activityName: String(r.activity_name || "").trim(),
      activityDisplayName: String(r.activity_display_name || "").trim(),
      nickname: String(r.nickname || "").trim(),
      handle: String(r.handle || "").trim()
    });
  }

  return rows.map((row) => ({
    ...row,
    searchSnap: byUser.get(row.id) || null
  }));
}

function digitsOnly(v: unknown): string {
  return String(v || "").replace(/\D/g, "");
}

function normalizeKrDigits(d: string): string {
  if (d.startsWith("82") && d.length >= 10) return `0${d.slice(2)}`;
  return d;
}

function phoneMatchesQuery(u: UserSearchRow, queryDigits: string): boolean {
  if (queryDigits.length < 9) return false;
  const q = normalizeKrDigits(queryDigits);
  const candidates = [
    digitsOnly(u.phoneE164),
    digitsOnly(snapOf(u).phone),
    digitsOnly(snapOf(u).phoneE164)
  ]
    .map(normalizeKrDigits)
    .filter(Boolean);
  return candidates.some((p) => p === q || p.endsWith(q) || q.endsWith(p.slice(-10)) || p.includes(q));
}

function nameFieldMatches(u: UserSearchRow, needle: string): boolean {
  if (!u.isNameSearchAllowed) return false;
  const n = needle.toLowerCase();
  const snap = snapOf(u);
  const fields = [u.legalName, snap.name, snap.displayName];
  return fields.some((f) => String(f || "").toLowerCase().includes(n));
}

function orgFieldMatches(u: UserSearchRow, needle: string): boolean {
  if (!u.isOrgSearchAllowed) return false;
  const n = needle.toLowerCase();
  const snap = snapOf(u);
  const fields = [u.businessProfile?.companyName, snap.organization, snap.companyName];
  return fields.some((f) => String(f || "").toLowerCase().includes(n));
}

function nameOrOrgMatches(u: UserSearchRow, needle: string): boolean {
  return nameFieldMatches(u, needle) || orgFieldMatches(u, needle);
}

function idOrActivityMatches(u: UserSearchRow, needle: string): boolean {
  const n = needle.replace(/^@/, "").toLowerCase();
  if (n.length < 2) return false;
  const snap = snapOf(u);
  const handle = String(u.publicHandle || "")
    .replace(/^@/, "")
    .toLowerCase();
  if (handle && (handle === n || handle.includes(n) || n.includes(handle))) return true;
  const activity = [
    snap.activityName,
    snap.activityDisplayName,
    snap.displayName,
    snap.nickname,
    snap.handle
  ];
  return activity.some((f) => {
    const s = String(f || "")
      .replace(/^@/, "")
      .toLowerCase();
    return Boolean(s) && (s === n || s.includes(n));
  });
}

/**
 * Case A/B 마스킹 — 허용되지 않은 PII는 응답에 절대 넣지 않음
 * 이름·상호는 각각 독립 마스킹
 */
export function maskShowcaseHit(u: UserSearchRow): MaskedShowcaseHit {
  const snap = snapOf(u);
  const phoneAllowed = Boolean(u.isPhoneSearchAllowed);
  const nameAllowed = Boolean(u.isNameSearchAllowed);
  const orgAllowed = Boolean(u.isOrgSearchAllowed);
  const idAllowed = Boolean(u.isIdSearchAllowed);

  const rawName = String(u.legalName || snap.name || snap.displayName || "").trim();
  const rawPhone = String(u.phoneE164 || snap.phone || "").trim();
  const handle = String(u.publicHandle || snap.handle || "").trim();
  const org = String(u.businessProfile?.companyName || snap.organization || snap.companyName || "").trim();

  return {
    userId: u.id,
    tags: u.showcaseTags || [],
    membershipTier: u.digitalCard?.membershipTierSnapshot || "free",
    organization: orgAllowed ? org : "",
    orgVisible: orgAllowed && Boolean(org),
    title: String(u.businessProfile?.jobTitle || snap.title || ""),
    logoUrl: (() => {
      const logo = String(snap.logoUrl || "").trim();
      return isHttpMediaUrl(logo) && !isDataUrl(logo) ? logo : "";
    })(),
    photoUrl: (() => {
      const photo = String(snap.photoUrl || "").trim();
      return isHttpMediaUrl(photo) && !isDataUrl(photo) ? photo : "";
    })(),
    displayName: nameAllowed && rawName ? rawName : MASKED_NAME,
    nameVisible: nameAllowed && Boolean(rawName),
    phone: phoneAllowed ? rawPhone : "",
    phoneVisible: phoneAllowed && Boolean(rawPhone),
    publicHandle: idAllowed ? handle : "",
    idInquiryEnabled: idAllowed && Boolean(handle),
    privacy: {
      isPhoneSearchAllowed: phoneAllowed,
      isNameSearchAllowed: nameAllowed,
      isOrgSearchAllowed: orgAllowed,
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
  isOrgSearchAllowed: true,
  isIdSearchAllowed: true,
  businessProfile: { select: { companyName: true, jobTitle: true } },
  /* exportSnapshotJson 전체 SELECT 금지 — base64 사진이 있으면 검색 1회에 수십~수백 MB egress */
  digitalCard: { select: { membershipTierSnapshot: true } }
} as const;

function baseTargetWhere() {
  return {
    hasActiveShowcase: true,
    identityVerified: true,
    accountStatus: "active" as const,
    status: "ACTIVE" as const
  };
}

/**
 * 유료 대상 필터 — 행마다 isPaidMember N+1 금지 (구독·B2B 배치 + 스냅샷)
 * egress·레이턴시 재발 방지용
 */
async function filterPaidTargets(rows: UserSearchRow[]): Promise<UserSearchRow[]> {
  if (!rows.length) return [];
  const paidIds = new Set<string>();
  for (const u of rows) {
    if (isPlatformCeoHandle(u.publicHandle)) {
      paidIds.add(u.id);
      continue;
    }
    const t = u.digitalCard?.membershipTierSnapshot;
    if (t === "paid" || t === "standard" || t === "premium" || t === "b2b") {
      paidIds.add(u.id);
    }
  }
  const remaining = rows.filter((r) => !paidIds.has(r.id)).map((r) => r.id);
  if (remaining.length) {
    const [subs, ents] = await Promise.all([
      prisma.userSubscription.findMany({
        where: {
          userId: { in: remaining },
          status: "active",
          cycleEndAt: { gt: new Date() }
        },
        select: { userId: true }
      }),
      prisma.b2BEnterpriseAccount.findMany({
        where: {
          adminUserId: { in: remaining },
          status: { in: ["draft", "active"] }
        },
        select: { adminUserId: true }
      })
    ]);
    for (const s of subs) paidIds.add(s.userId);
    for (const e of ents) paidIds.add(e.adminUserId);
  }
  return rows.filter((r) => paidIds.has(r.id));
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
  const limited = paid.slice(0, limit);
  const withSnap = await attachSearchSnapLites(limited);
  return withSnap.map(maskShowcaseHit);
}

/**
 * 전화번호 다이렉트 검색 — isPhoneSearchAllowed=true 대상만
 */
export async function searchByPhone(rawPhone: string, limit = 12): Promise<MaskedShowcaseHit[]> {
  const e164 = normalizeToE164KR(rawPhone);
  const queryDigits = digitsOnly(rawPhone);
  if (!e164 && queryDigits.length < 9) return [];

  let users: UserSearchRow[] = [];
  if (e164) {
    users = (await prisma.user.findMany({
      where: {
        ...baseTargetWhere(),
        isPhoneSearchAllowed: true,
        phoneE164: e164
      },
      select: searchSelect,
      take: limit
    })) as UserSearchRow[];
  }

  if (!users.length && queryDigits.length >= 9) {
    const candidates = (await prisma.user.findMany({
      where: {
        ...baseTargetWhere(),
        isPhoneSearchAllowed: true
      },
      select: searchSelect,
      take: 200
    })) as UserSearchRow[];
    const withSnap = await attachSearchSnapLites(candidates);
    users = withSnap.filter((u) => phoneMatchesQuery(u, queryDigits)).slice(0, limit);
  } else if (users.length) {
    users = await attachSearchSnapLites(users);
  }

  const paid = await filterPaidTargets(users);
  return paid.map(maskShowcaseHit);
}

/**
 * 이름·상호 검색 — 각각 isNameSearchAllowed / isOrgSearchAllowed 대상만 매칭
 * 결과 마스킹도 허용된 필드만 노출
 */
export async function searchByName(rawName: string, limit = 24): Promise<MaskedShowcaseHit[]> {
  const name = String(rawName || "").trim();
  if (name.length < 2) return [];

  const users = (await prisma.user.findMany({
    where: {
      ...baseTargetWhere(),
      OR: [
        {
          isNameSearchAllowed: true,
          legalName: { contains: name, mode: "insensitive" }
        },
        {
          isOrgSearchAllowed: true,
          businessProfile: { companyName: { contains: name, mode: "insensitive" } }
        }
      ]
    },
    select: searchSelect,
    take: 80
  })) as UserSearchRow[];

  /* 스냅샷 성명/상호만 있는 경우 — 경량 JSON path 스냅으로 추가 매칭 */
  const extraPool = (await prisma.user.findMany({
    where: {
      ...baseTargetWhere(),
      OR: [{ isNameSearchAllowed: true }, { isOrgSearchAllowed: true }],
      digitalCard: { isNot: null }
    },
    select: searchSelect,
    take: 120
  })) as UserSearchRow[];

  const extraWithSnap = await attachSearchSnapLites(extraPool);
  const seen = new Set(users.map((u) => u.id));
  for (const u of extraWithSnap) {
    if (seen.has(u.id)) continue;
    if (nameOrOrgMatches(u, name)) {
      users.push(u);
      seen.add(u.id);
    }
  }

  const paid = await filterPaidTargets(users);
  const limited = paid.slice(0, limit);
  const withSnap = await attachSearchSnapLites(limited);
  return withSnap.map(maskShowcaseHit);
}

/**
 * 아이디·활동명 검색 — isIdSearchAllowed=true 대상만
 */
export async function searchByPublicId(rawId: string, limit = 12): Promise<MaskedShowcaseHit[]> {
  const handle = String(rawId || "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
  if (handle.length < 2) return [];

  const exact = (await prisma.user.findMany({
    where: {
      ...baseTargetWhere(),
      isIdSearchAllowed: true,
      publicHandle: { equals: handle, mode: "insensitive" }
    },
    select: searchSelect,
    take: limit
  })) as UserSearchRow[];

  const candidates = (await prisma.user.findMany({
    where: {
      ...baseTargetWhere(),
      isIdSearchAllowed: true
    },
    select: searchSelect,
    take: 120
  })) as UserSearchRow[];

  const candidatesWithSnap = await attachSearchSnapLites(candidates);
  const seen = new Set(exact.map((u) => u.id));
  const merged = [...exact];
  for (const u of candidatesWithSnap) {
    if (seen.has(u.id)) continue;
    if (idOrActivityMatches(u, handle)) {
      merged.push(u);
      seen.add(u.id);
    }
  }

  const paid = await filterPaidTargets(merged);
  const limited = paid.slice(0, limit);
  const withSnap = await attachSearchSnapLites(limited);
  return withSnap.map(maskShowcaseHit);
}

export type PrivacyPatch = {
  isPhoneSearchAllowed?: boolean;
  isNameSearchAllowed?: boolean;
  isOrgSearchAllowed?: boolean;
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
  if (typeof patch.isOrgSearchAllowed === "boolean") {
    data.isOrgSearchAllowed = patch.isOrgSearchAllowed;
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
        isOrgSearchAllowed: true,
        isIdSearchAllowed: true,
        hasActiveShowcase: true
      }
    });
    return cur;
  }
  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      isPhoneSearchAllowed: true,
      isNameSearchAllowed: true,
      isOrgSearchAllowed: true,
      isIdSearchAllowed: true,
      hasActiveShowcase: true
    }
  });
  await markShowcaseActiveIfEligible(userId);
  return {
    ...updated,
    hasActiveShowcase: await refreshHasActiveShowcase(userId)
  };
}

export async function getSearchPrivacy(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      isPhoneSearchAllowed: true,
      isNameSearchAllowed: true,
      isOrgSearchAllowed: true,
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
