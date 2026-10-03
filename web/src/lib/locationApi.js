import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";
import { getSupabase, isSupabaseConfigured } from "./supabaseClient.js";
import { getLocalVlueUserId } from "./showcase/resolveShowcaseOwnerUserId.js";

function nativeBridge() {
  if (typeof window === "undefined") return null;
  return window.VlueLettering || window.Android || null;
}

function waitRewardedResult(requestId, timeoutMs = 120_000) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener("vlue-rewarded-ad-result", onResult);
      reject(new Error("광고 응답 시간이 초과되었습니다."));
    }, timeoutMs);
    function onResult(event) {
      const detail = event?.detail || {};
      if (String(detail.requestId || "") !== requestId) return;
      window.clearTimeout(timer);
      window.removeEventListener("vlue-rewarded-ad-result", onResult);
      resolve(detail);
    }
    window.addEventListener("vlue-rewarded-ad-result", onResult);
  });
}

/** 무료 회원 V-Map 방 개설 — 15초 보상형 광고 시청 완료 후에만 진행 */
export async function watchVmapCreateAd() {
  const native = nativeBridge();
  if (typeof native?.showRewardedAd !== "function") {
    throw new Error("보상형 광고는 VLUÉ Android 앱에서 이용할 수 있습니다.");
  }
  const requestId = globalThis.crypto?.randomUUID?.() || `${Date.now()}`;
  const userId = getLocalVlueUserId() || "vmap-local";
  const pending = waitRewardedResult(requestId);
  let raw;
  try {
    raw = native.showRewardedAd(requestId, "vmap_create", userId, "vmap-create");
  } catch (error) {
    window.dispatchEvent(new CustomEvent("vlue-rewarded-ad-result", { detail: { requestId, status: "error" } }));
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
    window.dispatchEvent(new CustomEvent("vlue-rewarded-ad-result", { detail: { requestId, status: "error" } }));
    await pending.catch(() => {});
    throw new Error("보상형 광고를 시작하지 못했습니다.");
  }
  const detail = await pending;
  if (detail.status !== "earned") {
    throw new Error("광고 시청을 완료해야 방을 개설할 수 있습니다.");
  }
}

async function read(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "요청에 실패했습니다.");
  return data;
}

function authInit(method, body) {
  return {
    method,
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  };
}

export async function fetchMapSponsor() {
  try {
    const res = await fetch(apiUrl("/api/location/sponsor"));
    const data = await res.json().catch(() => ({}));
    return data?.banner || null;
  } catch {
    return null;
  }
}

export function publishPresence(payload) {
  return vlueAuthFetch(apiUrl("/api/location/presence"), authInit("POST", payload)).then(read);
}

export function fetchFamilyLocations() {
  return vlueAuthFetch(apiUrl("/api/location/family"), { headers: vlueAuthHeaders() }).then(read);
}

export function createVmapRoom(payload) {
  return vlueAuthFetch(apiUrl("/api/location/vmap"), authInit("POST", payload)).then(read);
}

export function searchVmapPlaces(query) {
  const q = encodeURIComponent(String(query || "").trim());
  return vlueAuthFetch(apiUrl(`/api/location/place-search?q=${q}`), { headers: vlueAuthHeaders() }).then(read);
}

export function updateVmapPlace(roomId, payload) {
  return vlueAuthFetch(apiUrl(`/api/location/vmap/${roomId}/place`), authInit("PATCH", payload)).then(read);
}

export function joinVmapRoom(roomId, payload) {
  return vlueAuthFetch(apiUrl(`/api/location/vmap/${roomId}/join`), authInit("POST", payload)).then(read);
}

export function fetchVmapFriends(roomId = "") {
  const q = roomId ? `?roomId=${encodeURIComponent(String(roomId))}` : "";
  return vlueAuthFetch(apiUrl(`/api/location/friends${q}`), { headers: vlueAuthHeaders() }).then(read);
}

export function inviteVmapFriends(roomId, userIds) {
  return vlueAuthFetch(
    apiUrl(`/api/location/vmap/${roomId}/invite`),
    authInit("POST", { userIds: Array.isArray(userIds) ? userIds : [] })
  ).then(read);
}

export function departVmap(roomId, payload) {
  return vlueAuthFetch(apiUrl(`/api/location/vmap/${roomId}/depart`), authInit("POST", payload)).then(read);
}

export function arriveVmap(roomId) {
  return vlueAuthFetch(apiUrl(`/api/location/vmap/${roomId}/arrive`), authInit("POST", {})).then(read);
}

