/**
 * 확정 서비스 아키텍처 — 서비스소개·문서와 동기화 (V1)
 */
import type { ServiceAccordionItem } from './serviceIntroContent';

export const PLATFORM_ARCHITECTURE_INTRO = {
  api: '@vlue/api',
  principle:
    '모든 기능은 공통 API 서버를 바라보며, 멤버십·개인케이스·가족보호 상태는 플랫폼이 달라도 하나의 계정 데이터로 동기화됩니다.',
};

export const WEB_PLATFORM = {
  title: '웹 (www.vlue.kr)',
  tagline: '검색·요금·안내',
  exclusive: [
    {
      id: 'search',
      title: '통합 검색',
      summary: '웹 전용 UI',
      detail:
        '기관명·전화번호·사업자번호를 공공데이터와 VLUE 인증 DB로 동시 검증. 마케팅 홈·서비스소개 검색 허브에서 제공합니다.',
    },
    {
      id: 'pricing',
      title: 'V1 멤버십·요금제',
      summary: '웹 안내',
      detail: '무료·유료·B2B 요금제를 비교합니다. 가입·결제는 VLUE 앱에서 진행합니다.',
    },
  ],
  shared: ['개인케이스', '인증신청', '고객지원', '가족보호'],
  ui: '브랜드 가치를 전달하는 홍보/마케팅 레이아웃. 개인케이스는 앱과 동일 탭(명함저장·저장된케이스·내문서)으로 맞춥니다.',
};

export const APP_PLATFORM = {
  title: '앱 (모바일)',
  tagline: '쇼케이스·명함·보호',
  exclusive: [
    {
      id: 'showcase',
      title: '블루 쇼케이스',
      summary: '통화 중 프로필',
      detail: '카카오·인스타 프로필과 개인 스타일로 통화 중 쇼케이스를 보여 줍니다.',
    },
    {
      id: 'alert',
      title: '실시간 알림',
      summary: 'SSE·푸시·경보',
      detail: '보이스피싱 경보, 가족보호, 공지를 SSE·푸시로 즉시 전달합니다.',
    },
    {
      id: 'hw',
      title: '하드웨어 연동',
      summary: '네이티브 연동',
      detail: 'Android 통화 레터링 오버레이, 가족보호 브릿지, WebView 기반 VLUE 앱 셸.',
    },
  ],
  shared: ['개인케이스', '디지털 인증명함', '가족보호'],
  ui: '통화 보호·명함·개인케이스에 집중한 모바일 도구 UI.',
};

export const SYNC_PRINCIPLES: ServiceAccordionItem[] = [
  {
    id: 'sync-one',
    title: '단일 데이터 상태',
    summary: '웹·모바일 = 한 사용자',
    detail: '플랫폼이 달라도 로그인 계정 기준 데이터는 하나입니다. @vlue/api + PostgreSQL이 단일 소스입니다.',
  },
  {
    id: 'sync-vault',
    title: '개인케이스 동기화',
    summary: '명함·케이스·문서',
    detail:
      '웹·앱 개인케이스는 명함저장·저장된케이스·내문서 동일 구성입니다. 저장한 명함·쇼케이스 스크랩·문서는 동일 계정으로 이어집니다.',
  },
  {
    id: 'sync-realtime',
    title: '알림·보호',
    summary: '푸시·SSE',
    detail: '가족보호·피싱 경보·공지는 앱 푸시(및 SSE)로 전달됩니다. 웹에서는 안내·설정을 이어갑니다.',
  },
];

export const DEV_DIRECTION = [
  '웹 상·하단에 모바일 앱 다운로드 경로를 상시 노출하여 설치형으로 유도합니다.',
  '웹 개인케이스는 앱과 동일 탭·문구로 맞춰, 설치 후 이질감이 없도록 합니다.',
  '신규 공통 기능은 반드시 @vlue/api에 API를 추가한 뒤 웹·앱 양쪽에서 동일 계약으로 호출합니다.',
] as const;

export function buildPlatformArchitectureAccordion(): ServiceAccordionItem[] {
  return [
    {
      id: 'arch-web',
      title: `웹 — ${WEB_PLATFORM.tagline}`,
      summary: `단독: 통합검색, 요금제 · 공통: ${WEB_PLATFORM.shared.join(', ')}`,
      detail: [
        ...WEB_PLATFORM.exclusive.map((f) => `[웹 전용] ${f.title}: ${f.detail}`),
        `[공통 기능] ${WEB_PLATFORM.shared.join(' · ')} — 앱과 동일 API`,
        WEB_PLATFORM.ui,
      ],
    },
    {
      id: 'arch-app',
      title: `앱 — ${APP_PLATFORM.tagline}`,
      summary: `단독: 쇼케이스, 알림, HW · 공통: ${APP_PLATFORM.shared.join(', ')}`,
      detail: [
        ...APP_PLATFORM.exclusive.map((f) => `[앱 전용] ${f.title}: ${f.detail}`),
        `[공통 기능] ${APP_PLATFORM.shared.join(' · ')} — 웹과 동일 API`,
        APP_PLATFORM.ui,
      ],
    },
    ...SYNC_PRINCIPLES,
    {
      id: 'arch-dev',
      title: '개발 방향',
      summary: '다운로드 유도 · 디자인 통일 · API 우선',
      detail: [...DEV_DIRECTION],
    },
  ];
}
