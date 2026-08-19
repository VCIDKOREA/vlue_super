/**
 * 쇼케이스 검색 거리순.
 * 검색자 원점 = 검색 당시 기기 위치(GPS). 대상 = DCC에 등록·검색 공개된 주소.
 * 검색자 DCC/유료 여부와 무관.
 */

export type GeoPoint = { lat: number; lng: number };

export type DistanceRankHit = {
  userId: string;
  rawAddress: string;
  isAddressSearchAllowed: boolean;
};

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function parseSearchOrigin(latRaw: unknown, lngRaw: unknown): GeoPoint | null {
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

/** 지구 반지름 km — 검색자 현재 위치 ↔ DCC 등록 주소 */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function roundKm(km: number): number {
  if (!Number.isFinite(km) || km < 0) return 0;
  return Math.round(km * 10) / 10;
}

/**
 * 거리순 포함 여부.
 * 주소가 있고, 검색 노출(공개)로 둔 쇼케이스만.
 */
export function isDccDistanceRankEligible(opts: {
  rawAddress: string;
  isAddressSearchAllowed: boolean;
}): boolean {
  return Boolean(String(opts.rawAddress || "").trim()) && opts.isAddressSearchAllowed === true;
}

export async function buildDistanceKmByUserId(opts: {
  origin: GeoPoint | null;
  hits: DistanceRankHit[];
  geocode: (address: string) => Promise<GeoPoint | null>;
}): Promise<{
  originReady: boolean;
  byUserId: Map<string, number>;
}> {
  const origin = opts.origin;
  if (!origin) {
    return { originReady: false, byUserId: new Map() };
  }

  const eligible = opts.hits.filter((h) =>
    isDccDistanceRankEligible({
      rawAddress: h.rawAddress,
      isAddressSearchAllowed: h.isAddressSearchAllowed
    })
  );
  const unique = [...new Set(eligible.map((h) => String(h.rawAddress || "").trim()).filter(Boolean))];
  const coords = new Map<string, GeoPoint>();
  await Promise.all(
    unique.map(async (addr) => {
      const point = await opts.geocode(addr);
      if (point) coords.set(addr, point);
    })
  );

  const byUserId = new Map<string, number>();
  for (const hit of eligible) {
    const addr = String(hit.rawAddress || "").trim();
    const point = coords.get(addr);
    if (!point) continue;
    byUserId.set(hit.userId, roundKm(haversineKm(origin, point)));
  }
  return { originReady: true, byUserId };
}
