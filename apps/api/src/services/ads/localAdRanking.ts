import type { LocalAdDto } from "./localAdService.js";

/** 핫플레이스 AI 송출 점수 (0~100) — 즉시 상단 고정 없음 */
export function scoreLocalAdForHotplace(ad: LocalAdDto): number {
  const ageMs = Date.now() - new Date(ad.createdAt).getTime();
  const ageHours = Math.max(0, ageMs / 3_600_000);
  const recency = Math.max(0, 1 - ageHours / 168);
  const hasImage = ad.imageUrl ? 1 : 0;
  const textRich = Math.min(String(ad.description || "").length, 200) / 200;
  const locRich = Math.min(String(ad.location || "").length, 40) / 40;
  const linkedPost = ad.feedPostId ? 0.12 : 0;
  const raw = recency * 0.42 + hasImage * 0.22 + textRich * 0.14 + locRich * 0.1 + linkedPost;
  return Math.round(Math.min(100, Math.max(0, raw * 100)));
}

export function rankLocalAdsForHotplace(ads: LocalAdDto[]): LocalAdDto[] {
  return [...ads]
    .map((ad) => ({ ad, score: scoreLocalAdForHotplace(ad) }))
    .sort((a, b) => b.score - a.score || b.ad.createdAt.localeCompare(a.ad.createdAt))
    .map(({ ad, score }) => ({ ...ad, aiScore: score }));
}
