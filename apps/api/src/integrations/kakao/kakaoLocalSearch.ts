export type KakaoLocalItem = {
  place_name: string;
  telephone: string;
  address: string;
  road_address: string;
  category: string;
  place_url: string;
  latitude: number | null;
  longitude: number | null;
  rank: number;
};

export type KakaoSearchResult = {
  item: KakaoLocalItem | null;
  unavailable_reason: string;
  http_status: number | null;
};

function getKakaoRestKey(): string {
  return (
    String(process.env.KAKAO_REST_API_KEY || "").trim() ||
    String(process.env.KAKAO_CLIENT_ID || "").trim()
  );
}

function humanizeKakaoError(raw: string, httpStatus: number): string {
  const msg = String(raw || "").trim();
  if (/deactivated/i.test(msg)) {
    return "카카오 REST API 앱 키가 비활성화(deactivated) 상태입니다. 카카오 개발자 콘솔에서 앱을 '서비스 중'으로 전환하고, 활성 REST API 키를 Railway KAKAO_REST_API_KEY에 다시 등록한 뒤 @vlue/api를 재배포해 주세요.";
  }
  if (httpStatus === 401) return "카카오 REST API 키가 유효하지 않습니다.";
  if (httpStatus === 403) {
    return "카카오 [로컬] API 사용 권한이 없습니다. 개발자 콘솔 → 제품 설정 → 로컬 API를 활성화해 주세요.";
  }
  if (!msg) return "카카오에서 일치하는 장소를 찾지 못했습니다.";
  return msg;
}

function normalizePhone(raw: string): string {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) {
    if (digits.startsWith("02")) return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return String(raw || "").trim();
}

function scoreKakaoDoc(doc: Record<string, string>, keyword: string): number {
  const name = String(doc.place_name || "").replace(/\s/g, "").toLowerCase();
  const kw = String(keyword || "").replace(/\s/g, "").toLowerCase();
  const tokens = String(keyword || "")
    .split(/\s+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  let score = 0;
  if (kw && name.includes(kw)) score += 12;
  if (kw && kw.includes(name) && name.length >= 2) score += 8;
  for (const token of tokens) {
    const compact = token.replace(/\s/g, "");
    if (compact.length >= 2 && name.includes(compact)) score += 4;
  }
  if (normalizePhone(doc.phone || "")) score += 3;
  if (doc.road_address_name || doc.address_name) score += 1;
  return score;
}

function parseKakaoDoc(doc: Record<string, string>, keyword: string, rank: number): KakaoLocalItem {
  const road = String(doc.road_address_name || "").trim();
  const jibun = String(doc.address_name || "").trim();
  const x = Number(doc.x || 0);
  const y = Number(doc.y || 0);

  return {
    place_name: String(doc.place_name || keyword).trim(),
    telephone: normalizePhone(doc.phone || ""),
    address: road || jibun,
    road_address: road,
    category: String(doc.category_name || "").trim(),
    place_url: String(doc.place_url || "").trim(),
    latitude: y > 0 ? y : null,
    longitude: x > 0 ? x : null,
    rank
  };
}

async function fetchKakaoDocs(
  keyword: string,
  size = 10
): Promise<{ docs: Record<string, string>[]; httpStatus: number; apiMessage: string }> {
  const restKey = getKakaoRestKey();
  if (!restKey) {
    return { docs: [], httpStatus: 0, apiMessage: "KAKAO_REST_API_KEY 미설정" };
  }

  const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
  url.searchParams.set("query", keyword);
  url.searchParams.set("size", String(Math.min(Math.max(size, 1), 15)));

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `KakaoAK ${restKey}`,
        Accept: "application/json"
      }
    });
    const json = (await res.json().catch(() => ({}))) as {
      documents?: Array<Record<string, string>>;
      message?: string;
    };
    const docs = res.ok && Array.isArray(json.documents) ? json.documents : [];
    const rawMsg = json.message || "";
    const apiMessage = docs.length
      ? ""
      : humanizeKakaoError(rawMsg || (res.ok ? "" : `카카오 API 오류 (${res.status})`), res.status);
    return { docs, httpStatus: res.status, apiMessage };
  } catch {
    return { docs: [], httpStatus: 0, apiMessage: "카카오 API 네트워크 오류" };
  }
}

export async function searchKakaoLocalList(keyword: string, max = 10): Promise<KakaoLocalItem[]> {
  const { docs } = await fetchKakaoDocs(keyword, max);
  const q = String(keyword || "").trim();
  if (!docs.length) return [];

  const parsed = docs.map((doc, index) => parseKakaoDoc(doc, q, index + 1));
  const ranked = parsed
    .map((item, index) => ({ item, score: scoreKakaoDoc(docs[index]!, q) }))
    .sort((a, b) => b.score - a.score);
  const bestScore = ranked[0]?.score ?? 0;
  if (bestScore > 0) return ranked.filter((r) => r.score > 0).map((r) => r.item);
  return [parsed[0]!];
}

export async function searchKakaoLocalDetailed(keyword: string): Promise<KakaoSearchResult> {
  const q = String(keyword || "").trim();
  if (!q) {
    return { item: null, unavailable_reason: "검색어가 비어 있습니다.", http_status: null };
  }

  const { docs, httpStatus, apiMessage } = await fetchKakaoDocs(q, 10);
  if (!docs.length) {
    return { item: null, unavailable_reason: apiMessage, http_status: httpStatus || null };
  }

  const list = await searchKakaoLocalList(q, 10);
  return {
    item: list[0] ?? null,
    unavailable_reason: list[0] ? "" : apiMessage || "카카오 결과 파싱 실패",
    http_status: httpStatus
  };
}

export async function searchKakaoLocal(keyword: string): Promise<KakaoLocalItem | null> {
  const result = await searchKakaoLocalDetailed(keyword);
  return result.item;
}
