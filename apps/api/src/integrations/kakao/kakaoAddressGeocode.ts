/**
 * DCC 등록 주소 → 좌표. 기기 GPS·검색자 위치는 받지 않는다.
 */
import type { GeoPoint } from "../../services/dcc/dccAddressDistance.js";

const cache = new Map<string, GeoPoint | null>();

function getKakaoRestKey(): string {
  return (
    String(process.env.KAKAO_REST_API_KEY || "").trim() ||
    String(process.env.KAKAO_CLIENT_ID || "").trim()
  );
}

export function normalizeGeocodeQuery(address: string): string {
  return String(address || "").trim().replace(/\s+/g, " ");
}

function cacheKey(address: string): string {
  return normalizeGeocodeQuery(address).toLowerCase();
}

function parseXy(doc: Record<string, unknown> | null | undefined): GeoPoint | null {
  if (!doc || typeof doc !== "object") return null;
  const x = Number(doc.x);
  const y = Number(doc.y);
  if (!Number.isFinite(x) || !Number.isFinite(y) || x === 0 || y === 0) return null;
  return { lat: y, lng: x };
}

async function kakaoGetJson(url: URL): Promise<Record<string, unknown> | null> {
  const restKey = getKakaoRestKey();
  if (!restKey) return null;
  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `KakaoAK ${restKey}`,
        Accept: "application/json"
      }
    });
    if (!res.ok) return null;
    return (await res.json().catch(() => null)) as Record<string, unknown> | null;
  } catch {
    return null;
  }
}

async function geocodeViaAddressApi(query: string): Promise<GeoPoint | null> {
  const url = new URL("https://dapi.kakao.com/v2/local/search/address.json");
  url.searchParams.set("query", query);
  url.searchParams.set("size", "1");
  const json = await kakaoGetJson(url);
  const docs = Array.isArray(json?.documents) ? json.documents : [];
  const first = docs[0] as Record<string, unknown> | undefined;
  if (!first) return null;
  const road = first.road_address as Record<string, unknown> | undefined;
  const jibun = first.address as Record<string, unknown> | undefined;
  return parseXy(road) || parseXy(jibun) || parseXy(first);
}

async function geocodeViaKeywordApi(query: string): Promise<GeoPoint | null> {
  const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
  url.searchParams.set("query", query);
  url.searchParams.set("size", "1");
  const json = await kakaoGetJson(url);
  const docs = Array.isArray(json?.documents) ? json.documents : [];
  return parseXy(docs[0] as Record<string, unknown> | undefined);
}

export async function geocodeDccAddress(address: string): Promise<GeoPoint | null> {
  const q = normalizeGeocodeQuery(address);
  if (q.length < 4) return null;
  const key = cacheKey(q);
  if (cache.has(key)) return cache.get(key) ?? null;
  const point = (await geocodeViaAddressApi(q)) || (await geocodeViaKeywordApi(q));
  if (cache.size > 800) cache.clear();
  cache.set(key, point);
  return point;
}
