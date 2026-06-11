export type MapCoordinates = {
  latitude: number;
  longitude: number;
};

export type MapInfo = {
  coordinates: MapCoordinates | null;
  road_address: string;
  jibun_address: string;
  naver_map_url: string;
  kakao_map_url: string;
  google_map_url: string;
};

export function naverCoordsFromRaw(mapx: unknown, mapy: unknown): MapCoordinates | null {
  const x = Number(mapx || 0);
  const y = Number(mapy || 0);
  if (!x || !y) return null;
  const longitude = x / 1e7;
  const latitude = y / 1e7;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < 33 || latitude > 39 || longitude < 124 || longitude > 132) return null;
  return { latitude, longitude };
}

export function buildMapInfo(input: {
  name: string;
  latitude: number | null;
  longitude: number | null;
  road_address: string;
  jibun_address: string;
  naver_map_url?: string;
}): MapInfo {
  const road = String(input.road_address || "").trim();
  const jibun = String(input.jibun_address || "").trim();
  const name = String(input.name || "").trim();
  const query = road || jibun || name;
  const encodedQuery = encodeURIComponent(query);
  const encodedName = encodeURIComponent(name || query);

  const coordinates =
    input.latitude != null &&
    input.longitude != null &&
    Number.isFinite(input.latitude) &&
    Number.isFinite(input.longitude)
      ? { latitude: input.latitude, longitude: input.longitude }
      : null;

  let naver_map_url = String(input.naver_map_url || "").trim();
  if (!naver_map_url && query) {
    naver_map_url = `https://map.naver.com/v5/search/${encodedQuery}`;
  }

  let kakao_map_url = "";
  if (coordinates) {
    kakao_map_url = `https://map.kakao.com/link/map/${encodedName},${coordinates.latitude},${coordinates.longitude}`;
  } else if (query) {
    kakao_map_url = `https://map.kakao.com/link/search/${encodedQuery}`;
  }

  let google_map_url = "";
  if (coordinates) {
    google_map_url = `https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`;
  } else if (query) {
    google_map_url = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
  }

  return {
    coordinates,
    road_address: road,
    jibun_address: jibun,
    naver_map_url,
    kakao_map_url,
    google_map_url
  };
}
