/** 소싱·등록 전용 카테고리 (피드 카테고리와 별도) */
export const SOURCING_REGISTER_CATEGORIES = [
  "의류·잡화",
  "전자기기",
  "가구·인테리어",
  "뷰티·미용",
  "스포츠·레저",
  "도서·티켓",
  "식품·건강",
  "유아·완구",
  "해외직구",
  "공동구매",
  "기타"
];

/** 카테고리별 추가 입력 필드 */
export const SOURCING_CATEGORY_FIELDS = {
  "의류·잡화": [
    { key: "size", label: "사이즈", placeholder: "예: M, 270mm", type: "text" },
    { key: "color", label: "색상", placeholder: "예: 블랙", type: "text" },
    { key: "material", label: "소재", placeholder: "예: 면 100%", type: "text" }
  ],
  전자기기: [
    { key: "model", label: "모델명", placeholder: "예: Galaxy S24", type: "text" },
    { key: "warranty", label: "보증", placeholder: "예: 1년 제조사", type: "text" }
  ],
  "가구·인테리어": [
    { key: "dimensions", label: "크기 (cm)", placeholder: "가로×세로×높이", type: "text" },
    { key: "assembly", label: "조립", placeholder: "예: 부분 조립 필요", type: "text" }
  ],
  "뷰티·미용": [
    { key: "volume", label: "용량", placeholder: "예: 50ml", type: "text" },
    { key: "expiry", label: "유통기한", placeholder: "예: 2026.12", type: "text" }
  ],
  "스포츠·레저": [
    { key: "brand", label: "브랜드", placeholder: "예: Nike", type: "text" },
    { key: "sportType", label: "종목", placeholder: "예: 등산", type: "text" }
  ],
  "도서·티켓": [
    { key: "isbnOrEvent", label: "ISBN / 행사일", placeholder: "ISBN 또는 공연일", type: "text" },
    { key: "venue", label: "장소", placeholder: "예: 올림픽공원", type: "text" }
  ],
  "식품·건강": [
    { key: "expiry", label: "유통기한", placeholder: "예: 2026.06", type: "text" },
    { key: "origin", label: "원산지", placeholder: "예: 국내산", type: "text" }
  ],
  "유아·완구": [
    { key: "ageRange", label: "권장 연령", placeholder: "예: 36개월 이상", type: "text" },
    { key: "safety", label: "안전인증", placeholder: "예: KC 인증", type: "text" }
  ],
  해외직구: [
    { key: "originCountry", label: "발송 국가", placeholder: "예: 미국", type: "text" },
    { key: "customsNote", label: "통관 안내", placeholder: "예: 관부가세 별도", type: "text" }
  ],
  공동구매: [
    { key: "minQty", label: "최소 인원", placeholder: "예: 10명", type: "text" },
    { key: "deadline", label: "마감일", placeholder: "예: 3/30", type: "text" }
  ],
  기타: [{ key: "note", label: "추가 안내", placeholder: "구매 시 참고 사항", type: "textarea" }]
};

export function getSourcingCategoryFields(category) {
  return SOURCING_CATEGORY_FIELDS[category] || [];
}

/** 피드 노출용 쇼핑 카테고리 매핑 */
export function mapSourcingCategoryToFeed(category) {
  const map = {
    "의류·잡화": "패션·잡화",
    "전자기기": "전자기기",
    "가구·인테리어": "가구·인테리어",
    "뷰티·미용": "미용·뷰티",
    "스포츠·레저": "스포츠·레저",
    "도서·티켓": "티켓·상품권",
    "식품·건강": "건강 · 식품",
    "유아·완구": "유아·아동",
    해외직구: "해외직구",
    공동구매: "공동구매",
    기타: "문구·사무"
  };
  return map[category] || category;
}
