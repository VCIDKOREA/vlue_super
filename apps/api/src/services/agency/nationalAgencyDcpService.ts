/**
 * 국가기관 DCP — 화이트리스트 매칭 · 경로 검증 · 관리자 CRUD
 */
import { prisma } from "../../db/client.js";
import {
  AGENCY_ABNORMAL_WARNING,
  NATIONAL_AGENCY_WHITELIST_SEED
} from "../../data/nationalAgencyWhitelist.seed.js";

export const AGENCY_ROUTE_NORMAL = "normal";
export const AGENCY_ROUTE_ABNORMAL = "abnormal";

let seedPromise: Promise<void> | null = null;

export function normalizeAgencyShortNumber(raw: string): string {
  return String(raw || "").replace(/\D/g, "");
}

export function normalizeOfficialWebsite(raw: string): string {
  const t = String(raw || "").trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t.replace(/^\/+/, "")}`;
}

function normalizeRouteStatus(raw: unknown): string {
  return String(raw || "").trim().toLowerCase() === AGENCY_ROUTE_ABNORMAL
    ? AGENCY_ROUTE_ABNORMAL
    : AGENCY_ROUTE_NORMAL;
}

export type AgencyDcpPublic = {
  id: string;
  shortNumber: string;
  agencyName: string;
  officialWebsite: string;
  logoUrl: string;
  logoResourceName: string;
  enabled: boolean;
  routeStatus: string;
  sortOrder: number;
};

function serializeAgency(row: {
  id: string;
  shortNumber: string;
  agencyName: string;
  officialWebsite: string;
  logoUrl: string;
  logoResourceName: string;
  enabled: boolean;
  routeStatus: string;
  sortOrder: number;
}): AgencyDcpPublic {
  return {
    id: row.id,
    shortNumber: row.shortNumber,
    agencyName: row.agencyName,
    officialWebsite: row.officialWebsite,
    logoUrl: String(row.logoUrl || "").trim(),
    logoResourceName: row.logoResourceName,
    enabled: row.enabled,
    routeStatus: normalizeRouteStatus(row.routeStatus),
    sortOrder: row.sortOrder
  };
}

export async function ensureNationalAgencySeed(): Promise<void> {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    try {
      const count = await prisma.nationalAgencyProfile.count();
      if (count > 0) return;
      await prisma.nationalAgencyProfile.createMany({
        data: NATIONAL_AGENCY_WHITELIST_SEED.map((row) => ({
          shortNumber: row.shortNumber,
          agencyName: row.agencyName,
          officialWebsite: row.officialWebsite,
          logoResourceName: row.logoResourceName,
          sortOrder: row.sortOrder
        })),
        skipDuplicates: true
      });
    } catch (err) {
      seedPromise = null;
      console.warn("[agency-dcp] seed_failed", err);
    }
  })();
  return seedPromise;
}

export async function listNationalAgencies(): Promise<AgencyDcpPublic[]> {
  await ensureNationalAgencySeed();
  const rows = await prisma.nationalAgencyProfile.findMany({
    orderBy: [{ sortOrder: "asc" }, { shortNumber: "asc" }]
  });
  return rows.map(serializeAgency);
}

export async function matchNationalAgency(rawNumber: string): Promise<AgencyDcpPublic | null> {
  const candidates = agencyShortNumberCandidates(rawNumber);
  if (candidates.length === 0) return null;
  await ensureNationalAgencySeed();
  for (const shortNumber of candidates) {
    const row = await prisma.nationalAgencyProfile.findUnique({
      where: { shortNumber }
    });
    if (row && row.enabled) return serializeAgency(row);
  }
  return null;
}

export function agencyShortNumberCandidates(rawNumber: string): string[] {
  const d = normalizeAgencyShortNumber(rawNumber);
  if (!d) return [];
  const out = new Set<string>();
  out.add(d);
  if (d.startsWith("82") && d.length > 2) {
    const rest = d.slice(2);
    if (rest.length >= 3 && rest.length <= 4) out.add(rest);
  }
  if (d.startsWith("0") && d.length > 1) {
    const rest = d.slice(1);
    if (rest.length >= 3 && rest.length <= 4) out.add(rest);
  }
  return [...out];
}

export type AgencyCallRoute =
  | { status: "none" }
  | { status: "normal"; agency: AgencyDcpPublic }
  | { status: "abnormal"; agency: AgencyDcpPublic | null; warning: string };

/**
 * 수·발신 번호 → 정상 DCP / 비정상 경고 / 해당없음
 * forceRoute 는 테스트 시뮬레이터에서만 사용
 */
export async function resolveAgencyCallRoute(opts: {
  number: string;
  forceRoute?: string | null;
}): Promise<AgencyCallRoute> {
  const force = String(opts.forceRoute || "").trim().toLowerCase();
  const agency = await matchNationalAgency(opts.number);

  /* 테스트 force 는 화이트리스트 번호에만 적용. CEO 등 일반 번호에 abnormal 이 붙으면 안 된다. */
  if (!agency) {
    return { status: "none" };
  }
  if (force === AGENCY_ROUTE_ABNORMAL) {
    return { status: "abnormal", agency, warning: AGENCY_ABNORMAL_WARNING };
  }
  if (force === AGENCY_ROUTE_NORMAL || agency.routeStatus === AGENCY_ROUTE_NORMAL) {
    return { status: "normal", agency };
  }
  return { status: "abnormal", agency, warning: AGENCY_ABNORMAL_WARNING };
}

export function buildAgencyDcpLookupBody(
  agency: AgencyDcpPublic,
  routeStatus: string,
  warning?: string
) {
  const website = agency.officialWebsite;
  const logo = agency.logoUrl;
  return {
    matched: true,
    is_verified: true,
    source: "national_agency_dcp",
    profileKind: "dcp",
    displayName: agency.agencyName,
    jobTitle: "디지털인증프로필",
    companyName: agency.agencyName,
    email: "",
    website,
    image_url: logo,
    logo_url: logo,
    phoneE164: agency.shortNumber,
    publicHandle: "",
    membershipTier: "paid",
    digitalCardActive: true,
    profile: {
      website,
      logoUrl: logo,
      photoUrl: logo,
      organization: agency.agencyName,
      verificationItems: ["VLUE 디지털인증프로필", "국가기관 공식 번호"]
    },
    dcp: {
      id: agency.id,
      agencyName: agency.agencyName,
      shortNumber: agency.shortNumber,
      officialWebsite: website,
      logoUrl: logo,
      logoResourceName: agency.logoResourceName,
      routeStatus,
      warning: warning || ""
    }
  };
}

export async function updateNationalAgency(
  id: string,
  patch: {
    agencyName?: string;
    shortNumber?: string;
    officialWebsite?: string;
    logoUrl?: string;
    logoResourceName?: string;
    enabled?: boolean;
    routeStatus?: string;
    sortOrder?: number;
  }
) {
  const existing = await prisma.nationalAgencyProfile.findUnique({ where: { id } });
  if (!existing) return { ok: false as const, error: "기관을 찾을 수 없습니다.", status: 404 as const };

  const shortNumber = patch.shortNumber != null
    ? normalizeAgencyShortNumber(patch.shortNumber)
    : existing.shortNumber;
  if (!shortNumber) return { ok: false as const, error: "공식 번호가 필요합니다.", status: 400 as const };

  if (shortNumber !== existing.shortNumber) {
    const clash = await prisma.nationalAgencyProfile.findUnique({ where: { shortNumber } });
    if (clash) return { ok: false as const, error: "이미 등록된 공식 번호입니다.", status: 409 as const };
  }

  const row = await prisma.nationalAgencyProfile.update({
    where: { id },
    data: {
      agencyName: patch.agencyName != null ? String(patch.agencyName).trim().slice(0, 160) : undefined,
      shortNumber,
      officialWebsite:
        patch.officialWebsite != null
          ? normalizeOfficialWebsite(patch.officialWebsite).slice(0, 255)
          : undefined,
      logoUrl: patch.logoUrl != null ? String(patch.logoUrl).trim().slice(0, 1024) : undefined,
      logoResourceName:
        patch.logoResourceName != null ? String(patch.logoResourceName).trim().slice(0, 80) : undefined,
      enabled: typeof patch.enabled === "boolean" ? patch.enabled : undefined,
      routeStatus: patch.routeStatus != null ? normalizeRouteStatus(patch.routeStatus) : undefined,
      sortOrder: Number.isFinite(Number(patch.sortOrder)) ? Math.floor(Number(patch.sortOrder)) : undefined
    }
  });
  return { ok: true as const, agency: serializeAgency(row) };
}

export async function createNationalAgency(input: {
  agencyName: string;
  shortNumber: string;
  officialWebsite: string;
  logoResourceName?: string;
}) {
  const shortNumber = normalizeAgencyShortNumber(input.shortNumber);
  const agencyName = String(input.agencyName || "").trim().slice(0, 160);
  const officialWebsite = normalizeOfficialWebsite(input.officialWebsite).slice(0, 255);
  if (!shortNumber || !agencyName || !officialWebsite) {
    return { ok: false as const, error: "기관명·공식 번호·웹사이트가 필요합니다.", status: 400 as const };
  }
  const clash = await prisma.nationalAgencyProfile.findUnique({ where: { shortNumber } });
  if (clash) return { ok: false as const, error: "이미 등록된 공식 번호입니다.", status: 409 as const };
  const maxSort = await prisma.nationalAgencyProfile.aggregate({ _max: { sortOrder: true } });
  const row = await prisma.nationalAgencyProfile.create({
    data: {
      shortNumber,
      agencyName,
      officialWebsite,
      logoResourceName: String(input.logoResourceName || `dcp_logo_${shortNumber}`).slice(0, 80),
      sortOrder: (maxSort._max.sortOrder || 0) + 10
    }
  });
  return { ok: true as const, agency: serializeAgency(row) };
}
