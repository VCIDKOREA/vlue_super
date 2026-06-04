import { prisma } from "../db/client.js";
import { resolveDigitalCardIdParam } from "./bizcard/resolveCardId.js";
import { isPaidMember } from "./membership/paidMemberGate.js";

export type CardValidateResult = {
  valid: boolean;
  cardId: string;
  reason?: "not_found" | "account_suspended" | "membership_expired" | "card_revoked";
  message?: string;
  membershipActive?: boolean;
  designTemplate?: string | null;
  checkedAt: string;
};

/** 외부 배포 HTML — 유료 구독·계정 상태 실시간 검증 */
export async function validateDigitalCardForExport(cardIdOrHandle: string): Promise<CardValidateResult> {
  const checkedAt = new Date().toISOString();
  const raw = String(cardIdOrHandle || "").trim();
  const id = raw ? await resolveDigitalCardIdParam(raw) : null;
  if (!id) {
    return {
      valid: false,
      cardId: raw,
      reason: "not_found",
      message: raw
        ? "등록되지 않은 명함입니다. (UUID 또는 회원 ID 확인)"
        : "명함 ID가 없습니다.",
      checkedAt
    };
  }

  const row = await prisma.digitalCard.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      designTemplateSnapshot: true,
      user: { select: { accountStatus: true } }
    }
  });

  if (!row) {
    return {
      valid: false,
      cardId: id,
      reason: "not_found",
      message: "등록되지 않은 명함입니다.",
      checkedAt
    };
  }

  if (row.user.accountStatus === "suspended") {
    return {
      valid: false,
      cardId: id,
      reason: "account_suspended",
      message: "계정이 정지되어 명함이 무효화되었습니다.",
      membershipActive: false,
      designTemplate: row.designTemplateSnapshot,
      checkedAt
    };
  }

  const paid = await isPaidMember(row.userId);
  if (!paid.ok) {
    return {
      valid: false,
      cardId: id,
      reason: "membership_expired",
      message: "유효기간이 만료되어 무효화된 명함입니다.",
      membershipActive: false,
      designTemplate: row.designTemplateSnapshot,
      checkedAt
    };
  }

  return {
    valid: true,
    cardId: id,
    membershipActive: true,
    designTemplate: row.designTemplateSnapshot,
    checkedAt
  };
}
