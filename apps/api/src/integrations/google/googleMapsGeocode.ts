export type GooglePlaceMeta = {
  countryCode: string;
  countryName: string;
  cityName: string;
  addressLabel: string;
  isOverseas: boolean;
  timeZoneId: string;
};

function googleMapsKey() {
  return String(process.env.GOOGLE_MAPS_API_KEY || "").trim();
}

function component(
  components: Array<{ long_name?: string; short_name?: string; types?: string[] }> | undefined,
  type: string,
  preferShort = false
) {
  const hit = (components || []).find((item) => Array.isArray(item.types) && item.types.includes(type));
  if (!hit) return "";
  return String((preferShort ? hit.short_name : hit.long_name) || hit.long_name || hit.short_name || "").trim();
}

/** 좌표 → 국가/도시. country_code !== KR 이면 해외. */
export async function reverseGeocodeGoogle(lat: number, lng: number): Promise<GooglePlaceMeta | null> {
  const key = googleMapsKey();
  if (!key || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("latlng", `${lat},${lng}`);
  url.searchParams.set("language", "ko");
  url.searchParams.set("key", key);
  try {
    const res = await fetch(url.toString());
    const data = (await res.json().catch(() => ({}))) as {
      status?: string;
      results?: Array<{
        formatted_address?: string;
        address_components?: Array<{ long_name?: string; short_name?: string; types?: string[] }>;
      }>;
    };
    if (data.status !== "OK" || !data.results?.length) return null;
    const first = data.results[0];
    const parts = first.address_components || [];
    const countryCode = component(parts, "country", true).toUpperCase();
    const countryName = component(parts, "country") || (countryCode === "KR" ? "대한민국" : countryCode);
    const cityName =
      component(parts, "locality") ||
      component(parts, "administrative_area_level_1") ||
      component(parts, "sublocality_level_1") ||
      "";
    const addressLabel = String(first.formatted_address || [cityName, countryName].filter(Boolean).join(", ")).trim();
    const timeZoneId = await fetchGoogleTimeZone(lat, lng, key);
    return {
      countryCode: countryCode || "XX",
      countryName,
      cityName,
      addressLabel: addressLabel.slice(0, 240),
      isOverseas: Boolean(countryCode) && countryCode !== "KR",
      timeZoneId
    };
  } catch (err) {
    console.warn("[google-maps] reverse geocode failed", err);
    return null;
  }
}

async function fetchGoogleTimeZone(lat: number, lng: number, key: string): Promise<string> {
  const url = new URL("https://maps.googleapis.com/maps/api/timezone/json");
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("timestamp", String(Math.floor(Date.now() / 1000)));
  url.searchParams.set("key", key);
  try {
    const res = await fetch(url.toString());
    const data = (await res.json().catch(() => ({}))) as { status?: string; timeZoneId?: string };
    if (data.status === "OK" && data.timeZoneId) return String(data.timeZoneId);
  } catch {
    /* ignore */
  }
  return "";
}
