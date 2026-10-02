const KEY = "vlue_last_geo_v1";

export function readLastGeo() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const lat = Number(data?.lat);
    const lng = Number(data?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, at: Number(data?.at) || 0 };
  } catch {
    return null;
  }
}

export function writeLastGeo(lat, lng) {
  const nLat = Number(lat);
  const nLng = Number(lng);
  if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ lat: nLat, lng: nLng, at: Date.now() }));
  } catch {
    /* ignore */
  }
}
