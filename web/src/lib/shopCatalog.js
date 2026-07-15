/** 홈·마이페이지 공용 상점·업데이트 스토리 카탈로그 */

export const SUBSCRIBE_STORY_SHOPS = [
  { id: "s1", storyKey: "s1", name: "Soul Cafe", avatar: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200&q=80", roomId: "subscribe:soul-cafe", hasNew: true },
  { id: "s2", storyKey: "s2", name: "블루정비", avatar: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=200&q=80", roomId: "subscribe:blue-repair", hasNew: true },
  { id: "s3", storyKey: "s3", name: "커리어센터", avatar: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&q=80", roomId: "subscribe:career-center", hasNew: false },
  { id: "s4", storyKey: "s4", name: "VLUE Store", avatar: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&q=80", roomId: "subscribe:soul-cafe", hasNew: true }
];

export const SUBSCRIBE_STORY_POSTS = [
  { id: "p1", shopId: "s1", roomId: "subscribe:soul-cafe", shop: "Soul Cafe", time: "2시간 전", title: "신메뉴 오트 라떼 출시", thumb: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=80" },
  { id: "p2", shopId: "s2", roomId: "subscribe:blue-repair", shop: "역삼 블루정비", time: "5시간 전", title: "겨울 점검 패키지 안내", thumb: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&q=80" },
  { id: "p3", shopId: "s3", roomId: "subscribe:career-center", shop: "강남 커리어센터", time: "어제", title: "채용 설명회 라이브 다시보기", thumb: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80" }
];

/** 허브 업체 — 데모 제거. 실데이터 연동 전 빈 목록 */
export const HUB_BUSINESSES = [];

/** 카테고리 상점 roomId → 업데이트 스토리 shop id (s1, s2 …) */
export function getStoryIdByRoomId(roomId) {
  const rid = String(roomId || "").trim();
  if (!rid) return null;
  return SUBSCRIBE_STORY_SHOPS.find((s) => s.roomId === rid)?.id || null;
}

export function getHubShopById(id) {
  const all = [...HUB_BUSINESSES, ...SUBSCRIBE_STORY_SHOPS.map((s) => ({
    id: s.id,
    name: s.name,
    img: s.avatar,
    roomId: s.roomId,
    intro: "구독 스토리"
  }))];
  return all.find((s) => s.id === id || s.storyKey === id) || null;
}

export function getFavoritePickerShops() {
  return HUB_BUSINESSES;
}
