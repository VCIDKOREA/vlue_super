import { Hono } from "hono";
import { prisma } from "../db/client.js";
import { requireUserHeader } from "../middleware/cardGate.js";

export const walletRoutes = new Hono();

async function rewardPointsBalance(userId: string): Promise<number> {
  try {
    const rows = await prisma.commissionLedger.aggregate({
      where: {
        vluerUserId: userId,
        payoutMode: "reward_only",
        blockedReason: null
      },
      _sum: { commissionKrw: true }
    });
    return Math.max(0, rows._sum.commissionKrw ?? 0);
  } catch {
    return 0;
  }
}

walletRoutes.get("/me", requireUserHeader, async (c) => {
  const userId = c.get("vlueUserId") as string;
  const account = await prisma.walletAccount.upsert({
    where: { userId },
    update: {},
    create: { userId, balanceCash: 0 }
  });
  const balanceRewardPoints = await rewardPointsBalance(userId);
  const ledger = await prisma.walletLedger.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30
  });
  const withdrawalAccount = await prisma.walletWithdrawalAccount.findUnique({
    where: { userId }
  });
  return c.json({
    account,
    balanceCash: account.balanceCash,
    balanceRewardPoints,
    ledger,
    withdrawableMinCash: 10000,
    withdrawalAccount: withdrawalAccount
      ? {
          bankCode: withdrawalAccount.bankCode,
          bankName: withdrawalAccount.bankName,
          accountNumberMasked: maskAccountNumber(withdrawalAccount.accountNumber),
          accountHolder: withdrawalAccount.accountHolder
        }
      : null
  });
});

walletRoutes.get("/withdrawal-account", requireUserHeader, async (c) => {
  const userId = c.get("vlueUserId") as string;
  const row = await prisma.walletWithdrawalAccount.findUnique({ where: { userId } });
  if (!row) return c.json({ account: null });
  return c.json({
    account: {
      bankCode: row.bankCode,
      bankName: row.bankName,
      accountNumber: row.accountNumber,
      accountHolder: row.accountHolder
    }
  });
});

walletRoutes.put("/withdrawal-account", requireUserHeader, async (c) => {
  const userId = c.get("vlueUserId") as string;
  const body = await c.req.json().catch(() => ({}));
  const bankCode = String(body.bankCode || "").trim();
  const bankName = String(body.bankName || "").trim();
  const accountNumber = String(body.accountNumber || "").replace(/\s/g, "");
  const accountHolder = String(body.accountHolder || "").trim();

  if (!bankCode || !bankName || accountNumber.length < 8 || !accountHolder) {
    return c.json({ error: "은행·계좌번호·예금주를 모두 입력해 주세요." }, 400);
  }

  const row = await prisma.walletWithdrawalAccount.upsert({
    where: { userId },
    update: { bankCode, bankName, accountNumber, accountHolder },
    create: { userId, bankCode, bankName, accountNumber, accountHolder }
  });

  return c.json({
    ok: true,
    account: {
      bankCode: row.bankCode,
      bankName: row.bankName,
      accountNumber: row.accountNumber,
      accountHolder: row.accountHolder
    }
  });
});

walletRoutes.post("/deposit-request", requireUserHeader, async (c) => {
  const userId = c.get("vlueUserId") as string;
  const body = await c.req.json().catch(() => ({}));
  const amountKrw = Math.floor(Number(body.amountKrw) || 0);
  if (amountKrw < 1000) {
    return c.json({ error: "입금 신청 금액은 1,000원 이상입니다." }, 400);
  }

  const account = await prisma.walletAccount.upsert({
    where: { userId },
    update: {},
    create: { userId, balanceCash: 0 }
  });

  await prisma.walletLedger.create({
    data: {
      walletAccountId: account.id,
      userId,
      amountCash: 0,
      entryType: "credit",
      note: `입금신청 ${amountKrw.toLocaleString("ko-KR")}원${body.note ? ` · ${String(body.note).slice(0, 80)}` : ""}`
    }
  });

  return c.json({
    ok: true,
    message: "입금 신청이 접수되었습니다. 확인 후 잔액에 반영됩니다."
  });
});

walletRoutes.post("/withdrawal-request", requireUserHeader, async (c) => {
  const userId = c.get("vlueUserId") as string;
  const body = await c.req.json().catch(() => ({}));
  const amountKrw = Math.floor(Number(body.amountKrw) || 0);

  const bank = await prisma.walletWithdrawalAccount.findUnique({ where: { userId } });
  if (!bank) {
    return c.json({ error: "출금 계좌를 먼저 등록해 주세요." }, 400);
  }
  if (amountKrw < 10000) {
    return c.json({ error: "출금 신청은 10,000원 이상입니다." }, 400);
  }

  const result = await prisma
    .$transaction(async (tx) => {
      const account = await tx.walletAccount.upsert({
        where: { userId },
        update: {},
        create: { userId, balanceCash: 0 }
      });
      if (account.balanceCash < amountKrw) {
        throw new Error("출금 가능 잔액이 부족합니다.");
      }
      const updated = await tx.walletAccount.update({
        where: { id: account.id },
        data: { balanceCash: account.balanceCash - amountKrw }
      });
      await tx.walletLedger.create({
        data: {
          walletAccountId: account.id,
          userId,
          amountCash: -amountKrw,
          entryType: "withdrawal",
          note: `출금신청 ${amountKrw.toLocaleString("ko-KR")}원 → ${bank.bankName} ${maskAccountNumber(bank.accountNumber)}`
        }
      });
      return { balanceCash: updated.balanceCash };
    })
    .catch((e: Error) => ({ error: e.message }));

  if ("error" in result) return c.json({ error: result.error }, 400);
  return c.json({
    ok: true,
    message: "출금 신청이 접수되었습니다. 등록 계좌로 송금 처리됩니다.",
    balanceCash: result.balanceCash
  });
});

walletRoutes.post("/withdraw-all", requireUserHeader, async (c) => {
  const userId = c.get("vlueUserId") as string;
  const result = await prisma
    .$transaction(async (tx) => {
      const account = await tx.walletAccount.upsert({
        where: { userId },
        update: {},
        create: { userId, balanceCash: 0 }
      });
      if (account.balanceCash < 10000) {
        throw new Error("출금 가능 최소 금액은 10,000원입니다.");
      }
      const amount = account.balanceCash;
      const updated = await tx.walletAccount.update({
        where: { id: account.id },
        data: { balanceCash: 0 }
      });
      await tx.walletLedger.create({
        data: {
          walletAccountId: account.id,
          userId,
          amountCash: -amount,
          entryType: "withdrawal",
          note: "1만원 이상 전액 출금"
        }
      });
      return { withdrawnCash: amount, balanceCash: updated.balanceCash };
    })
    .catch((e: Error) => ({ error: e.message }));

  if ("error" in result) return c.json({ error: result.error }, 400);
  return c.json({ ok: true, ...result });
});

function maskAccountNumber(num: string) {
  const s = String(num || "");
  if (s.length <= 4) return "****";
  return `${"*".repeat(Math.max(0, s.length - 4))}${s.slice(-4)}`;
}
