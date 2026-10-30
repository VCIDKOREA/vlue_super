/**
 * 통화 오버레이용 멀티 레이어 번호 식별
 * 1) 호출측: VLUE 회원/명함 (cardLookup)
 * 2) 공공·자체 디렉터리
 * 3) 네이버/카카오 포털 플레이스
 * (+ 커뮤니티 제보 topLabel)
 *
 * Redis/메모리 캐시로 E.164 키 단기 저장.
 */

import { prisma } from "../../db/client.js";
import { normalizeToE164KR, phoneMatchVariants, toKoreaLocalDigits } from "../../lib/phoneE164.js";
import { formatPhoneDisplayKR } from "../../lib/phoneDisplay.js";
import { kvGet, kvSetEx } from "../../lib/redisKv.js";
import { searchKakaoLocalList } from "../../integrations/kakao/kakaoLocalSearch.js";
import { searchNaverLocalList } from "../../integrations/naver/naverLocalSearch.js";
import {
  buildPublicDirectorySafeLookupBody,
  lookupPublicDirectoryByPhone,
  type PublicDirectoryHit
} from "./publicDirectoryService.js";

export const VLUE_INTELLIGENCE_BADGE = "VLUE 스마트 인텔리전스로 찾은 번호입니다";
export const VLUE_INTELLIGENCE_BADGE_SHORT = "VLUE DB 명칭 식별 성공";

const CACHE_TTL_SEC = 300;
const CACHE_PREFIX = "vlue:phone-intel:v1:";

export type IntelligenceSource =
  | "public_directory"
  | "portal_kakao"
  | "portal_naver"
  | "community_tip";

export type PhoneIntelligenceHit = {
  displayName: string;
  category: string;
  address: string;
  source: IntelligenceSource;
  phoneE164: string;
  badge: string;
};

function digitsOnly(raw: string): string {
  return String(raw || "").replace(/\D/g, "");
}

function phonesMatch(a: string, b: string): boolean {
  const va = new Set(phoneMatchVariants(a));
  if (!va.size) return false;
  return phoneMatchVariants(b).some((v) => va.has(v));
}

function displayFormsForSearch(e164: string): string[] {
  const local = toKoreaLocalDigits(e164);
  const forms = new Set<string>();
  if (local) {
    forms.add(local);
    if (local.length === 11) {
      forms.add(`${local.slice(0, 3)}-${local.slice(3, 7)}-${local.slice(7)}`);
    } else if (local.length === 10 && local.startsWith("02")) {
      forms.add(`${local.slice(0, 2)}-${local.slice(2, 6)}-${local.slice(6)}`);
    } else if (local.length === 10) {
      forms.add(`${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`);
    }
  }
  forms.add(e164);
  forms.add(digitsOnly(e164));
  return [...forms].filter(Boolean);
}

async function lookupCommunityTip(e164: string): Promise<PhoneIntelligenceHit | null> {
  try {
    const rows = await prisma.letteringPhoneReport.findMany({
      where: { phoneE164: e164, reasonId: "community_tip" },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: { detail: true, cardSnapshot: true }
    });
    if (!rows.length) return null;
    const counts = new Map<string, { label: string; count: number }>();
    for (const row of rows) {
      const snap =
        row.cardSnapshot && typeof row.cardSnapshot === "object" && !Array.isArray(row.cardSnapshot)
          ? (row.cardSnapshot as Record<string, unknown>)
          : null;
      const label = String(snap?.label || row.detail || "")
        .trim()
        .slice(0, 40);
      if (!label) continue;
      const key = label.toLowerCase().replace(/\s+/g, "");
      const prev = counts.get(key);
      if (prev) prev.count += 1;
      else counts.set(key, { label, count: 1 });
    }
    const top = [...counts.values()].sort((a, b) => b.count - a.count)[0];
    if (!top?.label) return null;
    return {
      displayName: top.label,
      category: "커뮤니티 제보",
      address: "",
      source: "community_tip",
      phoneE164: e164,
      badge: VLUE_INTELLIGENCE_BADGE_SHORT
    };
  } catch {
    return null;
  }
}

