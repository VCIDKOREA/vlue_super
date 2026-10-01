import { familyProtectionDb } from "../../db/familyProtectionDb.js";
import type { ChildBankTransaction } from "./childBankTransactionTypes.js";

export async function getAcceptedBankConsentForWard(wardUserId: string) {
  try {
    return await familyProtectionDb.familyBankConsent.findFirst({
      where: { wardUserId, status: "accepted" },
      orderBy: { respondedAt: "desc" }
    });
  } catch {
    return null;
  }
}

/** 계좌·입출금 알림은 제공하지 않는다. */
export async function requestChildBankConsent(
  guardianUserId: string,
  linkId: string,
  input: { accountLabel?: string; bankCode?: string; accountMasked?: string; knownPayees?: string[] }
) {
  void guardianUserId;
  void linkId;
  void input;
  return { error: "계좌·입출금 알림은 제공하지 않습니다." };
}

/** 계좌·입출금 알림은 제공하지 않는다. */
export async function respondChildBankConsent(
  wardUserId: string,
  linkId: string,
  accept: boolean
) {
  void wardUserId;
  void linkId;
  void accept;
  return { error: "계좌·입출금 알림은 제공하지 않습니다." };
}

/** 계좌·입출금 알림은 제공하지 않는다. */
export async function recordChildBankTransaction(
  wardUserId: string,
  input: ChildBankTransaction | Omit<ChildBankTransaction, "wardUserId">
) {
  void wardUserId;
  void input;
  return {
    ok: true,
    notified: 0,
    isAccountAgreed: false,
    reason: "feature_disabled",
    message: "계좌·입출금 알림은 제공하지 않습니다."
  };
}

export async function listBankConsentsForUser(userId: string) {
  try {
    const [asGuardian, asWard, accepted] = await Promise.all([
      familyProtectionDb.familyBankConsent.findMany({
        where: { guardianUserId: userId },
        orderBy: { requestedAt: "desc" }
      }),
      familyProtectionDb.familyBankConsent.findMany({
        where: { wardUserId: userId, status: "pending" },
        orderBy: { requestedAt: "desc" }
      }),
      familyProtectionDb.familyBankConsent.findFirst({
        where: { wardUserId: userId, status: "accepted" }
      })
    ]);
    return {
      asGuardian,
      asWard,
      isAccountAgreed: accepted?.status === "accepted",
      acceptedConsentId: accepted?.id ?? null
    };
  } catch {
    return { asGuardian: [], asWard: [], isAccountAgreed: false, acceptedConsentId: null };
  }
}
