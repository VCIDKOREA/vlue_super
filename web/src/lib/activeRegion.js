/**
 * 프로필 Active Region — 실기기 위치 → 시/구/동 표시
 */

const CACHE_KEY = "vlue_active_region_v1";

export function readCachedActiveRegion() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (o?.label && typeof o.label === "string") return o;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeCachedActiveRegion(payload) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

/** Nominatim address → "서울 강남구 역삼동" 형태 */
export function formatKoreanRegionLabel(address = {}) {
  const a = address || {};
  const cityRaw = String(a.city || a.province || a.state || a.region || "").trim();
  const gu = String(a.borough || a.city_district || a.county || a.municipality || "").trim();
  const dong = String(
    a.suburb || a.neighbourhood || a.quarter || a.village || a.town || a.hamlet || ""
  ).trim();

  let city = cityRaw
    .replace(/특별시|광역시|특별자치시|특별자치도|도$/g, "")
    .replace(/^Seoul$/i, "서울")
    .replace(/^Busan$/i, "부산")
    .replace(/^Incheon$/i, "인천")
    .trim();

  if (!city && /서울|Seoul/i.test(String(a.display_name || ""))) city = "서울";

  const parts = [city, gu, dong].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return "";
}

export async function reverseGeocodeLatLng(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=ko`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "Accept-Language": "ko" }
  });
  if (!res.ok) throw new Error("geocode failed");
  const data = await res.json();
  const label =
    formatKoreanRegionLabel(data.address) ||
    String(data.name || "").trim() ||
    `위도 ${Number(lat).toFixed(3)}, 경도 ${Number(lng).toFixed(3)}`;
  return {
    label,
    displayName: data.display_name || label,
    lat,
    lng,
    at: Date.now()
  };
}

function readNativeLocationGranted() {
  try {
    const raw =
      window.Android?.getLetteringPermissionStatusJson?.() ||
      window.VlueLettering?.getLetteringPermissionStatusJson?.();
    if (!raw) return null;
    const o = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Boolean(o?.location);
  } catch {
    return null;
  }
}

/**
 * @returns {Promise<{ label: string, loading?: boolean, error?: string, fromCache?: boolean }>}
 */
export function resolveActiveRegion() {
  const cached = readCachedActiveRegion();
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve({
      label: cached?.label || "위치를 확인할 수 없습니다",
      error: "unsupported",
      fromCache: Boolean(cached)
    });
  }

  const nativeGranted = readNativeLocationGranted();

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const region = await reverseGeocodeLatLng(latitude, longitude);
          writeCachedActiveRegion(region);
          resolve({ label: region.label, fromCache: false });
        } catch {
          resolve({
            label: cached?.label || "위치 주소를 불러오지 못했습니다",
            error: "geocode",
            fromCache: Boolean(cached)
          });
        }
      },
      (err) => {
        const code = err?.code;
        /* PERMISSION_DENIED = 1 · OS 허용인데 WebView 미연동이면 여기로 옴 */
        if (code === 1 || nativeGranted === false) {
          resolve({
            label: cached?.label || "위치 권한이 필요합니다",
            error: "denied",
            fromCache: Boolean(cached),
            nativeGranted
          });
          return;
        }
        resolve({
          label: cached?.label || "위치를 가져오지 못했습니다",
          error: "unavailable",
          fromCache: Boolean(cached),
          nativeGranted
        });
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    );
  });
}
