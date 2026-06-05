/** 서비스소개 — 회사소개 + 기능소개 (중복 제거·카테고리 재정의) */

import { MEMBERSHIP_PRICING_FEATURES } from './membershipPlansContent';

export type ServiceAccordionItem = {
  id: string;
  title: string;
  summary: string;
  detail: string | string[];
};

/** 히어로 — 회사소개 문구 (기술 스펙 대신) */
export const ABOUT_HERO = {
  badge: '서비스소개',
  title: '믿을 수 있는 연결,\n안전한 일상',
  companyLead:
    'VLUE(블루)는 보이스피싱·기관 사칭 피해를 줄이고, 검증된 기관과 사람이 안심하고 소통할 수 있도록 돕는 디지털 신뢰 플랫폼입니다. 공공데이터와 자체 인증을 결합해 “이 전화, 이 업체를 믿어도 될까?”에 답하고, 웹과 설치형 앱으로 일상 업무까지 이어갑니다.',
  companyPoweredBy: 'Powered by VCID KOREA',
  subtitle:
    'www.vlue.kr에서 기관을 확인하고 문서를 만들고, PC·모바일 설치 프로그램에서 실시간으로 보호받으세요. 하나의 계정으로 데이터가 연결됩니다.',
  searchHint: '아래에서 기관을 조회하거나, 궁금한 기능을 바로 찾아볼 수 있습니다.',
};

export const COMPANY_PROFILE = {
  mission: '사기 전화·문자를 받기 전에 확인하고, 피해를 예방합니다.',
  vision: '검증된 데이터 위에 쌓인 국내 대표 보안·커머스 통합 플랫폼.',
  pillars: [
    {
      id: 'trust',
      title: '신뢰 검증',
      desc: '공공 DB + VLUE 인증 DB 이중 조회로 기관·번호 위험도를 표시합니다.',
    },
    {
      id: 'protect',
      title: '실시간 보호',
      desc: '설치형 앱에서 통화·가족·계좌 이상 징후를 알리고 대응을 돕습니다.',
    },
    {
      id: 'work',
      title: '업무 생산성',
      desc: '웹에서 AI엑셀에디터, 앱에서 명함·쇼핑·메일을 한 흐름으로 운영합니다.',
    },
  ],
} as const;

export const PLATFORM_SPLIT = {
  web: {
    title: '웹 (www.vlue.kr)',
    tagline: '홍보·검색·문서 작업',
    color: 'primary' as const,
    exclusive: [
      { id: 'search', title: '통합 기관 검색', desc: '기관명·전화·사업자번호 즉시 검증' },
      { id: 'excel', title: 'AI엑셀에디터', desc: '장부·보고서를 www에서 만들고 편집' },
    ],
    sharedLabel: '웹·앱 공통',
    shared: ['VLUE 스토어', 'VLUE메일', '개인자료실', '인증신청', '지역 이벤트', '공식 채용'],
  },
  install: {
    title: '설치형 (PC·모바일)',
    tagline: '도구·제어·실시간 알림',
    color: 'indigo' as const,
    exclusive: [
      { id: 'remote', title: '복합기 리모컨', desc: 'PC 에이전트·오피스 원격 제어' },
      { id: 'alert', title: '실시간 알림', desc: '피싱·가족·공지 SSE·푸시' },
      { id: 'hw', title: '하드웨어 연동', desc: '통화 화면 명함·Android 보호 브릿지' },
    ],
    sharedLabel: '웹·앱 공통',
    shared: ['VLUE 스토어', 'VLUE메일', '개인자료실', '쇼핑·결제·채팅'],
  },
  syncNote: '쇼핑·결제·메일·자료실·엑셀 데이터는 @vlue/api로 동기화됩니다. 브라우저 웹앱(/app)은 제공하지 않습니다.',
} as const;

/** @deprecated — 플랫폼 섹션에서 PLATFORM_SPLIT 사용 */
export const PLATFORM_ARCHITECTURE_INTRO = {
  api: '@vlue/api',
  principle: PLATFORM_SPLIT.syncNote,
};

export const PROBLEM_STATS = [
  { value: '7,500억+', label: '2023년 피싱 피해액', sub: '전년 대비 32% 증가' },
  { value: '18만건', label: '연간 피해 신고', sub: '하루 평균 500건 이상' },
  { value: '96%', label: '사전 예방 가능', sub: '정보 확인만으로도 차단' },
] as const;

