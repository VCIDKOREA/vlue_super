import { isPaidMember } from "../membership/paidMemberGate.js";

/** 무료: 메인 송출 슬롯 1개 */
export const MYCASE_FREE_MAX_MAIN_SLOTS = 1;
/** 유료(Pro): 메인 송출 슬롯 10개 (디지털인증명함 포함) */
export const MYCASE_PRO_MAX_MAIN_SLOTS = 10;
/** 무료: 메인 송출 변경 쿨다운 (7일) */
export const MYCASE_FREE_CHANGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export type MycaseTier = "free" | "pro";

export async function resolveMycaseTier(userId: string): Promise<MycaseTier> {
  const paid = await isPaidMember(userId);
  return paid.ok ? "pro" : "free";
}

export function maxMainSlotsForTier(tier: MycaseTier): number {
  return tier === "pro" ? MYCASE_PRO_MAX_MAIN_SLOTS : MYCASE_FREE_MAX_MAIN_SLOTS;
}

export type BroadcastPolicySnapshot = {
  tier: MycaseTier;
  maxMainSlots: number;
  usedMainSlots: number;
  remainingSlots: number;
  /** 무료만 — 다음 변경 가능 시각 (ISO). null이면 즉시 가능 */
  nextChangeAt: string | null;
  /** 무료만 — 남은 쿨다운 ms. 0이면 변경 가능 */
  cooldownRemainingMs: number;
  canChangeBroadcast: boolean;
  mainBroadcastChangedAt: string | null;
};

export function computeCooldown(
  tier: MycaseTier,
  mainBroadcastChangedAt: Date | null | undefined,
  now = new Date()
): { cooldownRemainingMs: number; nextChangeAt: string | null; canChangeBroadcast: boolean } {
  if (tier === "pro") {
    return { cooldownRemainingMs: 0, nextChangeAt: null, canChangeBroadcast: true };
  }
  if (!mainBroadcastChangedAt) {
    return { cooldownRemainingMs: 0, nextChangeAt: null, canChangeBroadcast: true };
  }
  const elapsed = now.getTime() - mainBroadcastChangedAt.getTime();
  const remaining = Math.max(0, MYCASE_FREE_CHANGE_COOLDOWN_MS - elapsed);
  if (remaining <= 0) {
    return { cooldownRemainingMs: 0, nextChangeAt: null, canChangeBroadcast: true };
  }
  return {
    cooldownRemainingMs: remaining,
    nextChangeAt: new Date(mainBroadcastChangedAt.getTime() + MYCASE_FREE_CHANGE_COOLDOWN_MS).toISOString(),
    canChangeBroadcast: false
  };
}

export type BroadcastPolicyErrorCode =
  | "slot_limit_exceeded"
  | "cooldown_active"
  | "not_found"
  | "forbidden"
  | "invalid";

export class MycaseBroadcastError extends Error {
  code: BroadcastPolicyErrorCode;
  status: number;
  details?: Record<string, unknown>;

  constructor(
    code: BroadcastPolicyErrorCode,
    message: string,
    status = 403,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "MycaseBroadcastError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
