/** API 미연결·로컬 체험용 워크북·템플릿 (서버 카탈로그와 동일 ID) */

export type DemoWorkbookModel = {
  meta?: { title?: string; templateId?: string };
  sheets?: Array<{
    id: string;
    name: string;
    rowCount?: number;
    columnCount?: number;
    cellData?: Record<string, { v?: string | number | null; f?: string | null }>;
  }>;
};

export const DEMO_TEMPLATE_CATALOG = [
  {
    id: 'group_buy_order_v1',
    category: 'commerce',
    title: '공구 주문 취합표',
    description: '채팅·폼 주문을 한 시트에 정리',
    badge: '인기',
    promptHints: ['공구', '주문 취합', '입금 확인'],
  },
  {
    id: 'payment_reconcile_v1',
    category: 'finance',
    title: '입금 대조표',
    description: '주문 금액과 실제 입금 내역 대조',
    badge: '정산',
    promptHints: ['입금', '대조', '차액'],
  },
  {
    id: 'inventory_check_v1',
    category: 'ops',
    title: '재고 점검표',
    description: 'SKU·수량·입출고 일괄 관리',
    badge: '재고',
    promptHints: ['재고', '입고', '출고'],
  },
  {
    id: 'event_attendance_v1',
    category: 'event',
    title: '행사 참석 명단',
    description: '신청·참석·좌석 배정 한눈에',
    badge: '행사',
    promptHints: ['참석', '명단', '좌석'],
  },
] as const;

export const PROMPT_SUGGESTIONS = [
  '3월 공구 주문 취합표 — 이름, 연락처, 수량, 입금여부',
  '이번 주 입금 대조표 (주문금액·입금액·차액)',
  '소모품 재고 점검 — 품목, 현재고, 안전재고',
  '오프라인 모임 참석 명단 + 좌석 번호',
];

export const EXCEL_CAPABILITY_CHIPS = [
  { label: 'AI 템플릿 매칭', detail: '12종 업무 양식' },
  { label: '수식·합계 자동', detail: 'SUM·차액 열' },
  { label: '버전 이력', detail: 'rev 단위 복구' },
  { label: 'PC·앱 동기화', detail: '동일 계정' },
  { label: 'CSV보내기', detail: '앱에서 지원' },
  { label: '협업 잠금', detail: '충돌 감지' },
];

const SAMPLE_GROUP_BUY = [
  ['1', '김민지', '010-2345-6789', '에코백', '2', '36,000', '완료'],
  ['2', '이준호', '010-3456-7890', '텀블러', '1', '18,500', '대기'],
  ['3', '박서연', '010-4567-8901', '에코백', '1', '18,000', '완료'],
  ['4', '최현우', '010-5678-9012', '키트', '3', '45,000', '대기'],
  ['5', '정하은', '010-6789-0123', '텀블러', '2', '37,000', '완료'],
];

const SAMPLE_RECONCILE = [
  ['A-101', '김민지', '36,000', '36,000', '0', '일치'],
  ['A-102', '이준호', '18,500', '18,000', '500', '미수'],
  ['A-103', '박서연', '18,000', '18,000', '0', '일치'],
];

const SAMPLE_INVENTORY = [
  ['SKU-01', '에코백', '42', '20', '입고'],
  ['SKU-02', '텀블러', '8', '15', '발주'],
  ['SKU-03', '키트', '31', '10', '양호'],
];

const SAMPLE_ATTENDANCE = [
  ['1', '김민지', '010-2345-6789', '참석', 'A-12'],
  ['2', '이준호', '010-3456-7890', '참석', 'B-04'],
  ['3', '박서연', '010-4567-8901', '불참', '—'],
];

function parseMonthFromPrompt(prompt: string): string | null {
  const m = prompt.match(/(\d{1,2})\s*월/);
  if (m) return `${m[1]}월`;
  return null;
}

function headersForTemplate(templateId: string): string[] {
  switch (templateId) {
    case 'payment_reconcile_v1':
      return ['주문번호', '주문자', '주문금액', '입금액', '차액', '상태'];
    case 'inventory_check_v1':
      return ['SKU', '품목명', '현재고', '안전재고', '판정'];
    case 'event_attendance_v1':
      return ['번호', '이름', '연락처', '참석', '좌석'];
    default:
      return ['번호', '이름', '연락처', '상품', '수량', '금액', '입금여부'];
  }
}

function samplesForTemplate(templateId: string): string[][] {
  switch (templateId) {
    case 'payment_reconcile_v1':
      return SAMPLE_RECONCILE;
    case 'inventory_check_v1':
      return SAMPLE_INVENTORY;
    case 'event_attendance_v1':
      return SAMPLE_ATTENDANCE;
    default:
      return SAMPLE_GROUP_BUY;
  }
}

function sheetMeta(templateId: string): { sheetId: string; sheetName: string } {
  switch (templateId) {
    case 'payment_reconcile_v1':
      return { sheetId: 'reconcile', sheetName: '입금대조' };
    case 'inventory_check_v1':
      return { sheetId: 'stock', sheetName: '재고점검' };
    case 'event_attendance_v1':
      return { sheetId: 'attendance', sheetName: '참석명단' };
    default:
      return { sheetId: 'orders', sheetName: '주문취합' };
  }
}

export function buildDemoModel(
  templateId: string,
  opts?: { prompt?: string; title?: string; withSamples?: boolean }
): DemoWorkbookModel {
  const tpl = DEMO_TEMPLATE_CATALOG.find((t) => t.id === templateId) ?? DEMO_TEMPLATE_CATALOG[0];
  const month = opts?.prompt ? parseMonthFromPrompt(opts.prompt) : null;
  const title =
    opts?.title ||
    (month ? `${month} ${tpl.title}` : tpl.title);
  const headers = headersForTemplate(templateId);
  const { sheetId, sheetName } = sheetMeta(templateId);
  const cellData: Record<string, { v: string | number; f?: string | null }> = {};

  headers.forEach((h, c) => {
    cellData[`r0c${c}`] = { v: h };
  });

  if (opts?.withSamples !== false) {
    const rows = samplesForTemplate(templateId);
    rows.forEach((row, ri) => {
      row.forEach((val, ci) => {
        cellData[`r${ri + 1}c${ci}`] = { v: val };
      });
    });
    if (templateId === 'group_buy_order_v1') {
      cellData.r6c0 = { v: '합계' };
      cellData.r6c4 = { v: '', f: '=SUM(E2:E6)' };
      cellData.r6c5 = { v: '', f: '=SUM(F2:F6)' };
    }
  }

  return {
    meta: { title, templateId },
    sheets: [
      {
        id: sheetId,
        name: sheetName,
        rowCount: 200,
        columnCount: Math.max(headers.length, 10),
        cellData,
      },
    ],
  };
}

export function isNetworkFetchError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return msg.includes('failed to fetch') || msg.includes('network') || err.name === 'TypeError';
}

export function friendlyApiError(err: unknown): string {
  if (isNetworkFetchError(err)) {
    return 'API 서버에 연결되지 않습니다. 아래는 체험 모드 미리보기이며, 서버가 켜지면 저장·동기화가 활성화됩니다.';
  }
  return err instanceof Error ? err.message : '요청 처리 중 오류가 발생했습니다.';
}

export const DEMO_PREVIEW_WORKBOOK_ID = 'demo-preview';
