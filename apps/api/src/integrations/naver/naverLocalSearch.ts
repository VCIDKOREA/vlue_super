export type NaverLocalItem = {
  title: string;
  telephone: string;
  roadAddress: string;
  address: string;
  category: string;
  link: string;
};

function stripHtmlTags(raw: string): string {
  return String(raw || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
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

export async function searchNaverLocal(keyword: string): Promise<NaverLocalItem | null> {
  const clientId = String(process.env.NAVER_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.NAVER_CLIENT_SECRET || "").trim();
  if (!clientId || !clientSecret) return null;

  const url = new URL("https://openapi.naver.com/v1/search/local.json");
  url.searchParams.set("query", keyword);
  url.searchParams.set("display", "5");
  url.searchParams.set("sort", "random");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
        Accept: "application/json"
      }
    });
    const json = (await res.json().catch(() => ({}))) as {
      items?: Array<Record<string, string>>;
      errorMessage?: string;
    };
    if (!res.ok) return null;

    const items = Array.isArray(json.items) ? json.items : [];
    if (!items.length) return null;

    const best = items[0]!;
    const roadAddress = stripHtmlTags(best.roadAddress || best.address || "");
    const address = stripHtmlTags(best.address || roadAddress);
    return {
      title: stripHtmlTags(best.title || keyword),
      telephone: normalizePhone(best.telephone || ""),
      roadAddress: roadAddress || address,
      address,
      category: stripHtmlTags(best.category || ""),
      link: String(best.link || "").trim()
    };
  } catch {
    return null;
  }
}
