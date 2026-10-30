/**
 * Google Directions API — walk / bike / transit / overseas driving.
 * Key: GOOGLE_MAPS_API_KEY
 */

import { thinPoints, type GuidePoint, type GuideStep, type ParsedDirections } from "../kakao/kakaoMobilityDirections.js";

const DIRECTIONS_URL = "https://maps.googleapis.com/maps/api/directions/json";

export type TransitLeg = {
  kind: "walk" | "transit" | "drive" | "bike" | "other";
  instruction: string;
  distanceM: number;
  durationSec: number;
  from?: string;
  to?: string;
  lineName?: string;
  vehicleType?: string;
};

function googleMapsKey() {
  return String(process.env.GOOGLE_MAPS_API_KEY || "").trim();
}

function mapTransport(transport: string): string {
  const t = String(transport || "car").toLowerCase();
  if (t === "walk" || t === "walking") return "walking";
  if (t === "bike" || t === "bicycling" || t === "bicycle") return "bicycling";
  if (t === "transit" || t === "subway" || t === "bus") return "transit";
  return "driving";
}

function decodePolyline(encoded: string): GuidePoint[] {
  if (!encoded) return [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const points: GuidePoint[] = [];
  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;
    result = 0;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;
    points.push([lng / 1e5, lat / 1e5]);
  }
  return points;
}

function parseGoogleRoute(payload: unknown, transport: string): (ParsedDirections & { legs: TransitLeg[] }) | null {
  const routes = (payload as { routes?: unknown[] } | null)?.routes;
  const route = routes?.[0] as
    | {
        overview_polyline?: { points?: string };
        legs?: Array<{
          distance?: { value?: number };
          duration?: { value?: number };
          steps?: Array<{
            html_instructions?: string;
            distance?: { value?: number };
            duration?: { value?: number };
            travel_mode?: string;
            polyline?: { points?: string };
            transit_details?: {
              departure_stop?: { name?: string };
              arrival_stop?: { name?: string };
              line?: { short_name?: string; name?: string; vehicle?: { type?: string; name?: string } };
            };
          }>;
        }>;
      }
    | undefined;
  if (!route) return null;

  const points: GuidePoint[] = [];
  const overview = decodePolyline(String(route.overview_polyline?.points || ""));
  for (const point of overview) {
    const prev = points[points.length - 1];
    if (prev && prev[0] === point[0] && prev[1] === point[1]) continue;
    points.push(point);
  }

  const steps: GuideStep[] = [];
  const legs: TransitLeg[] = [];
  let distanceM = 0;
  let durationSec = 0;

  for (const leg of route.legs || []) {
    distanceM += Math.round(Number(leg.distance?.value) || 0);
    durationSec += Math.round(Number(leg.duration?.value) || 0);
    for (const step of leg.steps || []) {
      const instruction = String(step.html_instructions || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80);
      const dist = Math.max(0, Math.round(Number(step.distance?.value) || 0));
      const dur = Math.max(0, Math.round(Number(step.duration?.value) || 0));
      steps.push({ instruction: instruction || "이동", distanceM: dist });

      const mode = String(step.travel_mode || "").toUpperCase();
      const td = step.transit_details;
      let kind: TransitLeg["kind"] = "other";
      if (mode === "WALKING") kind = "walk";
      else if (mode === "BICYCLING") kind = "bike";
      else if (mode === "DRIVING") kind = "drive";
      else if (mode === "TRANSIT") kind = "transit";

      legs.push({
        kind,
        instruction: instruction || "이동",
        distanceM: dist,
        durationSec: dur,
        from: td?.departure_stop?.name,
        to: td?.arrival_stop?.name,
        lineName: td?.line?.short_name || td?.line?.name,
        vehicleType: td?.line?.vehicle?.name || td?.line?.vehicle?.type
      });

      if (points.length < 2 && step.polyline?.points) {
        for (const point of decodePolyline(step.polyline.points)) {
          const prev = points[points.length - 1];
          if (prev && prev[0] === point[0] && prev[1] === point[1]) continue;
          points.push(point);
        }
      }
    }
  }

  if (points.length < 2) return null;
  return {
    distanceM,
    durationSec,
    points: thinPoints(points),
    steps: steps.slice(0, 60),
    legs: legs.slice(0, 80),
    ...(transport ? {} : {})
  };
}

export async function fetchGoogleDirections(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  options: { transport?: string } = {}
) {
  const key = googleMapsKey();
  if (!key) return { ok: false as const, error: "Google Maps 키가 없습니다." };
  const transport = String(options.transport || "car").toLowerCase();
  const mode = mapTransport(transport);
  const query = new URLSearchParams({
    origin: `${originLat},${originLng}`,
    destination: `${destLat},${destLng}`,
    mode,
    language: "ko",
    key
  });
  if (mode === "transit") query.set("departure_time", "now");

  const res = await fetch(`${DIRECTIONS_URL}?${query}`, {
    signal: AbortSignal.timeout(10000)
  });
  const data = await res.json().catch(() => null);
  const status = String((data as { status?: string } | null)?.status || "");
  if (!res.ok || status !== "OK") {
    return { ok: false as const, error: "경로를 찾지 못했습니다." };
  }
  const parsed = parseGoogleRoute(data, transport);
  if (!parsed) return { ok: false as const, error: "경로를 찾지 못했습니다." };
  return {
    ok: true as const,
    mode: transport,
    transport,
    provider: "google" as const,
    ...parsed
  };
}