export const PHISHING_WARNINGS = [
  {
    title: '즉시 전화 끊기',
    desc: '금융기관·수사기관을 사칭하며 돈, 계좌, 앱 설치를 요구하면 즉시 전화를 끊으세요.',
  },
  {
    title: '공식 번호로 확인',
    desc: '의심스러운 전화를 받으면 반드시 해당 기관의 공식 대표번호로 직접 재발신하여 사실 여부를 확인하세요.',
  },
  {
    title: '앱 설치 절대 금지',
    desc: '문자·전화로 유도하는 어떤 앱도 절대 설치하지 마세요. 원격제어 앱(팀뷰어, 애니덱 등)은 즉시 삭제하세요.',
  },
] as const;

export const PHISHING_TIPS = [
  '금융기관은 절대 전화로 비밀번호·OTP를 요구하지 않습니다',
  '검찰·경찰·금감원 사칭 전화는 100% 사기입니다',
  '가족 납치·사고 빙자 송금 요구 — 반드시 직접 확인하세요',
  '대출 승인 빙자 수수료 요구는 전형적인 사기 수법입니다',
  '의심스러우면 즉시 끊고 112 또는 1332에 신고하세요',
] as const;

export const VOICE_PHISHING_APP_LINES = [
  '기관·금융사를 사칭해 앱 설치를 유도하는 사례가 늘고 있습니다.',
  '전화 중 링크 설치 요청은 즉시 종료하고, 공식 번호로 재확인하세요.',
  'VLUE에서는 인증명함으로 상대 신뢰 정보를 먼저 확인하세요.',
] as const;

export const SOLUTION_STEPS = [
  {
    title: '의심 전화·문자 수신',
    desc: '기관·개인 사칭, 대출·투자 권유, 공공기관 위장 연락.',
  },
  {
    title: '이중 교차 검증',
    desc: '행정안전부·금융위 공공데이터 + VLUE 인증 DB 동시 조회.',
  },
  {
    title: 'AI 위험도 분석',
    desc: '신고 이력·연관 번호·사업자 정보를 종합해 위험도 산출.',
  },
  {
    title: '즉시 판별·대응',
    desc: '안전/주의/위험 단계 안내와 가족·앱 알림으로 피해 예방.',
  },
] as const;

export const ARCHITECTURE_FLOW = [
  { label: '조회', sub: '번호·기관' },
  { label: '공공 DB', sub: '행안부·금융위' },
  { label: 'VLUE DB', sub: '인증·신고' },
  { label: 'AI 분석', sub: '위험도' },
  { label: '결과', sub: '안전/주의/위험' },
] as const;

/** 웹 전용 기능 — 메뉴 중복·PC기능 중복 제거 */
export const WEB_EXCLUSIVE_FEATURES: ServiceAccordionItem[] = [
  {
    id: 'web-search',
    title: '통합 기관 검색',
    summary: '공공+VLUE DB 동시 검증',
    detail: [
      '기관명·전화번호·사업자번호를 한 번에 조회합니다.',
      '의심 연락을 받기 전 확인하면 피싱 예방에 효과적입니다.',
    ],
  },
  {
    id: 'web-excel',
    title: 'AI엑셀에디터',
    summary: 'www 전용 장부·보고서',
    detail: [
      '공구·매출·입금 대조 등 표준 템플릿으로 AI가 시트를 생성합니다.',
      '웹에서 바로 편집·저장하며, PC 설치 프로그램과 동일 데이터로 연동됩니다.',
    ],
  },
];

/** 웹·앱 공통 — 한 번만 노출 (네비 메뉴와 1:1) */
export const SHARED_SERVICES: Array<{
  id: string;
  title: string;
  summary: string;
  nav?: string;
}> = [
  { id: 'store', title: 'VLUE 스토어', summary: '인증 판매자 안전 쇼핑', nav: 'shopping' },
  { id: 'mail', title: 'VLUE메일', summary: '@vlue.kr 보안 메일', nav: 'mail' },
  { id: 'vault', title: '개인자료실', summary: '문서·스캔 파일', nav: 'resources' },
  { id: 'pricing', title: '인증신청', summary: '무료·유료·기업 멤버십', nav: 'pricing' },
  { id: 'events', title: '지역 이벤트', summary: '캠페인·일정', nav: 'events' },
  { id: 'jobs', title: '공식 채용', summary: '파트너·채용', nav: 'jobs' },
  { id: 'support', title: '고객지원', summary: 'FAQ·문의', nav: 'support' },
];

