import { prisma } from "../../db/client.js";
import { ssePublish } from "../../realtime/sseHub.js";

export type ChatSseMessagePayload = {
  id: string;
  roomId: string;
  senderId: string | null;
  senderCardId?: string | null;
  content: string;
  messageType: string;
  createdAt: string;
  senderName?: string | null;
};

function orderedParticipants(a: string, b: string) {
  return a < b ? { low: a, high: b } : { low: b, high: a };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 클라이언트 roomId(friends:uuid) 또는 서버 UUID → 서버 채팅방 */
export async function resolveServerChatRoom(userId: string, clientOrServerRoomId: string) {
  const raw = String(clientOrServerRoomId || "").trim();
  if (!raw) return null;

  if (UUID_RE.test(raw)) {
    const room = await prisma.chatRoom.findUnique({ where: { id: raw } });
    if (!room || (room.participantLow !== userId && room.participantHigh !== userId)) return null;
    const peerId = room.participantLow === userId ? room.participantHigh : room.participantLow;
    return { serverRoomId: room.id, peerId, participantLow: room.participantLow, participantHigh: room.participantHigh };
  }

  const m = /^friends:(.+)$/i.exec(raw);
  if (!m) return null;
  const peerId = m[1].trim();
  if (!UUID_RE.test(peerId)) return null;

  const { low, high } = orderedParticipants(userId, peerId);
  const room = await prisma.chatRoom.findFirst({
    where: { participantLow: low, participantHigh: high }
  });
  if (!room) return null;
  return { serverRoomId: room.id, peerId, participantLow: room.participantLow, participantHigh: room.participantHigh };
}

/** DM 참여자 양쪽에 실시간 채팅 메시지 SSE 푸시 */
export function publishChatMessageSse(input: {
  serverRoomId: string;
  participantLow: string;
  participantHigh: string;
  message: ChatSseMessagePayload;
}) {
  const { serverRoomId, participantLow, participantHigh, message } = input;
  for (const userId of [participantLow, participantHigh]) {
    const peerUserId = userId === participantLow ? participantHigh : participantLow;
    ssePublish(userId, {
      type: "vlue-chat-message",
      serverRoomId,
      peerUserId,
      message
    });
  }
}
