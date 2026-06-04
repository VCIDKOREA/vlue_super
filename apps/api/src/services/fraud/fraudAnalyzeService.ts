import { createHash } from "node:crypto";
import { prisma } from "../../db/client.js";
import { ssePublish } from "../../realtime/sseHub.js";
import { sendOfficePushToUser } from "../fcmNotificationService.js";
import { ensureFraudSchema } from "./fraudSchema.js";

const FRAUD_SYSTEM_INSTRUCTION = `너는 신뢰 플랫폼 'VLUE'의 실시간 사기 패턴 감지 독점 AI 엔진이다.
제공되는 유저의 대화 메시지를 분석하여 사기 의심 패턴을 정밀 추론하라.
단단한 시스템 방어를 위해, 안내 문구나 장황한 설명은 전면 배제하고 반드시 아래 지정된 순수 JSON 형식으로만 응답해야 한다:

{
  "is_suspicious": true/false,
  "risk_level": "low" / "medium" / "high" / "critical",
  "pattern_type": "감지된 패턴 명칭",
  "reason": "감지된 기술적 이유 1줄 요약",
  "highlight": true/false
}`;

export type FraudAnalysis = {
  is_suspicious: boolean;
  risk_level: "low" | "medium" | "high" | "critical";
  pattern_type: string;
  reason: string;
  highlight: boolean;
};

function mockAnalyze(content: string): FraudAnalysis {
  const t = content.toLowerCase();
  if (/송금|계좌|비밀번호|otp|주민|긴급|지금 당장|투자|원금보장/.test(t)) {
    return {
      is_suspicious: true,
      risk_level: /계좌|송금|비밀번호/.test(t) ? "high" : "medium",
      pattern_type: "금전·개인정보 요구 의심",
      reason: "민감 키워드 패턴 감지",
      highlight: true
    };
  }
  return {
    is_suspicious: false,
    risk_level: "low",
    pattern_type: "",
    reason: "",
    highlight: false
  };
}

async function callGeminiFraud(content: string): Promise<FraudAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return mockAnalyze(content);

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: FRAUD_SYSTEM_INSTRUCTION }] },
      contents: [{ role: "user", parts: [{ text: content }] }],
      generationConfig: { maxOutputTokens: 256, temperature: 0.2 }
    })
  });
  const data = (await res.json().catch(() => ({}))) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const raw = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return mockAnalyze(content);
  try {
    return JSON.parse(jsonMatch[0]) as FraudAnalysis;
  } catch {
    return mockAnalyze(content);
  }
}

export async function analyzeChatMessage(input: {
  roomId: string;
  messageId: string;
  senderId: string | null;
  content: string;
  peerUserId?: string;
}) {
  await ensureFraudSchema();
  if (!input.content?.trim() || input.content.length < 4) {
    return { analysis: mockAnalyze(""), logged: false };
  }

  const analysis = await callGeminiFraud(input.content);
  await prisma.$executeRawUnsafe(
    `
    INSERT INTO fraud_pattern_logs (
      room_id, message_id, sender_id, content_excerpt,
      is_suspicious, risk_level, pattern_type, reason, highlight, raw_ai
    ) VALUES ($1, $2, $3::uuid, $4, $5, $6, $7, $8, $9, $10::jsonb);
    `,
    input.roomId,
    input.messageId,
    input.senderId,
    input.content.slice(0, 500),
    analysis.is_suspicious,
    analysis.risk_level,
    analysis.pattern_type || null,
    analysis.reason || null,
    analysis.highlight,
    JSON.stringify(analysis)
  );

  const event = {
    type: "vlue-fraud-alert",
    roomId: input.roomId,
    messageId: input.messageId,
    ...analysis
  };

  if (input.senderId) ssePublish(input.senderId, event);
  if (input.peerUserId) ssePublish(input.peerUserId, event);

  if (analysis.risk_level === "high" || analysis.risk_level === "critical") {
    if (input.peerUserId) {
      void sendOfficePushToUser(
        input.peerUserId,
        "VLUE 사기 경고",
        analysis.reason || "의심 메시지가 감지되었습니다.",
        { type: "fraud_alert", roomId: input.roomId, riskLevel: analysis.risk_level }
      );
    }
  }

  return { analysis, logged: true };
}

export function generateMessageHash(message: {
  id: string;
  content: string;
  sender_id: string | null;
  created_at: string;
  room_id: string;
}) {
  const data = {
    id: message.id,
    content: message.content,
    sender_id: message.sender_id,
    timestamp: message.created_at,
    room_id: message.room_id
  };
  return createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

export function generateDocumentHash(hashes: string[]) {
  return createHash("sha256").update(hashes.join("")).digest("hex");
}
