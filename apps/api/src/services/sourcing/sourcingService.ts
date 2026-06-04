import { scrapeUrlMeta } from "./urlMetaScraper.js";

type VisionDraftInput = {
  imageUrl?: string;
  imageBase64?: string;
  imageBase64List?: string[];
  storeProfileId?: string;
  sellerMemo?: string;
  keywords?: string;
};

export type AiGenerateResult = {
  title: string;
  summary: string;
  marketingDescription: string;
  sellingPoints: string[];
  suggestedPrice: string;
  priceKrw: number;
  editable: string[];
  caution: string;
};

function buildTemplate(title: string, summary: string, priceHint: string, marketing?: string): AiGenerateResult {
  const priceKrw = Number(String(priceHint).replace(/\D/g, "")) || 39000;
  return {
    title,
    summary,
    marketingDescription:
      marketing ||
      `${summary}\n\n✔ 실사 촬영 기준 상태를 안내드립니다.\n✔ 문의 주시면 빠르게 답변드립니다.\n✔ 안전 포장 후 발송합니다.`,
    sellingPoints: [
      "실사 기반 상태 확인 가능",
      "빠른 문의 응대",
      "안전 포장 발송"
    ],
    editable: ["priceKrw", "title"],
    suggestedPrice: String(priceKrw),
    priceKrw,
    caution: "가격과 상품명은 수정 가능합니다."
  };
}

function extractJsonText(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  const o = raw as Record<string, unknown>;
  const output = o.output;
  if (Array.isArray(output)) {
    for (const block of output) {
      const content = (block as Record<string, unknown>)?.content;
      if (Array.isArray(content)) {
        for (const part of content) {
          const text = (part as Record<string, unknown>)?.text;
          if (typeof text === "string" && text.trim()) return text.trim();
        }
      }
    }
  }
  return "";
}

function parseAiJson(text: string, keywords: string): AiGenerateResult | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    const title = String(parsed.title || parsed.productName || "AI 소싱 상품").trim();
    const summary = String(parsed.summary || parsed.description || keywords || "상품 설명").trim();
    const marketingDescription = String(
      parsed.marketingDescription || parsed.detailDescription || parsed.summary || summary
    ).trim();
    const priceHint = String(parsed.priceHint || parsed.suggestedPrice || parsed.priceKrw || "49000");
    return buildTemplate(title, summary, priceHint, marketingDescription);
  } catch {
    return null;
  }
}

async function callOpenAiVision(input: VisionDraftInput) {
  const key = (process.env.OPENAI_API_KEY || "").trim();
  if (!key) return null;
  const firstBase64 =
    input.imageBase64 ||
    (input.imageBase64List && input.imageBase64List[0]) ||
    "";
  const imageRef = input.imageUrl
    ? { type: "input_image", image_url: input.imageUrl }
    : firstBase64
      ? { type: "input_image", image_url: `data:image/jpeg;base64,${firstBase64}` }
      : null;
  if (!imageRef) return null;

  const keywords = (input.keywords || input.sellerMemo || "").trim();
  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                `판매자 키워드: ${keywords || "없음"}\n` +
                "이미지와 키워드를 바탕으로 한국어 상품 JSON을 만들어줘. 키: title, summary, marketingDescription, priceHint(숫자만). marketingDescription은 마케팅 상세 설명 3~5문장."
            },
            imageRef
          ]
        }
      ]
    })
  });
  if (!resp.ok) return null;
  return (await resp.json()) as Record<string, unknown>;
}

export async function buildVisionDraft(input: VisionDraftInput) {
  const keywords = (input.keywords || input.sellerMemo || "").trim();
  const openAi = await callOpenAiVision({ ...input, keywords }).catch(() => null);
  const parsed = openAi ? parseAiJson(extractJsonText(openAi), keywords) : null;
  const fallback = buildTemplate(
    keywords ? `${keywords.split(/[,，]/)[0].trim()} 상품` : "AI 소싱 상품",
    keywords || "이미지 기반으로 생성된 상품 설명 초안입니다.",
    "49000"
  );
  return {
    storeProfileId: input.storeProfileId || null,
    draft: parsed || fallback,
    provider: parsed ? "openai" : "mock",
    raw: openAi
  };
}

export async function buildAiGenerate(input: VisionDraftInput) {
  return buildVisionDraft(input);
}

export function detectPlatform(host: string) {
  if (host.includes("coupang")) return "coupang";
  if (host.includes("smartstore") || host.includes("shopping.naver") || host.includes("naver")) return "smartstore";
  return "store";
}

export async function fetchInlineSourcingFromUrl(url: string) {
  const safeUrl = url.trim();
  let host = "";
  try {
    host = new URL(safeUrl).hostname.toLowerCase();
  } catch {
    throw new Error("올바른 상품 URL을 입력해 주세요.");
  }
  const platform = detectPlatform(host);

  try {
    const meta = await scrapeUrlMeta(safeUrl);
    return {
      sourceUrl: safeUrl,
      platform,
      title: meta.title || "소싱 상품",
      priceKrw: meta.priceKrw || 0,
      imageUrl: meta.imageUrl || "",
      description: meta.description || "",
      options: []
    };
  } catch {
    return {
      sourceUrl: safeUrl,
      platform,
      title: platform === "store" ? "자사몰 소싱 상품" : `${platform} 소싱 상품`,
      priceKrw: 0,
      imageUrl: "",
      description: "",
      options: []
    };
  }
}

/** @deprecated sync stub — use fetchInlineSourcingFromUrl */
export function parseInlineSourcingUrl(url: string) {
  const safeUrl = url.trim();
  const host = (() => {
    try {
      return new URL(safeUrl).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();
  const platform = detectPlatform(host);
  return {
    sourceUrl: safeUrl,
    platform,
    title: platform === "store" ? "자사몰 소싱 상품" : `${platform} 소싱 상품`,
    priceKrw: 0,
    imageUrl: "",
    description: "",
    options: []
  };
}
