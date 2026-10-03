function getKakaoRestKey(): string {
  return (
    String(process.env.KAKAO_REST_API_KEY || "").trim() ||
    String(process.env.KAKAO_CLIENT_ID || "").trim()
  );
}

/** 좌표 → 도로명(지번) 상세 주소. 키가 없으면 빈 문자열. */
export async function reverseGeocodeKakao(lat: number, lng: number): Promise<string> {
  const restKey = getKakaoRestKey();
  if (!restKey || !Number.isFinite(lat) || !Number.isFinite(lng)) return "";
  const url = new URL("https://dapi.kakao.com/v2/local/geo/coord2address.json");
  url.searchParams.set("x", String(lng));
  url.searchParams.set("y", String(lat));
  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `KakaoAK ${restKey}`, Accept: "application/json" }
    });
    if (!res.ok) return "";
    const json = (await res.json().catch(() => null)) as {
      documents?: Array<{
        road_address?: { address_name?: string } | null;
        address?: { address_name?: string } | null;
      }>;
    } | null;
    const doc = json?.documents?.[0];
    const road = String(doc?.road_address?.address_name || "").trim();
    const jibun = String(doc?.address?.address_name || "").trim();
    if (road && jibun && road !== jibun) return `${road} (${jibun})`;
    return road || jibun || "";
  } catch {
    return "";
  }
}
