import { prisma } from "../../db/client.js";
import { B2B_MIN_LINES } from "../vluer/pricingConstants.js";
import { normalizeToE164KR } from "../../lib/phoneE164.js";
import { broadcastGroupChatMessage } from "./enterpriseRealtime.js";

function linesComplete(lines: { assigneeName: string; realCliPhoneE164: string }[]) {
  if (lines.length < B2B_MIN_LINES) return false;
  return lines.every(
    (l) => l.assigneeName.trim().length >= 1 && l.realCliPhoneE164.replace(/\D/g, "").length >= 9
  );
}

/** 회선·계정 등록이 목표치에 도달하면 사내 그룹 채팅방 자동 개설 */
export async function ensureEnterpriseGroupChatIfReady(enterpriseId: string) {
  const ent = await prisma.b2BEnterpriseAccount.findUnique({
    where: { id: enterpriseId },
    include: { cartLines: { orderBy: { sortOrder: "asc" } }, groupChat: true }
  });
  if (!ent) return { ready: false as const, reason: "no_enterprise" };

  const target = Math.max(B2B_MIN_LINES, ent.plannedLineCount ?? ent.cartLines.length);
  const lines = ent.cartLines;

  if (lines.length < target || !linesComplete(lines)) {
    return {
      ready: false as const,
      reason: "incomplete",
      lineCount: lines.length,
      target
    };
  }

  const existing = ent.groupChat;
  const chat = await prisma.enterpriseGroupChat.upsert({
    where: { enterpriseId: ent.id },
    create: { enterpriseId: ent.id, title: `${ent.companyName} 사내` },
    update: { title: `${ent.companyName} 사내` }
  });

  let welcomePosted = false;
  if (!existing) {
    const welcome = await prisma.enterpriseGroupChatMessage.create({
      data: {
        chatId: chat.id,
        senderId: null,
        isSystem: true,
        content: `[VLUE] ${ent.companyName} 사내 그룹 채팅방이 개설되었습니다.\n회선 ${lines.length}명 등록 완료 · 비품·업무 공지는 이곳에서 확인하세요.`
      }
    });
    await broadcastGroupChatMessage(ent.id, {
      id: welcome.id,
      chatId: chat.id,
      content: welcome.content,
      isSystem: true,
      createdAt: welcome.createdAt.toISOString(),
      sender: { id: null, name: "VLUE 시스템", role: "SYSTEM" }
    });
    welcomePosted = true;
    await prisma.b2BEnterpriseAccount.update({
      where: { id: ent.id },
      data: { groupChatActivatedAt: new Date() }
    });
    const { ssePublishEnterpriseGroup } = await import("./enterpriseRealtime.js");
    await ssePublishEnterpriseGroup(ent.id, {
      type: "enterprise-group-chat-ready",
      enterpriseId: ent.id,
      chatId: chat.id,
      title: chat.title
    });
  }

  return {
    ready: true as const,
    chatId: chat.id,
    created: !existing,
    welcomePosted,
    lineCount: lines.length
  };
}

export async function setEnterprisePlannedLineCount(enterpriseId: string, planned: number) {
  const n = Math.max(B2B_MIN_LINES, Math.floor(Number(planned) || B2B_MIN_LINES));
  await prisma.b2BEnterpriseAccount.update({
    where: { id: enterpriseId },
    data: { plannedLineCount: n }
  });
  return n;
}

export function normalizePhoneInput(raw: string) {
  return normalizeToE164KR(String(raw || "").trim());
}
