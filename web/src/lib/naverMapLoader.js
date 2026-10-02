/** 네이버 지도 JS SDK 로더 (ncpKeyId) */

let loadPromise = null;

export function readNaverMapClientId() {
  return String(import.meta.env.VITE_NAVER_MAP_CLIENT_ID || "").trim();
}

export async function fetchNaverMapClientId() {
  const fromEnv = readNaverMapClientId();
  if (fromEnv) return fromEnv;
  try {
    const { apiUrl } = await import("./apiBase.js");
    const res = await fetch(apiUrl("/api/location/map-config"));
    const data = await res.json().catch(() => ({}));
    return String(data?.clientId || "").trim();
  } catch {
    return "";
  }
}

export function loadNaverMaps(clientId) {
  const key = String(clientId || "").trim();
  if (!key) return Promise.reject(new Error("네이버 지도 Client ID가 없습니다."));
  if (typeof window !== "undefined" && window.naver?.maps) {
    return Promise.resolve(window.naver.maps);
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-vlue-naver-maps]");
    if (existing) {
      const wait = () => {
        if (window.naver?.maps) resolve(window.naver.maps);
        else setTimeout(wait, 40);
      };
      wait();
      return;
    }
    const script = document.createElement("script");
    script.dataset.vlueNaverMaps = "1";
    script.async = true;
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(key)}`;
    script.onload = () => {
      if (window.naver?.maps) resolve(window.naver.maps);
      else reject(new Error("네이버 지도 SDK 로드에 실패했습니다."));
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("네이버 지도 스크립트를 불러오지 못했습니다."));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
