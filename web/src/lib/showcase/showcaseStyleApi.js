import { apiUrl } from "../apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "../vlueAuthHeaders.js";

/** GET /api/lettering/showcase/style */
export async function fetchShowcaseStyleBundle() {
  try {
    const res = await vlueAuthFetch(apiUrl("/api/lettering/showcase/style"));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || "fetch_failed", status: res.status };
    }
    return {
      ok: true,
      editor: data.editor ?? null,
      live: data.live ?? null,
      liveSource: data.liveSource ?? null,
      updatedAt: data.updatedAt ?? null
    };
  } catch (e) {
    return { ok: false, error: e?.message || "network" };
  }
}

/** PUT /api/lettering/showcase/style */
export async function putShowcaseStyleBundle({
  editor,
  live,
  liveSource,
  clientUpdatedAt
} = {}) {
  try {
    const res = await vlueAuthFetch(apiUrl("/api/lettering/showcase/style"), {
      method: "PUT",
      headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        editor,
        live,
        liveSource,
        clientUpdatedAt
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 409) {
      return {
        ok: false,
        conflict: true,
        editor: data.editor ?? null,
        live: data.live ?? null,
        liveSource: data.liveSource ?? null,
        updatedAt: data.updatedAt ?? null
      };
    }
    if (!res.ok) {
      return { ok: false, error: data.error || "save_failed", status: res.status };
    }
    return {
      ok: true,
      updatedAt: data.updatedAt ?? null
    };
  } catch (e) {
    return { ok: false, error: e?.message || "network" };
  }
}

/** GET /api/lettering/showcase/style/:userId — peer live style */
export async function fetchPeerShowcaseStyleBundle(userId) {
  const id = String(userId || "").trim();
  if (!id) return { ok: false, error: "user_required" };
  try {
    const res = await vlueAuthFetch(apiUrl(`/api/lettering/showcase/style/${encodeURIComponent(id)}`));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || "fetch_failed", status: res.status };
    }
    return {
      ok: true,
      editor: null,
      live: data.live ?? null,
      liveSource: data.liveSource ?? null,
      updatedAt: data.updatedAt ?? null
    };
  } catch (e) {
    return { ok: false, error: e?.message || "network" };
  }
}
