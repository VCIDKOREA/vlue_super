import { Hono } from "hono";
import { requireAdminConsoleBearer } from "../middleware/adminConsoleGate.js";
import {
  listPendingGroupAccountReviews,
  reviewGroupAccountOnCard
} from "../services/dcc/groupAccountReviewService.js";

/** 관리자 — 모임/단체 계좌 승인 큐 */
export const groupAccountAdminRoutes = new Hono<{
  Variables: { adminConsoleUser: { id: string } };
}>();

groupAccountAdminRoutes.use("*", requireAdminConsoleBearer);

groupAccountAdminRoutes.get("/pending", async (c) => {
  const items = await listPendingGroupAccountReviews(80);
  return c.json({ ok: true, items });
});

groupAccountAdminRoutes.post("/:cardId/review", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    action?: string;
    adminNote?: string;
  };
  const action = body.action === "reject" ? "reject" : "approve";
  try {
    const result = await reviewGroupAccountOnCard({
      cardId: c.req.param("cardId"),
      action,
      adminNote: body.adminNote
    });
    return c.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "처리 실패";
    const status = msg === "CARD_NOT_FOUND" ? 404 : 400;
    const map: Record<string, string> = {
      CARD_ID_REQUIRED: "카드 ID가 필요합니다.",
      CARD_NOT_FOUND: "명함을 찾을 수 없습니다.",
      NOT_GROUP_ACCOUNT: "모임/단체 계좌 신청이 아닙니다."
    };
    return c.json({ error: map[msg] || msg }, status);
  }
});
