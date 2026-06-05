import type { VlueWorkbookModel } from "@vlue/shared/excel";

/** DB 미적용·로컬 폴백용 정적 템플릿 (시드와 동일 ID) */
export const OFFICE_EXCEL_TEMPLATES_FALLBACK: Array<{
  id: string;
  category: string;
  title: string;
  description: string;
  model: VlueWorkbookModel;
  promptHints: string[];
}> = [
  {
    id: "group_buy_order_v1",
    category: "commerce",
    title: "공구 주문 취합표",
    description: "채팅·폼 주문을 한 시트에 정리하는 표준 양식",
    promptHints: ["공구", "주문", "취합", "입금"],
    model: {
      meta: {
        title: "공구 주문 취합",
        templateId: "group_buy_order_v1",
        locale: "ko-KR",
        createdBy: "ai"
      },
      sheets: [
        {
          id: "orders",
          name: "주문취합",
          rowCount: 200,
          columnCount: 12,
          cellData: {
            r0c0: { v: "번호" },
            r0c1: { v: "이름" },
            r0c2: { v: "연락처" },
            r0c3: { v: "상품" },
            r0c4: { v: "수량" },
            r0c5: { v: "금액" },
            r0c6: { v: "입금여부" }
          }
        }
      ]
    }
  },
  {
    id: "payment_reconcile_v1",
    category: "finance",
    title: "입금 대조표",
    description: "주문 금액과 실제 입금 내역을 대조",
    promptHints: ["입금", "대조", "정산"],
    model: {
      meta: {
        title: "입금 대조",
        templateId: "payment_reconcile_v1",
        locale: "ko-KR",
        createdBy: "ai"
      },
      sheets: [
        {
          id: "reconcile",
          name: "입금대조",
          rowCount: 200,
          columnCount: 10,
          cellData: {
            r0c0: { v: "주문번호" },
            r0c1: { v: "주문자" },
            r0c2: { v: "주문금액" },
            r0c3: { v: "입금액" },
            r0c4: { v: "차액" },
            r1c4: { v: 0, f: "=C2-D2" }
          }
        }
      ]
    }
  }
];

export function getFallbackTemplateById(templateId: string) {
  return OFFICE_EXCEL_TEMPLATES_FALLBACK.find((t) => t.id === templateId) ?? null;
}
