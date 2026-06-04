import { prisma } from "../../db/client.js";
import { familyProtectionDb } from "../../db/familyProtectionDb.js";
import { ssePublish } from "../../realtime/sseHub.js";
import type { ChildBankTransaction } from "./childBankTransactionTypes.js";
import { resolveIsUnknownPayeeForWard } from "./bankingPayeeWhitelist.js";
import { createFamilyAlertAndNotifyGuardians } from "./familyProtectionNotify.js";
import {
  fcmMessageChildBankThreshold,
  fcmMessageChildBankUnknownPayee,
  pushFamilyProtectionFcmToGuardians
} from "./familyProtectionFcmPush.js";
import { getGuardianChildLinks, getOrCreateFamilySettings, mergeLinkAlertConfig } from "./familyProtectionSettingsHelper.js";

async function wardDisplayName(userId: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { legalName: true, nickFeed: true, publicHandle: true }
  });
  return u?.legalName || u?.publicHandle || "자녀";
}

async function guardianDisplayName(userId: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { legalName: true, publicHandle: true }
  });
  return u?.legalName || u?.publicHandle || "보호자";
}

type ConsentScopes = {
  bankTxNotify?: boolean;
  allTransactions?: boolean;
  thresholdKrw?: number;
  unknownPayeeAlert?: boolean;
  knownPayees?: string[];
};

function parseScopes(raw: unknown): ConsentScopes {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const known = Array.isArray(o.knownPayees)
    ? o.knownPayees.map((x) => String(x).trim().toLowerCase()).filter(Boolean)
    : [];
  return {
    bankTxNotify: o.bankTxNotify !== false,
    allTransactions: Boolean(o.allTransactions),
    thresholdKrw: Number(o.thresholdKrw) || 10000,
    unknownPayeeAlert: o.unknownPayeeAlert !== false,
    knownPayees: known
  };
}

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

/** 보호자 → 자녀 계좌 모니터링 동의 요청 (개인정보법: 자녀 명시 동의) */
export async function requestChildBankConsent(
  guardianUserId: string,
  linkId: string,
  input: { accountLabel?: string; bankCode?: string; accountMasked?: string; knownPayees?: string[] }
) {
  const link = await familyProtectionDb.familyProtectionLink.findFirst({
    where: { id: linkId, guardianUserId, status: "active", wardRole: "child" }
  });
  if (!link) return { error: "활성 자녀 연결을 찾을 수 없습니다." };

  const gName = await guardianDisplayName(guardianUserId);
  const title = "가족 보호 · 계좌 모니터링 동의";
  const body = `${gName} 님이 자녀 계좌 입출금 알림을 요청했습니다. 동의 시 입출금 내역이 보호자에게 전달됩니다.`;

  const knownPayees = (input.knownPayees || [])
    .map((x) => String(x).trim().toLowerCase())
    .filter(Boolean);

  let consent;
  try {
    consent = await familyProtectionDb.familyBankConsent.upsert({
      where: { linkId },
      create: {
        linkId,
        guardianUserId,
        wardUserId: link.wardUserId,
        status: "pending",
        accountLabel: input.accountLabel || null,
        bankCode: input.bankCode || null,
        accountMasked: input.accountMasked || null,
        scopesJson: {
          bankTxNotify: true,
          allTransactions: false,
          thresholdKrw: 10000,
          unknownPayeeAlert: true,
          knownPayees
        }
      },
      update: {
        status: "pending",
        accountLabel: input.accountLabel || null,
        bankCode: input.bankCode || null,
        accountMasked: input.accountMasked || null,
        respondedAt: null,
        requestedAt: new Date(),
        scopesJson: {
          bankTxNotify: true,
          allTransactions: false,
          thresholdKrw: 10000,
          unknownPayeeAlert: true,
          knownPayees
        }
      }
    });
  } catch {
    return { error: "계좌 동의 저장에 실패했습니다. DB 마이그레이션을 적용해 주세요." };
  }

  await prisma.ownerNotification.create({
    data: {
      ownerUserId: link.wardUserId,
      actorUserId: guardianUserId,
      title,
      body
    }
  });

  ssePublish(link.wardUserId, {
    type: "vlue-family-bank-consent-request",
    linkId,
    consentId: consent.id,
    guardianUserId,
    title,
    body,
    accountLabel: input.accountLabel || null
  });

  return { ok: true, consent };
}

/** 자녀 — 동의/거절 */
export async function respondChildBankConsent(
  wardUserId: string,
  linkId: string,
  accept: boolean
) {
  const consent = await familyProtectionDb.familyBankConsent.findFirst({
    where: { linkId, wardUserId, status: "pending" }
  });
  if (!consent) return { error: "대기 중인 동의 요청이 없습니다." };

  const status = accept ? "accepted" : "rejected";
  const updated = await familyProtectionDb.familyBankConsent.update({
    where: { id: consent.id },
    data: { status, respondedAt: new Date() }
  });

  const wardName = await wardDisplayName(wardUserId);
  const title = accept ? "계좌 모니터링 동의 완료" : "계좌 모니터링 거절";
  const body = accept
    ? `${wardName} 님이 계좌 입출금 알림에 동의했습니다.`
    : `${wardName} 님이 계좌 입출금 알림을 거절했습니다.`;

  await prisma.ownerNotification.create({
    data: {
      ownerUserId: consent.guardianUserId,
      actorUserId: wardUserId,
      title,
      body
    }
  });

  ssePublish(consent.guardianUserId, {
    type: "vlue-family-bank-consent-response",
    linkId,
    accepted: accept,
    isAccountAgreed: accept,
    title,
    body
  });

  return { ok: true, consent: updated, isAccountAgreed: accept };
}

