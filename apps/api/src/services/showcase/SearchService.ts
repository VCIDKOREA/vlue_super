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
import { isDccExposureComplete, resolveDirectoryAddress, resolveDirectoryPhone } from "../dcc/dccExposure.js";
import { buildDistanceKmByUserId, type GeoPoint } from "../dcc/dccAddressDistance.js";
import { geocodeDccAddress } from "../../integrations/kakao/kakaoAddressGeocode.js";
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
  /** 검색된 명함은 이름을 항상 표시 */
  displayName: string;
  nameVisible: boolean;
  /** 허용 시 실번호, 아니면 010-****-**** (전화연결 금지) */
  phone: string;
  phoneVisible: boolean;
  phoneDialEnabled: boolean;
  address: string;
  addressVisible: boolean;
  /** ID 문의 버튼용 — 허용 시 publicHandle */
  publicHandle: string;
  idInquiryEnabled: boolean;
  privacy: {
    isPhoneSearchAllowed: boolean;
    isNameSearchAllowed: boolean;
    isOrgSearchAllowed: boolean;
    isIdSearchAllowed: boolean;
    isAddressSearchAllowed: boolean;
  };
  /** 검색자 현재 위치(GPS) ↔ DCC 등록 주소 km. 주소 비공개·없음은 순위 제외 */
  distanceKm: number | null;
  distanceRankEligible: boolean;
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
  isAddressSearchAllowed: boolean;
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
  address: string;
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
      address: string | null;
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
      NULLIF(TRIM(export_snapshot_json->>'handle'), '') AS handle,
      NULLIF(TRIM(export_snapshot_json->>'address'), '') AS address
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
      handle: String(r.handle || "").trim(),
      address: String(r.address || "").trim()
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
 * 검색 결과 카드 — 이름은 항상 표시. 전화·주소만 검색 노출 설정 적용.
 * 수락된 지인(fullAccess)은 전부 공개.
 */