async function lookupPortalPlace(e164: string): Promise<PhoneIntelligenceHit | null> {
  const queries = displayFormsForSearch(e164);
  /* Kakao first (전화 필드 매칭), then Naver */
  for (const q of queries.slice(0, 3)) {
    try {
      const kakao = await searchKakaoLocalList(q, 10);
      const hit = kakao.find((item) => phonesMatch(item.telephone || "", e164));
      if (hit?.place_name) {
        return {
          displayName: hit.place_name,
          category: hit.category || "",
          address: hit.road_address || hit.address || "",
          source: "portal_kakao",
          phoneE164: e164,
          badge: VLUE_INTELLIGENCE_BADGE
        };
      }
    } catch {
      /* continue */
    }
  }
  for (const q of queries.slice(0, 3)) {
    try {
      const naver = await searchNaverLocalList(q, 10);
      const hit = naver.find((item) => phonesMatch(item.telephone || "", e164));
      if (hit?.title) {
        return {
          displayName: hit.title,
          category: hit.category || "",
          address: hit.roadAddress || hit.address || "",
          source: "portal_naver",
          phoneE164: e164,
          badge: VLUE_INTELLIGENCE_BADGE
        };
      }
    } catch {
      /* continue */
    }
  }
  return null;
}

/** 오버레이용 — 디렉터리 env OFF 여도 DB에 있으면 조회 */
async function lookupDirectoryForced(raw: string): Promise<PublicDirectoryHit | null> {
  return lookupPublicDirectoryByPhone(raw, { force: true });
}

export function buildIntelligenceSafeLookupBody(hit: PhoneIntelligenceHit) {
  const phoneDisplay = formatPhoneDisplayKR(hit.phoneE164);
  const asDirectory: PublicDirectoryHit = {
    id: `intel:${hit.source}:${digitsOnly(hit.phoneE164)}`,
    sourceKind: hit.source,
    displayName: hit.displayName,
    phoneE164: hit.phoneE164,
    phoneDigits: toKoreaLocalDigits(hit.phoneE164),
    businessNumber: "",
    category: hit.category,
    address: hit.address,
    region: ""
  };
  const body = buildPublicDirectorySafeLookupBody(asDirectory);
  return {
    ...body,
    source: hit.source,
    vlueIntelligenceFound: true,
    intelligenceBadge: hit.badge,
    intelligenceSource: hit.source,
    phoneDisplay,
    directory: {
      ...body.directory,
      sourceKind: hit.source,
      vlueAuthLabel: hit.source === "community_tip" ? "제보 명칭" : "VLUE 스마트 인텔리전스",
      intelligenceBadge: hit.badge
    },
    dcp: {
      ...body.dcp,
      contactName: hit.displayName,
      intelligenceBadge: hit.badge,
      vlueIntelligenceFound: true
    }
  };
}

/**
 * Layer 2→3 (+ tip). VLUE 회원 미스 이후에만 호출.
 * 캐시 히트 시 즉시 반환.
 */
export async function resolvePhoneIntelligence(raw: string): Promise<PhoneIntelligenceHit | null> {
  const e164 = normalizeToE164KR(String(raw || "").trim());
  if (!e164) return null;
  const cacheKey = `${CACHE_PREFIX}${e164}`;

  try {
    const cached = await kvGet(cacheKey);
    if (cached) {
      if (cached === "__miss__") return null;
      const parsed = JSON.parse(cached) as PhoneIntelligenceHit;
      if (parsed?.displayName) return parsed;
    }
  } catch {
    /* ignore cache */
  }

  /* Layer 2 — 공공/자체 디렉터리 */
  const directory = await lookupDirectoryForced(raw).catch(() => null);
  if (directory?.displayName) {
    const hit: PhoneIntelligenceHit = {
      displayName: directory.displayName,
      category: directory.category || "",
      address: directory.address || "",
      source: "public_directory",
      phoneE164: e164,
      badge: VLUE_INTELLIGENCE_BADGE
    };
    void kvSetEx(cacheKey, JSON.stringify(hit), CACHE_TTL_SEC);
    return hit;
  }

  /* Layer 3 — 포털 플레이스 */
  const portal = await lookupPortalPlace(e164);
  if (portal) {
    void kvSetEx(cacheKey, JSON.stringify(portal), CACHE_TTL_SEC);
    return portal;
  }

  /* Community tip — soft identity */
  const tip = await lookupCommunityTip(e164);
  if (tip) {
    void kvSetEx(cacheKey, JSON.stringify(tip), Math.min(CACHE_TTL_SEC, 120));
    return tip;
  }

  void kvSetEx(cacheKey, "__miss__", 60);
  return null;
}
