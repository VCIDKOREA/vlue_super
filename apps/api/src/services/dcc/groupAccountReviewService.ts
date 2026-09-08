import { prisma } from "../../db/client.js";

type Snap = Record<string, unknown>;

function asSnap(raw: unknown): Snap {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Snap;
  return {};
}

function text(v: unknown, max = 200): string {
  return String(v ?? "").trim().slice(0, max);
}

export type GroupAccountPendingItem = {
  id: string;
  cardId: string;
  userId: string;
  legalName: string;
  publicHandle: string;
  phoneE164: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  accountGroupDocName: string;
  organization: string;
  updatedAt: string | null;
};

/** 모임/단체 계좌 — isGroupVerified=false 인 DCC 스냅샷 대기 목록 */
export async function listPendingGroupAccountReviews(limit = 80): Promise<GroupAccountPendingItem[]> {
  const take = Math.min(100, Math.max(1, limit));
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      user_id: string;
      export_snapshot_json: unknown;
      updated_at: Date;
      legal_name: string | null;
      public_handle: string | null;
      phone_e164: string | null;
    }>
  >(
    `
      SELECT dc.id, dc.user_id, dc.export_snapshot_json, dc.updated_at,
             u.legal_name, u.public_handle, u.phone_e164
      FROM digital_cards dc
      INNER JOIN users u ON u.id = dc.user_id
      WHERE (dc.export_snapshot_json->>'accountType') = 'GROUP'
        AND COALESCE((dc.export_snapshot_json->>'isGroupVerified')::text, 'false') IN ('false', '0', '')
        AND NULLIF(TRIM(dc.export_snapshot_json->>'accountNumber'), '') IS NOT NULL
        AND NULLIF(TRIM(dc.export_snapshot_json->>'bankName'), '') IS NOT NULL
      ORDER BY dc.updated_at DESC
      LIMIT ${take};
    `
  );

  return rows.map((r) => {
    const s = asSnap(r.export_snapshot_json);
    return {
      id: r.id,
      cardId: r.id,
      userId: r.user_id,
      legalName: text(r.legal_name, 120),
      publicHandle: text(r.public_handle, 80),
      phoneE164: text(r.phone_e164, 24),
      bankName: text(s.bankName, 40),
      accountNumber: text(String(s.accountNumber || "").replace(/\D/g, ""), 30),
      accountHolder: text(s.accountHolder, 80),
      accountGroupDocName: text(s.accountGroupDocName, 200),
      organization: text(s.organization, 200),
      updatedAt: r.updated_at?.toISOString?.() || null
    };
  });
}

export async function reviewGroupAccountOnCard(input: {
  cardId: string;
  action: "approve" | "reject";
  adminNote?: string;
}) {
  const cardId = String(input.cardId || "").trim();
  if (!cardId) throw new Error("CARD_ID_REQUIRED");

  const card = await prisma.digitalCard.findUnique({
    where: { id: cardId },
    select: { id: true, userId: true, exportSnapshotJson: true }
  });
  if (!card) throw new Error("CARD_NOT_FOUND");

  const prev = asSnap(card.exportSnapshotJson);
  if (text(prev.accountType, 16) !== "GROUP") {
    throw new Error("NOT_GROUP_ACCOUNT");
  }

  const note = text(input.adminNote, 500);
  let next: Snap;
  if (input.action === "approve") {
    next = {
      ...prev,
      isGroupVerified: true,
      groupAccountReviewStatus: "approved",
      groupAccountAdminNote: note || ""
    };
  } else {
    next = {
      ...prev,
      isGroupVerified: false,
      groupAccountReviewStatus: "rejected",
      groupAccountAdminNote: note || "반려됨"
    };
  }

  await prisma.digitalCard.update({
    where: { id: cardId },
    data: { exportSnapshotJson: next as object }
  });

  return {
    cardId,
    userId: card.userId,
    reviewStatus: input.action === "approve" ? "approved" : "rejected",
    isGroupVerified: input.action === "approve"
  };
}
