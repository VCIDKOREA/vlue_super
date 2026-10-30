/**
 * 공공데이터포털 — 교통안전 신호등 실시간 정보 (B551982/rti)
 * Secret: PUBLIC_DATA_SIGNAL_API_KEY (fallback: PUBLIC_DATA_SERVICE_KEY)
 */

const BASE = "https://apis.data.go.kr/B551982/rti";

export function publicDataSignalApiKey() {
  return String(
    process.env.PUBLIC_DATA_SIGNAL_API_KEY || process.env.PUBLIC_DATA_SERVICE_KEY || ""
  )
    .trim()
    .replace(/^"|"$/g, "");
}

export type NearbySignal = {
  id: string;
  lat: number;
  lng: number;
  remainSec: number | null;
  phase: string;
  label: string;
  distanceM: number;
};

function num(value: unknown, fallback = NaN) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function asRows(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const body = (root.response as Record<string, unknown> | undefined)?.body as
    | Record<string, unknown>
    | undefined;
  const items = body?.items ?? root.items ?? root.data ?? root.list;
  if (Array.isArray(items)) return items as Record<string, unknown>[];
  if (items && typeof items === "object") {
    const item = (items as { item?: unknown }).item;
    if (Array.isArray(item)) return item as Record<string, unknown>[];
    if (item && typeof item === "object") return [item as Record<string, unknown>];
  }
  return [];
}

function pickLat(row: Record<string, unknown>) {
  return num(row.lat ?? row.latitude ?? row.ycrd ?? row.ycord ?? row.YCRD ?? row.LAT);
}

function pickLng(row: Record<string, unknown>) {
  return num(row.lng ?? row.lon ?? row.longitude ?? row.xcrd ?? row.xcord ?? row.XCRD ?? row.LNG);
}

function pickRemain(row: Record<string, unknown>) {
  const n = num(
    row.remainSec ??
      row.remainTime ??
      row.ntLgtRmdrCs ??
      row.rmdrCs ??
      row.greenRemain ??
      row.REMAIN_SEC
  );
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : null;
}

function pickPhase(row: Record<string, unknown>) {
  const raw = String(
    row.phase ?? row.signal ?? row.ntLgtCd ?? row.lgtCd ?? row.color ?? row.PHASE ?? ""
  )
    .trim()
    .toLowerCase();
  if (!raw) return "unknown";
  if (raw.includes("green") || raw === "g" || raw === "3" || raw.includes("녹")) return "green";
  if (raw.includes("yellow") || raw === "y" || raw === "2" || raw.includes("황")) return "yellow";
  if (raw.includes("red") || raw === "r" || raw === "1" || raw.includes("적")) return "red";
  return raw.slice(0, 24);
}

function pickLabel(row: Record<string, unknown>) {
  return String(
    row.intsnNm ?? row.crossingName ?? row.name ?? row.ctrlerNm ?? row.label ?? "교차로 신호"
  ).trim() || "교차로 신호";
}

function pickId(row: Record<string, unknown>, index: number) {
  return String(row.intsnId ?? row.ctrlerId ?? row.id ?? row.ITSSC_ID ?? `sig-${index}`);
}

/**
 * Nearby realtime signal snapshot.
 * API catalog paths vary by dataset revision — try a few known list endpoints.
 */
export async function fetchNearbyTrafficSignals(
  lat: number,
  lng: number,
  radiusM = 400
): Promise<{ ok: true; signals: NearbySignal[] } | { ok: false; error: string; signals: NearbySignal[] }> {
  const serviceKey = publicDataSignalApiKey();
  if (!serviceKey) {
    return { ok: false, error: "PUBLIC_DATA_SIGNAL_API_KEY가 없습니다.", signals: [] };
  }

  const paths = [
    "/getRtiList",
    "/getTrafficSignalList",
    "/getIntsnSttusList",
    ""
  ];

  let lastError = "신호 데이터를 불러오지 못했습니다.";
  for (const path of paths) {
    try {
      const query = new URLSearchParams({
        serviceKey,
        pageNo: "1",
        numOfRows: "50",
        type: "json",
        lat: String(lat),
        lng: String(lng),
        radius: String(Math.round(radiusM))
      });
      const url = `${BASE}${path}?${query}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        lastError = `신호 API HTTP ${res.status}`;
        continue;
      }
      const rows = asRows(data);
      if (!rows.length) {
        lastError = "인근 신호 데이터가 없습니다.";
        continue;
      }
      const signals = rows
        .map((row, index) => {
          const sLat = pickLat(row);
          const sLng = pickLng(row);
          if (!Number.isFinite(sLat) || !Number.isFinite(sLng)) return null;
          const distanceM = Math.round(haversineMeters(lat, lng, sLat, sLng));
          if (distanceM > radiusM * 1.5) return null;
          return {
            id: pickId(row, index),
            lat: sLat,
            lng: sLng,
            remainSec: pickRemain(row),
            phase: pickPhase(row),
            label: pickLabel(row),
            distanceM
          } satisfies NearbySignal;
        })
        .filter(Boolean)
        .sort((a, b) => (a!.distanceM || 0) - (b!.distanceM || 0))
        .slice(0, 8) as NearbySignal[];

      if (signals.length) return { ok: true, signals };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "신호 API 호출 실패";
    }
  }

  return { ok: false, error: lastError, signals: [] };
}
