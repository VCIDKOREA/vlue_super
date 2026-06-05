export const certifiedOrgs = [
  {
    id: "vlue-001",
    name: "명경채 요양병원",
    category: "의료기관 / 요양병원",
    address: "서울특별시 강남구 테헤란로 123, 명경채빌딩 3-5층",
    phone: "02-1234-5678",
    certifiedDate: "2024-03-15",
    validUntil: "2026-03-14",
    certNumber: "VLUE-MED-2024-0031",
    status: "active",
    description: "명경채 요양병원은 노인성 질환 및 재활치료를 전문으로 하는 의료기관입니다.",
    representative: "김명경",
    businessNumber: "123-45-67890",
    tags: ["의료", "요양", "재활", "노인케어"],
    lastVerified: "2026-04-17 09:32:15"
  },
  {
    id: "vlue-002",
    name: "다다오피스",
    category: "비즈니스 서비스 / 공유오피스",
    address: "서울특별시 마포구 월드컵북로 56길 19, 다다타워 2층",
    phone: "02-9876-5432",
    certifiedDate: "2024-06-01",
    validUntil: "2026-05-31",
    certNumber: "VLUE-BIZ-2024-0087",
    status: "active",
    description: "다다오피스는 스타트업 및 소규모 기업을 위한 프리미엄 공유오피스 서비스를 제공합니다.",
    representative: "박다다",
    businessNumber: "234-56-78901",
    tags: ["공유오피스", "스타트업", "비즈니스", "보안인증"],
    lastVerified: "2026-04-17 10:15:42"
  },
  {
    id: "vlue-003",
    name: "한국신뢰금융",
    category: "금융기관 / 대출중개",
    address: "서울특별시 중구 을지로 100, 한국신뢰빌딩 8층",
    phone: "02-5555-7777",
    certifiedDate: "2025-01-10",
    validUntil: "2027-01-09",
    certNumber: "VLUE-FIN-2025-0012",
    status: "active",
    description: "금융감독원 등록 대출중개업체로 VLUE 인증을 통한 합법적인 금융 서비스를 제공합니다.",
    representative: "이신뢰",
    businessNumber: "345-67-89012",
    tags: ["금융", "대출", "합법기관", "인증"],
    lastVerified: "2026-04-17 08:00:01"
  }
];
export const publicDataResults = [
  {
    id: "pub-001",
    name: "명경채 요양병원",
    category: "요양병원",
    address: "서울특별시 강남구 테헤란로 123",
    phone: "02-1234-5678",
    source: "건강보험심사평가원",
    lastUpdated: "2025-01-10",
    status: "정상운영"
  },
  {
    id: "pub-002",
    name: "다다오피스",
    category: "사업장",
    address: "서울특별시 마포구 월드컵북로 56길 19",
    phone: "02-9876-5432",
    source: "국세청 사업자정보",
    lastUpdated: "2025-02-20",
    status: "정상사업자"
  },
  {
    id: "pub-003",
    name: "한국신뢰금융",
    category: "금융업",
    address: "서울특별시 중구 을지로 100",
    phone: "02-5555-7777",
    source: "금융감독원",
    lastUpdated: "2025-03-15",
    status: "정상등록"
  }
];
export const newsItems = [
  {
    id: "news-001",
    title: "금융기관 사칭 보이스피싱 전월 대비 37% 급증",
    date: "2026-04-15",
    category: "alert",
    summary: "최근 주요 시중은행 및 카드사를 사칭한 보이스피싱 피해가 전월 대비 37% 증가하였습니다. 발신번호 변작 기술을 활용한 신종 수법이 확인되었으니 각별한 주의가 필요합니다.",
    imageUrl: "https://images.pexels.com/photos/5935794/pexels-photo-5935794.jpeg?auto=compress&cs=tinysrgb&w=400"
  },
  {
    id: "news-002",
    title: "VLUE 인증 기관 2분기 신규 등록 접수 시작",
    date: "2026-04-10",
    category: "notice",
    summary: "2026년 2분기(4월~6월) VLUE 인증 신청 접수가 시작됩니다. 의료기관, 금융기관, 공공기관 등 모든 업종 신청 가능합니다.",
    imageUrl: "https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=400"
  },
  {
    id: "news-003",
    title: "정부, 보이스피싱 처벌 강화 법안 국회 통과",
    date: "2026-04-08",
    category: "news",
    summary: "전기통신금융사기 처벌 강화 및 피해구제에 관한 특별법 개정안이 국회 본회의를 통과하였습니다.",
    imageUrl: "https://images.pexels.com/photos/1078981/pexels-photo-1078981.jpeg?auto=compress&cs=tinysrgb&w=400"
  },
  {
    id: "news-004",
    title: "VLUE 플랫폼 API 연동 서비스 베타 출시",
    date: "2026-03-28",
    category: "notice",
    summary: "기업 및 기관에서 VLUE 인증 데이터를 직접 조회할 수 있는 API 서비스가 베타 오픈되었습니다.",
    imageUrl: "https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=400"
  },
  {
    id: "news-005",
    title: "VLUE × 경찰청 보이스피싱 대응 MOU 체결",
    date: "2026-03-20",
    category: "news",
    summary: "VLUE와 경찰청 사이버수사국이 보이스피싱 신고 데이터 실시간 공유 MOU를 체결했습니다.",
    imageUrl: "https://images.pexels.com/photos/5668473/pexels-photo-5668473.jpeg?auto=compress&cs=tinysrgb&w=400"
  },
  {
    id: "news-006",
    title: "디지털 명함 서비스 정식 출시 — 사칭 원천 차단",
    date: "2026-03-15",
    category: "notice",
    summary: "VLUE 인증 회원 전용 디지털 명함 서비스가 정식 출시되었습니다. 인증 마크와 보안 경고 문구가 포함되어 사칭 피해를 원천 차단합니다.",
    imageUrl: "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=400"
  },
  {
    id: "event-001",
    title: "서울 강남 보이스피싱 예방 교육 행사",
    date: "2026-04-25",
    category: "event",
    summary: "강남구청 주관으로 노인층 대상 보이스피싱 예방 교육이 진행됩니다. 참여 신청 후 무료 참가 가능합니다.",
    region: "서울 강남구",
    imageUrl: "https://images.pexels.com/photos/7176026/pexels-photo-7176026.jpeg?auto=compress&cs=tinysrgb&w=400"
  },
  {
    id: "event-002",
    title: "부산 해운대 VLUE 인증 설명회",
    date: "2026-05-03",
    category: "event",
    summary: "VLUE 인증 취득을 희망하는 부산 지역 기업 및 기관을 위한 설명회가 개최됩니다.",
    region: "부산 해운대구",
    imageUrl: "https://images.pexels.com/photos/1181562/pexels-photo-1181562.jpeg?auto=compress&cs=tinysrgb&w=400"
  },
  {
    id: "event-003",
    title: "대구 수성구 금융사기 예방 캠페인",
    date: "2026-05-10",
    category: "event",
    summary: "대구광역시와 공동 주관으로 금융사기 예방 캠페인 및 VLUE 서비스 체험 행사가 열립니다.",
    region: "대구 수성구",
    imageUrl: "https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=400"
  },
  {
    id: "event-004",
    title: "인천 연수구 스마트 보안 세미나",
    date: "2026-05-17",
    category: "event",
    summary: "디지털 금융사기 예방을 위한 스마트 보안 세미나 및 VLUE 플랫폼 시연 행사입니다.",
    region: "인천 연수구",
    imageUrl: "https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=400"
  },
  {
    id: "event-005",
    title: "광주 서구 청년 보안 창업 네트워킹",
    date: "2026-05-24",
    category: "event",
    summary: "보안 스타트업을 꿈꾸는 청년들을 위한 네트워킹 및 VLUE 파트너십 설명회입니다.",
    region: "광주 서구",
    imageUrl: "https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=400"
  },
  {
    id: "event-006",
    title: "대전 유성구 어르신 디지털 안심 교실",
    date: "2026-06-01",
    category: "event",
    summary: "65세 이상 어르신을 위한 스마트폰 보이스피싱 예방 무료 교육 프로그램입니다.",
    region: "대전 유성구",
    imageUrl: "https://images.pexels.com/photos/7176026/pexels-photo-7176026.jpeg?auto=compress&cs=tinysrgb&w=400"
  }
];
export const products = [
  {
    id: "prod-001",
    name: "요양병원 입원 상담 서비스",
    seller: "명경채 요양병원",
    price: 0,
    category: "의료상담",
    imageUrl: "https://images.pexels.com/photos/305565/pexels-photo-305565.jpeg?auto=compress&cs=tinysrgb&w=400",
    rating: 4.9,
    reviews: 128,
    certified: true
  },
  {
    id: "prod-002",
    name: "프리미엄 공유오피스 월 이용권",
    seller: "다다오피스",
    price: 29e4,
    originalPrice: 35e4,
    category: "오피스",
    imageUrl: "https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=400",
    rating: 4.8,
    reviews: 204,
    certified: true
  },
  {
    id: "prod-003",
    name: "보이스피싱 예방 기업 교육 패키지",
    seller: "VLUE 공식",
    price: 15e4,
    category: "교육",
    imageUrl: "https://images.pexels.com/photos/3184431/pexels-photo-3184431.jpeg?auto=compress&cs=tinysrgb&w=400",
    rating: 5,
    reviews: 67,
    certified: true
  },
  {
    id: "prod-004",
    name: "스마트 보안 컨설팅 서비스",
    seller: "한국신뢰금융",
    price: 5e5,
    originalPrice: 7e5,
    category: "컨설팅",
    imageUrl: "https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=400",
    rating: 4.7,
    reviews: 45,
    certified: true
  },
  {
    id: "prod-005",
    name: "노인 맞춤 재활 치료 프로그램",
    seller: "명경채 요양병원",
    price: 0,
    category: "의료",
    imageUrl: "https://images.pexels.com/photos/4386467/pexels-photo-4386467.jpeg?auto=compress&cs=tinysrgb&w=400",
    rating: 4.9,
    reviews: 93,
    certified: true
  },
  {
    id: "prod-006",
    name: "스타트업 입주 패키지 (3개월)",
    seller: "다다오피스",
    price: 75e4,
    originalPrice: 105e4,
    category: "오피스",
    imageUrl: "https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=400",
    rating: 4.8,
    reviews: 156,
    certified: true
  },
  {
    id: "prod-007",
    name: "사무용 친환경 책상 (공구)",
    seller: "그린오피스",
    price: 89e3,
    originalPrice: 13e4,
    category: "오피스",
    imageUrl: "https://images.pexels.com/photos/1957478/pexels-photo-1957478.jpeg?auto=compress&cs=tinysrgb&w=400",
    rating: 4.5,
    reviews: 312,
    certified: false,
    isGroupBuy: true
  },
  {
    id: "prod-008",
    name: "업무용 에르고노믹 의자 (공구)",
    seller: "체어마켓",
    price: 189e3,
    originalPrice: 28e4,
    category: "오피스",
    imageUrl: "https://images.pexels.com/photos/1957478/pexels-photo-1957478.jpeg?auto=compress&cs=tinysrgb&w=400",
    rating: 4.6,
    reviews: 189,
    certified: false,
    isGroupBuy: true
  }
];
export const templates = [
  {
    id: "tmpl-001",
    name: "거래처 안전 확인서",
    category: "법무/계약",
    description: "신규 거래처의 VLUE 인증 여부를 확인하고 안전 거래를 보장하는 공식 확인서 양식.",
    content: "[거래처 안전 확인서]",
    thumbnail: "doc"
  },
  {
    id: "tmpl-002",
    name: "보이스피싱 피해 신고서",
    category: "신고/민원",
    description: "보이스피싱 피해 발생 시 관계 기관에 제출하는 공식 피해 신고서 양식.",
    content: "[보이스피싱 피해 신고서]",
    thumbnail: "report"
  },
  {
    id: "tmpl-003",
    name: "VLUE 인증 신청서",
    category: "인증/등록",
    description: "VLUE 공식 인증을 신청하기 위한 표준 신청서 양식.",
    content: "[VLUE 인증 신청서]",
    thumbnail: "cert"
  }
];
export const pricingTiers = [
  {
    id: "basic",
    name: "베이직",
    price: 0,
    period: "무료",
    description: "개인 및 소규모 기관을 위한 기본 서비스",
    color: "gray",
    features: [
      "VLUE 통합 검색: 무제한",
      "보안 자료실: 무제한 이용",
      "디지털 명함(표준형: 연블루) 선택 발급",
      "개인용 채팅 APP 사용",
      "@vlue.kr 메일 (1GB)",
      "보이스피싱 실시간 경보"
    ]
  },
  {
    id: "standard",
    name: "스탠다드",
    price: 29e3,
    period: "월",
    description: "중소기업 및 기관을 위한 표준 인증 서비스",
    color: "blue",
    recommended: true,
    features: [
      "인증서 기반 디지털 명함 (골드 애니메이션 테두리)",
      "영업/조직용 채팅 APP",
      "블루쇼핑 입점 권한",
      "공식 인증 마크 발급",
      "전용 API 연동",
      "레터링 서비스 기본 포함",
      "전화/이메일 우선 지원"
    ]
  },
  {
    id: "premium",
    name: "프리미엄",
    price: 89e3,
    period: "월",
    description: "대기업 및 공공기관을 위한 최상위 서비스",
    color: "gold",
    features: [
      "프리미엄 디지털 명함 (무지개 홀로그램 애니메이션)",
      "피해 보상 보험 연계",
      "전담 AM 배정",
      "위치 기반 안심 구역",
      "API 무제한",
      "연간 보안 감사 1회 무료",
      "24시간 긴급 지원"
    ]
  }
];
export const jobPosts = [
  {
    id: "job-001",
    title: "보안 플랫폼 프론트엔드 개발자",
    company: "VLUE 공식",
    location: "서울 강남구",
    type: "정규직",
    salary: "4,000~6,000만원",
    deadline: "2026-05-31",
    certified: true,
    tags: ["React", "TypeScript", "보안"]
  },
  {
    id: "job-002",
    title: "요양병원 간호사 (경력 2년 이상)",
    company: "명경채 요양병원",
    location: "서울 강남구",
    type: "정규직",
    salary: "3,200~4,000만원",
    deadline: "2026-05-15",
    certified: true,
    tags: ["간호", "노인케어", "재활"]
  },
  {
    id: "job-003",
    title: "공유오피스 운영 매니저",
    company: "다다오피스",
    location: "서울 마포구",
    type: "정규직",
    salary: "2,800~3,500만원",
    deadline: "2026-05-20",
    certified: true,
    tags: ["운영관리", "고객서비스", "오피스"]
  },
  {
    id: "job-004",
    title: "금융 보안 컨설턴트 (계약직)",
    company: "한국신뢰금융",
    location: "서울 중구",
    type: "계약직",
    salary: "협의",
    deadline: "2026-05-25",
    certified: true,
    tags: ["금융", "보안", "컨설팅"]
  },
  {
    id: "job-005",
    title: "AI 보이스피싱 탐지 연구원",
    company: "VLUE 공식",
    location: "서울 강남구",
    type: "정규직",
    salary: "5,000~8,000만원",
    deadline: "2026-06-10",
    certified: true,
    tags: ["AI", "머신러닝", "보안연구"]
  },
  {
    id: "job-006",
    title: "마케팅 인턴 (대졸 우대)",
    company: "다다오피스",
    location: "서울 마포구",
    type: "인턴",
    salary: "월 220만원",
    deadline: "2026-05-10",
    certified: true,
    tags: ["마케팅", "SNS", "콘텐츠"]
  }
];
export const jobProfiles = [
  {
    id: "prof-001",
    name: "김**",
    field: "IT 개발",
    experience: "경력 5년",
    location: "서울",
    education: "컴퓨터공학 학사",
    tags: ["React", "Node.js", "보안"],
    available: true
  },
  {
    id: "prof-002",
    name: "이**",
    field: "간호·의료",
    experience: "경력 8년",
    location: "서울/경기",
    education: "간호학 학사",
    tags: ["노인케어", "재활", "ICU"],
    available: true
  },
  {
    id: "prof-003",
    name: "박**",
    field: "금융·컨설팅",
    experience: "경력 12년",
    location: "서울",
    education: "경영학 석사",
    tags: ["금융분석", "리스크관리", "컴플라이언스"],
    available: false
  },
  {
    id: "prof-004",
    name: "최**",
    field: "마케팅",
    experience: "신입",
    location: "서울/재택",
    education: "경영학 학사",
    tags: ["SNS마케팅", "콘텐츠", "브랜딩"],
    available: true
  },
  {
    id: "prof-005",
    name: "정**",
    field: "보안 연구",
    experience: "경력 7년",
    location: "서울",
    education: "정보보안 석사",
    tags: ["사이버보안", "AI탐지", "침투테스트"],
    available: true
  },
  {
    id: "prof-006",
    name: "한**",
    field: "운영관리",
    experience: "경력 4년",
    location: "서울/경기",
    education: "경영학 학사",
    tags: ["시설관리", "고객서비스", "오피스"],
    available: true
  }
];

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vY2tEYXRhLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENlcnRpZmllZE9yZywgUHVibGljRGF0YVJlc3VsdCwgTmV3c0l0ZW0sIFByb2R1Y3QsIFRlbXBsYXRlLCBQcmljaW5nVGllciwgSm9iUG9zdCwgSm9iUHJvZmlsZSB9IGZyb20gJy4uL3R5cGVzJztcblxuZXhwb3J0IGNvbnN0IGNlcnRpZmllZE9yZ3M6IENlcnRpZmllZE9yZ1tdID0gW1xuICB7XG4gICAgaWQ6ICd2bHVlLTAwMScsXG4gICAgbmFtZTogJ+uqheqyveyxhCDsmpTslpHrs5Hsm5AnLFxuICAgIGNhdGVnb3J5OiAn7J2Y66OM6riw6rSAIC8g7JqU7JaR67OR7JuQJyxcbiAgICBhZGRyZXNzOiAn7ISc7Jq47Yq567OE7IucIOqwleuCqOq1rCDthYztl6TrnoDroZwgMTIzLCDrqoXqsr3ssYTruYzrlKkgMy017Li1JyxcbiAgICBwaG9uZTogJzAyLTEyMzQtNTY3OCcsXG4gICAgY2VydGlmaWVkRGF0ZTogJzIwMjQtMDMtMTUnLFxuICAgIHZhbGlkVW50aWw6ICcyMDI2LTAzLTE0JyxcbiAgICBjZXJ0TnVtYmVyOiAnVkxVRS1NRUQtMjAyNC0wMDMxJyxcbiAgICBzdGF0dXM6ICdhY3RpdmUnLFxuICAgIGRlc2NyaXB0aW9uOiAn66qF6rK97LGEIOyalOyWkeuzkeybkOydgCDrhbjsnbjshLEg7KeI7ZmYIOuwjyDsnqztmZzsuZjro4zrpbwg7KCE66y47Jy866GcIO2VmOuKlCDsnZjro4zquLDqtIDsnoXri4jri6QuJyxcbiAgICByZXByZXNlbnRhdGl2ZTogJ+q5gOuqheqyvScsXG4gICAgYnVzaW5lc3NOdW1iZXI6ICcxMjMtNDUtNjc4OTAnLFxuICAgIHRhZ3M6IFsn7J2Y66OMJywgJ+yalOyWkScsICfsnqztmZwnLCAn64W47J247LyA7Ja0J10sXG4gICAgbGFzdFZlcmlmaWVkOiAnMjAyNi0wNC0xNyAwOTozMjoxNScsXG4gIH0sXG4gIHtcbiAgICBpZDogJ3ZsdWUtMDAyJyxcbiAgICBuYW1lOiAn64uk64uk7Jik7ZS87IqkJyxcbiAgICBjYXRlZ29yeTogJ+u5hOymiOuLiOyKpCDshJzruYTsiqQgLyDqs7XsnKDsmKTtlLzsiqQnLFxuICAgIGFkZHJlc3M6ICfshJzsmrjtirnrs4Tsi5wg66eI7Y+s6rWsIOyblOuTnOy7teu2geuhnCA1Nuq4uCAxOSwg64uk64uk7YOA7JuMIDLsuLUnLFxuICAgIHBob25lOiAnMDItOTg3Ni01NDMyJyxcbiAgICBjZXJ0aWZpZWREYXRlOiAnMjAyNC0wNi0wMScsXG4gICAgdmFsaWRVbnRpbDogJzIwMjYtMDUtMzEnLFxuICAgIGNlcnROdW1iZXI6ICdWTFVFLUJJWi0yMDI0LTAwODcnLFxuICAgIHN0YXR1czogJ2FjdGl2ZScsXG4gICAgZGVzY3JpcHRpb246ICfri6Tri6TsmKTtlLzsiqTripQg7Iqk7YOA7Yq47JeFIOuwjyDshozqt5zrqqgg6riw7JeF7J2EIOychO2VnCDtlITrpqzrr7jsl4Qg6rO17Jyg7Jik7ZS87IqkIOyEnOu5hOyKpOulvCDsoJzqs7Xtlanri4jri6QuJyxcbiAgICByZXByZXNlbnRhdGl2ZTogJ+uwleuLpOuLpCcsXG4gICAgYnVzaW5lc3NOdW1iZXI6ICcyMzQtNTYtNzg5MDEnLFxuICAgIHRhZ3M6IFsn6rO17Jyg7Jik7ZS87IqkJywgJ+yKpO2DgO2KuOyXhScsICfruYTspojri4jsiqQnLCAn67O07JWI7J247KadJ10sXG4gICAgbGFzdFZlcmlmaWVkOiAnMjAyNi0wNC0xNyAxMDoxNTo0MicsXG4gIH0sXG4gIHtcbiAgICBpZDogJ3ZsdWUtMDAzJyxcbiAgICBuYW1lOiAn7ZWc6rWt7Iug66Kw6riI7Jy1JyxcbiAgICBjYXRlZ29yeTogJ+q4iOycteq4sOq0gCAvIOuMgOy2nOykkeqwnCcsXG4gICAgYWRkcmVzczogJ+yEnOyauO2KueuzhOyLnCDspJHqtawg7J2E7KeA66GcIDEwMCwg7ZWc6rWt7Iug66Kw67mM65SpIDjsuLUnLFxuICAgIHBob25lOiAnMDItNTU1NS03Nzc3JyxcbiAgICBjZXJ0aWZpZWREYXRlOiAnMjAyNS0wMS0xMCcsXG4gICAgdmFsaWRVbnRpbDogJzIwMjctMDEtMDknLFxuICAgIGNlcnROdW1iZXI6ICdWTFVFLUZJTi0yMDI1LTAwMTInLFxuICAgIHN0YXR1czogJ2FjdGl2ZScsXG4gICAgZGVzY3JpcHRpb246ICfquIjsnLXqsJDrj4Xsm5Ag65Ox66GdIOuMgOy2nOykkeqwnOyXheyytOuhnCBWTFVFIOyduOymneydhCDthrXtlZwg7ZWp67KV7KCB7J24IOq4iOyctSDshJzruYTsiqTrpbwg7KCc6rO17ZWp64uI64ukLicsXG4gICAgcmVwcmVzZW50YXRpdmU6ICfsnbTsi6DrorAnLFxuICAgIGJ1c2luZXNzTnVtYmVyOiAnMzQ1LTY3LTg5MDEyJyxcbiAgICB0YWdzOiBbJ+q4iOyctScsICfrjIDstpwnLCAn7ZWp67KV6riw6rSAJywgJ+yduOymnSddLFxuICAgIGxhc3RWZXJpZmllZDogJzIwMjYtMDQtMTcgMDg6MDA6MDEnLFxuICB9LFxuXTtcblxuZXhwb3J0IGNvbnN0IHB1YmxpY0RhdGFSZXN1bHRzOiBQdWJsaWNEYXRhUmVzdWx0W10gPSBbXG4gIHtcbiAgICBpZDogJ3B1Yi0wMDEnLFxuICAgIG5hbWU6ICfrqoXqsr3ssYQg7JqU7JaR67OR7JuQJyxcbiAgICBjYXRlZ29yeTogJ+yalOyWkeuzkeybkCcsXG4gICAgYWRkcmVzczogJ+yEnOyauO2KueuzhOyLnCDqsJXrgqjqtawg7YWM7Zek656A66GcIDEyMycsXG4gICAgcGhvbmU6ICcwMi0xMjM0LTU2NzgnLFxuICAgIHNvdXJjZTogJ+qxtOqwleuztO2XmOyLrOyCrO2PieqwgOybkCcsXG4gICAgbGFzdFVwZGF0ZWQ6ICcyMDI1LTAxLTEwJyxcbiAgICBzdGF0dXM6ICfsoJXsg4HsmrTsmIEnLFxuICB9LFxuICB7XG4gICAgaWQ6ICdwdWItMDAyJyxcbiAgICBuYW1lOiAn64uk64uk7Jik7ZS87IqkJyxcbiAgICBjYXRlZ29yeTogJ+yCrOyXheyepScsXG4gICAgYWRkcmVzczogJ+yEnOyauO2KueuzhOyLnCDrp4jtj6zqtawg7JuU65Oc7Lu167aB66GcIDU26ri4IDE5JyxcbiAgICBwaG9uZTogJzAyLTk4NzYtNTQzMicsXG4gICAgc291cmNlOiAn6rWt7IS47LKtIOyCrOyXheyekOygleuztCcsXG4gICAgbGFzdFVwZGF0ZWQ6ICcyMDI1LTAyLTIwJyxcbiAgICBzdGF0dXM6ICfsoJXsg4Hsgqzsl4XsnpAnLFxuICB9LFxuICB7XG4gICAgaWQ6ICdwdWItMDAzJyxcbiAgICBuYW1lOiAn7ZWc6rWt7Iug66Kw6riI7Jy1JyxcbiAgICBjYXRlZ29yeTogJ+q4iOycteyXhScsXG4gICAgYWRkcmVzczogJ+yEnOyauO2KueuzhOyLnCDspJHqtawg7J2E7KeA66GcIDEwMCcsXG4gICAgcGhvbmU6ICcwMi01NTU1LTc3NzcnLFxuICAgIHNvdXJjZTogJ+q4iOycteqwkOuPheybkCcsXG4gICAgbGFzdFVwZGF0ZWQ6ICcyMDI1LTAzLTE1JyxcbiAgICBzdGF0dXM6ICfsoJXsg4Hrk7HroZ0nLFxuICB9LFxuXTtcblxuZXhwb3J0IGNvbnN0IG5ld3NJdGVtczogTmV3c0l0ZW1bXSA9IFtcbiAge1xuICAgIGlkOiAnbmV3cy0wMDEnLFxuICAgIHRpdGxlOiAn6riI7Jy16riw6rSAIOyCrOy5rSDrs7TsnbTsiqTtlLzsi7Eg7KCE7JuUIOuMgOu5hCAzNyUg6riJ7KadJyxcbiAgICBkYXRlOiAnMjAyNi0wNC0xNScsXG4gICAgY2F0ZWdvcnk6ICdhbGVydCcsXG4gICAgc3VtbWFyeTogJ+y1nOq3vCDso7zsmpQg7Iuc7KSR7J2A7ZaJIOuwjyDsubTrk5zsgqzrpbwg7IKs7Lmt7ZWcIOuztOydtOyKpO2UvOyLsSDtlLztlbTqsIAg7KCE7JuUIOuMgOu5hCAzNyUg7Kad6rCA7ZWY7JiA7Iq164uI64ukLiDrsJzsi6DrsojtmLgg67OA7J6RIOq4sOyIoOydhCDtmZzsmqntlZwg7Iug7KKFIOyImOuyleydtCDtmZXsnbjrkJjsl4jsnLzri4gg6rCB67OE7ZWcIOyjvOydmOqwgCDtlYTsmpTtlanri4jri6QuJyxcbiAgICBpbWFnZVVybDogJ2h0dHBzOi8vaW1hZ2VzLnBleGVscy5jb20vcGhvdG9zLzU5MzU3OTQvcGV4ZWxzLXBob3RvLTU5MzU3OTQuanBlZz9hdXRvPWNvbXByZXNzJmNzPXRpbnlzcmdiJnc9NDAwJyxcbiAgfSxcbiAge1xuICAgIGlkOiAnbmV3cy0wMDInLFxuICAgIHRpdGxlOiAnVkxVRSDsnbjspp0g6riw6rSAIDLrtoTquLAg7Iug6recIOuTseuhnSDsoJHsiJgg7Iuc7J6RJyxcbiAgICBkYXRlOiAnMjAyNi0wNC0xMCcsXG4gICAgY2F0ZWdvcnk6ICdub3RpY2UnLFxuICAgIHN1bW1hcnk6ICcyMDI264WEIDLrtoTquLAoNOyblH427JuUKSBWTFVFIOyduOymnSDsi6Dssq0g7KCR7IiY6rCAIOyLnOyekeuQqeuLiOuLpC4g7J2Y66OM6riw6rSALCDquIjsnLXquLDqtIAsIOqzteqzteq4sOq0gCDrk7Eg66qo65OgIOyXheyihSDsi6Dssq0g6rCA64ql7ZWp64uI64ukLicsXG4gICAgaW1hZ2VVcmw6ICdodHRwczovL2ltYWdlcy5wZXhlbHMuY29tL3Bob3Rvcy8zMTg0MjkyL3BleGVscy1waG90by0zMTg0MjkyLmpwZWc/YXV0bz1jb21wcmVzcyZjcz10aW55c3JnYiZ3PTQwMCcsXG4gIH0sXG4gIHtcbiAgICBpZDogJ25ld3MtMDAzJyxcbiAgICB0aXRsZTogJ+ygleu2gCwg67O07J207Iqk7ZS87IuxIOyymOuyjCDqsJXtmZQg67KV7JWIIOq1re2ajCDthrXqs7wnLFxuICAgIGRhdGU6ICcyMDI2LTA0LTA4JyxcbiAgICBjYXRlZ29yeTogJ25ld3MnLFxuICAgIHN1bW1hcnk6ICfsoITquLDthrXsi6DquIjsnLXsgqzquLAg7LKY67KMIOqwle2ZlCDrsI8g7ZS87ZW06rWs7KCc7JeQIOq0gO2VnCDtirnrs4TrspUg6rCc7KCV7JWI7J20IOq1re2ajCDrs7jtmozsnZjrpbwg7Ya16rO87ZWY7JiA7Iq164uI64ukLicsXG4gICAgaW1hZ2VVcmw6ICdodHRwczovL2ltYWdlcy5wZXhlbHMuY29tL3Bob3Rvcy8xMDc4OTgxL3BleGVscy1waG90by0xMDc4OTgxLmpwZWc/YXV0bz1jb21wcmVzcyZjcz10aW55c3JnYiZ3PTQwMCcsXG4gIH0sXG4gIHtcbiAgICBpZDogJ25ld3MtMDA0JyxcbiAgICB0aXRsZTogJ1ZMVUUg7ZSM656r7Y+8IEFQSSDsl7Drj5kg7ISc67mE7IqkIOuyoO2DgCDstpzsi5wnLFxuICAgIGRhdGU6ICcyMDI2LTAzLTI4JyxcbiAgICBjYXRlZ29yeTogJ25vdGljZScsXG4gICAgc3VtbWFyeTogJ+q4sOyXhSDrsI8g6riw6rSA7JeQ7IScIFZMVUUg7J247KadIOuNsOydtO2EsOulvCDsp4HsoJEg7KGw7ZqM7ZWgIOyImCDsnojripQgQVBJIOyEnOu5hOyKpOqwgCDrsqDtg4Ag7Jik7ZSI65CY7JeI7Iq164uI64ukLicsXG4gICAgaW1hZ2VVcmw6ICdodHRwczovL2ltYWdlcy5wZXhlbHMuY29tL3Bob3Rvcy8xMTgxMjcxL3BleGVscy1waG90by0xMTgxMjcxLmpwZWc/YXV0bz1jb21wcmVzcyZjcz10aW55c3JnYiZ3PTQwMCcsXG4gIH0sXG4gIHtcbiAgICBpZDogJ25ld3MtMDA1JyxcbiAgICB0aXRsZTogJ1ZMVUUgw5cg6rK97LCw7LKtIOuztOydtOyKpO2UvOyLsSDrjIDsnZEgTU9VIOyytOqysCcsXG4gICAgZGF0ZTogJzIwMjYtMDMtMjAnLFxuICAgIGNhdGVnb3J5OiAnbmV3cycsXG4gICAgc3VtbWFyeTogJ1ZMVUXsmYAg6rK97LCw7LKtIOyCrOydtOuyhOyImOyCrOq1reydtCDrs7TsnbTsiqTtlLzsi7Eg7Iug6rOgIOuNsOydtO2EsCDsi6Tsi5zqsIQg6rO17JygIE1PVeulvCDssrTqsrDtlojsirXri4jri6QuJyxcbiAgICBpbWFnZVVybDogJ2h0dHBzOi8vaW1hZ2VzLnBleGVscy5jb20vcGhvdG9zLzU2Njg0NzMvcGV4ZWxzLXBob3RvLTU2Njg0NzMuanBlZz9hdXRvPWNvbXByZXNzJmNzPXRpbnlzcmdiJnc9NDAwJyxcbiAgfSxcbiAge1xuICAgIGlkOiAnbmV3cy0wMDYnLFxuICAgIHRpdGxlOiAn65SU7KeA7YS4IOuqhe2VqCDshJzruYTsiqQg7KCV7IudIOy2nOyLnCDigJQg7IKs7LmtIOybkOyynCDssKjri6gnLFxuICAgIGRhdGU6ICcyMDI2LTAzLTE1JyxcbiAgICBjYXRlZ29yeTogJ25vdGljZScsXG4gICAgc3VtbWFyeTogJ1ZMVUUg7J247KadIO2ajOybkCDsoITsmqkg65SU7KeA7YS4IOuqhe2VqCDshJzruYTsiqTqsIAg7KCV7IudIOy2nOyLnOuQmOyXiOyKteuLiOuLpC4g7J247KadIOuniO2BrOyZgCDrs7TslYgg6rK96rOgIOusuOq1rOqwgCDtj6ztlajrkJjslrQg7IKs7LmtIO2UvO2VtOulvCDsm5Dsspwg7LCo64uo7ZWp64uI64ukLicsXG4gICAgaW1hZ2VVcmw6ICdodHRwczovL2ltYWdlcy5wZXhlbHMuY29tL3Bob3Rvcy8zMTg0NDE4L3BleGVscy1waG90by0zMTg0NDE4LmpwZWc/YXV0bz1jb21wcmVzcyZjcz10aW55c3JnYiZ3PTQwMCcsXG4gIH0sXG4gIHtcbiAgICBpZDogJ2V2ZW50LTAwMScsXG4gICAgdGl0bGU6ICfshJzsmrgg6rCV64KoIOuztOydtOyKpO2UvOyLsSDsmIjrsKkg6rWQ7JyhIO2WieyCrCcsXG4gICAgZGF0ZTogJzIwMjYtMDQtMjUnLFxuICAgIGNhdGVnb3J5OiAnZXZlbnQnLFxuICAgIHN1bW1hcnk6ICfqsJXrgqjqtazssq0g7KO86rSA7Jy866GcIOuFuOyduOy4tSDrjIDsg4Eg67O07J207Iqk7ZS87IuxIOyYiOuwqSDqtZDsnKHsnbQg7KeE7ZaJ65Cp64uI64ukLiDssLjsl6wg7Iug7LKtIO2bhCDrrLTro4wg7LC46rCAIOqwgOuKpe2VqeuLiOuLpC4nLFxuICAgIHJlZ2lvbjogJ+yEnOyauCDqsJXrgqjqtawnLFxuICAgIGltYWdlVXJsOiAnaHR0cHM6Ly9pbWFnZXMucGV4ZWxzLmNvbS9waG90b3MvNzE3NjAyNi9wZXhlbHMtcGhvdG8tNzE3NjAyNi5qcGVnP2F1dG89Y29tcHJlc3MmY3M9dGlueXNyZ2Imdz00MDAnLFxuICB9LFxuICB7XG4gICAgaWQ6ICdldmVudC0wMDInLFxuICAgIHRpdGxlOiAn67aA7IKwIO2VtOyatOuMgCBWTFVFIOyduOymnSDshKTrqoXtmownLFxuICAgIGRhdGU6ICcyMDI2LTA1LTAzJyxcbiAgICBjYXRlZ29yeTogJ2V2ZW50JyxcbiAgICBzdW1tYXJ5OiAnVkxVRSDsnbjspp0g7Leo65Od7J2EIO2drOunne2VmOuKlCDrtoDsgrAg7KeA7JetIOq4sOyXhSDrsI8g6riw6rSA7J2EIOychO2VnCDshKTrqoXtmozqsIAg6rCc7LWc65Cp64uI64ukLicsXG4gICAgcmVnaW9uOiAn67aA7IKwIO2VtOyatOuMgOq1rCcsXG4gICAgaW1hZ2VVcmw6ICdodHRwczovL2ltYWdlcy5wZXhlbHMuY29tL3Bob3Rvcy8xMTgxNTYyL3BleGVscy1waG90by0xMTgxNTYyLmpwZWc/YXV0bz1jb21wcmVzcyZjcz10aW55c3JnYiZ3PTQwMCcsXG4gIH0sXG4gIHtcbiAgICBpZDogJ2V2ZW50LTAwMycsXG4gICAgdGl0bGU6ICfrjIDqtawg7IiY7ISx6rWsIOq4iOycteyCrOq4sCDsmIjrsKkg7Lqg7Y6Y7J24JyxcbiAgICBkYXRlOiAnMjAyNi0wNS0xMCcsXG4gICAgY2F0ZWdvcnk6ICdldmVudCcsXG4gICAgc3VtbWFyeTogJ+uMgOq1rOq0keyXreyLnOyZgCDqs7Xrj5kg7KO86rSA7Jy866GcIOq4iOycteyCrOq4sCDsmIjrsKkg7Lqg7Y6Y7J24IOuwjyBWTFVFIOyEnOu5hOyKpCDssrTtl5gg7ZaJ7IKs6rCAIOyXtOumveuLiOuLpC4nLFxuICAgIHJlZ2lvbjogJ+uMgOq1rCDsiJjshLHqtawnLFxuICAgIGltYWdlVXJsOiAnaHR0cHM6Ly9pbWFnZXMucGV4ZWxzLmNvbS9waG90b3MvMzE4NDI5Mi9wZXhlbHMtcGhvdG8tMzE4NDI5Mi5qcGVnP2F1dG89Y29tcHJlc3MmY3M9dGlueXNyZ2Imdz00MDAnLFxuICB9LFxuICB7XG4gICAgaWQ6ICdldmVudC0wMDQnLFxuICAgIHRpdGxlOiAn7J247LKcIOyXsOyImOq1rCDsiqTrp4jtirgg67O07JWIIOyEuOuvuOuCmCcsXG4gICAgZGF0ZTogJzIwMjYtMDUtMTcnLFxuICAgIGNhdGVnb3J5OiAnZXZlbnQnLFxuICAgIHN1bW1hcnk6ICfrlJTsp4DthLgg6riI7Jy17IKs6riwIOyYiOuwqeydhCDsnITtlZwg7Iqk66eI7Yq4IOuztOyViCDshLjrr7jrgpgg67CPIFZMVUUg7ZSM656r7Y+8IOyLnOyXsCDtlonsgqzsnoXri4jri6QuJyxcbiAgICByZWdpb246ICfsnbjsspwg7Jew7IiY6rWsJyxcbiAgICBpbWFnZVVybDogJ2h0dHBzOi8vaW1hZ2VzLnBleGVscy5jb20vcGhvdG9zLzMxODMxNTAvcGV4ZWxzLXBob3RvLTMxODMxNTAuanBlZz9hdXRvPWNvbXByZXNzJmNzPXRpbnlzcmdiJnc9NDAwJyxcbiAgfSxcbiAge1xuICAgIGlkOiAnZXZlbnQtMDA1JyxcbiAgICB0aXRsZTogJ+q0keyjvCDshJzqtawg7LKt64WEIOuztOyViCDssL3sl4Ug64Sk7Yq47JuM7YK5JyxcbiAgICBkYXRlOiAnMjAyNi0wNS0yNCcsXG4gICAgY2F0ZWdvcnk6ICdldmVudCcsXG4gICAgc3VtbWFyeTogJ+uztOyViCDsiqTtg4Dtirjsl4XsnYQg6r+I6r6464qUIOyyreuFhOuTpOydhCDsnITtlZwg64Sk7Yq47JuM7YK5IOuwjyBWTFVFIO2MjO2KuOuEiOyLrSDshKTrqoXtmozsnoXri4jri6QuJyxcbiAgICByZWdpb246ICfqtJHso7wg7ISc6rWsJyxcbiAgICBpbWFnZVVybDogJ2h0dHBzOi8vaW1hZ2VzLnBleGVscy5jb20vcGhvdG9zLzExODE0MDYvcGV4ZWxzLXBob3RvLTExODE0MDYuanBlZz9hdXRvPWNvbXByZXNzJmNzPXRpbnlzcmdiJnc9NDAwJyxcbiAgfSxcbiAge1xuICAgIGlkOiAnZXZlbnQtMDA2JyxcbiAgICB0aXRsZTogJ+uMgOyghCDsnKDshLHqtawg7Ja066W07IugIOuUlOyngO2EuCDslYjsi6wg6rWQ7IukJyxcbiAgICBkYXRlOiAnMjAyNi0wNi0wMScsXG4gICAgY2F0ZWdvcnk6ICdldmVudCcsXG4gICAgc3VtbWFyeTogJzY17IS4IOydtOyDgSDslrTrpbTsi6DsnYQg7JyE7ZWcIOyKpOuniO2KuO2PsCDrs7TsnbTsiqTtlLzsi7Eg7JiI67CpIOustOujjCDqtZDsnKEg7ZSE66Gc6re4656o7J6F64uI64ukLicsXG4gICAgcmVnaW9uOiAn64yA7KCEIOycoOyEseq1rCcsXG4gICAgaW1hZ2VVcmw6ICdodHRwczovL2ltYWdlcy5wZXhlbHMuY29tL3Bob3Rvcy83MTc2MDI2L3BleGVscy1waG90by03MTc2MDI2LmpwZWc/YXV0bz1jb21wcmVzcyZjcz10aW55c3JnYiZ3PTQwMCcsXG4gIH0sXG5dO1xuXG5leHBvcnQgY29uc3QgcHJvZHVjdHM6IFByb2R1Y3RbXSA9IFtcbiAge1xuICAgIGlkOiAncHJvZC0wMDEnLFxuICAgIG5hbWU6ICfsmpTslpHrs5Hsm5Ag7J6F7JuQIOyDgeuLtCDshJzruYTsiqQnLFxuICAgIHNlbGxlcjogJ+uqheqyveyxhCDsmpTslpHrs5Hsm5AnLFxuICAgIHByaWNlOiAwLFxuICAgIGNhdGVnb3J5OiAn7J2Y66OM7IOB64u0JyxcbiAgICBpbWFnZVVybDogJ2h0dHBzOi8vaW1hZ2VzLnBleGVscy5jb20vcGhvdG9zLzMwNTU2NS9wZXhlbHMtcGhvdG8tMzA1NTY1LmpwZWc/YXV0bz1jb21wcmVzcyZjcz10aW55c3JnYiZ3PTQwMCcsXG4gICAgcmF0aW5nOiA0LjksXG4gICAgcmV2aWV3czogMTI4LFxuICAgIGNlcnRpZmllZDogdHJ1ZSxcbiAgfSxcbiAge1xuICAgIGlkOiAncHJvZC0wMDInLFxuICAgIG5hbWU6ICftlITrpqzrr7jsl4Qg6rO17Jyg7Jik7ZS87IqkIOyblCDsnbTsmqnqtownLFxuICAgIHNlbGxlcjogJ+uLpOuLpOyYpO2UvOyKpCcsXG4gICAgcHJpY2U6IDI5MDAwMCxcbiAgICBvcmlnaW5hbFByaWNlOiAzNTAwMDAsXG4gICAgY2F0ZWdvcnk6ICfsmKTtlLzsiqQnLFxuICAgIGltYWdlVXJsOiAnaHR0cHM6Ly9pbWFnZXMucGV4ZWxzLmNvbS9waG90b3MvMTE4MTQ2Ny9wZXhlbHMtcGhvdG8tMTE4MTQ2Ny5qcGVnP2F1dG89Y29tcHJlc3MmY3M9dGlueXNyZ2Imdz00MDAnLFxuICAgIHJhdGluZzogNC44LFxuICAgIHJldmlld3M6IDIwNCxcbiAgICBjZXJ0aWZpZWQ6IHRydWUsXG4gIH0sXG4gIHtcbiAgICBpZDogJ3Byb2QtMDAzJyxcbiAgICBuYW1lOiAn67O07J207Iqk7ZS87IuxIOyYiOuwqSDquLDsl4Ug6rWQ7JyhIO2MqO2CpOyngCcsXG4gICAgc2VsbGVyOiAnVkxVRSDqs7Xsi50nLFxuICAgIHByaWNlOiAxNTAwMDAsXG4gICAgY2F0ZWdvcnk6ICfqtZDsnKEnLFxuICAgIGltYWdlVXJsOiAnaHR0cHM6Ly9pbWFnZXMucGV4ZWxzLmNvbS9waG90b3MvMzE4NDQzMS9wZXhlbHMtcGhvdG8tMzE4NDQzMS5qcGVnP2F1dG89Y29tcHJlc3MmY3M9dGlueXNyZ2Imdz00MDAnLFxuICAgIHJhdGluZzogNS4wLFxuICAgIHJldmlld3M6IDY3LFxuICAgIGNlcnRpZmllZDogdHJ1ZSxcbiAgfSxcbiAge1xuICAgIGlkOiAncHJvZC0wMDQnLFxuICAgIG5hbWU6ICfsiqTrp4jtirgg67O07JWIIOy7qOyEpO2MhSDshJzruYTsiqQnLFxuICAgIHNlbGxlcjogJ+2VnOq1reyLoOuisOq4iOyctScsXG4gICAgcHJpY2U6IDUwMDAwMCxcbiAgICBvcmlnaW5hbFByaWNlOiA3MDAwMDAsXG4gICAgY2F0ZWdvcnk6ICfsu6jshKTtjIUnLFxuICAgIGltYWdlVXJsOiAnaHR0cHM6Ly9pbWFnZXMucGV4ZWxzLmNvbS9waG90b3MvMzE4MzE1MC9wZXhlbHMtcGhvdG8tMzE4MzE1MC5qcGVnP2F1dG89Y29tcHJlc3MmY3M9dGlueXNyZ2Imdz00MDAnLFxuICAgIHJhdGluZzogNC43LFxuICAgIHJldmlld3M6IDQ1LFxuICAgIGNlcnRpZmllZDogdHJ1ZSxcbiAgfSxcbiAge1xuICAgIGlkOiAncHJvZC0wMDUnLFxuICAgIG5hbWU6ICfrhbjsnbgg66ee7LakIOyerO2ZnCDsuZjro4wg7ZSE66Gc6re4656oJyxcbiAgICBzZWxsZXI6ICfrqoXqsr3ssYQg7JqU7JaR67OR7JuQJyxcbiAgICBwcmljZTogMCxcbiAgICBjYXRlZ29yeTogJ+ydmOujjCcsXG4gICAgaW1hZ2VVcmw6ICdodHRwczovL2ltYWdlcy5wZXhlbHMuY29tL3Bob3Rvcy80Mzg2NDY3L3BleGVscy1waG90by00Mzg2NDY3LmpwZWc/YXV0bz1jb21wcmVzcyZjcz10aW55c3JnYiZ3PTQwMCcsXG4gICAgcmF0aW5nOiA0LjksXG4gICAgcmV2aWV3czogOTMsXG4gICAgY2VydGlmaWVkOiB0cnVlLFxuICB9LFxuICB7XG4gICAgaWQ6ICdwcm9kLTAwNicsXG4gICAgbmFtZTogJ+yKpO2DgO2KuOyXhSDsnoXso7wg7Yyo7YKk7KeAICgz6rCc7JuUKScsXG4gICAgc2VsbGVyOiAn64uk64uk7Jik7ZS87IqkJyxcbiAgICBwcmljZTogNzUwMDAwLFxuICAgIG9yaWdpbmFsUHJpY2U6IDEwNTAwMDAsXG4gICAgY2F0ZWdvcnk6ICfsmKTtlLzsiqQnLFxuICAgIGltYWdlVXJsOiAnaHR0cHM6Ly9pbWFnZXMucGV4ZWxzLmNvbS9waG90b3MvMTE4MTQwNi9wZXhlbHMtcGhvdG8tMTE4MTQwNi5qcGVnP2F1dG89Y29tcHJlc3MmY3M9dGlueXNyZ2Imdz00MDAnLFxuICAgIHJhdGluZzogNC44LFxuICAgIHJldmlld3M6IDE1NixcbiAgICBjZXJ0aWZpZWQ6IHRydWUsXG4gIH0sXG4gIHtcbiAgICBpZDogJ3Byb2QtMDA3JyxcbiAgICBuYW1lOiAn7IKs66y07JqpIOy5nO2ZmOqyvSDssYXsg4EgKOqzteq1rCknLFxuICAgIHNlbGxlcjogJ+q3uOumsOyYpO2UvOyKpCcsXG4gICAgcHJpY2U6IDg5MDAwLFxuICAgIG9yaWdpbmFsUHJpY2U6IDEzMDAwMCxcbiAgICBjYXRlZ29yeTogJ+yYpO2UvOyKpCcsXG4gICAgaW1hZ2VVcmw6ICdodHRwczovL2ltYWdlcy5wZXhlbHMuY29tL3Bob3Rvcy8xOTU3NDc4L3BleGVscy1waG90by0xOTU3NDc4LmpwZWc/YXV0bz1jb21wcmVzcyZjcz10aW55c3JnYiZ3PTQwMCcsXG4gICAgcmF0aW5nOiA0LjUsXG4gICAgcmV2aWV3czogMzEyLFxuICAgIGNlcnRpZmllZDogZmFsc2UsXG4gICAgaXNHcm91cEJ1eTogdHJ1ZSxcbiAgfSxcbiAge1xuICAgIGlkOiAncHJvZC0wMDgnLFxuICAgIG5hbWU6ICfsl4XrrLTsmqkg7JeQ66W06rOg64W466+5IOydmOyekCAo6rO16rWsKScsXG4gICAgc2VsbGVyOiAn7LK07Ja066eI7LyTJyxcbiAgICBwcmljZTogMTg5MDAwLFxuICAgIG9yaWdpbmFsUHJpY2U6IDI4MDAwMCxcbiAgICBjYXRlZ29yeTogJ+yYpO2UvOyKpCcsXG4gICAgaW1hZ2VVcmw6ICdodHRwczovL2ltYWdlcy5wZXhlbHMuY29tL3Bob3Rvcy8xOTU3NDc4L3BleGVscy1waG90by0xOTU3NDc4LmpwZWc/YXV0bz1jb21wcmVzcyZjcz10aW55c3JnYiZ3PTQwMCcsXG4gICAgcmF0aW5nOiA0LjYsXG4gICAgcmV2aWV3czogMTg5LFxuICAgIGNlcnRpZmllZDogZmFsc2UsXG4gICAgaXNHcm91cEJ1eTogdHJ1ZSxcbiAgfSxcbl07XG5cbmV4cG9ydCBjb25zdCB0ZW1wbGF0ZXM6IFRlbXBsYXRlW10gPSBbXG4gIHtcbiAgICBpZDogJ3RtcGwtMDAxJyxcbiAgICBuYW1lOiAn6rGw656Y7LKYIOyViOyghCDtmZXsnbjshJwnLFxuICAgIGNhdGVnb3J5OiAn67KV66y0L+qzhOyVvScsXG4gICAgZGVzY3JpcHRpb246ICfsi6Dqt5wg6rGw656Y7LKY7J2YIFZMVUUg7J247KadIOyXrOu2gOulvCDtmZXsnbjtlZjqs6Ag7JWI7KCEIOqxsOuemOulvCDrs7TsnqXtlZjripQg6rO17IudIO2ZleyduOyEnCDslpHsi50uJyxcbiAgICBjb250ZW50OiAnW+qxsOuemOyymCDslYjsoIQg7ZmV7J247IScXScsXG4gICAgdGh1bWJuYWlsOiAnZG9jJyxcbiAgfSxcbiAge1xuICAgIGlkOiAndG1wbC0wMDInLFxuICAgIG5hbWU6ICfrs7TsnbTsiqTtlLzsi7Eg7ZS87ZW0IOyLoOqzoOyEnCcsXG4gICAgY2F0ZWdvcnk6ICfsi6Dqs6Av66+87JuQJyxcbiAgICBkZXNjcmlwdGlvbjogJ+uztOydtOyKpO2UvOyLsSDtlLztlbQg67Cc7IOdIOyLnCDqtIDqs4Qg6riw6rSA7JeQIOygnOy2nO2VmOuKlCDqs7Xsi50g7ZS87ZW0IOyLoOqzoOyEnCDslpHsi50uJyxcbiAgICBjb250ZW50OiAnW+uztOydtOyKpO2UvOyLsSDtlLztlbQg7Iug6rOg7IScXScsXG4gICAgdGh1bWJuYWlsOiAncmVwb3J0JyxcbiAgfSxcbiAge1xuICAgIGlkOiAndG1wbC0wMDMnLFxuICAgIG5hbWU6ICdWTFVFIOyduOymnSDsi6Dssq3shJwnLFxuICAgIGNhdGVnb3J5OiAn7J247KadL+uTseuhnScsXG4gICAgZGVzY3JpcHRpb246ICdWTFVFIOqzteyLnSDsnbjspp3snYQg7Iug7LKt7ZWY6riwIOychO2VnCDtkZzspIAg7Iug7LKt7IScIOyWkeyLnS4nLFxuICAgIGNvbnRlbnQ6ICdbVkxVRSDsnbjspp0g7Iug7LKt7IScXScsXG4gICAgdGh1bWJuYWlsOiAnY2VydCcsXG4gIH0sXG5dO1xuXG5leHBvcnQgY29uc3QgcHJpY2luZ1RpZXJzOiBQcmljaW5nVGllcltdID0gW1xuICB7XG4gICAgaWQ6ICdiYXNpYycsXG4gICAgbmFtZTogJ+uyoOydtOyngScsXG4gICAgcHJpY2U6IDAsXG4gICAgcGVyaW9kOiAn66y066OMJyxcbiAgICBkZXNjcmlwdGlvbjogJ+qwnOyduCDrsI8g7IaM6rec66qoIOq4sOq0gOydhCDsnITtlZwg6riw67O4IOyEnOu5hOyKpCcsXG4gICAgY29sb3I6ICdncmF5JyxcbiAgICBmZWF0dXJlczogW1xuICAgICAgJ1ZMVUUg7Ya17ZWpIOqygOyDiTog66y07KCc7ZWcJyxcbiAgICAgICfrs7TslYgg7J6Q66OM7IukOiDrrLTsoJztlZwg7J207JqpJyxcbiAgICAgICfrlJTsp4DthLgg66qF7ZWoKO2RnOykgO2YlTog7Jew67iU66OoKSDshKDtg50g67Cc6riJJyxcbiAgICAgICfqsJzsnbjsmqkg7LGE7YyFIEFQUCDsgqzsmqknLFxuICAgICAgJ0B2bHVlLmtyIOuplOydvCAoMUdCKScsXG4gICAgICAn67O07J207Iqk7ZS87IuxIOyLpOyLnOqwhCDqsr3rs7QnLFxuICAgIF0sXG4gIH0sXG4gIHtcbiAgICBpZDogJ3N0YW5kYXJkJyxcbiAgICBuYW1lOiAn7Iqk7YOg64uk65OcJyxcbiAgICBwcmljZTogMjkwMDAsXG4gICAgcGVyaW9kOiAn7JuUJyxcbiAgICBkZXNjcmlwdGlvbjogJ+ykkeyGjOq4sOyXhSDrsI8g6riw6rSA7J2EIOychO2VnCDtkZzspIAg7J247KadIOyEnOu5hOyKpCcsXG4gICAgY29sb3I6ICdibHVlJyxcbiAgICByZWNvbW1lbmRlZDogdHJ1ZSxcbiAgICBmZWF0dXJlczogW1xuICAgICAgJ+yduOymneyEnCDquLDrsJgg65SU7KeA7YS4IOuqhe2VqCAo6rOo65OcIOyVoOuLiOuplOydtOyFmCDthYzrkZDrpqwpJyxcbiAgICAgICfsmIHsl4Uv7KGw7KeB7JqpIOyxhO2MhSBBUFAnLFxuICAgICAgJ+u4lOujqOyHvO2VkSDsnoXsoJAg6raM7ZWcJyxcbiAgICAgICfqs7Xsi50g7J247KadIOuniO2BrCDrsJzquIknLFxuICAgICAgJ+yghOyaqSBBUEkg7Jew64+ZJyxcbiAgICAgICfroIjthLDrp4Eg7ISc67mE7IqkIOq4sOuzuCDtj6ztlagnLFxuICAgICAgJ+yghO2ZlC/snbTrqZTsnbwg7Jqw7ISgIOyngOybkCcsXG4gICAgXSxcbiAgfSxcbiAge1xuICAgIGlkOiAncHJlbWl1bScsXG4gICAgbmFtZTogJ+2UhOumrOuvuOyXhCcsXG4gICAgcHJpY2U6IDg5MDAwLFxuICAgIHBlcmlvZDogJ+yblCcsXG4gICAgZGVzY3JpcHRpb246ICfrjIDquLDsl4Ug67CPIOqzteqzteq4sOq0gOydhCDsnITtlZwg7LWc7IOB7JyEIOyEnOu5hOyKpCcsXG4gICAgY29sb3I6ICdnb2xkJyxcbiAgICBmZWF0dXJlczogW1xuICAgICAgJ+2UhOumrOuvuOyXhCDrlJTsp4DthLgg66qF7ZWoICjrrLTsp4DqsJwg7ZmA66Gc6re4656oIOyVoOuLiOuplOydtOyFmCknLFxuICAgICAgJ+2UvO2VtCDrs7Tsg4Eg67O07ZeYIOyXsOqzhCcsXG4gICAgICAn7KCE64u0IEFNIOuwsOyglScsXG4gICAgICAn7JyE7LmYIOq4sOuwmCDslYjsi6wg6rWs7JetJyxcbiAgICAgICdBUEkg66y07KCc7ZWcJyxcbiAgICAgICfsl7DqsIQg67O07JWIIOqwkOyCrCAx7ZqMIOustOujjCcsXG4gICAgICAnMjTsi5zqsIQg6ri06riJIOyngOybkCcsXG4gICAgXSxcbiAgfSxcbl07XG5cbmV4cG9ydCBjb25zdCBqb2JQb3N0czogSm9iUG9zdFtdID0gW1xuICB7XG4gICAgaWQ6ICdqb2ItMDAxJyxcbiAgICB0aXRsZTogJ+uztOyViCDtlIzrnqvtj7wg7ZSE66Gg7Yq47JeU65OcIOqwnOuwnOyekCcsXG4gICAgY29tcGFueTogJ1ZMVUUg6rO17IudJyxcbiAgICBsb2NhdGlvbjogJ+yEnOyauCDqsJXrgqjqtawnLFxuICAgIHR5cGU6ICfsoJXqt5zsp4EnLFxuICAgIHNhbGFyeTogJzQsMDAwfjYsMDAw66eM7JuQJyxcbiAgICBkZWFkbGluZTogJzIwMjYtMDUtMzEnLFxuICAgIGNlcnRpZmllZDogdHJ1ZSxcbiAgICB0YWdzOiBbJ1JlYWN0JywgJ1R5cGVTY3JpcHQnLCAn67O07JWIJ10sXG4gIH0sXG4gIHtcbiAgICBpZDogJ2pvYi0wMDInLFxuICAgIHRpdGxlOiAn7JqU7JaR67OR7JuQIOqwhO2YuOyCrCAo6rK966ClIDLrhYQg7J207IOBKScsXG4gICAgY29tcGFueTogJ+uqheqyveyxhCDsmpTslpHrs5Hsm5AnLFxuICAgIGxvY2F0aW9uOiAn7ISc7Jq4IOqwleuCqOq1rCcsXG4gICAgdHlwZTogJ+ygleq3nOyngScsXG4gICAgc2FsYXJ5OiAnMywyMDB+NCwwMDDrp4zsm5AnLFxuICAgIGRlYWRsaW5lOiAnMjAyNi0wNS0xNScsXG4gICAgY2VydGlmaWVkOiB0cnVlLFxuICAgIHRhZ3M6IFsn6rCE7Zi4JywgJ+uFuOyduOy8gOyWtCcsICfsnqztmZwnXSxcbiAgfSxcbiAge1xuICAgIGlkOiAnam9iLTAwMycsXG4gICAgdGl0bGU6ICfqs7XsnKDsmKTtlLzsiqQg7Jq07JiBIOunpOuLiOyggCcsXG4gICAgY29tcGFueTogJ+uLpOuLpOyYpO2UvOyKpCcsXG4gICAgbG9jYXRpb246ICfshJzsmrgg66eI7Y+s6rWsJyxcbiAgICB0eXBlOiAn7KCV6rec7KeBJyxcbiAgICBzYWxhcnk6ICcyLDgwMH4zLDUwMOunjOybkCcsXG4gICAgZGVhZGxpbmU6ICcyMDI2LTA1LTIwJyxcbiAgICBjZXJ0aWZpZWQ6IHRydWUsXG4gICAgdGFnczogWyfsmrTsmIHqtIDrpqwnLCAn6rOg6rCd7ISc67mE7IqkJywgJ+yYpO2UvOyKpCddLFxuICB9LFxuICB7XG4gICAgaWQ6ICdqb2ItMDA0JyxcbiAgICB0aXRsZTogJ+q4iOyctSDrs7TslYgg7Luo7ISk7YS07Yq4ICjqs4Tslb3sp4EpJyxcbiAgICBjb21wYW55OiAn7ZWc6rWt7Iug66Kw6riI7Jy1JyxcbiAgICBsb2NhdGlvbjogJ+yEnOyauCDspJHqtawnLFxuICAgIHR5cGU6ICfqs4Tslb3sp4EnLFxuICAgIHNhbGFyeTogJ+2YkeydmCcsXG4gICAgZGVhZGxpbmU6ICcyMDI2LTA1LTI1JyxcbiAgICBjZXJ0aWZpZWQ6IHRydWUsXG4gICAgdGFnczogWyfquIjsnLUnLCAn67O07JWIJywgJ+y7qOyEpO2MhSddLFxuICB9LFxuICB7XG4gICAgaWQ6ICdqb2ItMDA1JyxcbiAgICB0aXRsZTogJ0FJIOuztOydtOyKpO2UvOyLsSDtg5Dsp4Ag7Jew6rWs7JuQJyxcbiAgICBjb21wYW55OiAnVkxVRSDqs7Xsi50nLFxuICAgIGxvY2F0aW9uOiAn7ISc7Jq4IOqwleuCqOq1rCcsXG4gICAgdHlwZTogJ+ygleq3nOyngScsXG4gICAgc2FsYXJ5OiAnNSwwMDB+OCwwMDDrp4zsm5AnLFxuICAgIGRlYWRsaW5lOiAnMjAyNi0wNi0xMCcsXG4gICAgY2VydGlmaWVkOiB0cnVlLFxuICAgIHRhZ3M6IFsnQUknLCAn66i47Iug65+s64udJywgJ+uztOyViOyXsOq1rCddLFxuICB9LFxuICB7XG4gICAgaWQ6ICdqb2ItMDA2JyxcbiAgICB0aXRsZTogJ+uniOy8gO2MhSDsnbjthLQgKOuMgOyhuCDsmrDrjIApJyxcbiAgICBjb21wYW55OiAn64uk64uk7Jik7ZS87IqkJyxcbiAgICBsb2NhdGlvbjogJ+yEnOyauCDrp4jtj6zqtawnLFxuICAgIHR5cGU6ICfsnbjthLQnLFxuICAgIHNhbGFyeTogJ+yblCAyMjDrp4zsm5AnLFxuICAgIGRlYWRsaW5lOiAnMjAyNi0wNS0xMCcsXG4gICAgY2VydGlmaWVkOiB0cnVlLFxuICAgIHRhZ3M6IFsn66eI7LyA7YyFJywgJ1NOUycsICfsvZjthZDsuKAnXSxcbiAgfSxcbl07XG5cbmV4cG9ydCBjb25zdCBqb2JQcm9maWxlczogSm9iUHJvZmlsZVtdID0gW1xuICB7XG4gICAgaWQ6ICdwcm9mLTAwMScsXG4gICAgbmFtZTogJ+q5gCoqJyxcbiAgICBmaWVsZDogJ0lUIOqwnOuwnCcsXG4gICAgZXhwZXJpZW5jZTogJ+qyveugpSA164WEJyxcbiAgICBsb2NhdGlvbjogJ+yEnOyauCcsXG4gICAgZWR1Y2F0aW9uOiAn7Lu07ZOo7YSw6rO17ZWZIO2VmeyCrCcsXG4gICAgdGFnczogWydSZWFjdCcsICdOb2RlLmpzJywgJ+uztOyViCddLFxuICAgIGF2YWlsYWJsZTogdHJ1ZSxcbiAgfSxcbiAge1xuICAgIGlkOiAncHJvZi0wMDInLFxuICAgIG5hbWU6ICfsnbQqKicsXG4gICAgZmllbGQ6ICfqsITtmLjCt+ydmOujjCcsXG4gICAgZXhwZXJpZW5jZTogJ+qyveugpSA464WEJyxcbiAgICBsb2NhdGlvbjogJ+yEnOyauC/qsr3quLAnLFxuICAgIGVkdWNhdGlvbjogJ+qwhO2YuO2VmSDtlZnsgqwnLFxuICAgIHRhZ3M6IFsn64W47J247LyA7Ja0JywgJ+yerO2ZnCcsICdJQ1UnXSxcbiAgICBhdmFpbGFibGU6IHRydWUsXG4gIH0sXG4gIHtcbiAgICBpZDogJ3Byb2YtMDAzJyxcbiAgICBuYW1lOiAn67CVKionLFxuICAgIGZpZWxkOiAn6riI7Jy1wrfsu6jshKTtjIUnLFxuICAgIGV4cGVyaWVuY2U6ICfqsr3roKUgMTLrhYQnLFxuICAgIGxvY2F0aW9uOiAn7ISc7Jq4JyxcbiAgICBlZHVjYXRpb246ICfqsr3smIHtlZkg7ISd7IKsJyxcbiAgICB0YWdzOiBbJ+q4iOycteu2hOyEnScsICfrpqzsiqTtgazqtIDrpqwnLCAn7Lu07ZSM65287J207Ja47IqkJ10sXG4gICAgYXZhaWxhYmxlOiBmYWxzZSxcbiAgfSxcbiAge1xuICAgIGlkOiAncHJvZi0wMDQnLFxuICAgIG5hbWU6ICfstZwqKicsXG4gICAgZmllbGQ6ICfrp4jsvIDtjIUnLFxuICAgIGV4cGVyaWVuY2U6ICfsi6DsnoUnLFxuICAgIGxvY2F0aW9uOiAn7ISc7Jq4L+yerO2DnScsXG4gICAgZWR1Y2F0aW9uOiAn6rK97JiB7ZWZIO2VmeyCrCcsXG4gICAgdGFnczogWydTTlPrp4jsvIDtjIUnLCAn7L2Y7YWQ7LigJywgJ+u4jOuenOuUqSddLFxuICAgIGF2YWlsYWJsZTogdHJ1ZSxcbiAgfSxcbiAge1xuICAgIGlkOiAncHJvZi0wMDUnLFxuICAgIG5hbWU6ICfsoJUqKicsXG4gICAgZmllbGQ6ICfrs7TslYgg7Jew6rWsJyxcbiAgICBleHBlcmllbmNlOiAn6rK966ClIDfrhYQnLFxuICAgIGxvY2F0aW9uOiAn7ISc7Jq4JyxcbiAgICBlZHVjYXRpb246ICfsoJXrs7Trs7TslYgg7ISd7IKsJyxcbiAgICB0YWdzOiBbJ+yCrOydtOuyhOuztOyViCcsICdBSe2DkOyngCcsICfsuajtiKzthYzsiqTtirgnXSxcbiAgICBhdmFpbGFibGU6IHRydWUsXG4gIH0sXG4gIHtcbiAgICBpZDogJ3Byb2YtMDA2JyxcbiAgICBuYW1lOiAn7ZWcKionLFxuICAgIGZpZWxkOiAn7Jq07JiB6rSA66asJyxcbiAgICBleHBlcmllbmNlOiAn6rK966ClIDTrhYQnLFxuICAgIGxvY2F0aW9uOiAn7ISc7Jq4L+qyveq4sCcsXG4gICAgZWR1Y2F0aW9uOiAn6rK97JiB7ZWZIO2VmeyCrCcsXG4gICAgdGFnczogWyfsi5zshKTqtIDrpqwnLCAn6rOg6rCd7ISc67mE7IqkJywgJ+yYpO2UvOyKpCddLFxuICAgIGF2YWlsYWJsZTogdHJ1ZSxcbiAgfSxcbl07XG4iXSwibWFwcGluZ3MiOiJBQUVPLGFBQU0sZ0JBQWdDO0FBQUEsRUFDM0M7QUFBQSxJQUNFLElBQUk7QUFBQSxJQUNKLE1BQU07QUFBQSxJQUNOLFVBQVU7QUFBQSxJQUNWLFNBQVM7QUFBQSxJQUNULE9BQU87QUFBQSxJQUNQLGVBQWU7QUFBQSxJQUNmLFlBQVk7QUFBQSxJQUNaLFlBQVk7QUFBQSxJQUNaLFFBQVE7QUFBQSxJQUNSLGFBQWE7QUFBQSxJQUNiLGdCQUFnQjtBQUFBLElBQ2hCLGdCQUFnQjtBQUFBLElBQ2hCLE1BQU0sQ0FBQyxNQUFNLE1BQU0sTUFBTSxNQUFNO0FBQUEsSUFDL0IsY0FBYztBQUFBLEVBQ2hCO0FBQUEsRUFDQTtBQUFBLElBQ0UsSUFBSTtBQUFBLElBQ0osTUFBTTtBQUFBLElBQ04sVUFBVTtBQUFBLElBQ1YsU0FBUztBQUFBLElBQ1QsT0FBTztBQUFBLElBQ1AsZUFBZTtBQUFBLElBQ2YsWUFBWTtBQUFBLElBQ1osWUFBWTtBQUFBLElBQ1osUUFBUTtBQUFBLElBQ1IsYUFBYTtBQUFBLElBQ2IsZ0JBQWdCO0FBQUEsSUFDaEIsZ0JBQWdCO0FBQUEsSUFDaEIsTUFBTSxDQUFDLFNBQVMsUUFBUSxRQUFRLE1BQU07QUFBQSxJQUN0QyxjQUFjO0FBQUEsRUFDaEI7QUFBQSxFQUNBO0FBQUEsSUFDRSxJQUFJO0FBQUEsSUFDSixNQUFNO0FBQUEsSUFDTixVQUFVO0FBQUEsSUFDVixTQUFTO0FBQUEsSUFDVCxPQUFPO0FBQUEsSUFDUCxlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsSUFDWixZQUFZO0FBQUEsSUFDWixRQUFRO0FBQUEsSUFDUixhQUFhO0FBQUEsSUFDYixnQkFBZ0I7QUFBQSxJQUNoQixnQkFBZ0I7QUFBQSxJQUNoQixNQUFNLENBQUMsTUFBTSxNQUFNLFFBQVEsSUFBSTtBQUFBLElBQy9CLGNBQWM7QUFBQSxFQUNoQjtBQUNGO0FBRU8sYUFBTSxvQkFBd0M7QUFBQSxFQUNuRDtBQUFBLElBQ0UsSUFBSTtBQUFBLElBQ0osTUFBTTtBQUFBLElBQ04sVUFBVTtBQUFBLElBQ1YsU0FBUztBQUFBLElBQ1QsT0FBTztBQUFBLElBQ1AsUUFBUTtBQUFBLElBQ1IsYUFBYTtBQUFBLElBQ2IsUUFBUTtBQUFBLEVBQ1Y7QUFBQSxFQUNBO0FBQUEsSUFDRSxJQUFJO0FBQUEsSUFDSixNQUFNO0FBQUEsSUFDTixVQUFVO0FBQUEsSUFDVixTQUFTO0FBQUEsSUFDVCxPQUFPO0FBQUEsSUFDUCxRQUFRO0FBQUEsSUFDUixhQUFhO0FBQUEsSUFDYixRQUFRO0FBQUEsRUFDVjtBQUFBLEVBQ0E7QUFBQSxJQUNFLElBQUk7QUFBQSxJQUNKLE1BQU07QUFBQSxJQUNOLFVBQVU7QUFBQSxJQUNWLFNBQVM7QUFBQSxJQUNULE9BQU87QUFBQSxJQUNQLFFBQVE7QUFBQSxJQUNSLGFBQWE7QUFBQSxJQUNiLFFBQVE7QUFBQSxFQUNWO0FBQ0Y7QUFFTyxhQUFNLFlBQXdCO0FBQUEsRUFDbkM7QUFBQSxJQUNFLElBQUk7QUFBQSxJQUNKLE9BQU87QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFVBQVU7QUFBQSxJQUNWLFNBQVM7QUFBQSxJQUNULFVBQVU7QUFBQSxFQUNaO0FBQUEsRUFDQTtBQUFBLElBQ0UsSUFBSTtBQUFBLElBQ0osT0FBTztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sVUFBVTtBQUFBLElBQ1YsU0FBUztBQUFBLElBQ1QsVUFBVTtBQUFBLEVBQ1o7QUFBQSxFQUNBO0FBQUEsSUFDRSxJQUFJO0FBQUEsSUFDSixPQUFPO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixVQUFVO0FBQUEsSUFDVixTQUFTO0FBQUEsSUFDVCxVQUFVO0FBQUEsRUFDWjtBQUFBLEVBQ0E7QUFBQSxJQUNFLElBQUk7QUFBQSxJQUNKLE9BQU87QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFVBQVU7QUFBQSxJQUNWLFNBQVM7QUFBQSxJQUNULFVBQVU7QUFBQSxFQUNaO0FBQUEsRUFDQTtBQUFBLElBQ0UsSUFBSTtBQUFBLElBQ0osT0FBTztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sVUFBVTtBQUFBLElBQ1YsU0FBUztBQUFBLElBQ1QsVUFBVTtBQUFBLEVBQ1o7QUFBQSxFQUNBO0FBQUEsSUFDRSxJQUFJO0FBQUEsSUFDSixPQUFPO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixVQUFVO0FBQUEsSUFDVixTQUFTO0FBQUEsSUFDVCxVQUFVO0FBQUEsRUFDWjtBQUFBLEVBQ0E7QUFBQSxJQUNFLElBQUk7QUFBQSxJQUNKLE9BQU87QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFVBQVU7QUFBQSxJQUNWLFNBQVM7QUFBQSxJQUNULFFBQVE7QUFBQSxJQUNSLFVBQVU7QUFBQSxFQUNaO0FBQUEsRUFDQTtBQUFBLElBQ0UsSUFBSTtBQUFBLElBQ0osT0FBTztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sVUFBVTtBQUFBLElBQ1YsU0FBUztBQUFBLElBQ1QsUUFBUTtBQUFBLElBQ1IsVUFBVTtBQUFBLEVBQ1o7QUFBQSxFQUNBO0FBQUEsSUFDRSxJQUFJO0FBQUEsSUFDSixPQUFPO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixVQUFVO0FBQUEsSUFDVixTQUFTO0FBQUEsSUFDVCxRQUFRO0FBQUEsSUFDUixVQUFVO0FBQUEsRUFDWjtBQUFBLEVBQ0E7QUFBQSxJQUNFLElBQUk7QUFBQSxJQUNKLE9BQU87QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFVBQVU7QUFBQSxJQUNWLFNBQVM7QUFBQSxJQUNULFFBQVE7QUFBQSxJQUNSLFVBQVU7QUFBQSxFQUNa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VUFBVTtBQUFBLElBQ1YsYUFBYTtBQUFBLElBQ2IsU0FBUztBQUFBLElBQ1QsV0FBVztBQUFBLEVBQ2I7QUFBQSxFQUNBO0FBQUEsSUFDRSxJQUFJO0FBQUEsSUFDSixNQUFNO0FBQUEsSUFDTixVQUFVO0FBQUEsSUFDVixhQUFhO0FBQUEsSUFDYixTQUFTO0FBQUEsSUFDVCxXQUFXO0FBQUEsRUFDYjtBQUNGO0FBRU8sYUFBTSxlQUE4QjtBQUFBLEVBQ3pDO0FBQUEsSUFDRSxJQUFJO0FBQUEsSUFDSixNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUEsSUFDUCxRQUFRO0FBQUEsSUFDUixhQUFhO0FBQUEsSUFDYixPQUFPO0FBQUEsSUFDUCxVQUFVO0FBQUEsTUFDUjtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBO0FBQUEsSUFDRSxJQUFJO0FBQUEsSUFDSixNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUEsSUFDUCxRQUFRO0FBQUEsSUFDUixhQUFhO0FBQUEsSUFDYixPQUFPO0FBQUEsSUFDUCxhQUFhO0FBQUEsSUFDYixVQUFVO0FBQUEsTUFDUjtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQTtBQUFBLElBQ0UsSUFBSTtBQUFBLElBQ0osTUFBTTtBQUFBLElBQ04sT0FBTztBQUFBLElBQ1AsUUFBUTtBQUFBLElBQ1IsYUFBYTtBQUFBLElBQ2IsT0FBTztBQUFBLElBQ1AsVUFBVTtBQUFBLE1BQ1I7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGO0FBRU8sYUFBTSxXQUFzQjtBQUFBLEVBQ2pDO0FBQUEsSUFDRSxJQUFJO0FBQUEsSUFDSixPQUFPO0FBQUEsSUFDUCxTQUFTO0FBQUEsSUFDVCxV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