/** 설치형 전용 — 앱 가이드 핵심만 (시스템 상세 목록 제거) */
export const INSTALL_EXCLUSIVE_FEATURES: ServiceAccordionItem[] = [
  {
    id: 'lettering',
    title: '디지털 인증 명함 · 레터링',
    summary: '통화 화면 신뢰 카드',
    detail: '통화 중 VLUE 인증 명함이 노출되어 사칭·피싱 의심을 줄이고, 홍보·상담 접점으로 활용합니다.',
  },
  {
    id: 'family',
    title: '가족 보호',
    summary: '부모·자녀 안심 모니터링',
    detail: '통화·원격앱·유해 링크·계좌 이상 징후를 보호자에게 알립니다. Android 네이티브 연동을 지원합니다.',
  },
  {
    id: 'remote',
    title: '스마트 오피스 · 리모컨',
    summary: 'PC·복합기 원격',
    detail: 'PC 에이전트로 스캔·인쇄·팩스를 요청하고, 오피스 메일을 앱에서 확인합니다.',
  },
  {
    id: 'chat',
    title: '채팅 · BlueAI',
    summary: '1:1 상담·AI 비서',
    detail: '고객·가족방·공식 채널 DM과 VLUE AI 대화를 한 앱에서 운영합니다.',
  },
  {
    id: 'commerce',
    title: '미디어 커머스 · 라이브',
    summary: '쇼핑·방송·공구',
    detail: '숏츠·라이브·공동구매와 스토어 운영을 연결해 매출·상담을 한곳에서 처리합니다.',
  },
  {
    id: 'partner',
    title: 'Vluer · 지역 광고',
    summary: '추천·리워드·동네 노출',
    detail: '추천 코드·커미션·로컬 광고로 소상공인 성장을 지원합니다.',
  },
];

export const INSTALL_HIGHLIGHTS = [
  '수신 전화 실시간 위험 알림',
  '문자·링크 스미싱 분석',
  '위치 기반 안심영역',
  '지문·Face ID 로그인',
] as const;

export const PRICING_TIER_FEATURES = MEMBERSHIP_PRICING_FEATURES;

export const TRUST_ITEMS = [
  { label: '행정안전부 연계', desc: '공공기관 사업자 DB 실시간 연동' },
  { label: '금융위원회 협력', desc: '금융사기 신고 이력 공유 체계' },
  { label: 'ISO 27001 인증', desc: '국제 정보보안 관리체계 인증' },
  { label: 'ISMS-P 인증', desc: '개인정보보호 관리체계 인증' },
  { label: '경찰청 MOU', desc: '사이버범죄수사대 데이터 공유' },
  { label: '인터폴 등재', desc: '국제 사기 DB 교차 연동' },
] as const;

export const CHART_FOOTNOTE =
  '2019년 대비 2.3배 증가 · 2023년 피해액 7,500억원+ 돌파 · 전년 대비 32% 급증';

export const PLATFORM_STATS = [
  { label: 'VLUE 인증 기관', value: '2,847', unit: '개', brand: true as const },
  { label: '검증 완료', value: '18.3만', unit: '건', brand: false as const },
  { label: '사기 차단', value: '9,402', unit: '건', brand: false as const },
] as const;

export const INSTITUTION_QUICK_SEARCH = [
  '명경채 요양병원',
  '다다오피스',
  '한국신뢰금융',
  '02-1234-5678',
] as const;

export const FEATURE_KEYWORD_QUICK = [
  '통합 검색',
  'AI엑셀에디터',
  '디지털명함',
  '가족보호',
  'VLUE 스토어',
  '무료 회원',
  'VLUER 추천',
] as const;

export type AboutCategoryId =
  | 'all'
  | 'company'
  | 'platform'
  | 'risk'
  | 'protect'
  | 'web'
  | 'install'
  | 'membership'
  | 'trust';

