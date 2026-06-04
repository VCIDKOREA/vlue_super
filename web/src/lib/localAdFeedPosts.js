import { apiUrl } from "./apiBase.js";
import { getPageDisplayProfile, readMyPagePosts } from "./pageProfileStorage.js";
import { vlueAuthFetch } from "./vlueAuthHeaders.js";

/**
 * 지역 광고 신청 후보 — MY 상점 피드 게시물 + (선택) 카드 피드 API
 * @param {string} [cardId]
 */
export async function loadStoreFeedPostCandidates(cardId = "") {
  const page = getPageDisplayProfile();
  const storeName = page.storeName || page.feedName || "내 매장";
  const location =
    String(page.raw?.storeRegion || page.raw?.storeAddress || page.raw?.storeContact || "").trim() ||
    "지역 미설정";

  const local = readMyPagePosts().map((p) => {
    const caption = String(p.caption || "").trim();
    return {
      id: String(p.id),
      source: "mypage",
      title: caption.slice(0, 48) || "상점 피드 게시물",
      body: caption || "상점 피드 게시물",
      imageUrl: String(p.previewUrl || "").trim(),
      storeName,
      location,
      createdAt: p.createdAt || null
    };
  });

  const cid = String(cardId || "").trim();
  if (!cid) return local;

  try {
    const res = await vlueAuthFetch(apiUrl(`/api/feed/posts?cardId=${encodeURIComponent(cid)}`));
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !Array.isArray(data.posts)) return local;
    const fromApi = data.posts.map((p) => {
      const body = String(p.body || "").trim();
      const title = String(p.title || "").trim();
      return {
        id: String(p.id),
        source: "card_feed",
        title: title || body.slice(0, 48) || "카드 피드 게시물",
        body: body || title,
        imageUrl: "",
        storeName,
        location,
        createdAt: p.createdAt || null
      };
    });
    const seen = new Set(local.map((x) => `${x.source}:${x.id}`));
    const merged = [...local];
    for (const row of fromApi) {
      const key = `${row.source}:${row.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(row);
      }
    }
    return merged;
  } catch {
    return local;
  }
}
