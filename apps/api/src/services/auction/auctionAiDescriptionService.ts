import { buildAiGenerate } from "../sourcing/sourcingService.js";

export async function generateAuctionDescription(input: {
  title: string;
  keywords?: string;
  condition?: string;
  category?: string;
}) {
  const title = String(input.title || "").trim();
  const keywords = [input.keywords, input.category, input.condition === "new_item" ? "새상품" : "중고"]
    .filter(Boolean)
    .join(" ");

  const result = await buildAiGenerate({
    keywords: keywords || title,
    sellerMemo: `VLUE 개인 경매 상품: ${title}. 상세 설명을 구매자 신뢰를 높이는 톤으로 작성.`
  });

  const draft = result.draft;
  return {
    description: draft.marketingDescription || draft.summary,
    sellingPoints: draft.sellingPoints
  };
}
