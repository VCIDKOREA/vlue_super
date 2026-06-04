import { prisma } from "../../db/client.js";
import { ssePublish } from "../../realtime/sseHub.js";

export async function listEnterpriseMemberUserIds(enterpriseId: string): Promise<string[]> {
  const ent = await prisma.b2BEnterpriseAccount.findUnique({
    where: { id: enterpriseId },
    select: { adminUserId: true }
  });
  if (!ent) return [];

  const members = await prisma.user.findMany({
    where: {
      OR: [{ id: ent.adminUserId }, { enterpriseGroupId: ent.adminUserId }]
    },
    select: { id: true }
  });
  return members.map((m) => m.id);
}

export async function ssePublishEnterpriseGroup(
  enterpriseId: string,
  event: Record<string, unknown>
) {
  const ids = await listEnterpriseMemberUserIds(enterpriseId);
  for (const uid of ids) {
    ssePublish(uid, event);
  }
}

export type GroupChatMessagePayload = {
  id: string;
  chatId: string;
  content: string;
  isSystem: boolean;
  createdAt: string;
  sender: { id: string | null; name: string; role: string };
};

export async function broadcastGroupChatMessage(
  enterpriseId: string,
  message: GroupChatMessagePayload
) {
  await ssePublishEnterpriseGroup(enterpriseId, {
    type: "enterprise-group-chat",
    enterpriseId,
    message
  });
}
