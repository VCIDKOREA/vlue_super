import type { AdminDevice } from "@prisma/client";
import "hono";

declare module "hono" {
  interface ContextVariableMap {
    vlueUserId: string;
    cardActor: "owner" | "member";
    feedPostJson: { cardId?: string; title?: string; body?: string };
    adminDevice: AdminDevice;
  }
}
