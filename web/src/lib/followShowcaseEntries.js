import { formatLetteringPhoneDisplay } from "./letteringPhoneMatch.js";
import { getLocalVlueUserId } from "./showcase/resolveShowcaseOwnerUserId.js";
import { fetchFollowing } from "./followApi.js";
import { searchShowcaseByTag } from "./showcase/showcaseTagsApi.js";
import { isPaidLetteringTier } from "./letteringMembership.js";

const OWNER_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(id) {
  return OWNER_UUID_RE.test(String(id || "").trim());
}

/**
 * @typedef {'trending'|'nearby'|'hashtag'|'following'} FollowBucket
 * @typedef {Object} FollowShowcaseRow
 * @property {string} id
 * @property {string} userId
 * @property {string} name
 * @property {string} subtitle
 * @property {string} phone
 * @property {string} phoneDisplay
 * @property {string} avatarUrl
 * @property {string} [publicHandle]
 * @property {FollowBucket} bucket
 * @property {string} membershipTier
 * @property {boolean} hasShowcase
 * @property {boolean} hasDigitalCard
 * @property {string[]} [tags]
 */

function withProductFlags(row, tier = "free") {
  const membershipTier = String(tier || row.membershipTier || "free").toLowerCase();
  const hasDigitalCard = isPaidLetteringTier(membershipTier);
  return {
    ...row,
    membershipTier,
    hasShowcase: true,
    hasDigitalCard
  };
}

function mapFollowingApiItem(item) {
  const userId = String(item.userId || "").trim();
  if (!isUuid(userId)) return null;
  const handle = String(item.publicHandle || "").replace(/^@/, "").trim();
  return withProductFlags(
    {
      id: `following:${userId}`,
      userId,
      name: String(item.displayName || handle || "VLUE 회원").trim(),
      subtitle: handle ? `@${handle}` : "팔로잉 중",
      phone: "",
      phoneDisplay: "",
      avatarUrl: "",
      publicHandle: handle,
      bucket: "following",
      relation: item.relation || "following",
      relationLabel: item.relationLabel || "팔로잉",
      tags: []
    },
    "paid"
  );
}

