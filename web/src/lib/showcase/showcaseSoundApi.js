import { apiUrl } from "../apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "../vlueAuthHeaders.js";

export async function fetchShowcaseSoundMeta() {
  const res = await vlueAuthFetch(apiUrl("/api/showcase-sounds/meta"));
  return res.json().catch(() => ({}));
}

export async function fetchSignatureSounds() {
  const res = await vlueAuthFetch(apiUrl("/api/showcase-sounds/signature"));
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, items: data.items || [], ...data };
}

export async function fetchMyShowcaseSounds() {
  const res = await vlueAuthFetch(apiUrl("/api/showcase-sounds/mine"));
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, owned: data.owned || [], borrowed: data.borrowed || [], ...data };
}

export async function fetchShowcaseSoundQuota() {
  const res = await vlueAuthFetch(apiUrl("/api/showcase-sounds/quota"));
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, quota: data.quota || null, ...data };
}

export async function requestShowcaseSoundUploadUrl({ fileName, contentType, fileSize }) {
  const res = await vlueAuthFetch(apiUrl("/api/showcase-sounds/upload-url"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ fileName, contentType, fileSize })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "업로드 URL 발급 실패");
  return data;
}

export async function uploadShowcaseSoundFile(file) {
  const contentType = file.type || "audio/mpeg";
  const signed = await requestShowcaseSoundUploadUrl({
    fileName: file.name,
    contentType,
    fileSize: file.size
  });
  const put = await fetch(signed.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file
  });
  if (!put.ok) throw new Error("음원 업로드에 실패했습니다.");
  return {
    audioUrl: signed.publicUrl,
    objectKey: signed.path,
    contentType: signed.contentType,
    fileSize: file.size
  };
}

export async function registerShowcaseSound(payload) {
  const res = await vlueAuthFetch(apiUrl("/api/showcase-sounds"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "등록 실패");
  return data.sound;
}

export async function borrowShowcaseSound(soundId) {
  const res = await vlueAuthFetch(apiUrl(`/api/showcase-sounds/${encodeURIComponent(soundId)}/borrow`), {
    method: "POST",
    headers: vlueAuthHeaders()
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "퍼가기 실패");
  return data.sound;
}

export async function notifyThemeBgmChange() {
  const res = await vlueAuthFetch(apiUrl("/api/showcase-sounds/theme-change"), {
    method: "POST",
    headers: vlueAuthHeaders()
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "주제곡 변경 제한");
  return data.quota;
}

/** 한국저작권위원회 등록정보 검색 */
export async function verifyCopyrightRegistration({ title, author, registrationNo } = {}) {
  const params = new URLSearchParams();
  if (title) params.set("title", title);
  if (author) params.set("author", author);
  if (registrationNo) params.set("registrationNo", registrationNo);
  const res = await vlueAuthFetch(apiUrl(`/api/v1/copyright/verify?${params}`));
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && data.ok !== false, status: res.status, ...data };
}

export function soundToBgmPatch(sound, mode = "user") {
  if (!sound) return { mode: "none", soundId: "", title: "", artistName: "", audioUrl: "", attributionLabel: "", linkBroken: false };
  return {
    mode: sound.linkBroken ? "none" : mode,
    soundId: sound.id || "",
    title: sound.title || "",
    artistName: sound.artistName || "",
    audioUrl: sound.linkBroken ? "" : sound.audioUrl || "",
    attributionLabel: sound.attributionLabel || "",
    linkBroken: Boolean(sound.linkBroken)
  };
}
