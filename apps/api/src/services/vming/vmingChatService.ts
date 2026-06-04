import { prisma } from "../../db/client.js";
import { userHasPremiumTier } from "../../middleware/cardGate.js";
import { VMING_SYSTEM_INSTRUCTION, resolvePipelineDirective } from "./vmingSystemPrompt.js";
import { buildVmingUserContextBlock } from "./vmingUserContext.js";

const FREE_DAILY_LIMIT = 20;
const UPSELL_THRESHOLD = 5;

let usageInitialized = false;

async function ensureVmingUsageTable() {
  if (usageInitialized) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS vming_daily_usage (
      user_id UUID NOT NULL,
      usage_date DATE NOT NULL,
      question_count INT NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, usage_date)
    );
  `);
  usageInitialized = true;
}

function todayKst(): string {
  const d = new Date();
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

async function getUsageCount(userId: string): Promise<number> {
  await ensureVmingUsageTable();
  const day = todayKst();
  const rows = await prisma.$queryRawUnsafe<Array<{ question_count: number }>>(
    `SELECT question_count FROM vming_daily_usage WHERE user_id = $1::uuid AND usage_date = $2::date;`,
    userId,
    day
  );
  return rows[0]?.question_count ?? 0;
}

async function incrementUsage(userId: string): Promise<number> {
  await ensureVmingUsageTable();
  const day = todayKst();
  const rows = await prisma.$queryRawUnsafe<Array<{ question_count: number }>>(
    `
      INSERT INTO vming_daily_usage (user_id, usage_date, question_count)
      VALUES ($1::uuid, $2::date, 1)
      ON CONFLICT (user_id, usage_date)
      DO UPDATE SET question_count = vming_daily_usage.question_count + 1
      RETURNING question_count;
    `,
    userId,
    day
  );
  return rows[0]?.question_count ?? 1;
}

function upsellLine(remaining: number, isPremium: boolean, message: string): string | null {
  if (isPremium) return null;
  const coreKeywords = /가족|보호|프리미엄|멤버십|결제|광고|15초|영상|복합기|원격|명함|리워드|정산/i;
  if (remaining > UPSELL_THRESHOLD && !coreKeywords.test(message)) return null;
  if (remaining <= 0) {
    return "오늘 무료 질문 한도에 도달했습니다. **VLUE 프리미엄**이면 브이밍 무제한 대화와 5대 AI 엔진(명함·리워드·안심·광고·문서)을 한 번에 쓸 수 있습니다.";
  }
  return `오늘 남은 무료 질문 **${remaining}회**. 핵심 비즈니스 기능은 프리미엄에서 제한 없이 이어집니다 — 지금 업그레이드하면 브이밍이 더 깊은 컨텍스트로 돕습니다.`;
}

function mockVmingReply(message: string, quickReplyId?: string | null): string {
  const id = String(quickReplyId || "").trim();

  if (id === "biz-card") {
    return `## AI 명함 컨설팅
**예상 신뢰도** 72% → 목표 88%

**보완 키워드** 전문성 · 응답속도 · VLUE 인증

**소개 문장 3종**
1. VLUE 인증 통신으로 신뢰를 증명하는 ○○ 전문가입니다.
2. 고객의 시간을 아끼는 24시간 응대형 비즈니스 파트너입니다.
3. 데이터 기반 상담으로 결과를 만드는 ○○○입니다.`;
  }
  if (id === "reward-predict") {
    return `## 리워드 예측 브리핑
최근 추천 패턴상 **주말 저녁 공유** 시 전환율이 평일 대비 높게 나타납니다(시나리오 예시).

**액션** 이번 주말 가족보호 초대 링크를 1회 공유하시면, 다음 정산 주기 리워드 **약 1만~2만원 추가** 가능성이 있습니다.`;
  }
  if (id === "safe-zone") {
    return `## 안심 동선 브리핑
실시간 GPS가 연동되면 이 자리에서 이탈 거리·안심 구역을 분석합니다.

지금은 **친구검색 → 가족 보호**에서 피보호자를 등록해 주세요.`;
  }
  if (id === "ad-script" || id === "ad-video") {
    return `## 15초 광고 콘티
**[0~5초]** 시선 고정 — "오늘의 혜택, 3초 만에 확인"
**[5~10초]** 가치 — 핵심 메뉴·할인율 텍스트 오버레이
**[10~15초]** CTA — "VLUE 인증 상점 · 지금 방문" + 로고 마크`;
  }
  if (id === "smart-doc" || id === "printer") {
    return `## 스마트 문서 요약
1. (핵심) 문서 목적·대상을 한 줄로 압축합니다.
2. (핵심) 반복 페이지·여백을 줄일 수 있습니다.
3. (핵심) 원격 출력 전 최종 검토를 권장합니다.

