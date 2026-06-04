import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";

async function parseJson(res) {
  return res.json().catch(() => ({}));
}

function throwApiError(data, fallback) {
  throw new Error(data?.error || fallback);
}

/** @returns {Promise<{ storeProfileId, draft, provider, raw }>} */
export async function postVisionDraft({ imageUrl, imageBase64, storeProfileId, sellerMemo }) {
  const res = await vlueAuthFetch(apiUrl("/api/sourcing/vision-draft"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify({ imageUrl, imageBase64, storeProfileId, sellerMemo })
  });
  const data = await parseJson(res);
  if (!res.ok) throwApiError(data, "AI 상세페이지 초안 생성에 실패했습니다.");
  return data;
}

/** @returns {Promise<{ item }>} */
export async function postInlineSourcingImport(url) {
  const res = await vlueAuthFetch(apiUrl("/api/sourcing/inline-import"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify({ url })
  });
  const data = await parseJson(res);
  if (!res.ok) throwApiError(data, "인라인 소싱에 실패했습니다.");
  return data;
}

/** @returns {Promise<{ campaign }>} */
export async function createGroupBuyCampaign({ title, targetQty, durationMinutes }) {
  const res = await vlueAuthFetch(apiUrl("/api/groupbuy/campaigns"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify({ title, targetQty, durationMinutes })
  });
  const data = await parseJson(res);
  if (!res.ok) throwApiError(data, "공구 캠페인 생성에 실패했습니다.");
  return data;
}

/** @returns {Promise<{ tick }>} */
export async function fetchGroupBuyTick(campaignId) {
  const res = await vlueAuthFetch(apiUrl(`/api/groupbuy/campaigns/${encodeURIComponent(campaignId)}/tick`));
  const data = await parseJson(res);
  if (!res.ok) throwApiError(data, "공구 현황을 불러오지 못했습니다.");
  return data;
}

/** @returns {Promise<{ tick }>} */
export async function postGroupBuyTick(campaignId, soldQtyDelta = 1) {
  const res = await vlueAuthFetch(apiUrl(`/api/groupbuy/campaigns/${encodeURIComponent(campaignId)}/tick`), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify({ soldQtyDelta })
  });
  const data = await parseJson(res);
  if (!res.ok) throwApiError(data, "참여 처리에 실패했습니다.");
  return data;
}

/** @returns {Promise<{ items, domain }>} */
export async function fetchVaultItems() {
  const res = await vlueAuthFetch(apiUrl("/api/vault/items"));
  const data = await parseJson(res);
  if (!res.ok) throwApiError(data, "파트너십 보관함을 불러오지 못했습니다.");
  return data;
}

/** @returns {Promise<{ item }>} */
export async function addVaultItem({ title, kind, payloadJson }) {
  const res = await vlueAuthFetch(apiUrl("/api/vault/items"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify({ title, kind, payloadJson })
  });
  const data = await parseJson(res);
  if (!res.ok) throwApiError(data, "보관함에 담기에 실패했습니다.");
  return data;
}

/** @returns {Promise<{ endpoint }>} */
export async function createLiveEndpoint(platform = "vlue") {
  const res = await vlueAuthFetch(apiUrl("/api/live/endpoints"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify({ platform })
  });
  const data = await parseJson(res);
  if (!res.ok) throwApiError(data, "라이브 엔드포인트 생성에 실패했습니다.");
  return data;
}

/** @returns {Promise<{ embed }>} */
export async function fetchLiveEmbed(platform, streamId) {
  const res = await vlueAuthFetch(
    apiUrl(`/api/live/embed/${encodeURIComponent(platform)}/${encodeURIComponent(streamId)}`)
  );
  const data = await parseJson(res);
  if (!res.ok) throwApiError(data, "라이브 정보를 불러오지 못했습니다.");
  return data;
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}

export function dataUrlToBase64(dataUrl) {
  const s = String(dataUrl || "");
  const idx = s.indexOf(",");
  return idx >= 0 ? s.slice(idx + 1) : s;
}

/** @returns {Promise<{ draft, provider, raw }>} */
export async function postAiGenerate({ imageBase64List, keywords, sellerMemo, storeProfileId }) {
  const res = await vlueAuthFetch(apiUrl("/api/sourcing/ai-generate"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify({
      imageBase64List: (imageBase64List || []).slice(0, 10),
      keywords: keywords || sellerMemo,
      sellerMemo
    })
  });
  const data = await parseJson(res);
  if (!res.ok) throwApiError(data, "AI 상세페이지 생성에 실패했습니다.");
  return data;
}

/** @returns {Promise<{ vault, assets, payload }>} */
export async function postRegisterPageProduct(body) {
  const res = await vlueAuthFetch(apiUrl("/api/sourcing/register-product"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: JSON.stringify(body)
  });
  const data = await parseJson(res);
  if (!res.ok) throwApiError(data, "페이지 쇼핑 등록에 실패했습니다.");
  return data;
}

/** @returns {Promise<{ items }>} */
export async function fetchPageFeed() {
  const res = await vlueAuthFetch(apiUrl("/api/sourcing/page-feed"));
  const data = await parseJson(res);
  if (!res.ok) throwApiError(data, "페이지 쇼핑 피드를 불러오지 못했습니다.");
  return data;
}
