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

function getCurrentPositionOnce(options) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(Object.assign(new Error("unsupported"), { code: 0 }));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

/**
 * 권한 OK인데도 GPS 미수신·타임아웃이 잦아 저정확도→고정확도 재시도
 */
async function getPositionWithFallback() {
  const attempts = [
    { enableHighAccuracy: false, timeout: 20000, maximumAge: 120000 },
    { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 }
  ];
  let lastErr = null;
  for (const opts of attempts) {
    try {
      return await getCurrentPositionOnce(opts);
    } catch (err) {
      lastErr = err;
      /* PERMISSION_DENIED 는 재시도 무의미 */
      if (err?.code === 1) throw err;
    }
  }
  throw lastErr || Object.assign(new Error("unavailable"), { code: 2 });
}

function errorResult(err, cached, nativeGranted) {
  const code = err?.code;
  if (code === 1 || nativeGranted === false) {
    return {
      label: cached?.label || "위치 권한이 필요합니다",
      error: "denied",
      fromCache: Boolean(cached),
      nativeGranted
    };
  }
  if (code === 3) {
    return {
      label: cached?.label || "위치 확인 시간 초과 · 다시 탭해 주세요",
      error: "timeout",
      fromCache: Boolean(cached),
      nativeGranted
    };
  }
  /* code 2 POSITION_UNAVAILABLE — GPS/위치서비스 OFF 또는 수신 불가 */
  return {
    label: cached?.label || "위치 서비스를 켠 뒤 다시 탭해 주세요",
    error: "unavailable",
    fromCache: Boolean(cached),
    nativeGranted
  };
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

  return (async () => {
    try {
      const pos = await getPositionWithFallback();
      try {
        const { latitude, longitude } = pos.coords;
        const region = await reverseGeocodeLatLng(latitude, longitude);
        writeCachedActiveRegion(region);
        return { label: region.label, fromCache: false };
      } catch {
        /* 좌표는 있는데 주소 변환만 실패 — 좌표라도 표시 */
        const { latitude, longitude } = pos.coords;
        const fallback = {
          label: `위도 ${Number(latitude).toFixed(3)}, 경도 ${Number(longitude).toFixed(3)}`,
          lat: latitude,
          lng: longitude,
          at: Date.now()
        };
        writeCachedActiveRegion(fallback);
        return {
          label: cached?.label || fallback.label,
          error: "geocode",
          fromCache: Boolean(cached)
        };
      }
    } catch (err) {
      return errorResult(err, cached, nativeGranted);
    }
  })();
}
