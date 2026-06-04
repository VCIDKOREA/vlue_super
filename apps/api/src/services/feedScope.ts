import { prisma } from "../db/client.js";
import { cardActor } from "../middleware/cardGate.js";

export type FeedAppMode = "personal" | "office";

/**
 * 개인 모드: 소유 모바일 명함 우선, 없으면 소유 카드 중 첫 번째.
 * 직장내선: 활성 카드 ID 필수 + 멤버/소유자만.
 */
export async function resolveScopedCardForViewer(
  userId: string,
  mode: FeedAppMode,
  activeOfficeCardId: string | null | undefined
): Promise<
  | { ok: true; cardId: string }
  | { ok: false; error: string; status: 400 | 403 | 404 }
> {
  if (mode === "office") {
    const cid = activeOfficeCardId?.trim();
    if (!cid) {
      return {
        ok: false,
        error: "직장내선 모드에서는 X-VLUE-Active-Card-Id 헤더가 필요합니다.",
        status: 400
      };
    }
    const actor = await cardActor(userId, cid);
    if (actor === "none") {
      return { ok: false, error: "해당 명함 피드에 접근할 수 없습니다.", status: 403 };
    }
    return { ok: true, cardId: cid };
  }

  const mobile = await prisma.businessCard.findFirst({
    where: { userId, kind: "mobile", verificationStatus: "approved" },
    orderBy: { createdAt: "asc" },
    select: { id: true }
  });
  if (mobile) return { ok: true, cardId: mobile.id };

  const anyOwned = await prisma.businessCard.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true }
  });
  if (anyOwned) return { ok: true, cardId: anyOwned.id };

  return { ok: false, error: "등록된 명함이 없어 피드 범위를 정할 수 없습니다.", status: 404 };
}
