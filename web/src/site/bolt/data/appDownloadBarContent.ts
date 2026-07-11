import type { View } from '../types';
import { isWebPcDownloadEnabled } from '../../../lib/v1ReleaseScope.js';

const cta = () => (isWebPcDownloadEnabled() ? '모바일·PC 버전을 설치하세요.' : '모바일 앱을 설치하세요.');

/** 상단 설치 바 — 메뉴(뷰)별 핵심 포인트 → 설치 CTA */
const DOWNLOAD_BAR_TOP_PC: Record<View, string> = {
  home: `기관 검색은 웹에서, 통화 중 실시간 경보·가족 보호는 모바일 앱에서, 오피스·복합기 제어는 PC 프로그램에서 — ${cta()}`,
  search: `조회한 기관을 저장하고 수신 전화 위험 알림을 받으려면 VLUE 앱이 필요합니다 — ${cta()}`,
  about: `서비스 구조는 웹에서 확인했으면, 리모컨·실시간 알림·인증 명함은 설치형 앱에서 이어가세요 — ${cta()}`,
  shopping: `VLUE 인증 쇼핑·블루페이 결제·주문 알림은 모바일 앱에서, 매장·재고 관리는 PC 프로그램에서 — ${cta()}`,
  pricing: `V1 멤버십·블루 쇼케이스·디지털 인증명함·가족보호는 설치 후 바로 활성화됩니다 — ${cta()}`,
  family: `가족구성원 등록은 웹·앱 동일 계정으로 연동됩니다. 보호 알림·설정은 ${cta()}`,
  events: `지역 행사 일정·참가·리마인더 알림은 모바일 앱 푸시로 받아보세요 — ${cta()}`,
  resources: `자료실 파일은 웹·앱이 동기화되며, 스캔·대용량 업로드는 PC 프로그램이 편합니다 — ${cta()}`,
  jobs: `채용 공고·지원 현황·파트너 알림은 VLUE 앱에서 실시간으로 확인하세요 — ${cta()}`,
  mail: `@vlue.kr 보안 메일 수신·검사 알림은 모바일·PC 앱에서 — ${cta()}`,
  support: `긴급 피싱 신고·1:1 문의 답변은 앱에서 더 빠르게 처리됩니다 — ${cta()}`,
  exceleditor: `AI 엑셀은 www 전용이며, 저장한 장부는 PC·모바일 앱과 동일 데이터로 연동됩니다 — ${cta()}`,
  download: '스마트폰은 모바일 앱, 업무 PC는 PC 프로그램 — 모바일·PC 버전을 설치하세요.',
  safezone: `안심영역·위치 기반 보호 설정은 모바일 앱에서 — ${cta()}`,
  news: `보이스피싱 경보·VLUE 공지 푸시는 앱에서 — ${cta()}`,
  mypage: `내 인증·결제·알림 설정은 웹·앱이 동기화됩니다 — ${cta()}`,
  bizcard: `통화 화면 디지털 명함·레터링은 모바일 앱 전용 기능입니다 — ${cta()}`,
};

const DOWNLOAD_BAR_TOP_MOBILE: Record<View, string> = {
  home: `기관 검색은 웹에서, 통화 중 실시간 경보·가족 보호는 모바일 앱에서 — ${cta()}`,
  search: `조회한 기관을 저장하고 수신 전화 위험 알림을 받으려면 VLUE 모바일 앱이 필요합니다 — ${cta()}`,
  about: `서비스 구조는 웹에서 확인했으면, 실시간 알림·인증 명함은 모바일 앱에서 이어가세요 — ${cta()}`,
  shopping: `VLUE 인증 쇼핑·결제·주문 알림은 모바일 앱에서 — ${cta()}`,
  pricing: `V1 멤버십·블루 쇼케이스·디지털 인증명함·가족보호는 앱 설치 후 바로 활성화됩니다 — ${cta()}`,
  family: `가족구성원 등록은 웹·앱 동일 계정으로 연동됩니다. 보호 알림·설정은 ${cta()}`,
  events: `지역 행사 일정·참가·리마인더 알림은 모바일 앱 푸시로 받아보세요 — ${cta()}`,
  resources: `자료실 파일은 웹·모바일 앱이 동기화됩니다 — ${cta()}`,
  jobs: `채용 공고·지원 현황·파트너 알림은 VLUE 앱에서 실시간으로 확인하세요 — ${cta()}`,
  mail: `@vlue.kr 보안 메일 수신·검사 알림은 모바일 앱에서 — ${cta()}`,
  support: `긴급 피싱 신고·1:1 문의 답변은 앱에서 더 빠르게 처리됩니다 — ${cta()}`,
  exceleditor: `AI 엑셀은 www 전용이며, 저장한 장부는 모바일 앱과 동일 데이터로 연동됩니다 — ${cta()}`,
  download: '스마트폰용 VLUE 모바일 앱을 설치하세요.',
  safezone: `안심영역·위치 기반 보호 설정은 모바일 앱에서 — ${cta()}`,
  news: `보이스피싱 경보·VLUE 공지 푸시는 앱에서 — ${cta()}`,
  mypage: `내 인증·결제·알림 설정은 웹·앱이 동기화됩니다 — ${cta()}`,
  bizcard: `통화 화면 디지털 명함·레터링은 모바일 앱 전용 기능입니다 — ${cta()}`,
};

export const DOWNLOAD_BAR_BOTTOM = isWebPcDownloadEnabled()
  ? '웹과 동일한 쇼핑·결제·메일·자료실 — 앱·PC 설치 후 데이터가 즉시 이어집니다.'
  : '웹과 동일한 자료실·인증 설정 — 모바일 앱 설치 후 데이터가 즉시 이어집니다.';

export function getTopDownloadBarMessage(view: View): string {
  const map = isWebPcDownloadEnabled() ? DOWNLOAD_BAR_TOP_PC : DOWNLOAD_BAR_TOP_MOBILE;
  return map[view] ?? map.home;
}
