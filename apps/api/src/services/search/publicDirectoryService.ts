import { prisma } from "../../db/client.js";
import { normalizeToE164KR } from "../../lib/phoneE164.js";
import { formatPhoneDisplayKR } from "../../lib/phoneDisplay.js";

export const PUBLIC_DIRECTORY_PROFILE_KIND = "public_directory_safe";

/**
 * 런타임 스위치 — Supabase 부하 시 기본 OFF.
 * Railway 등에서 PUBLIC_DIRECTORY_LOOKUP=1 일 때만 통화/검색/sync 조회 활성.
 */
export function isPublicDirectoryRuntimeEnabled(): boolean {
  const v = String(process.env.PUBLIC_DIRECTORY_LOOKUP || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}

export type PublicDirectoryHit = {
  id: string;
  sourceKind: string;
  displayName: string;
  phoneE164: string;
  phoneDigits: string;
  businessNumber: string;
  category: string;
  address: string;
  region: string;
};

function digitsOnly(raw: string): string {
  return String(raw || "").replace(/\D/g, "");
}

function nameNorm(raw: string): string {
  return String(raw || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function phoneDigitCandidates(raw: string): string[] {
  const d = digitsOnly(raw);
  if (!d) return [];
  const out = new Set<string>();
  out.add(d);
  if (d.startsWith("82") && d.length > 2) {
    const rest = d.slice(2);
    out.add(rest);
    if (!rest.startsWith("0")) out.add(`0${rest}`);
  }
  if (d.startsWith("0") && d.length > 1) out.add(d.slice(1));
  const e164 = normalizeToE164KR(raw);
  if (e164) out.add(digitsOnly(e164));
  return [...out].filter(Boolean);
}

function mapRow(row: {
  id: string;
  sourceKind: string;
  displayName: string;
  phoneE164: string;
  phoneDigits: string;
  businessNumber: string;
  category: string;
  address: string;
  region: string;
}): PublicDirectoryHit {
  return {
    id: row.id,
    sourceKind: row.sourceKind,
    displayName: row.displayName,
    phoneE164: row.phoneE164,
    phoneDigits: row.phoneDigits,
    businessNumber: row.businessNumber,
    category: row.category,
    address: row.address,
    region: row.region
  };
}

/** 수신 매칭 — 전화 있는 디렉터리 행만 */
export async function lookupPublicDirectoryByPhone(raw: string): Promise<PublicDirectoryHit | null> {
  if (!isPublicDirectoryRuntimeEnabled()) return null;
  const e164 = normalizeToE164KR(String(raw || "").trim());
  const cands = phoneDigitCandidates(raw);
  if (!e164 && cands.length === 0) return null;

  const or: Array<{ phoneE164?: string; phoneDigits?: string }> = [];
  if (e164) or.push({ phoneE164: e164 });
  for (const d of cands) {
    or.push({ phoneDigits: d });
    if (!d.startsWith("0") && d.length >= 8) or.push({ phoneDigits: `0${d}` });
  }

  const row = await prisma.publicDirectoryEntry.findFirst({
    where: {
      AND: [
        { OR: or },
        { phoneE164: { not: "" } }
      ]
    },
    orderBy: [{ sourceKind: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      sourceKind: true,
      displayName: true,
      phoneE164: true,
      phoneDigits: true,
      businessNumber: true,
      category: true,
      address: true,
      region: true
    }
  });
  return row ? mapRow(row) : null;
}

/** 통합검색 — 상호/기관명·사업자번호 (prefix / 정확일치만 — contains 전표 스캔 금지) */
export async function searchPublicDirectory(opts: {
  query: string;
  limit?: number;
}): Promise<PublicDirectoryHit[]> {
  if (!isPublicDirectoryRuntimeEnabled()) return [];
  const q = String(opts.query || "").trim();
  if (q.length < 2) return [];
  const limit = Math.min(Math.max(opts.limit ?? 12, 1), 20);
  const biz = digitsOnly(q);
  const norm = nameNorm(q);
  const prefix = norm.slice(0, 48);
  const displayPrefix = q.slice(0, 40);

  // btree 인덱스 친화: startsWith / 정확일치만 (ILIKE %x% 는 67만 행에서 CPU·IO 급증)
  const rows = await prisma.publicDirectoryEntry.findMany({
    where: {
      OR: [
        ...(biz.length === 10 ? [{ businessNumber: biz }] : []),
        ...(prefix ? [{ nameNorm: { startsWith: prefix } }] : []),
        ...(displayPrefix ? [{ displayName: { startsWith: displayPrefix } }] : [])
      ]
    },
    take: limit,
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      sourceKind: true,
      displayName: true,
      phoneE164: true,
      phoneDigits: true,
      businessNumber: true,
      category: true,
      address: true,
      region: true
    }
  });
  return rows.map(mapRow);
}

export function buildPublicDirectorySafeLookupBody(hit: PublicDirectoryHit) {
  const phone = hit.phoneE164 || hit.phoneDigits;
  const phoneDisplay = phone ? formatPhoneDisplayKR(phone.startsWith("+") ? phone : phone) : "";
  return {
    matched: true,
    /* 공공·학교 등 디렉터리 매칭 ≠ VLUÉ 회원 본인인증 */
    is_verified: false,
    vlue_verified_badge: false,
    source: "public_directory",
    profileKind: PUBLIC_DIRECTORY_PROFILE_KIND,
    displayName: hit.displayName,
    companyName: hit.displayName,
    organization: hit.displayName,
    jobTitle: hit.category || "",
    phoneE164: hit.phoneE164 || normalizeToE164KR(hit.phoneDigits) || "",
    phoneDisplay,
    membershipTier: "free",
    publicHandle: "",
    website: "",
    image_url: "",
    logo_url: "",
    address: hit.address,
    directory: {
      id: hit.id,
      sourceKind: hit.sourceKind,
      category: hit.category,
      region: hit.region,
      businessNumber: hit.businessNumber,
      vlueAuthLabel: "안심 디렉터리"
    },
    dcp: {
      routeStatus: "normal",
      pathVerify: false,
      publicDirectorySafe: true,
      contactName: hit.displayName,
      warning: ""
    },
    access: {
      isOwner: false,
      isActiveFollower: false,
      isMutualFollow: false,
      isShowcasePrivate: false
    },
    visibility: { phone: true, name: true, org: true, id: false }
  };
}

/** 앱 로컬 캐시용 — 전화 있는 행만 슬림 동기화 (페이지·한도 제한으로 DB 부하 완화) */
export async function listPublicDirectoryPhoneSync(opts: {
  since?: Date | null;
  limit?: number;
  cursor?: string | null;
}) {
  if (!isPublicDirectoryRuntimeEnabled()) {
    return { entries: [] as const, nextCursor: null as string | null, hasMore: false };
  }
  // 풀싱크(since 없음)는 소량, 증분은 조금 더 허용
  const hardMax = opts.since ? 1000 : 500;
  const limit = Math.min(Math.max(opts.limit ?? 500, 1), hardMax);
  const rows = await prisma.publicDirectoryEntry.findMany({
    where: {
      phoneE164: { not: "" },
      ...(opts.since ? { updatedAt: { gt: opts.since } } : {}),
      ...(opts.cursor ? { id: { gt: opts.cursor } } : {})
    },
    orderBy: { id: "asc" },
    take: limit,
    select: {
      id: true,
      phoneE164: true,
      phoneDigits: true,
      displayName: true,
      sourceKind: true,
      updatedAt: true
    }
  });
  const nextCursor = rows.length === limit ? rows[rows.length - 1]?.id ?? null : null;
  return {
    entries: rows.map((r) => ({
      id: r.id,
      p: r.phoneE164,
      d: r.phoneDigits,
      n: r.displayName,
      k: r.sourceKind,
      u: r.updatedAt.toISOString()
    })),
    nextCursor,
    hasMore: Boolean(nextCursor)
  };
}
