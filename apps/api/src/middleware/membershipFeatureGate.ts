import type { Context } from "hono";
import { assertPrimaryFeatureAccess } from "../services/membership/membershipAccessService.js";

export async function gateChatAccess(c: Context, userId: string) {
  try {
    await assertPrimaryFeatureAccess(userId, "chat");
    return null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "채팅 이용 권한이 없습니다.";
    return c.json({ error: msg, code: "MEMBERSHIP_CHAT_REQUIRED" }, 403);
  }
}

export async function gateShoppingAccess(c: Context, userId: string) {
  try {
    await assertPrimaryFeatureAccess(userId, "shopping");
    return null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "쇼핑 이용 권한이 없습니다.";
    return c.json({ error: msg, code: "MEMBERSHIP_SHOPPING_REQUIRED" }, 403);
  }
}
