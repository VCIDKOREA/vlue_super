import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";
import { getLocalVlueUserId } from "./showcase/resolveShowcaseOwnerUserId.js";

const RESULT_EVENT = "vlue-rewarded-ad-result";

async function jsonRequest(path, options = {}) {
  const res = await vlueAuthFetch(apiUrl(path), options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `reward_policy_${res.status}`);
  return data;
}

export function fetchMonetizationPolicy() {
  return jsonRequest("/api/monetization/policy");
}

function waitForNativeReward(requestId, timeoutMs = 120_000) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener(RESULT_EVENT, onResult);
      reject(new Error("광고 응답 시간이 초과되었습니다."));
    }, timeoutMs);
    function finish(fn, value) {
      window.clearTimeout(timer);
      window.removeEventListener(RESULT_EVENT, onResult);
      fn(value);
    }
    function onResult(event) {
      const detail = event?.detail || {};
      if (String(detail.requestId || "") !== requestId) return;
      if (detail.status === "earned") finish(resolve, detail);
      else if (detail.status === "dismissed") finish(reject, new Error("광고 시청을 완료해야 적용할 수 있습니다."));
      else if (detail.status === "busy") finish(reject, new Error("다른 광고가 진행 중입니다."));
      else if (detail.status === "error") finish(reject, new Error("광고를 불러오지 못했습니다."));
    }
    window.addEventListener(RESULT_EVENT, onResult);
  });
}

async function waitForSsv(grantId, timeoutMs = 30_000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const data = await jsonRequest(`/api/monetization/reward/${encodeURIComponent(grantId)}`);
    const status = data?.grant?.status;
    if (status === "earned" || status === "consumed") return data.grant;
    if (status === "rejected" || status === "expired") throw new Error("광고 보상 검증에 실패했습니다.");
    await new Promise((resolve) => window.setTimeout(resolve, 1000));
  }
  throw new Error("광고 보상 확인이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.");
}

/**
 * Android RewardedAd + AdMob SSV 검증.
 * 반환 grantId는 showcase_save/bgm_apply 성공 후 consumeRewardedAdGrant에 전달한다.
 */
export async function requestRewardedAdGrant(action, { targetKey = "" } = {}) {
  const challenge = await jsonRequest("/api/monetization/reward/challenge", {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ action, targetKey })
  });
  if (!challenge.required) {
    return { required: false, grantId: String(challenge.grant?.id || ""), challenge };
  }

  const userId = getLocalVlueUserId();
  const grantId = String(challenge.grant?.id || "");
  const requestId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  const bridge = window.VlueLettering || window.Android;
  if (!userId || !grantId || typeof bridge?.showRewardedAd !== "function") {
    throw new Error("보상형 광고는 VLUE Android 앱에서 이용할 수 있습니다.");
  }

  const pending = waitForNativeReward(requestId);
  let raw;
  try {
    raw = bridge.showRewardedAd(requestId, action, userId, grantId);
  } catch (error) {
    window.dispatchEvent(new CustomEvent(RESULT_EVENT, { detail: { requestId, status: "error" } }));
    await pending.catch(() => {});
    throw error;
  }
  let accepted = raw;
  try {
    accepted = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    accepted = { ok: false };
  }
  if (!accepted?.ok) {
    window.dispatchEvent(new CustomEvent(RESULT_EVENT, { detail: { requestId, status: "error" } }));
    await pending.catch(() => {});
    throw new Error("보상형 광고를 시작할 수 없습니다.");
  }
  await pending;
  await waitForSsv(grantId);
  return { required: true, grantId, challenge };
}

export async function consumeRewardedAdGrant(grantId, action) {
  if (!grantId) return { ok: true, bypassed: true };
  return jsonRequest(`/api/monetization/reward/${encodeURIComponent(grantId)}/consume`, {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ action })
  });
}
