/** 원 단위 이하 절사 (KRW integer) */
export function floorWon(amount: number): number {
  return Math.floor(Math.max(0, amount));
}

/** 원 단위 반올림 — 파트너 최종 지급액(사업소득세 차감 후) */
export function roundWon(amount: number): number {
  return Math.round(Math.max(0, amount));
}

/** 10원 단위 절사 (B2C 월간 할인가) */
export function floorTo10Won(amount: number): number {
  return Math.floor(Math.max(0, amount) / 10) * 10;
}

/** 100원 단위 절사 → spec 월 19,800원 */
export function floorTo100Won(amount: number): number {
  return Math.floor(Math.max(0, amount) / 100) * 100;
}
