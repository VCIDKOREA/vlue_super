import { randomInt } from "node:crypto";
import { prisma } from "../../db/client.js";
import { probeCorporateEmailDeliverability } from "../enterprise/corporateMailService.js";
import { revokePersonalComboBenefit } from "./personalComboMembershipService.js";
import { koreaDateKey } from "./subscriptionBilling.js";

export type PersonalComboReverifyOptions = {
  asOf?: Date;
  dryRun?: boolean;
  limit?: number;
};

export type PersonalComboReverifySummary = {
  asOfDateKst: string;
  scanned: number;
  revoked: number;
  extended: number;
  skippedDryRun: number;
  results: Array<Record<string, unknown>>;
};

function randomReverifyDays(): number {
  return randomInt(30, 91);
}

/**
 * 30~90일 주기 회사 메일 재확인 — 퇴사자 콤보 혜택 자동 회수
 * 개인 사생활 데이터(게시물·채팅 등)는 건드리지 않음
 */
export async function runPersonalComboReverificationBatch(
  opts: PersonalComboReverifyOptions = {}
): Promise<PersonalComboReverifySummary> {
  const asOf = opts.asOf ?? new Date();
  const limit = Math.min(500, Math.max(1, opts.limit ?? 200));

  const candidates = await prisma.user.findMany({
    where: {
      isEnterpriseVerified: true,
      enterpriseVerifyNextCheckAt: { lte: asOf }
    },
    take: limit,
    orderBy: { enterpriseVerifyNextCheckAt: "asc" },
    select: {
      id: true,
      enterpriseVerifiedEmail: true,
      enterpriseVerifyNextCheckAt: true
    }
  });

  const summary: PersonalComboReverifySummary = {
    asOfDateKst: koreaDateKey(asOf),
    scanned: candidates.length,
    revoked: 0,
    extended: 0,
    skippedDryRun: 0,
    results: []
  };

  for (const user of candidates) {
    const email = user.enterpriseVerifiedEmail?.trim();
    if (!email) {
      if (opts.dryRun) {
        summary.skippedDryRun += 1;
        summary.results.push({ userId: user.id, action: "revoke_no_email", dryRun: true });
        continue;
      }
      await revokePersonalComboBenefit(user.id, "enterprise_email_missing");
      summary.revoked += 1;
      summary.results.push({ userId: user.id, action: "revoked", reason: "enterprise_email_missing" });
      continue;
    }

    if (opts.dryRun) {
      summary.skippedDryRun += 1;
      summary.results.push({
        userId: user.id,
        email,
        action: "would_probe",
        dryRun: true
      });
      continue;
    }

    const deliverable = await probeCorporateEmailDeliverability(email);
    if (!deliverable) {
      await revokePersonalComboBenefit(user.id, "enterprise_mail_unreachable");
      summary.revoked += 1;
      summary.results.push({ userId: user.id, email, action: "revoked", reason: "enterprise_mail_unreachable" });
      continue;
    }

    const nextCheck = new Date(asOf);
    nextCheck.setDate(nextCheck.getDate() + randomReverifyDays());

    await prisma.user.update({
      where: { id: user.id },
      data: { enterpriseVerifyNextCheckAt: nextCheck }
    });
    summary.extended += 1;
    summary.results.push({
      userId: user.id,
      email,
      action: "extended",
      nextReverifyAt: nextCheck.toISOString()
    });
  }

  console.info("[personal-combo-reverify]", JSON.stringify({
    asOf: summary.asOfDateKst,
    scanned: summary.scanned,
    revoked: summary.revoked,
    extended: summary.extended
  }));

  return summary;
}
