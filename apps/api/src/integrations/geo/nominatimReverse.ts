/** 좌표 → 도로명·번지가 있는 주소. Google 키가 거절돼도 상세 위치를 채운다. */
export async function reverseGeocodeNominatim(lat: number, lng: number): Promise<string> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "";
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("accept-language", "ko");
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "vlue-family-location"
      }
    });
    if (!res.ok) return "";
    const data = (await res.json().catch(() => null)) as { display_name?: string } | null;
    const parts = String(data?.display_name || "")
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part && !/^(대한민국|south korea|united states|미국)$/i.test(part) && !/^\d{5,6}$/.test(part));
    return parts.reverse().join(" ").trim().slice(0, 240);
  } catch {
    return "";
  }
}
