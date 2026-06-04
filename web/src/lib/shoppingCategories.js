/** 쇼핑 피드 · 검색창 카테고리 (표시 순서) */
/** 상품 등록 시 선택 (전체 제외) */
export const SHOPPING_REGISTER_CATEGORIES = [
  "실시간",
  "문구·사무",
  "유아·아동",
  "이벤트·할인",
  "티켓·상품권",
  "가구·인테리어",
  "건강 · 식품",
  "전자기기",
  "생활·주방",
  "반려용품",
  "스포츠·레저",
  "자동차용품",
  "패션·잡화",
  "미용·뷰티",
  "해외직구",
  "공동구매"
];

export const SHOPPING_CATEGORIES = [
  "전체",
  "실시간",
  "문구·사무",
  "유아·아동",
  "이벤트·할인",
  "티켓·상품권",
  "가구·인테리어",
  "건강 · 식품",
  "전자기기",
  "생활·주방",
  "반려용품",
  "스포츠·레저",
  "자동차용품",
  "패션·잡화",
  "미용·뷰티",
  "해외직구",
  "공동구매"
];

const LEGACY_CATEGORY_MAP = {
  "애견.묘용품": "반려용품",
  "전자제품": "전자기기",
  "생활용품": "생활·주방",
  "사무용품": "문구·사무",
  가구: "가구·인테리어",
  복합기: "문구·사무",
  식품: "건강 · 식품",
  건강식품: "건강 · 식품"
};

export function normalizeShoppingCategory(value) {
  if (!value || value === "전체") return "전체";
  if (SHOPPING_CATEGORIES.includes(value)) return value;
  return LEGACY_CATEGORY_MAP[value] || "전체";
}

export function inferShoppingCategory(item) {
  const stored = normalizeShoppingCategory(item?.shoppingCategory);
  if (stored && stored !== "전체" && SHOPPING_CATEGORIES.includes(stored)) return stored;

  const text = `${item?.overlayCaption || ""} ${item?.channelName || ""} ${item?.product?.title || ""} ${item?.sourceUrl || ""}`.toLowerCase();

  if (/공동구매|공구|groupbuy/.test(text)) return "공동구매";
  if (item?.isLive || /\blive\b|라이브|실시간/.test(text)) return "실시간";
  if (/티켓|상품권|교환권|e쿠폰|기프트카드/.test(text)) return "티켓·상품권";
  if (/이벤트|할인|특가|세일|쿠폰|프로모션/.test(text)) return "이벤트·할인";
  if (/유아|아동|키즈|베이비|기저귀|분유|장난감/.test(text)) return "유아·아동";
  if (/문구|오피스|사무|필기|노트|복사용지|복합기|프린터|사무기기|복사기|스캐너|토너|잉크/.test(text)) return "문구·사무";
  if (/가구|소파|인테리어|침대|매트리스|조명/.test(text)) return "가구·인테리어";
  if (/건강|영양|비타민|홍삼|식품|먹거리|과자|음료|식료/.test(text)) return "건강 · 식품";
  if (/가전|전자|폰|이어폰|노트북|태블릿|tv|컴퓨터|스마트|모니터|카메라/.test(text)) return "전자기기";
  if (/생활|주방|욕실|정리|청소|수납|세제/.test(text)) return "생활·주방";
  if (/반려|강아지|고양이|애견|애묘|펫|pet/.test(text)) return "반려용품";
  if (/스포츠|레저|캠핑|등산|골프|자전거|피트니스|헬스/.test(text)) return "스포츠·레저";
  if (/자동차|차량|카닥|타이어|오일|블랙박스|세차/.test(text)) return "자동차용품";
  if (/패션|의류|잡화|가방|신발|액세서리|주얼리|코디/.test(text)) return "패션·잡화";
  if (/미용|뷰티|화장품|스킨|메이크업|향수|헤어/.test(text)) return "미용·뷰티";
  if (/해외|직구/.test(text)) return "해외직구";

  return "전체";
}