export function maskShowcaseHit(u: UserSearchRow, opts?: { fullAccess?: boolean }): MaskedShowcaseHit {
  const snap = snapOf(u);
  const fullAccess = Boolean(opts?.fullAccess);
  const phoneAllowed = Boolean(u.isPhoneSearchAllowed);
  const nameAllowed = Boolean(u.isNameSearchAllowed);
  const orgAllowed = Boolean(u.isOrgSearchAllowed);
  const idAllowed = Boolean(u.isIdSearchAllowed);
  const addressAllowed = Boolean(u.isAddressSearchAllowed);

  const rawName = String(u.legalName || snap.name || snap.displayName || "").trim();
  const rawPhone = String(u.phoneE164 || snap.phone || "").trim();
  const handle = String(u.publicHandle || snap.handle || "").trim();
  const org = String(u.businessProfile?.companyName || snap.organization || snap.companyName || "").trim();
  const rawAddress = String(snap.address || "").trim();
  const phoneDir = resolveDirectoryPhone({
    rawPhone,
    allowed: phoneAllowed,
    fullAccess
  });
  const addrDir = resolveDirectoryAddress({
    rawAddress,
    allowed: addressAllowed,
    fullAccess
  });

  return {
    userId: u.id,
    tags: u.showcaseTags || [],
    membershipTier: u.digitalCard?.membershipTierSnapshot || "free",
    organization: orgAllowed || fullAccess ? org : "",
    orgVisible: (orgAllowed || fullAccess) && Boolean(org),
    title: String(u.businessProfile?.jobTitle || snap.title || ""),
    logoUrl: (() => {
      const logo = String(snap.logoUrl || "").trim();
      return isHttpMediaUrl(logo) && !isDataUrl(logo) ? logo : "";
    })(),
    photoUrl: (() => {
      const photo = String(snap.photoUrl || "").trim();
      return isHttpMediaUrl(photo) && !isDataUrl(photo) ? photo : "";
    })(),
    displayName: rawName || (handle ? `@${handle}` : "") || MASKED_NAME,
    nameVisible: Boolean(rawName || handle),
    phone: phoneDir.phone,
    phoneVisible: phoneDir.phoneVisible,
    phoneDialEnabled: phoneDir.phoneDialEnabled,
    address: addrDir.address,
    addressVisible: addrDir.addressVisible,
    publicHandle: idAllowed || fullAccess ? handle : "",
    idInquiryEnabled: (idAllowed || fullAccess) && Boolean(handle),
    privacy: {
      isPhoneSearchAllowed: phoneAllowed,
      isNameSearchAllowed: nameAllowed,
      isOrgSearchAllowed: orgAllowed,
      isIdSearchAllowed: idAllowed,
      isAddressSearchAllowed: addressAllowed
    },
    distanceKm: null,
    distanceRankEligible: false
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
  isAddressSearchAllowed: true,
  businessProfile: { select: { companyName: true, jobTitle: true } },
  /* exportSnapshotJson 전체 SELECT 금지 — base64 사진이 있으면 검색 1회에 수십~수백 MB egress */
  digitalCard: { select: { membershipTierSnapshot: true } }
} as const;

async function acceptedFriendIds(viewerId: string, ownerIds: string[]): Promise<Set<string>> {
  const ids = [...new Set(ownerIds.filter(Boolean))];
  if (!viewerId || !ids.length) return new Set();
  const rows = await prisma.friendRequest.findMany({
    where: {
      status: "accepted",
      OR: [
        { fromUserId: viewerId, toUserId: { in: ids } },
        { toUserId: viewerId, fromUserId: { in: ids } }
      ]
    },
    select: { fromUserId: true, toUserId: true }
  });
  const set = new Set<string>();
  for (const r of rows) {
    set.add(r.fromUserId === viewerId ? r.toUserId : r.fromUserId);
  }
  return set;
}

async function maskHitsForViewer(
  rows: UserSearchRow[],
  viewerId?: string | null,
  origin?: GeoPoint | null
): Promise<MaskedShowcaseHit[]> {
  const friendIds = viewerId ? await acceptedFriendIds(viewerId, rows.map((r) => r.id)) : new Set<string>();
  const masked = rows.map((u) =>
    maskShowcaseHit(u, { fullAccess: Boolean(viewerId && (viewerId === u.id || friendIds.has(u.id))) })
  );
  const dist = await buildDistanceKmByUserId({
    origin: origin || null,
    hits: rows.map((u) => ({
      userId: u.id,
      rawAddress: String(snapOf(u).address || "").trim(),
      isAddressSearchAllowed: Boolean(u.isAddressSearchAllowed)
    })),
    geocode: geocodeDccAddress
  });
  return masked.map((hit) => {
    const km = dist.byUserId.get(hit.userId);
    const eligible = typeof km === "number";
    return {
      ...hit,
      distanceKm: eligible ? km : null,
      distanceRankEligible: eligible
    };
  });
}

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
export async function searchByHashtag(
  query: string,
  limit = 24,
  viewerId?: string | null,
  origin?: GeoPoint | null
): Promise<MaskedShowcaseHit[]> {
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
  return maskHitsForViewer(withSnap, viewerId, origin);
}

/**
 * 전화번호 다이렉트 검색 — isPhoneSearchAllowed=true 대상만
 */
export async function searchByPhone(
  rawPhone: string,
  limit = 12,
  viewerId?: string | null,
  origin?: GeoPoint | null
): Promise<MaskedShowcaseHit[]> {
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
  return maskHitsForViewer(paid, viewerId, origin);
}

/**
 * 이름·상호 검색 — 각각 isNameSearchAllowed / isOrgSearchAllowed 대상만 매칭
 * 결과 마스킹도 허용된 필드만 노출
 */
export async function searchByName(
  rawName: string,
  limit = 24,
  viewerId?: string | null,
  origin?: GeoPoint | null
): Promise<MaskedShowcaseHit[]> {
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
  return maskHitsForViewer(withSnap, viewerId, origin);
}

/**
 * 아이디·활동명 검색 — isIdSearchAllowed=true 대상만
 */
export async function searchByPublicId(
  rawId: string,
  limit = 12,
  viewerId?: string | null,
  origin?: GeoPoint | null
): Promise<MaskedShowcaseHit[]> {
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
  return maskHitsForViewer(withSnap, viewerId, origin);
}

export type PrivacyPatch = {
  isPhoneSearchAllowed?: boolean;
  isNameSearchAllowed?: boolean;
  isOrgSearchAllowed?: boolean;
  isIdSearchAllowed?: boolean;
  isAddressSearchAllowed?: boolean;
};

const privacySelectFields = {
  isPhoneSearchAllowed: true,
  isNameSearchAllowed: true,
  isOrgSearchAllowed: true,
  isIdSearchAllowed: true,
  isAddressSearchAllowed: true,
  isPhoneFollowersAllowed: true,
  isAddressFollowersAllowed: true,
  dccExposureConfigured: true,
  hasActiveShowcase: true
} as const;

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
  if (typeof patch.isAddressSearchAllowed === "boolean") {
    data.isAddressSearchAllowed = patch.isAddressSearchAllowed;
  }
  if (!Object.keys(data).length) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: privacySelectFields
    });
  }
  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: privacySelectFields
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
      ...privacySelectFields,
      identityVerified: true
    }
  });
}