**추천 서식** 2분할 모아찍기 — 종이·비용 절약.`;
  }

  if (id === "blue-guide") {
    return "VLUE 블루에서는 **채팅·명함·구독·쇼핑**을 한 화면 흐름으로 씁니다. 하단 탭에서 채팅·브이밍·마이·쇼핑·친구를 오가며 이용하시면 됩니다.";
  }
  if (id === "referral") {
    return "추천제는 **설정 → VLUE ID**에서 내 코드를 복사해 초대할 수 있습니다. 가입·결제 시 리워드가 적립되며, 상세는 마이페이지·지갑에서 확인합니다.";
  }
  if (id === "family") {
    return "가족보호는 **친구검색 → 가족 보호**에서 등록합니다. 유료 회원이 초대하고 가족이 수락하면 위치·알림이 시작됩니다.";
  }

  const m = message.toLowerCase();
  if (m.includes("가족") || m.includes("보호")) {
    return "가족보호는 친구검색 > 가족 보호에서 등록해요. 유료 회원이 초대하고 가족이 수락하면 알림이 시작됩니다.";
  }
  if (m.includes("광고") || m.includes("15초") || m.includes("영상")) {
    return "홍보 사진 여러 장을 올리면 서버가 15초 슬라이드 MP4로 합쳐줘요. MY > 스토어 또는 미디어 업로드 메뉴에서 시도해 보세요.";
  }
  if (m.includes("복합기") || m.includes("원격")) {
    return "원격 복합기는 PC 에이전트 연결 후 자료실 파일을 선택해 인쇄·팩스 요청하면 됩니다.";
  }
  if (m.includes("추천")) {
    return "추천제는 VLUE ID로 친구를 초대하면 혜택이 쌓여요. 설정 > VLUE ID에서 내 코드를 복사할 수 있어요.";
  }
  return "VLUE 블루 앱에서 채팅·명함·가족보호를 한곳에서 쓸 수 있어요. 궁금한 메뉴를 말씀해 주시면 짧게 안내할게요. **AI 전문 엔진** 메뉴에서는 명함·리워드·안심 등 심화 분석도 받을 수 있습니다.";
}

async function callGemini(input: {
  message: string;
  history: Array<{ role: string; text: string }>;
  userId: string;
  quickReplyId?: string | null;
}): Promise<string> {
  const { message, history, userId, quickReplyId } = input;
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return mockVmingReply(message, quickReplyId);

  const [contextBlock, pipeline] = await Promise.all([
    buildVmingUserContextBlock(userId),
    Promise.resolve(resolvePipelineDirective(quickReplyId, message))
  ]);

  const systemText = [VMING_SYSTEM_INSTRUCTION, contextBlock, pipeline].filter(Boolean).join("\n\n");

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-1.5-flash";
  const contents = [
    ...history.slice(-10).map((h) => ({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.text }]
    })),
    { role: "user", parts: [{ text: message }] }
  ];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemText }] },
      contents,
      generationConfig: { maxOutputTokens: 1024, temperature: 0.7 }
    })
  });

  const data = (await res.json().catch(() => ({}))) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message?: string };
  };

  if (!res.ok) {
    console.warn("[vming] gemini_error", data.error?.message || res.status);
    return mockVmingReply(message, quickReplyId);
  }

  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim();
  return text || mockVmingReply(message, quickReplyId);
}

export async function handleVmingChat(input: {
  userId: string;
  message: string;
  history?: Array<{ role: string; text: string }>;
  quickReplyId?: string;
  roomId?: string;
}) {
  const message = String(input.message || "").trim();
  if (!message) throw new Error("MESSAGE_REQUIRED");

  const isPremium = await userHasPremiumTier(input.userId);
  const usedBefore = await getUsageCount(input.userId);
  if (!isPremium && usedBefore >= FREE_DAILY_LIMIT) {
    return {
      reply:
        "오늘 무료 브이밍 질문 한도(20회)에 도달했습니다. **VLUE 프리미엄**으로 업그레이드하면 무제한 대화와 5대 AI 인텔리전스 엔진을 제한 없이 이용할 수 있습니다.",
      remaining: 0,
      limit: FREE_DAILY_LIMIT,
      isPremium,
      upsell: true,
      provider: "limit"
    };
  }

  const replyCore = await callGemini({
    message,
    history: input.history || [],
    userId: input.userId,
    quickReplyId: input.quickReplyId
  });
  const usedAfter = await incrementUsage(input.userId);
  const remaining = Math.max(0, FREE_DAILY_LIMIT - usedAfter);
  const upsell = upsellLine(isPremium ? 99 : remaining, isPremium, message);
  const reply = upsell ? `${replyCore}\n\n---\n${upsell}` : replyCore;

  return {
    reply,
    remaining: isPremium ? null : remaining,
    limit: isPremium ? null : FREE_DAILY_LIMIT,
    isPremium,
    upsell: Boolean(upsell),
    provider: process.env.GEMINI_API_KEY ? "gemini" : "mock",
    quickReplyId: input.quickReplyId || null
  };
}
