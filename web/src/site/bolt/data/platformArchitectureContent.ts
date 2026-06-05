/**
 * 확정 서비스 아키텍처 — 서비스소개·문서와 동기화 (docs/SERVICE_ARCHITECTURE.md)
 */
import type { ServiceAccordionItem } from './serviceIntroContent';

export const PLATFORM_ARCHITECTURE_INTRO = {
  api: '@vlue/api',
  principle: '모든 기능은 공통 API 서버를 바라보며, 결제·자료실·쇼핑·채팅 상태는 플랫폼이 달라도 하나의 데이터로 실시간 동기화됩니다.',
};

export const WEB_PLATFORM = {
  title: '웹 (www.vlue.kr)',
  tagline: '단독 기능 + 홍보·마케팅',
  exclusive: [
    { id: 'search', title: '통합 검색', summary: '웹 전용 UI', detail: '기관명·전화번호·사업자번호를 공공데이터와 VLUE 인증 DB로 동시 검증. 마케팅 홈·서비스소개 검색 허브에서 제공합니다.' },
    { id: 'excel', title: 'AI엑셀에디터', summary: '웹 전용 UI', detail: '장부·보고서를 www에서 AI로 생성·편집하고, PC·모바일 앱과 동일 데이터로 연동합니다.' },
  ],
  shared: ['쇼핑', '결제', '메일(@vlue.kr)', '자료실'],
  ui: '브랜드 가치를 전달하는 홍보/마케팅 레이아웃 + 공통 기능용 대시보드. 쇼핑·메일·자료실은 앱과 동일 디자인 시스템(컬러·폰트·컴포넌트)을 공유합니다.',
};

export const APP_PLATFORM = {
  title: '앱 (PC 설치형 / 모바일)',
  tagline: '도구 및 제어',
  exclusive: [
    { id: 'remote', title: '복합기 리모컨', summary: 'PC·오피스 제어', detail: 'OfficeRemotePanel·PC 에이전트를 통해 복합기·원격 작업을 제어합니다. 웹에서는 제공하지 않습니다.' },
    { id: 'alert', title: '실시간 알림', summary: 'SSE·푸시·경보', detail: '보이스피싱 경보, 가족보호, 공지, 오피스 메일 등 SSE·푸시로 즉시 전달합니다.' },
    { id: 'hw', title: '하드웨어 제어', summary: '네이티브 연동', detail: 'Android 통화 레터링 오버레이, 가족보호 브릿지, WebView 기반 VLUE 앱 셸.' },
  ],
  shared: ['쇼핑', '결제', '메일', '자료실'],
  ui: '업무 생산성에 집중한 카카오톡 스타일 통일 도구 UI(채팅·MY·쇼핑·BlueAI).',
};

export const SYNC_PRINCIPLES: ServiceAccordionItem[] = [
  {
    id: 'sync-one',
    title: '단일 데이터 상태',
    summary: '웹·PC·모바일 = 한 사용자',
    detail: '플랫폼이 달라도 로그인 계정 기준 데이터는 하나입니다. @vlue/api + PostgreSQL이 단일 소스입니다.',
  },
  {
    id: 'sync-commerce',
    title: '결제·자료실·쇼핑',
    summary: '즉시 반영',
    detail: '웹에서 결제한 내역, 자료실에 올린 파일, 쇼핑 장바구니는 앱에서 바로 확인할 수 있습니다. 동일 REST API를 사용합니다.',
  },
  {
    id: 'sync-realtime',
    title: '채팅·리모컨',
    summary: 'WebSocket 실시간',
    detail: '채팅·DM·리모컨 상태는 WebSocket(및 SSE)으로 플랫폼 간 실시간 동기화됩니다. Supabase Realtime은 DM 보조 채널로 사용합니다.',
  },
];

export const DEV_DIRECTION = [
  '웹 상·하단에 앱/PC 프로그램 다운로드 경로를 상시 노출하여 설치형으로 유도합니다.',
  '웹의 쇼핑·메일·자료실 UI는 앱과 디자인 시스템을 공유해, 설치 후 이질감이 없도록 합니다.',
  '신규 공통 기능은 반드시 @vlue/api에 API를 추가한 뒤 웹·앱 양쪽에서 동일 계약으로 호출합니다.',
] as const;

export function buildPlatformArchitectureAccordion(): ServiceAccordionItem[] {
  return [
    {
      id: 'arch-web',
      title: `웹 — ${WEB_PLATFORM.tagline}`,
      summary: `단독: 통합검색, AI엑셀에디터 · 공통: ${WEB_PLATFORM.shared.join(', ')}`,
      detail: [
        ...WEB_PLATFORM.exclusive.map((f) => `[웹 전용] ${f.title}: ${f.detail}`),
        `[공통 기능] ${WEB_PLATFORM.shared.join(' · ')} — 앱과 동일 API`,
        WEB_PLATFORM.ui,
      ],
    },
    {
      id: 'arch-app',
      title: `앱 — ${APP_PLATFORM.tagline}`,
      summary: `단독: 리모컨, 알림, HW · 공통: ${APP_PLATFORM.shared.join(', ')}`,
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
