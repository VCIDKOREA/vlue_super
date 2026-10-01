/**
 * 카카오모빌리티 자동차 길찾기.
 * GET https://apis-navi.kakaomobility.com/v1/directions
 * 키는 apps/api .env 의 KAKAO_REST_API_KEY.
 */

export const KAKAO_DIRECTIONS_URL = "https://apis-navi.kakaomobility.com/v1/directions";

const TYPE_LABEL: Record<number, string> = {
  0: "직진",
  1: "좌회전",
  2: "우회전",
  3: "U턴",
  5: "왼쪽으로",
  6: "오른쪽으로",
  100: "안내를 시작합니다",
  101: "목적지 도착"
};

export type GuidePoint = [number, number];

export type GuideStep = {
  instruction: string;
  distanceM: number;
};

export type ParsedDirections = {
  distanceM: number;
  durationSec: number;
  points: GuidePoint[];
  steps: GuideStep[];
};

type GuideRow = { guidance?: unknown; type?: unknown; distance?: unknown };
type RoadRow = { vertexes?: unknown };
type SectionRow = { roads?: RoadRow[]; guides?: GuideRow[] };
type RouteRow = {
  result_code?: unknown;
  summary?: { distance?: unknown; duration?: unknown };
  sections?: SectionRow[];
};

export function kakaoRestApiKey() {
  return String(process.env.KAKAO_REST_API_KEY || "").trim();
}

function instructionOf(guide: GuideRow) {
  const text = String(guide.guidance || "").trim();
  const type = Number(guide.type);
  if (text === "출발지" || type === 100) return "안내를 시작합니다";
  if (text === "도착지" || type === 101) return "목적지 도착";
  if (text) return text.slice(0, 40);
  return TYPE_LABEL[type] || "직진";
}

export function thinPoints(points: GuidePoint[], max = 280) {
  if (points.length <= max) return points;
  const stride = Math.ceil(points.length / max);
  const out = points.filter((_, index) => index % stride === 0);
  const last = points[points.length - 1];
  const tail = out[out.length - 1];
  if (!tail || tail[0] !== last[0] || tail[1] !== last[1]) out.push(last);
  return out;
}

function pointsFromVertexes(vertexes: unknown) {
  if (!Array.isArray(vertexes)) return [] as GuidePoint[];
  const points: GuidePoint[] = [];
  for (let index = 0; index + 1 < vertexes.length; index += 2) {
    const lng = Number(vertexes[index]);
    const lat = Number(vertexes[index + 1]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    const prev = points[points.length - 1];
    if (prev && prev[0] === lng && prev[1] === lat) continue;
    points.push([lng, lat]);
  }
  return points;
}

export function parseKakaoDirections(payload: unknown): ParsedDirections | null {
  const routes = (payload as { routes?: RouteRow[] } | null)?.routes;
  const route = routes?.[0];
  if (!route) return null;
  if (route.result_code != null && Number(route.result_code) !== 0) return null;
  const points: GuidePoint[] = [];
  const steps: GuideStep[] = [];
  for (const section of route.sections || []) {
    for (const road of section.roads || []) {
      for (const point of pointsFromVertexes(road.vertexes)) {
        const prev = points[points.length - 1];
        if (prev && prev[0] === point[0] && prev[1] === point[1]) continue;
        points.push(point);
      }
    }
    for (const guide of section.guides || []) {
      steps.push({
        instruction: instructionOf(guide),
        distanceM: Math.max(0, Math.round(Number(guide.distance) || 0))
      });
    }
  }
  if (points.length < 2) return null;
  return {
    distanceM: Math.round(Number(route.summary?.distance) || 0),
    durationSec: Math.round(Number(route.summary?.duration) || 0),
    points: thinPoints(points),
    steps: steps.slice(0, 40)
  };
}

export async function fetchKakaoCarDirections(originLng: number, originLat: number, destLng: number, destLat: number) {
  const key = kakaoRestApiKey();
  if (!key) return { ok: false as const, error: "카카오 길찾기 키가 없습니다." };
  const query = new URLSearchParams({
    origin: `${originLng},${originLat}`,
    destination: `${destLng},${destLat}`,
    priority: "RECOMMEND",
    summary: "false"
  });
  const res = await fetch(`${KAKAO_DIRECTIONS_URL}?${query}`, {
    headers: {
      Authorization: `KakaoAK ${key}`,
      "Content-Type": "application/json"
    },
    signal: AbortSignal.timeout(7000)
  });
  const data = await res.json().catch(() => null);
  const parsed = parseKakaoDirections(data);
  if (!res.ok || !parsed) return { ok: false as const, error: "경로를 찾지 못했습니다." };
  return { ok: true as const, ...parsed };
}