export function publishVmapPresence(roomId, payload) {
  return vlueAuthFetch(apiUrl(`/api/location/vmap/${roomId}/presence`), authInit("POST", payload)).then(read);
}

export function fetchVmapRoom(roomId) {
  return vlueAuthFetch(apiUrl(`/api/location/vmap/${roomId}`), { headers: vlueAuthHeaders() }).then(read);
}

export function postVmapMessage(roomId, payload) {
  return vlueAuthFetch(apiUrl(`/api/location/vmap/${roomId}/messages`), authInit("POST", payload)).then(read);
}

export function fetchVmapMessages(roomId, after) {
  const q = after ? `?after=${encodeURIComponent(after)}` : "";
  return vlueAuthFetch(apiUrl(`/api/location/vmap/${roomId}/messages${q}`), { headers: vlueAuthHeaders() }).then(read);
}

export function postFamilyLocationMessage(payload) {
  return vlueAuthFetch(apiUrl("/api/location/family/messages"), authInit("POST", payload)).then(read);
}

/** 가족 위치방에서 상대 위치로 이동 시작 — 채팅·푸시·알림함 */
export function startFamilyNavigate(payload) {
  return vlueAuthFetch(apiUrl("/api/location/family/navigate"), authInit("POST", payload)).then(read);
}

export function fetchFamilyLocationMessages(after) {
  const q = after ? `?after=${encodeURIComponent(after)}` : "";
  return vlueAuthFetch(apiUrl(`/api/location/family/messages${q}`), { headers: vlueAuthHeaders() }).then(read);
}

export function fetchVmapGuide({ fromLat, fromLng, toLat, toLng, mode }) {
  const q = new URLSearchParams({
    fromLat: String(fromLat),
    fromLng: String(fromLng),
    toLat: String(toLat),
    toLng: String(toLng),
    mode: String(mode || "recommend")
  });
  return vlueAuthFetch(apiUrl(`/api/location/guide?${q}`), { headers: vlueAuthHeaders() }).then(read);
}

export function exitVmapApi(roomId) {
  return vlueAuthFetch(apiUrl(`/api/location/vmap/${roomId}/exit`), authInit("POST", {})).then(read);
}

export function finishVmapApi(roomId) {
  return vlueAuthFetch(apiUrl(`/api/location/vmap/${roomId}/finish`), authInit("POST", {})).then(read);
}

/** 키가 있으면 Supabase broadcast로 갱신을 재촉하고, 없으면 폴링만 쓴다. */
export function subscribeVmapPing(roomId, onPing) {
  if (!roomId || !isSupabaseConfigured()) return () => {};
  const client = getSupabase();
  if (!client) return () => {};
  const channel = client.channel(`vmap-${roomId}`);
  channel.on("broadcast", { event: "ping" }, () => onPing?.());
  channel.subscribe();
  return () => {
    client.removeChannel(channel);
  };
}

export function pingVmap(roomId) {
  if (!roomId || !isSupabaseConfigured()) return;
  const client = getSupabase();
  client?.channel(`vmap-${roomId}`).send({ type: "broadcast", event: "ping", payload: {} });
}

export function setNativeVmapSession(active) {
  const bridge = typeof window === "undefined" ? null : window.Android || window.VlueLettering;
  try {
    if (active) bridge?.startVmapSession?.();
    else bridge?.stopVmapSession?.();
  } catch {
    /* ignore */
  }
}

export function setMapKeepScreenOn(active) {
  const bridge = typeof window === "undefined" ? null : window.Android || window.VlueLettering;
  try {
    bridge?.setMapKeepScreenOn?.(Boolean(active));
  } catch {
    /* ignore */
  }
}

/** 다른 앱 위에 뜨는 V-Map 미니 오버레이. 지원하면 true. */
export function setNativeVmapMiniOverlay(active, payload = {}) {
  const bridge = typeof window === "undefined" ? null : window.Android || window.VlueLettering;
  try {
    if (active) {
      if (typeof bridge?.showVmapMiniOverlay !== "function") return false;
      const raw = bridge.showVmapMiniOverlay(JSON.stringify(payload || {}));
      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw);
          return Boolean(parsed?.ok);
        } catch {
          return raw === "ok" || raw === "true";
        }
      }
      return Boolean(raw);
    }
    bridge?.hideVmapMiniOverlay?.();
    return true;
  } catch {
    return false;
  }
}

export function updateNativeVmapMiniOverlay(payload = {}) {
  const bridge = typeof window === "undefined" ? null : window.Android || window.VlueLettering;
  try {
    bridge?.updateVmapMiniOverlay?.(JSON.stringify(payload || {}));
  } catch {
    /* ignore */
  }
}
