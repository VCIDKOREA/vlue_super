import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

export async function fetchAuctionList({ category, limit = 30 } = {}) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  params.set("limit", String(limit));
  const res = await fetch(apiUrl(`/api/auction/list?${params.toString()}`), { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "경매 목록을 불러오지 못했습니다.");
  return data.items || [];
}

export async function fetchAuctionDetail(auctionId) {
  const res = await fetch(apiUrl(`/api/auction/${encodeURIComponent(auctionId)}`), { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "경매 정보를 불러오지 못했습니다.");
  return data;
}

export async function fetchAuctionMarketPrice(keyword) {
  const q = encodeURIComponent(String(keyword || "").trim());
  const res = await fetch(apiUrl(`/api/auction/market-price/search?keyword=${q}`), { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "시중가 조회에 실패했습니다.");
  return data.market_price_info || data;
}

export async function postCreateAuction(payload) {
  const res = await vlueAuthFetch(apiUrl("/api/auction"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...vlueAuthHeaders() },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "경매 등록에 실패했습니다.");
  return data.auction;
}

export async function postAuctionBid(auctionId, amountKrw) {
  const res = await vlueAuthFetch(apiUrl(`/api/auction/${encodeURIComponent(auctionId)}/bid`), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...vlueAuthHeaders() },
    body: JSON.stringify({ amountKrw })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "입찰에 실패했습니다.");
  return data;
}

export async function postAuctionAiDescription(payload) {
  const res = await fetch(apiUrl("/api/auction/ai-description"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "AI 설명 생성에 실패했습니다.");
  return data;
}

export async function postAuctionEscrowHold(auctionId) {
  const res = await vlueAuthFetch(apiUrl(`/api/auction/${encodeURIComponent(auctionId)}/escrow/hold`), {
    method: "POST",
    headers: vlueAuthHeaders()
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "에스크로 결제에 실패했습니다.");
  return data.escrow;
}

export async function postAuctionEscrowConfirm(auctionId) {
  const res = await vlueAuthFetch(apiUrl(`/api/auction/${encodeURIComponent(auctionId)}/escrow/confirm`), {
    method: "POST",
    headers: vlueAuthHeaders()
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "구매 확정에 실패했습니다.");
  return data.escrow;
}

export async function postInterestKeyword(keyword, source = "watchlist") {
  const res = await vlueAuthFetch(apiUrl("/api/auction/keywords"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...vlueAuthHeaders() },
    body: JSON.stringify({ keyword, source })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "키워드 등록에 실패했습니다.");
  return data.keyword;
}

export async function postRecordSearchKeyword(keyword) {
  const res = await vlueAuthFetch(apiUrl("/api/auction/keywords/search"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...vlueAuthHeaders() },
    body: JSON.stringify({ keyword })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  return data.keyword;
}

export async function fetchMyInterestKeywords() {
  const res = await vlueAuthFetch(apiUrl("/api/auction/keywords/me"), {
    headers: vlueAuthHeaders()
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "키워드 목록을 불러오지 못했습니다.");
  return data.keywords || [];
}
