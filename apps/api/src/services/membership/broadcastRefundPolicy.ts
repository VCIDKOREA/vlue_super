/** 영업 송출 옵션 환불 정책 — 결제·정지 동의서 공통 */
export const BROADCAST_REFUND_POLICY_SUMMARY =
  "월 15일 이상 사용 시 환불 없음. 15일 미만 사용 시 결제 금액의 50% 환불.";

export const BROADCAST_REFUND_POLICY_DETAIL = [
  "영업 송출 옵션은 결제 즉시 발신번호 송출 기능이 활성화됩니다.",
  "사용 중지(정지) 요청 시 송출 기능은 즉시 중단됩니다.",
  "당월 결제일 기준 15일 이상 이용한 경우 환불 금액이 없습니다.",
  "15일 미만 이용 시 결제 금액의 50%가 환불 검토 대상입니다.",
  "환불은 결제 수단·PG사 정책에 따라 처리되며, 추후 세부 정책은 앱 내 안내를 따릅니다."
] as const;

export type BroadcastRefundQuote = {
  daysUsed: number;
  refundRate: number;
  refundAmountKrw: number;
  noRefund: boolean;
  summary: string;
};

export function daysSince(iso: string | undefined | null): number {
  if (!iso) return 0;
  const start = new Date(iso).getTime();
  if (!Number.isFinite(start)) return 0;
  const diff = Date.now() - start;
  return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)));
}

export function quoteBroadcastRefund(paidAt: string | undefined, amountKrw: number): BroadcastRefundQuote {
  const daysUsed = daysSince(paidAt);
  const base = Math.max(0, Math.floor(Number(amountKrw) || 0));
  const noRefund = daysUsed >= 15;
  const refundRate = noRefund ? 0 : 0.5;
  const refundAmountKrw = noRefund ? 0 : Math.floor(base * 0.5);
  const summary = noRefund
    ? `이용 ${daysUsed}일 — 15일 이상 사용으로 환불 금액 없음`
    : `이용 ${daysUsed}일 — 50% 환불 검토 대상 (${refundAmountKrw.toLocaleString("ko-KR")}원)`;
  return { daysUsed, refundRate, refundAmountKrw, noRefund, summary };
}