/** 입출금 — 오픈뱅킹·네이티브·수동 공통 */
export async function recordChildBankTransaction(
  wardUserId: string,
  input: ChildBankTransaction | Omit<ChildBankTransaction, "wardUserId">
) {
  const links = await getGuardianChildLinks(wardUserId);
  if (!links.length) {
    return { ok: true, notified: 0, isAccountAgreed: false, reason: "no_child_link" };
  }

  const consent = await getAcceptedBankConsentForWard(wardUserId);
  const isAccountAgreed = consent?.status === "accepted";
  if (input.requireConsent !== false && !isAccountAgreed) {
    console.info("[family-bank] consent_required", {
      wardUserId,
      source: input.source || "manual",
      externalTransactionId: input.externalTransactionId || null
    });
    return {
      ok: true,
      notified: 0,
      isAccountAgreed: false,
      reason: "consent_required",
      message: "자녀 계좌 모니터링 동의(isAccountAgreed)가 필요합니다."
    };
  }

  const scopes = parseScopes(consent?.scopesJson);
  const amount = Math.abs(Math.floor(Number(input.amountKrw) || 0));
  if (amount <= 0) {
    return { ok: false, error: "amountKrw 필요", isAccountAgreed };
  }

  const direction = input.direction === "in" ? "in" : "out";
  const unknown = await resolveIsUnknownPayeeForWard(
    wardUserId,
    input.counterpartyName,
    input.counterpartyMasked,
    scopes,
    input.isUnknownPayee
  );
  const name = await wardDisplayName(wardUserId);

  let tx;
  try {
    tx = await familyProtectionDb.familyBankTransaction.create({
      data: {
        wardUserId,
        linkId: consent?.linkId || links[0]?.id || null,
        amountKrw: amount,
        direction,
        counterpartyName: input.counterpartyName || null,
        counterpartyMasked: input.counterpartyMasked || null,
        isUnknownPayee: unknown,
        source: input.source || "manual"
      }
    });
  } catch {
    return { ok: false, error: "거래 저장 실패", isAccountAgreed };
  }

  let notified = 0;
  const filterReasons: string[] = [];

  for (const link of links) {
    const settings = await getOrCreateFamilySettings(link.guardianUserId);
    const cfg = mergeLinkAlertConfig(link, settings);
    if (!cfg.childBankEnabled) {
      filterReasons.push("child_bank_disabled");
      continue;
    }

    const threshold = scopes.thresholdKrw ?? cfg.childBankThresholdKrw ?? 10000;
    const allTx = scopes.allTransactions ?? cfg.childBankAllTx;
    const unknownAlert = scopes.unknownPayeeAlert ?? cfg.childUnknownPayeeEnabled;

    const overThreshold = amount >= threshold;
    const shouldNotify = allTx || overThreshold || (unknownAlert && unknown);

    if (!shouldNotify) {
      const reason =
        !allTx && !overThreshold ? "below_threshold" : unknownAlert ? "known_payee" : "filtered";
      filterReasons.push(reason);
      console.info("[family-bank] transaction_logged_no_notify", {
        wardUserId,
        guardianUserId: link.guardianUserId,
        amount,
        direction,
        threshold,
        allTx,
        isUnknownPayee: unknown,
        filterReason: reason,
        source: input.source || "manual",
        externalTransactionId: input.externalTransactionId || null
      });
      continue;
    }

    const dirKo = direction === "in" ? "입금" : "출금";
    const who = input.counterpartyName || input.counterpartyMasked || "상대 미상";
    const title = "[가족 보호] 계좌 " + dirKo;
    const body = `${name} 님 계좌 ${dirKo} ${amount.toLocaleString("ko-KR")}원 (${who})${unknown ? " · 미등록 상대" : ""}.`;

    const r = await createFamilyAlertAndNotifyGuardians({
      wardUserId,
      kind: "child_bank_transaction",
      title,
      body,
      guardianUserIds: [link.guardianUserId],
      payload: {
        transactionId: tx.id,
        amount,
        direction,
        isUnknown: unknown,
        isAccountAgreed: true,
        thresholdKrw: threshold
      }
    });
    if (!r.skippedCooldown) {
      notified += r.alerted;
      if (r.alerted > 0) {
        const who = input.counterpartyName || input.counterpartyMasked || "";
        const push =
          unknown && unknownAlert
            ? fcmMessageChildBankUnknownPayee(who)
            : fcmMessageChildBankThreshold(amount);
        void pushFamilyProtectionFcmToGuardians([link.guardianUserId], push.title, push.body, {
          wardUserId,
          transactionId: tx.id,
          direction,
          ...push.data
        });
      }
    }
  }

  return {
    ok: true,
    transactionId: tx.id,
    notified,
    isAccountAgreed: true,
    isUnknownPayee: unknown,
    filterReasons: notified ? [] : filterReasons
  };
}

export async function listBankConsentsForUser(userId: string) {
  try {
    const asGuardian = await familyProtectionDb.familyBankConsent.findMany({
      where: { guardianUserId: userId },
      orderBy: { requestedAt: "desc" }
    });
    const asWard = await familyProtectionDb.familyBankConsent.findMany({
      where: { wardUserId: userId, status: "pending" },
      orderBy: { requestedAt: "desc" }
    });
    const accepted = await familyProtectionDb.familyBankConsent.findFirst({
      where: { wardUserId: userId, status: "accepted" }
    });
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
