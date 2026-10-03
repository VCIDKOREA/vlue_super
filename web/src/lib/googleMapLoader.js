/** Google Maps JS SDK 로더 */

let loadPromise = null;
let cachedKey = "";

export function readGoogleMapsApiKey() {
  return String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "").trim();
}

export async function fetchGoogleMapsApiKey() {
  const fromEnv = readGoogleMapsApiKey();
  if (fromEnv) return fromEnv;
  if (cachedKey) return cachedKey;
  try {
    const { apiUrl } = await import("./apiBase.js");
    const res = await fetch(apiUrl("/api/location/map-config"));
    const data = await res.json().catch(() => ({}));
    cachedKey = String(data?.googleMapsApiKey || "").trim();
    return cachedKey;
  } catch {
    return "";
  }
}

export function loadGoogleMaps(apiKey) {
  const key = String(apiKey || "").trim();
  if (!key) return Promise.reject(new Error("Google Maps API 키가 없습니다."));
  if (typeof window !== "undefined" && window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-vlue-google-maps]");
    if (existing) {
      const wait = () => {
        if (window.google?.maps) resolve(window.google.maps);
        else setTimeout(wait, 40);
      };
      wait();
      return;
    }
    const script = document.createElement("script");
    script.dataset.vlueGoogleMaps = "1";
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&language=ko&v=weekly`;
    script.onload = () => {
      if (window.google?.maps) resolve(window.google.maps);
      else reject(new Error("Google Maps SDK 로드에 실패했습니다."));
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Google Maps 스크립트를 불러오지 못했습니다."));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
