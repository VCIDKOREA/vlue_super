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
    }
    walked += len;
  }
  const traveled = Math.max(0, Math.min(total, bestTraveled));
  return {
    traveled,
    remain: Math.max(0, total - traveled),
    total
  };
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
  for (const step of rows) {
    if (step.instruction === "안내를 시작합니다") continue;
    const remain = step.cumulativeM - traveled;
    if (remain <= 0) continue;
    return { ...step, remainM: Math.max(1, Math.round(remain)) };
  }
  return null;
}

export function nextGuideCue(steps, traveledM = 0) {
  return liveGuideCue(steps, traveledM);
}
