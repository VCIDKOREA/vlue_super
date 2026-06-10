import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import { vmingConsentMiddleware, type AiChatVariables } from "../middleware/vmingConsentMiddleware.js";
import { handleVmingChat } from "../services/vming/vmingChatService.js";
import { maskNonConsentedUsers } from "../services/vming/consent/vmingConsentMask.js";
import { allowVmingRequest, analyzeVmingIntent, type FeatureType } from "../services/vming/vmingUsageService.js";
import {
  publishChatMessageSse,
  resolveServerChatRoom
} from "../services/chat/chatRealtime.js";
import { prisma } from "../db/client.js";

type AiVars = AiChatVariables & { vlueUserId: string };

export const aiRoutes = new Hono<{ Variables: AiVars }>();

aiRoutes.use("*", requireUserHeader);

aiRoutes.post("/chat", vmingConsentMiddleware, async (c) => {
  try {
    const userId = c.get("vlueUserId") as string;
    const body = c.get("aiChatBody") as {
      message?: string;
      history?: Array<{ role: string; text: string }>;
      quickReplyId?: string;
      type?: string;
      roomId?: string;
      chatLogs?: Array<{ user_id: string; user_name: string; content: string }>;
      hiddenCommand?: boolean;
    };
    const message = String(body.message || "").trim();
    if (!message) return c.json({ error: "message is required" }, 400);

    if (body.type === "calendar_parse") {
      const { parseCalendarNaturalLanguage } = await import("../services/calendar/calendarParseService.js");
      const parsed = await parseCalendarNaturalLanguage(message);
      return c.json({
        ok: true,
        reply: JSON.stringify(parsed.parsed),
        parsed: parsed.parsed,
        provider: parsed.provider,
        type: "calendar_parse"
      });
    }

    if (body.type === "memo_summary") {
      const { summarizeMemoText } = await import("../services/memo/personalMemoService.js");
      let summary = "";
      try {
        const ai = await handleVmingChat({
          userId,
          message: `다음 메모를 3줄로 요약해 주세요. 각 줄은 한 문장으로:\n\n${message}`,
          history: []
        });
        summary = String(ai.reply || "").trim();
      } catch {
        summary = await summarizeMemoText(message);
      }
      if (!summary) summary = await summarizeMemoText(message);
      return c.json({ ok: true, summary, type: "memo_summary" });
    }

    const maskedUserIds = c.get("maskedUserIds");
    let history = body.history || [];
    if (body.chatLogs?.length) {
      const masked = maskNonConsentedUsers(body.chatLogs, maskedUserIds);
      history = [
        ...history,
        ...masked.map((log) => ({
          role: "user",
          text: `[${log.user_name}]: ${log.content}`
        }))
      ];
    }

    const isHiddenVmingCommand = body.hiddenCommand === true || /^\/브이밍\s+/i.test(message);
    const commandText = isHiddenVmingCommand ? message.replace(/^\/브이밍\s+/i, "").trim() : message;
    const featureType: FeatureType = isHiddenVmingCommand
      ? "room_command"
      : body.type === "post_desc"
        ? "post_desc"
        : body.type === "web_excel"
          ? "web_excel"
          : "daily_chat";

    const intent = await analyzeVmingIntent(commandText || message);
    const gate = await allowVmingRequest({
      userId,
      roomId: body.roomId,
      intentType: intent.intent_type,
      featureType,
      message: commandText || message
    });
    if (!gate.allowed) {
      const isChatSoftLimit =
        gate.code === "SOFT_LIMIT_REACHED" ||
        gate.code === "FREE_MINUTE_RATE_LIMIT" ||
        gate.code === "DAILY_CHAT_CALL_LIMIT_EXCEEDED";
      const isProjectFeature =
        featureType === "room_command" || featureType === "post_desc" || featureType === "web_excel";
      const blockedReasonType = isChatSoftLimit
        ? "DAILY_CHAT_EXCEEDED"
        : isProjectFeature
          ? "PROJECT_LIMIT_EXCEEDED"
          : "GENERAL_LIMIT_EXCEEDED";
      return c.json(
        {
          ok: false,
          code: gate.code,
          blocked_reason_type: blockedReasonType,
          message: isChatSoftLimit
            ? `오늘 저와 나눌 수 있는 무료 대화 용량을 모두 소모하셨어요! 💬 
오늘의 이야기는 아쉽게 공식 종료되지만, 내일 오전 0시(자정)가 되면 새로운 대화 용량이 가득 충전되니 내일 다시 시도해 주세요!

만약 내일까지 기다리지 않고 지금 바로 멈춤 없는 대화를 이어가거나, 대화방 요약·AI 엑셀 제작 등 심도 깊은 프로젝트 전용 기능을 제한 없이 담당하게 하고 싶으시다면 아래 링크를 확인해 보세요!`
            : isProjectFeature
              ? "오늘 제공된 무료 체험 한도를 모두 소모하셨습니다. 환율 상승에도 부담 없는 가격! 월 4,900원 무제한 패키지로 VLUE의 모든 AI 기능을 제한 없이 고용해 보세요!"
              : "오늘 제공된 호출 사용 횟수를 모두 소모하셨어요. 제한 없이 브이밍 호출 기능을 이용해 보세요!",
          openUnlimitedPurchase: true,
          ctaPrimary:
            blockedReasonType === "PROJECT_LIMIT_EXCEEDED"
              ? "⚡ 무제한 패키지 결제하기"
              : "⚡ 월 4,900원 무제한 패키지 업그레이드",
          ctaSecondary: blockedReasonType === "DAILY_CHAT_EXCEEDED" ? "확인 (내일 올래요)" : ""
        },
        429
      );
    }

    const result = await handleVmingChat({
      userId,
      message: commandText || message,
      history,
      quickReplyId: body.quickReplyId,
      roomId: body.roomId
    });

    const intentType = intent?.intent_type || "general_chat";
    const shareTemplate =
      intentType === "generate_evidence"
        ? "🚨 [VLUE 보안 가드] 본 대화방의 안전한 거래 보장을 위해, 현재까지의 대화록에 대한 법적 무결성 증거 패키지(PDF) 컴파일 및 격리 보관이 완료되었습니다."
        : `🤖 [브이밍 AI 비서] 대화방 멤버들을 위한 결과물 생성이 완료되었습니다.`;

    const clientRoomId = String(body.roomId || "").trim();
    if (clientRoomId && (isHiddenVmingCommand || shareTemplate)) {
      const resolved = await resolveServerChatRoom(userId, clientRoomId);
      if (resolved) {
        const sys = await prisma.chatMessage.create({
          data: {
            roomId: resolved.serverRoomId,
            senderId: null,
            content: shareTemplate,
            messageType: "system"
          }
        });
        publishChatMessageSse({
          serverRoomId: resolved.serverRoomId,
          participantLow: resolved.participantLow,
          participantHigh: resolved.participantHigh,
          message: {
            id: sys.id,
            roomId: sys.roomId,
            senderId: null,
            content: sys.content,
            messageType: "system",
            createdAt: sys.createdAt.toISOString(),
            senderName: null
          }
        });
      }
    }

    return c.json({
      ok: true,
      ...result,
      hiddenCommand: isHiddenVmingCommand,
      intent,
      shareTemplate
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    const code = message === "MESSAGE_REQUIRED" ? 400 : 500;
    return c.json({ error: message }, code);
  }
});