function mapSearchHit(hit, bucket) {
  const userId = String(hit.userId || "").trim();
  if (!isUuid(userId)) return null;
  const handle = String(hit.publicHandle || "").replace(/^@/, "").trim();
  const tags = Array.isArray(hit.tags) ? hit.tags : [];
  const tagLabel = tags[0] ? String(tags[0]).replace(/^#/, "") : "";
  return withProductFlags(
    {
      id: `${bucket}:${userId}`,
      userId,
      name: String(hit.displayName || handle || "VLUE 회원").trim(),
      subtitle:
        bucket === "hashtag" && tagLabel
          ? `#${tagLabel}`
          : handle
            ? `@${handle}`
            : hit.organization || "쇼케이스",
      phone: String(hit.phone || "").trim(),
      phoneDisplay: hit.phone ? formatLetteringPhoneDisplay(hit.phone) : "",
      avatarUrl: String(hit.logoUrl || "").trim(),
      publicHandle: handle,
      bucket,
      tags
    },
    hit.membershipTier || "free"
  );
}

/** 주소록·카탈로그 기반 후보 */
export function buildBaseRecommendPool({
  catalogFriends = [],
  contactMatchData = null,
  followingIds = new Set()
} = {}) {
  const me = getLocalVlueUserId();
  const byId = new Map();

  for (const u of contactMatchData?.registered || []) {
    const userId = String(u.userId || "").trim();
    if (!isUuid(userId) || userId === me || followingIds.has(userId)) continue;
    const phone = String(u.phoneDisplay || u.phoneE164 || "").trim();
    const handle = String(u.publicHandle || "").replace(/^@/, "").trim();
    byId.set(
      userId,
      withProductFlags(
        {
          id: `pool:${userId}`,
          userId,
          name: String(u.displayName || u.contactName || handle || "VLUE 회원").trim(),
          subtitle: handle ? `@${handle}` : "주소록 · VLUE 회원",
          phone,
          phoneDisplay: phone ? formatLetteringPhoneDisplay(phone) : "",
          avatarUrl: "",
          publicHandle: handle,
          bucket: "nearby",
          tags: []
        },
        u.isFriend ? "paid" : "free"
      )
    );
  }

  for (const f of catalogFriends) {
    const userId = String(f.id || f.userId || "").trim();
    if (!isUuid(userId) || userId === me || followingIds.has(userId) || byId.has(userId)) continue;
    const phone = String(f.phone || f.cardPhone || "").trim();
    byId.set(
      userId,
      withProductFlags(
        {
          id: `pool:${userId}`,
          userId,
          name: String(f.cardName || f.name || "VLUE 회원").trim(),
          subtitle: [f.cardOrg, f.cardTitle].filter(Boolean).join(" · ") || "추천",
          phone,
          phoneDisplay: phone ? formatLetteringPhoneDisplay(phone) : "",
          avatarUrl: String(f.avatarUrl || f.avatar || "").trim(),
          publicHandle: "",
          bucket: "trending",
          tags: []
        },
        f.membershipTier || "free"
      )
    );
  }

  return Array.from(byId.values());
}

export function mergeFollowingEntries(apiItems = [], catalogFriends = [], contactMatchData = null) {
  const byId = new Map();

  for (const raw of apiItems) {
    const row = mapFollowingApiItem(raw);
    if (row) byId.set(row.userId, row);
  }

  for (const f of catalogFriends) {
    const userId = String(f.id || f.userId || "").trim();
    if (!isUuid(userId)) continue;
    const phone = String(f.phone || f.cardPhone || "").trim();
    const prev = byId.get(userId);
    if (prev) {
      byId.set(
        userId,
        withProductFlags(
          {
            ...prev,
            name: prev.name || String(f.cardName || f.name || "").trim(),
            phone: prev.phone || phone,
            phoneDisplay: prev.phoneDisplay || (phone ? formatLetteringPhoneDisplay(phone) : ""),
            avatarUrl: prev.avatarUrl || String(f.avatarUrl || f.avatar || "").trim(),
            subtitle:
              prev.subtitle ||
              [f.cardOrg, f.cardTitle].filter(Boolean).join(" · ") ||
              "팔로잉 쇼케이스"
          },
          f.membershipTier || prev.membershipTier
        )
      );
    }
  }

  for (const u of contactMatchData?.registered || []) {
    const userId = String(u.userId || "").trim();
    if (!isUuid(userId) || !byId.has(userId)) continue;
    const prev = byId.get(userId);
    const phone = String(u.phoneDisplay || u.phoneE164 || "").trim();
    const handle = String(u.publicHandle || "").replace(/^@/, "").trim();
    byId.set(userId, {
      ...prev,
      phone: prev.phone || phone,
      phoneDisplay: prev.phoneDisplay || (phone ? formatLetteringPhoneDisplay(phone) : ""),
      publicHandle: prev.publicHandle || handle,
      subtitle: prev.subtitle || (handle ? `@${handle}` : "팔로잉 쇼케이스")
    });
  }

  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

/**
 * 추천을 인기급상승 / 주변 / (해시태그는 검색 UI) 로 분리
 * @param {{ geoGranted?: boolean }} opts
 */
export function splitRecommendBuckets(pool = [], trendingHits = [], opts = {}) {
  const used = new Set();
  const trending = [];

  for (const hit of trendingHits) {
    const row = mapSearchHit(hit, "trending");
    if (!row || used.has(row.userId)) continue;
    used.add(row.userId);
    trending.push({
      ...row,
      subtitle: row.tags?.[0] ? `#${String(row.tags[0]).replace(/^#/, "")} · 급상승` : "인기 급상승"
    });
  }

  const paidPool = pool
    .filter((r) => isPaidLetteringTier(r.membershipTier) && !used.has(r.userId))
    .slice(0, 12);
  for (const r of paidPool) {
    used.add(r.userId);
    trending.push({
      ...r,
      id: `trending:${r.userId}`,
      bucket: "trending",
      subtitle: r.subtitle || "인기 급상승"
    });
  }

  const nearby = [];
  if (opts.geoGranted) {
    for (const r of pool) {
      if (used.has(r.userId)) continue;
      used.add(r.userId);
      nearby.push({
        ...r,
        id: `nearby:${r.userId}`,
        bucket: "nearby",
        subtitle: "주변 추천"
      });
      if (nearby.length >= 16) break;
    }
  }

  return { trending, nearby };
}

/** 해시태그 검색 결과를 행으로 변환 */
export function mapHashtagSearchHits(items = []) {
  const out = [];
  const seen = new Set();
  for (const hit of items) {
    const row = mapSearchHit(hit, "hashtag");
    if (!row || seen.has(row.userId)) continue;
    seen.add(row.userId);
    out.push(row);
  }
  return out;
}

export async function loadFollowShowcaseLists({
  catalogFriends = [],
  contactMatchData = null,
  geoGranted = false
} = {}) {
  const me = getLocalVlueUserId();
  let apiItems = [];
  if (me) {
    const res = await fetchFollowing(me, { limit: 100 });
    if (res.ok) apiItems = res.items || [];
  }
  const following = mergeFollowingEntries(apiItems, catalogFriends, contactMatchData);
  const followingIds = new Set(following.map((r) => r.userId));
  const pool = buildBaseRecommendPool({ catalogFriends, contactMatchData, followingIds });

  let trendingHits = [];
  try {
    const trendRes = await searchShowcaseByTag("#VLUE", { mode: "hashtag" });
    if (trendRes.ok) trendingHits = trendRes.items || [];
  } catch {
    /* ignore */
  }

  const { trending, nearby } = splitRecommendBuckets(pool, trendingHits, { geoGranted });
  return { following, trending, nearby, me };
}