export const ABOUT_CATEGORIES: { id: AboutCategoryId; label: string; sectionId: string }[] = [
  { id: 'all', label: '전체', sectionId: 'about-overview' },
  { id: 'company', label: '회사소개', sectionId: 'about-company' },
  { id: 'platform', label: '플랫폼', sectionId: 'about-platform' },
  { id: 'risk', label: '보이스피싱', sectionId: 'about-risk' },
  { id: 'protect', label: 'VLUE 대응', sectionId: 'about-protect' },
  { id: 'web', label: '웹 전용', sectionId: 'about-web' },
  { id: 'install', label: '설치형 앱', sectionId: 'about-install' },
  { id: 'membership', label: '요금제', sectionId: 'about-pricing' },
  { id: 'trust', label: '신뢰·비전', sectionId: 'about-trust' },
];

export const VISION_CARDS = [
  {
    title: '보안 통합 포털',
    desc: '보이스피싱·스미싱·파밍을 아우르는 종합 사기 예방 포털로 확장합니다.',
    tag: '2024 로드맵',
  },
  {
    title: '실시간 알림 강화',
    desc: '설치형 앱에서 통화·메시지 위험 신호를 더 빠르고 정확하게 전달합니다.',
    tag: '2024 Q3',
  },
  {
    title: '기업 보안 B2B',
    desc: '금융·통신·플랫폼 기업 대상 API 기반 사기 검증 서비스를 제공합니다.',
    tag: '2025 확장',
  },
] as const;

export const MARKET_BARS = [
  { label: '보이스피싱 예방 솔루션', pct: 68 },
  { label: '기업 보안 B2B API', pct: 45 },
  { label: '설치형 보안·커머스', pct: 30 },
] as const;

export type CatalogFeature = ServiceAccordionItem & {
  category: AboutCategoryId;
  sectionId: string;
};

function detailText(detail: string | string[]): string {
  return Array.isArray(detail) ? detail.join(' ') : detail;
}

export function buildFeatureCatalog(): CatalogFeature[] {
  const company = COMPANY_PROFILE.pillars.map((p) => ({
    id: `company-${p.id}`,
    title: p.title,
    summary: p.desc,
    detail: p.desc,
    category: 'company' as const,
    sectionId: 'about-company',
  }));

  const platform = [
    ...PLATFORM_SPLIT.web.exclusive,
    ...PLATFORM_SPLIT.install.exclusive,
  ].map((f, i) => ({
    id: `plat-${f.id}-${i}`,
    title: f.title,
    summary: f.desc,
    detail: f.desc,
    category: 'platform' as const,
    sectionId: 'about-platform',
  }));

  const risk = [
    ...PHISHING_WARNINGS.map((w, i) => ({
      id: `warn-${i}`,
      title: w.title,
      summary: w.desc.slice(0, 40),
      detail: w.desc,
      category: 'risk' as const,
      sectionId: 'about-risk',
    })),
    ...PHISHING_TIPS.map((tip, i) => ({
      id: `tip-${i}`,
      title: `대응 수칙 ${i + 1}`,
      summary: tip.slice(0, 36),
      detail: tip,
      category: 'risk' as const,
      sectionId: 'about-risk',
    })),
  ];

  const protect = SOLUTION_STEPS.map((step, i) => ({
    id: `protect-${i}`,
    title: step.title,
    summary: step.desc.slice(0, 48),
    detail: step.desc,
    category: 'protect' as const,
    sectionId: 'about-protect',
  }));

  const web = WEB_EXCLUSIVE_FEATURES.map((item) => ({
    ...item,
    category: 'web' as const,
    sectionId: 'about-web',
  }));

  const install = INSTALL_EXCLUSIVE_FEATURES.map((item) => ({
    ...item,
    category: 'install' as const,
    sectionId: 'about-install',
  }));

  const pricing = PRICING_TIER_FEATURES.map((item) => ({
    ...item,
    category: 'membership' as const,
    sectionId: 'about-pricing',
  }));

  const trust = TRUST_ITEMS.map((t, i) => ({
    id: `trust-${i}`,
    title: t.label,
    summary: t.desc,
    detail: t.desc,
    category: 'trust' as const,
    sectionId: 'about-trust',
  }));

  return [...company, ...platform, ...risk, ...protect, ...web, ...install, ...pricing, ...trust];
}

export function matchFeatureQuery(item: CatalogFeature, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = `${item.title} ${item.summary} ${detailText(item.detail)}`.toLowerCase();
  return hay.includes(needle);
}

/** 하위 호환 — platformArchitectureContent import 제거용 최소 export */
export const WEB_PLATFORM = PLATFORM_SPLIT.web;
export const APP_PLATFORM = PLATFORM_SPLIT.install;