export type DccExposureSavePatch = {
  phoneSearch: boolean;
  addressSearch: boolean;
  phoneFollow: boolean;
  addressFollow: boolean;
};

/** DCC 설정 저장 — 4항목이 모두 boolean이어야 함 */
export async function saveDccExposure(userId: string, patch: DccExposureSavePatch) {
  const choice = {
    phoneSearch: patch.phoneSearch,
    addressSearch: patch.addressSearch,
    phoneFollow: patch.phoneFollow,
    addressFollow: patch.addressFollow
  };
  if (!isDccExposureComplete(choice)) {
    const err = new Error("EXPOSURE_REQUIRED");
    err.name = "EXPOSURE_REQUIRED";
    throw err;
  }
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      isPhoneSearchAllowed: patch.phoneSearch,
      isAddressSearchAllowed: patch.addressSearch,
      isPhoneFollowersAllowed: patch.phoneFollow,
      isAddressFollowersAllowed: patch.addressFollow,
      dccExposureConfigured: true
    },
    select: privacySelectFields
  });
  await markShowcaseActiveIfEligible(userId);
  return {
    ...updated,
    hasActiveShowcase: await refreshHasActiveShowcase(userId)
  };
}

/** 통합 진입 — mode에 따라 분기 */
export async function runShowcaseSearch(opts: {
  mode: ShowcaseSearchMode;
  query: string;
  limit?: number;
  viewerId?: string | null;
  origin?: GeoPoint | null;
}): Promise<{
  mode: ShowcaseSearchMode;
  items: MaskedShowcaseHit[];
  originReady: boolean;
}> {
  const limit = opts.limit ?? 24;
  const q = String(opts.query || "").trim();
  const viewerId = opts.viewerId || null;
  const origin = opts.origin || null;
  const mode: ShowcaseSearchMode =
    opts.mode === "phone" || opts.mode === "name" || opts.mode === "id" ? opts.mode : "hashtag";
  const items =
    mode === "phone"
      ? await searchByPhone(q, limit, viewerId, origin)
      : mode === "name"
        ? await searchByName(q, limit, viewerId, origin)
        : mode === "id"
          ? await searchByPublicId(q, limit, viewerId, origin)
          : await searchByHashtag(q, limit, viewerId, origin);
  return { mode, items, originReady: Boolean(origin) };
}
