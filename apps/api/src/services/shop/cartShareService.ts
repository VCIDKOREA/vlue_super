import { prisma } from "../../db/client.js";
import { loadEnterpriseUserContext } from "../enterprise/enterpriseContext.js";
import { broadcastGroupChatMessage } from "../enterprise/enterpriseRealtime.js";
import {
  listEnterpriseProcurementCart,
  listPurchaseRequestsForEnterprise
} from "./shopOrderService.js";

function formatKrw(n: number) {
  return `${Math.max(0, n).toLocaleString("ko-KR")}원`;
}

export async function buildEnterpriseCartShareText(enterpriseId: string) {
  const ent = await prisma.b2BEnterpriseAccount.findUnique({
    where: { id: enterpriseId },
    select: { companyName: true }
  });
  const cart = await listEnterpriseProcurementCart(enterpriseId);
  const pending = await prisma.storePurchaseRequest.findMany({
    where: { enterpriseId, status: "PENDING" },
    orderBy: { createdAt: "asc" }
  });

  const lines: string[] = [
    `[VLUE] ${ent?.companyName || "사내"} — 이번 주 사내 비품 결제 전 최종 확인`,
    "",
    "■ 공용 장바구니"
  ];

  if (cart.length === 0) {
    lines.push("  (비어 있음)");
  } else {
    cart.forEach((row, i) => {
      lines.push(
        `  ${i + 1}. ${row.productName} ×${row.quantity} — ${formatKrw(row.unitPriceKrw * row.quantity)} · ${row.addedByName}${row.addedByDept ? ` (${row.addedByDept})` : ""}`
      );
    });
  }

  lines.push("", "■ 직원 구매 요청 (대기)");
  if (pending.length === 0) {
    lines.push("  (없음)");
  } else {
    pending.forEach((row, i) => {
      lines.push(
        `  ${i + 1}. ${row.productName} ×${row.quantity} — ${row.requestedByName}${row.requestedByDept ? ` / ${row.requestedByDept}` : ""}`
      );
    });
  }

  lines.push("", "경리·대표 계정에서 최종 결제 전 누락·중복을 확인해 주세요.");

  return lines.join("\n");
}

export async function shareEnterpriseCartToGroupChat(buyerUserId: string) {
  const ctx = await loadEnterpriseUserContext(buyerUserId);
  if (!ctx?.enterpriseId) throw new Error("기업 소속이 아닙니다.");
  if (!["MASTER", "MANAGER", "BUYER"].includes(ctx.enterpriseRole)) {
    throw new Error("장바구니 공유는 경리·대표 계정만 가능합니다.");
  }

  const chat = await prisma.enterpriseGroupChat.findUnique({
    where: { enterpriseId: ctx.enterpriseId }
  });
  if (!chat) throw new Error("기업 그룹 채팅방이 없습니다.");

  const content = await buildEnterpriseCartShareText(ctx.enterpriseId);

  const msg = await prisma.enterpriseGroupChatMessage.create({
    data: {
      chatId: chat.id,
      senderId: null,
      content,
      isSystem: true
    }
  });

  await broadcastGroupChatMessage(ctx.enterpriseId, {
    id: msg.id,
    chatId: chat.id,
    content: msg.content,
    isSystem: true,
    createdAt: msg.createdAt.toISOString(),
    sender: { id: null, name: "VLUE 시스템", role: "SYSTEM" }
  });

  return { chatId: chat.id, messageId: msg.id, content };
}

export async function listEnterpriseGroupChatMessages(viewerUserId: string, limit = 50) {
  const ctx = await loadEnterpriseUserContext(viewerUserId);
  if (!ctx?.enterpriseId) throw new Error("기업 소속이 아닙니다.");

  const chat = await prisma.enterpriseGroupChat.findUnique({
    where: { enterpriseId: ctx.enterpriseId }
  });
  if (!chat) return [];

  return prisma.enterpriseGroupChatMessage.findMany({
    where: { chatId: chat.id },
    orderBy: { createdAt: "desc" },
    take: limit
  });
}

export async function getEnterpriseDashboard(viewerUserId: string) {
  const ctx = await loadEnterpriseUserContext(viewerUserId);
  if (!ctx) return { enterprise: null };

  const ent = ctx.enterpriseId
    ? await prisma.b2BEnterpriseAccount.findUnique({
        where: { id: ctx.enterpriseId },
        select: {
          id: true,
          companyName: true,
          corporateWalletBalanceKrw: true,
          corporateCardLast4: true,
          corporateCardRegisteredAt: true
        }
      })
    : null;

  const pendingRequests =
    ctx.enterpriseId && ["MASTER", "MANAGER", "BUYER"].includes(ctx.enterpriseRole)
      ? await listPurchaseRequestsForEnterprise(viewerUserId, "PENDING")
      : [];

  const myRequests =
    ctx.enterpriseRole === "STAFF"
      ? await listPurchaseRequestsForEnterprise(viewerUserId)
      : [];

  const cart =
    ctx.enterpriseId && ["MASTER", "MANAGER", "BUYER"].includes(ctx.enterpriseRole)
      ? await listEnterpriseProcurementCart(ctx.enterpriseId)
      : [];

  return {
    enterprise: ent,
    role: ctx.enterpriseRole,
    lineType: ctx.lineType,
    dept: ctx.enterpriseDept,
    pendingRequestCount: pendingRequests.length,
    pendingRequests,
    myRequests,
    procurementCart: cart
  };
}
