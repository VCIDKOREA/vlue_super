/** OSRM 스텝의 회전 종류를 짧은 한국어 안내로 바꾼다. */

const MODIFIER = {
  uturn: "U턴",
  "sharp right": "급우회전",
  right: "우회전",
  "slight right": "약간 우회전",
  straight: "직진",
  "slight left": "약간 좌회전",
  left: "좌회전",
  "sharp left": "급좌회전"
};

export function maneuverLabel(type, modifier) {
  const kind = String(type || "");
  const mod = String(modifier || "");
  if (kind === "arrive") return "목적지 도착";
  if (kind === "depart") return "안내를 시작합니다";
  if (mod === "uturn" || kind === "uturn") return "U턴";
  if (kind === "roundabout" || kind === "rotary") return "로터리";
  if (kind === "merge") return mod.includes("left") ? "왼쪽 합류" : "오른쪽 합류";
  if (MODIFIER[mod]) return MODIFIER[mod];
  return "직진";
}

export function formatGuideDistance(meters) {
  const value = Number(meters) || 0;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}km`;
  return `${Math.max(0, Math.round(value))}m`;
}

/** 카카오내비식 방향 HUD용 짧은 화살표 기호 */
export function maneuverGlyph(instruction) {
  const text = String(instruction || "");
  if (/U턴|유턴/i.test(text)) return "↩";
  if (/급우|우회전|오른쪽/.test(text)) return "↗";
  if (/급좌|좌회전|왼쪽/.test(text)) return "↖";
  if (/도착/.test(text)) return "◎";
  if (/로터리|합류/.test(text)) return "⟳";
  return "↑";
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function localMeters(lat, lng, originLat, originLng) {
  const latRad = (originLat * Math.PI) / 180;
  return {
    x: (lng - originLng) * 111320 * Math.cos(latRad),
    y: (lat - originLat) * 110540
  };
}

/** GPS를 경로 폴리라인에 투영한 진행 거리. points는 [lng, lat]. */
export function alongRouteMeters(points, lat, lng) {
  if (!Array.isArray(points) || points.length < 2 || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const segLens = [];
  let total = 0;
  for (let i = 0; i + 1 < points.length; i += 1) {
    const len = haversineMeters(points[i][1], points[i][0], points[i + 1][1], points[i + 1][0]);
    segLens.push(len);
    total += len;
  }
  if (total <= 0) return { traveled: 0, remain: 0, total: 0 };
  let bestDist = Infinity;
  let bestTraveled = 0;
  let bestBearing = null;
  let bestLat = lat;
  let bestLng = lng;
  let walked = 0;
  for (let i = 0; i + 1 < points.length; i += 1) {
    const latA = points[i][1];
    const lngA = points[i][0];
    const latB = points[i + 1][1];
    const lngB = points[i + 1][0];
    const len = segLens[i];
    let t = 0;
    if (len > 0.4) {
      const a = localMeters(latA, lngA, lat, lng);
      const b = localMeters(latB, lngB, lat, lng);
      const abx = b.x - a.x;
      const aby = b.y - a.y;
      const ab2 = abx * abx + aby * aby;
      t = ab2 > 0 ? Math.max(0, Math.min(1, (-a.x * abx + -a.y * aby) / ab2)) : 0;
    }
    const projLat = latA + (latB - latA) * t;
    const projLng = lngA + (lngB - lngA) * t;
    const dist = haversineMeters(lat, lng, projLat, projLng);
    const traveled = walked + len * t;
    if (dist < bestDist - 0.3 || (Math.abs(dist - bestDist) <= 0.3 && traveled > bestTraveled)) {
      bestDist = dist;
      bestTraveled = traveled;
      bestLat = projLat;
      bestLng = projLng;
      bestBearing = bearingDegrees(latA, lngA, latB, lngB);
    }
    walked += len;
  }
  const traveled = Math.max(0, Math.min(total, bestTraveled));
  return {
    traveled,
    remain: Math.max(0, total - traveled),
    total,
    bearing: bestBearing,
    lat: bestLat,
    lng: bestLng,
    distM: Number.isFinite(bestDist) ? bestDist : Infinity
  };
}

export function lerpHeading(from, to, t) {
  if (!Number.isFinite(to)) return Number.isFinite(from) ? from : 0;
  if (!Number.isFinite(from)) return ((to % 360) + 360) % 360;
  const k = Math.max(0, Math.min(1, Number(t) || 0));
  const delta = ((((to - from) % 360) + 540) % 360) - 180;
  return (from + delta * k + 360) % 360;
}

const SNAP_ON_M = 42;
const SNAP_HOLD_M = 80;
const BACKTRACK_M = 16;

/**
 * GPS를 경로선에 붙인다. 건물·골목으로 튀는 점을 막고, 뒤로 미끄러지지 않게 한다.
 */
export function matchGpsToRoute(points, lat, lng, prev = null, extras = {}) {
  const along = alongRouteMeters(points, lat, lng);
  const speedKmh = Number(extras.speedKmh);
  const gpsHeading = Number(extras.headingDeg);
  if (!along || !Number.isFinite(along.lat) || !Number.isFinite(along.lng)) {
    return {
      lat,
      lng,
      snapped: false,
      bearing: Number.isFinite(gpsHeading) ? gpsHeading : prev?.bearing ?? null,
      traveled: Number(prev?.traveled) || 0,
      remain: null,
      total: 0,
      distM: Infinity
    };
  }
  const distM = along.distM;
  let traveled = along.traveled;
  let snapLat = along.lat;
  let snapLng = along.lng;
  const had = Boolean(prev?.snapped) && Number.isFinite(prev.lat) && Number.isFinite(prev.lng);
  if (had && Number.isFinite(prev.traveled) && traveled + BACKTRACK_M < prev.traveled && distM <= SNAP_HOLD_M) {
    traveled = prev.traveled;
    snapLat = prev.lat;
    snapLng = prev.lng;
  }
  const snapped = distM <= SNAP_ON_M || (had && distM <= SNAP_HOLD_M);
  const outLat = snapped ? snapLat : lat;
  const outLng = snapped ? snapLng : lng;
  const mix = snapped ? (had ? 0.38 : 1) : 1;
  const latSm = had && snapped ? prev.lat + (outLat - prev.lat) * mix : outLat;
  const lngSm = had && snapped ? prev.lng + (outLng - prev.lng) * mix : outLng;
  const routeHeading = Number.isFinite(along.bearing) ? along.bearing : null;
  const preferGps = Number.isFinite(gpsHeading) && Number.isFinite(speedKmh) && speedKmh >= 8 && snapped;
  const targetHeading = preferGps ? lerpHeading(routeHeading ?? gpsHeading, gpsHeading, 0.22) : routeHeading ?? gpsHeading;
  const bearing = lerpHeading(prev?.bearing, targetHeading, snapped ? 0.34 : 0.18);
  return {
    lat: latSm,
    lng: lngSm,
    snapped,
    bearing,
    traveled,
    remain: along.remain,
    total: along.total,
    distM
  };
}

function bearingDegrees(fromLat, fromLng, toLat, toLng) {
  const toRad = (d) => (d * Math.PI) / 180;
  const φ1 = toRad(fromLat);
  const φ2 = toRad(toLat);
  const Δλ = toRad(toLng - fromLng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** 진행 방향 앞으로 meters 만큼 이동한 좌표. 차량을 화면 하단에 두기 위한 카메라 중심. */
export function lookAheadLatLng(lat, lng, headingDeg, meters) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(headingDeg) || !(meters > 0)) {
    return { lat, lng };
  }
  const R = 6378137;
  const δ = meters / R;
  const θ = (headingDeg * Math.PI) / 180;
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lng * Math.PI) / 180;
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
  const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));
  return {
    lat: (φ2 * 180) / Math.PI,
    lng: (((λ2 * 180) / Math.PI + 540) % 360) - 180
  };
}

/** 차량을 화면 하단 20~25%(기본 22.5%)에 두기 위해 전방으로 밀어 올리는 거리. */
export function chaseLookAheadMeters(lat, zoom, viewportHeightPx, fraction = 0.275) {
  const height = Number.isFinite(viewportHeightPx) && viewportHeightPx > 200 ? viewportHeightPx : 640;
  const z = Number.isFinite(zoom) ? zoom : 16.8;
  const mpp = (156543.03392 * Math.cos(((Number(lat) || 0) * Math.PI) / 180)) / 2 ** z;
  const frac = Number.isFinite(fraction) ? fraction : 0.275;
  return Math.max(28, Math.min(240, height * frac * mpp));
}

export function isStraightGuide(instruction) {
  const text = String(instruction || "");
  return /직진|안내를 시작|안내를 종료|출발지/.test(text) && !/분기|갈래|인터체인지|IC/.test(text);
}

function stepCumulative(steps) {
  const rows = Array.isArray(steps) ? steps : [];
  let acc = 0;
  return rows.map((step) => {
    acc += Math.max(0, Number(step?.distanceM) || 0);
    return { ...step, cumulativeM: acc };
  });
}

/** 폴리라인 진행 거리를 안내 스텝 거리 축으로 맞춘다. */
export function guideTravelMeters(steps, along) {
  if (!along || !Number.isFinite(along.traveled)) return 0;
  const rows = stepCumulative(steps);
  const stepTotal = rows.length ? rows[rows.length - 1].cumulativeM : 0;
  const poly = Number(along.total) || 0;
  if (stepTotal > 0 && poly > 0) return (along.traveled / poly) * stepTotal;
  return along.traveled;
}

/**
 * 이미 지난 안내(잔여 0m 이하)는 건너뛰고, 다음 전방 안내와 1m 잔여거리를 돌려준다.
 * traveledM 은 경로 시작부터 현재 위치까지의 안내 거리.
 */
export function liveGuideCue(steps, traveledM = 0) {
  const rows = stepCumulative(steps);
  const traveled = Math.max(0, Number(traveledM) || 0);
  let fallback = null;
  for (const step of rows) {
    if (step.instruction === "안내를 시작합니다" || /안내를 종료/.test(String(step.instruction || ""))) continue;
    const remain = step.cumulativeM - traveled;
    if (remain <= 0) continue;
    const cue = { ...step, remainM: Math.max(1, Math.round(remain)) };
    if (!fallback) fallback = cue;
    if (isStraightGuide(step.instruction) && step.instruction !== "목적지 도착") continue;
    return cue;
  }
  return fallback;
}

export function nextGuideCue(steps, traveledM = 0) {
  return liveGuideCue(steps, traveledM);
}
