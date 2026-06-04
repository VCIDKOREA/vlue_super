import { apiUrl } from "./apiBase.js";
import { VlueNetworkError } from "./networkError.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";
import { localMemoMeta } from "./localMemoStorage.js";

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function memoFetch(url, init) {
  try {
    const res = await vlueAuthFetch(url, init);
    return parseJson(res);
  } catch (e) {
    if (e instanceof VlueNetworkError) throw e;
    throw new VlueNetworkError(undefined, e);
  }
}

function sortMemos(memos) {
  return [...(memos || [])].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export async function fetchMemoMeta() {
  const data = await memoFetch(apiUrl("/api/memo/meta"), { headers: vlueAuthHeaders() });
  const memos = sortMemos(data.memos || []);
  return localMemoMeta(memos);
}

export async function fetchMemos({ filter = "all", tag } = {}) {
  const q = new URLSearchParams();
  if (filter && filter !== "all") q.set("filter", filter);
  if (tag) q.set("tag", tag);
  const data = await memoFetch(apiUrl(`/api/memo?${q}`), { headers: vlueAuthHeaders() });
  return { memos: sortMemos(data.memos || []) };
}

export async function fetchMemo(id) {
  const data = await memoFetch(apiUrl(`/api/memo/${id}`), { headers: vlueAuthHeaders() });
  return data.memo;
}

export async function createMemo(body) {
  const data = await memoFetch(apiUrl("/api/memo"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return data.memo;
}

export async function updateMemo(id, body) {
  const data = await memoFetch(apiUrl(`/api/memo/${id}`), {
    method: "PUT",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return data.memo;
}

export async function deleteMemo(id) {
  await memoFetch(apiUrl(`/api/memo/${id}`), {
    method: "DELETE",
    headers: vlueAuthHeaders()
  });
}

export async function searchMemos(query, opts = {}) {
  const q = new URLSearchParams({ q: query || "" });
  if (opts.sourceApp) q.set("sourceApp", opts.sourceApp);
  if (opts.from) q.set("from", opts.from);
  if (opts.to) q.set("to", opts.to);
  const data = await memoFetch(apiUrl(`/api/memo/search?${q}`), { headers: vlueAuthHeaders() });
  return sortMemos(data.memos || []);
}

export async function fetchLinkPreview(url) {
  const res = await vlueAuthFetch(apiUrl(`/api/memo/link-preview?url=${encodeURIComponent(url)}`), {
    headers: vlueAuthHeaders()
  });
  const data = await parseJson(res);
  return data.preview;
}

export async function receiveShareMemo(payload) {
  const data = await memoFetch(apiUrl("/api/memo/share-receive"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return data;
}

export async function setMemoReminder(id, reminderAt) {
  const data = await memoFetch(apiUrl(`/api/memo/${id}/reminder`), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ reminderAt })
  });
  return data.memo;
}

export async function requestMemoSummary(content) {
  const res = await vlueAuthFetch(apiUrl("/api/ai/chat"), {
    method: "POST",
    headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ type: "memo_summary", message: content })
  });
  const data = await parseJson(res);
  return data.summary || "";
}
