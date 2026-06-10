import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  activateVmingUnlimitedByPayment,
  allowVmingRequest,
  getVmingUserStatus,
  purchaseVmingUnlimited,
  type FeatureType
} from "../services/vming/vmingUsageService.js";

function blockedReasonForFeature(featureType: FeatureType, gateCode: string) {
  const isChatSoftLimit =
    gateCode === "SOFT_LIMIT_REACHED" ||
    gateCode === "FREE_MINUTE_RATE_LIMIT" ||
    gateCode === "DAILY_CHAT_CALL_LIMIT_EXCEEDED";
  if (isChatSoftLimit) return "DAILY_CHAT_EXCEEDED";
  if (featureType === "room_command" || featureType === "post_desc" || featureType === "web_excel") {
    return "PROJECT_LIMIT_EXCEEDED";
  }
  return "GENERAL_LIMIT_EXCEEDED";
}

export const vmingRoutes = new Hono();

vmingRoutes.use("*", requireUserHeader);

vmingRoutes.get("/user/vming-status", async (c) => {
  const userId = c.get("vlueUserId") as string;
  const status = await getVmingUserStatus(userId);
  return c.json({ ok: true, ...status });
});

vmingRoutes.post("/user/vming-unlimited/purchase", async (c) => {
  const userId = c.get("vlueUserId") as string;
  const purchased = await purchaseVmingUnlimited(userId);
  return c.json({
    ok: true,
    message: "⚡ 브이밍 무제한 패키지 결제가 완료되었습니다.",
    ...purchased
  });
});

/** AI 기능 선체크(카운터 미증가) — 엑셀/post_desc 등 작업 시작 전 */
vmingRoutes.post("/feature/check", async (c) => {
  const userId = c.get("vlueUserId") as string;
  const body = (await c.req.json<{ featureType?: FeatureType; message?: string; roomId?: string }>().catch(
    () => ({})
  )) as { featureType?: FeatureType; message?: string; roomId?: string };
  const featureType: FeatureType = body.featureType || "web_excel";
  const gate = await allowVmingRequest({
    userId,
    roomId: body.roomId,
    intentType: "general_chat",
    featureType,
    message: body.message || "feature-check",
    dryRun: true
  });
  if (!gate.allowed) {
    const blockedReasonType = blockedReasonForFeature(featureType, gate.code);
    return c.json(
      {
        ok: false,
        code: gate.code,
        blocked_reason_type: blockedReasonType,
        message:
          blockedReasonType === "DAILY_CHAT_EXCEEDED"
            ? `오늘 저와 나눌 수 있는 무료 대화 용량을 모두 소모하셨어요! 💬 
오늘의 이야기는 아쉽게 공식 종료되지만, 내일 오전 0시(자정)가 되면 새로운 대화 용량이 가득 충전되니 내일 다시 시도해 주세요!

만약 내일까지 기다리지 않고 지금 바로 멈춤 없는 대화를 이어가거나, 대화방 요약·AI 엑셀 제작 등 심도 깊은 프로젝트 전용 기능을 제한 없이 담당하게 하고 싶으시다면 아래 링크를 확인해 보세요!`
            : "오늘 제공된 무료 체험 한도를 모두 소모하셨습니다. 환율 상승에도 부담 없는 가격! 월 4,900원 무제한 패키지로 VLUE의 모든 AI 기능을 제한 없이 고용해 보세요!",
        openUnlimitedPurchase: true
      },
      429
    );
  }
  return c.json({ ok: true, tier: gate.tier, featureType });
});

vmingRoutes.post("/user/vming-unlimited/confirm", async (c) => {
  const userId = c.get("vlueUserId") as string;
  const body: { merchantUid?: string; impUid?: string; provider?: string } = await c.req
    .json<{ merchantUid?: string; impUid?: string; provider?: string }>()
    .catch(() => ({} as { merchantUid?: string; impUid?: string; provider?: string }));
  const confirmed = await activateVmingUnlimitedByPayment({
    userId,
    merchantUid: body.merchantUid,
    impUid: body.impUid,
    provider: body.provider || "manual_confirm"
  });
  return c.json({
    message: "⚡ 결제 확인 완료. 무제한 패키지가 활성화되었습니다.",
    ...confirmed
  });
});
