import { prisma } from "../../db/client.js";
import { loadEnterpriseUserContext, requireEnterpriseContext } from "../enterprise/enterpriseContext.js";
import { broadcastGroupChatMessage } from "./enterpriseRealtime.js";
import { ensureEnterpriseGroupChatIfReady } from "./enterpriseGroupChatBootstrap.js";

export type SerializedChatMessage = {
  id: string;
  content: string;
  isSystem: boolean;
  createdAt: Date | string;
  sender: { id: string | null; name: string; role: string };
};

export function serializeChatMessage(
  m: { id: string; content: string; isSystem: boolean; createdAt: Date; senderId: string | null },
  senderMap: Map<string, { legalName: string | null; publicHandle: string | null; enterpriseRole: string | null }>
): SerializedChatMessage {
  return {
    id: m.id,
    content: m.content,
    isSystem: m.isSystem,
    createdAt: m.createdAt,
     sender: m.senderId
      ? {
          id: m.senderId,
          name:
            senderMap.get(m.senderId)?.legalName ||
            senderMap.get(m.senderId)?.publicHandle ||
            "직원",
          role: senderMap.get(m.senderId)?.enterpriseRole || "STAFF"
        }
      : { id: null, name: "VLUE 시스템", role: "SYSTEM" }
  };
}

export async function listGroupChatMessages(viewerUserId: string, limit = 80) {
  const ctx = await requireEnterpriseContext(viewerUserId);
  if (!ctx.enterpriseId) throw new Error("기업 채팅방 없음");

  await ensureEnterpriseGroupChatIfReady(ctx.enterpriseId);

  const chat = await prisma.enterpriseGroupChat.findUnique({
    where: { enterpriseId: ctx.enterpriseId }
  });
  if (!chat) return { chatId: null, messages: [] };

  const messages = await prisma.enterpriseGroupChatMessage.findMany({
    where: { chatId: chat.id },
    orderBy: { createdAt: "asc" },
    take: limit
  });

  const senderIds = messages.map((m) => m.senderId).filter(Boolean) as string[];
  const senders =
    senderIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: senderIds } },
          select: { id: true, legalName: true, publicHandle: true, enterpriseRole: true }
        })
      : [];
  const senderMap = new Map(senders.map((s) => [s.id, s]));

  return {
    chatId: chat.id,
    title: chat.title,
    messages: messages.map((m) => serializeChatMessage(m, senderMap))
  };
}

export async function postGroupChatMessage(senderUserId: string, contentRaw: string) {
  const ctx = await requireEnterpriseContext(senderUserId);
  if (!ctx.enterpriseId) throw new Error("기업 채팅방 없음");

  const content = String(contentRaw || "").trim();
  if (!content) throw new Error("메시지를 입력해 주세요.");
  if (content.length > 4000) throw new Error("메시지가 너무 깁니다.");

  await ensureEnterpriseGroupChatIfReady(ctx.enterpriseId);

  const chat = await prisma.enterpriseGroupChat.findUnique({
    where: { enterpriseId: ctx.enterpriseId }
  });
  if (!chat) throw new Error("채팅방이 없습니다. 회선 등록을 완료해 주세요.");

  const msg = await prisma.enterpriseGroupChatMessage.create({
    data: {
      chatId: chat.id,
      senderId: senderUserId,
      content,
      isSystem: false
    }
  });

  const sender = await prisma.user.findUnique({
    where: { id: senderUserId },
    select: { id: true, legalName: true, publicHandle: true, enterpriseRole: true }
  });
  const senderMap = new Map(sender ? [[sender.id, sender]] : []);
  const serialized = serializeChatMessage(msg, senderMap);

  await broadcastGroupChatMessage(ctx.enterpriseId, {
    id: serialized.id,
    chatId: chat.id,
    content: serialized.content,
    isSystem: serialized.isSystem,
    createdAt:
      serialized.createdAt instanceof Date
        ? serialized.createdAt.toISOString()
        : String(serialized.createdAt),
    sender: serialized.sender
  });

  return serialized;
}
