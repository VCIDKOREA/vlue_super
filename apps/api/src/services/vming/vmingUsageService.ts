import { prisma } from "../../db/client.js";
import { userHasPremiumTier } from "../../middleware/cardGate.js";
import { getRateValue, incrRateValue } from "./vmingRateRedis.js";

type TierKind = "FREE" | "PREMIUM" | "UNLIMITED";
type IntentType = "summary_ppt" | "create_contract" | "group_schedule" | "generate_evidence" | "general_chat";
export type FeatureType = "daily_chat" | "room_command" | "post_desc" | "web_ppt";

let addonReady = false;

const FX_KRW = 1520;
const INPUT_TOKEN_COST_KRW = 0.000114;
const OUTPUT_TOKEN_COST_KRW = 0.000456;
const FREE_DAILY_CHAT_TOKEN_LIMIT = 15_000;

const LIMITS_BY_TIER = {
  FREE: {
    dailyChatCalls: null as number | null,
    dailyChatToken: FREE_DAILY_CHAT_TOKEN_LIMIT,
    roomCommandDaily: 1,
    postDescDaily: 1,
    webPptMonthly: 1
  },
  PREMIUM: {
    dailyChatCalls: 50,
    dailyChatToken: null as number | null,
    roomCommandDaily: 10,
    postDescDaily: 5,
    webPptMonthly: 10
  },
  UNLIMITED: {
    dailyChatCalls: null as number | null,
    dailyChatToken: null as number | null,
    roomCommandDaily: null as number | null,
    postDescDaily: null as number | null,
    webPptMonthly: null as number | null
  }
} as const;

function getNow() {
  return new Date();
}

function ymdKst(d = getNow()) {
  const k = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return k.toISOString().slice(0, 10);
}

function ymKst(d = getNow()) {
  const k = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return k.toISOString().slice(0, 7);
}

function nextMidnightKstMs() {
  const now = getNow();
  const k = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = k.getUTCFullYear();
  const m = k.getUTCMonth();
  const day = k.getUTCDate();
  const next = Date.UTC(y, m, day + 1, 0, 0, 0) - 9 * 60 * 60 * 1000;
  return next;
}

function monthEndKstMs() {
  const now = getNow();
  const k = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = k.getUTCFullYear();
  const m = k.getUTCMonth();
  const nextMonth = Date.UTC(y, m + 1, 1, 0, 0, 0) - 9 * 60 * 60 * 1000;
  return nextMonth;
}

async function readCounter(key: string) {
  return getRateValue(key);
}

async function incrCounter(key: string, expiresAt: number) {
  return incrRateValue(key, expiresAt, 1);
}

async function readTokenCounter(key: string) {
  return getRateValue(key);
}

async function incrTokenCounter(key: string, amount: number, expiresAt: number) {
  return incrRateValue(key, expiresAt, Math.max(1, Math.floor(amount)));
}

function estimateInputTokens(message: string) {
  const chars = String(message || "").length;
  return Math.max(1, Math.ceil(chars / 3));
}

function estimateOutputTokens(message: string) {
  const chars = String(message || "").length;
  return Math.max(1, Math.ceil(chars / 6));
}

function featureKey(userId: string, feature: FeatureType, range: "daily" | "monthly") {
  if (range === "daily") return `user:limit:${userId}:${feature}:daily:${ymdKst()}`;
  return `user:limit:${userId}:${feature}:monthly:${ymKst()}`;
}

function debounceKey(userId: string) {
  const now = getNow();
  const min = Math.floor(now.getTime() / 60_000);
  return `user:limit:${userId}:debounce:${min}`;
}

async function ensureVmingAddonSchema() {
  if (addonReady) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS vming_unlimited_addons (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      active_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      active_until TIMESTAMPTZ NOT NULL,
      monthly_price_krw INT NOT NULL DEFAULT 4900,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  addonReady = true;
}

export async function resolveVmingTier(userId: string): Promise<TierKind> {
  await ensureVmingAddonSchema();
  const addon = await prisma.$queryRawUnsafe<Array<{ ok: boolean }>>(
    `
      SELECT EXISTS(
        SELECT 1 FROM vming_unlimited_addons
        WHERE user_id = $1::uuid
          AND status = 'active'
          AND active_until > NOW()
      ) AS ok;
    `,
    userId
  );
  if (addon[0]?.ok) return "UNLIMITED";
  return (await userHasPremiumTier(userId)) ? "PREMIUM" : "FREE";
}

export async function purchaseVmingUnlimited(userId: string) {
  await ensureVmingAddonSchema();
  const until = new Date();
  until.setMonth(until.getMonth() + 1);
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO vming_unlimited_addons (user_id, status, active_until, monthly_price_krw)
      VALUES ($1::uuid, 'active', $2::timestamptz, 4900);
    `,
    userId,
    until.toISOString()
  );
  return {
    plan: "UNLIMITED" as const,
    priceKrw: 4900,
    activeUntil: until.toISOString()
  };
}

export async function activateVmingUnlimitedByPayment(input: {
  userId: string;
  merchantUid?: string;
  provider?: string;
  impUid?: string;
}) {
  await ensureVmingAddonSchema();
  const until = new Date();
  until.setMonth(until.getMonth() + 1);
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO vming_unlimited_addons (user_id, status, active_until, monthly_price_krw)
      VALUES ($1::uuid, 'active', $2::timestamptz, 4900);
    `,
    input.userId,
    until.toISOString()
  );
  return {
    ok: true,
    plan: "UNLIMITED" as const,
    activeUntil: until.toISOString(),
    merchantUid: input.merchantUid || null,
    provider: input.provider || null,
    impUid: input.impUid || null
  };
}

export async function getVmingUserStatus(userId: string) {
  const tier = await resolveVmingTier(userId);
  const chatCallKey = featureKey(userId, "daily_chat", "daily");
  const chatTokenKey = `user:limit:${userId}:daily_chat_tokens:daily:${ymdKst()}`;
  const usedDaily = await readCounter(chatCallKey);
  const usedTokens = await readTokenCounter(chatTokenKey);
  const spec = LIMITS_BY_TIER[tier];

  if (tier === "UNLIMITED") {
    return {
      tier,
      dailyUsed: usedDaily,
      dailyLimit: null,
      dailyRemaining: null,
      dailyTokenUsed: usedTokens,
      dailyTokenLimit: null,
      tokenCostKrw: { input: INPUT_TOKEN_COST_KRW, output: OUTPUT_TOKEN_COST_KRW, fxBase: FX_KRW },
      statusLabel: "⚡ 무제한 이용 중 (제한 없음)"
    };
  }
  const dailyLimit = spec.dailyChatCalls;
  const remaining = dailyLimit == null ? null : Math.max(0, dailyLimit - usedDaily);
  const tokenRemaining =
    spec.dailyChatToken == null ? null : Math.max(0, spec.dailyChatToken - usedTokens);
  return {
    tier,
    dailyUsed: usedDaily,
    dailyLimit,
    dailyRemaining: remaining,
    dailyTokenUsed: usedTokens,
    dailyTokenLimit: spec.dailyChatToken,
    dailyTokenRemaining: tokenRemaining,
    projectLimits: {
      roomCommandDaily: spec.roomCommandDaily,
      postDescDaily: spec.postDescDaily,
      webPptMonthly: spec.webPptMonthly
    },
    tokenCostKrw: { input: INPUT_TOKEN_COST_KRW, output: OUTPUT_TOKEN_COST_KRW, fxBase: FX_KRW },
    statusLabel:
      tier === "FREE"
        ? `오늘 남은 브이밍 호출 횟수: ${remaining ?? 0}회 / ${dailyLimit ?? 0}회 (토큰 ${tokenRemaining ?? 0}/${spec.dailyChatToken ?? 0})`
        : `오늘 남은 브이밍 호출 횟수: ${remaining ?? 0}회 / ${dailyLimit ?? 0}회`
  };
}

export async function analyzeVmingIntent(message: string): Promise<{
  is_suspicious: boolean;
  risk_level: "low" | "medium" | "high" | "critical";
  intent_type: IntentType;
  reason: string;
  highlight: boolean;
}> {
  const text = String(message || "").trim();
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const mock = () => {
    if (/증거|고소|사기|백서|법적|피해/.test(text)) {
      return {
        is_suspicious: true,
        risk_level: "high" as const,
        intent_type: "generate_evidence" as const,
        reason: "사기 피해 증거 생성 의도로 분류",
        highlight: true
      };
    }
    if (/요약|ppt|슬라이드/.test(text)) {
      return {
        is_suspicious: false,
        risk_level: "low" as const,
        intent_type: "summary_ppt" as const,
        reason: "요약 자료 생성 의도",
        highlight: false
      };
    }
    if (/계약|합의|약관/.test(text)) {
      return {
        is_suspicious: false,
        risk_level: "low" as const,
        intent_type: "create_contract" as const,
        reason: "계약 문서 생성 의도",
        highlight: false
      };
    }
    if (/일정|회의|스케줄/.test(text)) {
      return {
        is_suspicious: false,
        risk_level: "low" as const,
        intent_type: "group_schedule" as const,
        reason: "그룹 일정 생성 의도",
        highlight: false
      };
    }
    return {
      is_suspicious: false,
      risk_level: "low" as const,
      intent_type: "general_chat" as const,
      reason: "일반 AI 질의",
      highlight: false
    };
  };
  if (!apiKey) return mock();

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const instruction = `다음 사용자 요청의 의도를 분석해 반드시 JSON만 반환:
{
  "is_suspicious": true/false,
  "risk_level": "low"|"medium"|"high"|"critical",
  "intent_type": "summary_ppt"|"create_contract"|"group_schedule"|"generate_evidence"|"general_chat",
  "reason": "1줄",
  "highlight": true/false
}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instruction }] },
        contents: [{ role: "user", parts: [{ text }] }],
        generationConfig: { maxOutputTokens: 180, temperature: 0.1 }
      })
    });
    const data = (await res.json().catch(() => ({}))) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const raw = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
    const json = raw.match(/\{[\s\S]*\}/)?.[0];
    if (!json) return mock();
    return JSON.parse(json);
  } catch {
    return mock();
  }
}

export async function allowVmingRequest(input: {
  userId: string;
  roomId?: string;
  intentType: IntentType;
  featureType: FeatureType;
  message?: string;
  /** true면 카운터를 증가시키지 않고 한도만 검사 */
  dryRun?: boolean;
}) {
  const dryRun = input.dryRun === true;
  const tier = await resolveVmingTier(input.userId);
  const limits = LIMITS_BY_TIER[tier];

  if (tier === "UNLIMITED") {
    const deb = await readCounter(debounceKey(input.userId));
    if (deb >= 3) {
      return {
        allowed: false as const,
        code: "DEBOUNCE_LIMIT_EXCEEDED",
        tier,
        dailyRemaining: null,
        monthlyRemaining: null,
        openUnlimitedPurchase: false
      };
    }
    if (!dryRun) await incrCounter(debounceKey(input.userId), Date.now() + 60_000);
    return { allowed: true as const, tier, dailyRemaining: null, monthlyRemaining: null, bypass: true };
  }

  if (input.intentType === "generate_evidence" && input.roomId) {
    const emergency = await prisma.$queryRawUnsafe<Array<{ hit: boolean }>>(
      `
        SELECT EXISTS(
          SELECT 1 FROM fraud_pattern_logs
          WHERE room_id = $1
            AND risk_level IN ('high','critical')
        ) AS hit;
      `,
      input.roomId
    );
    if (emergency[0]?.hit) {
      return { allowed: true as const, tier, dailyRemaining: null, monthlyRemaining: null, bypass: true };
    }
  }

  const dKey = featureKey(input.userId, input.featureType, "daily");
  const mKey = featureKey(input.userId, input.featureType, "monthly");

  if (input.featureType === "daily_chat") {
    const usedCalls = await readCounter(dKey);
    const callLimit = limits.dailyChatCalls;
    if (callLimit != null && usedCalls >= callLimit) {
      return {
        allowed: false as const,
        code: "DAILY_CHAT_CALL_LIMIT_EXCEEDED",
        tier,
        dailyRemaining: 0,
        monthlyRemaining: null,
        openUnlimitedPurchase: true
      };
    }
    if (tier === "FREE") {
      const minuteKey = debounceKey(input.userId);
      const minuteUsed = await readCounter(minuteKey);
      if (minuteUsed >= 1) {
        return {
          allowed: false as const,
          code: "FREE_MINUTE_RATE_LIMIT",
          tier,
          dailyRemaining: Math.max(0, (callLimit ?? 0) - usedCalls),
          monthlyRemaining: null,
          openUnlimitedPurchase: true
        };
      }
      const inTokens = estimateInputTokens(input.message || "");
      if (inTokens >= 5000) {
        return {
          allowed: false as const,
          code: "TEXT_BOMB_WARNING",
          tier,
          dailyRemaining: Math.max(0, (callLimit ?? 0) - usedCalls),
          monthlyRemaining: null,
          warning: "과도한 텍스트 입력으로 용량이 급격히 소모될 수 있습니다.",
          openUnlimitedPurchase: false
        };
      }
      const tokenKey = `user:limit:${input.userId}:daily_chat_tokens:daily:${ymdKst()}`;
      const usedTokens = await readTokenCounter(tokenKey);
      const estimatedTotal = inTokens + estimateOutputTokens(input.message || "");
      if ((limits.dailyChatToken ?? 0) <= usedTokens + estimatedTotal) {
        return {
          allowed: false as const,
          code: "SOFT_LIMIT_REACHED",
          tier,
          dailyRemaining: Math.max(0, (callLimit ?? 0) - usedCalls),
          monthlyRemaining: null,
          openUnlimitedPurchase: true,
          template:
            "오늘 저와 나눌 수 있는 무료 대화 용량을 모두 소모하셨어요! 💬 내일 자정에 새 용량이 충전됩니다. 지금 바로 이어가려면 ⚡ 월 4,900원 무제한 패키지를 이용해 보세요."
        };
      }
      if (!dryRun) {
        await incrCounter(minuteKey, Date.now() + 60_000);
        await incrTokenCounter(tokenKey, estimatedTotal, nextMidnightKstMs());
      }
    }
    const latestCalls = dryRun ? usedCalls : await incrCounter(dKey, nextMidnightKstMs());
    return {
      allowed: true as const,
      tier,
      dailyRemaining: callLimit == null ? null : Math.max(0, callLimit - latestCalls),
      monthlyRemaining: null,
      bypass: false
    };
  }

  const dailyUsed = await readCounter(dKey);
  const monthlyUsed = await readCounter(mKey);
  const dailyLimit =
    input.featureType === "room_command"
      ? limits.roomCommandDaily
      : input.featureType === "post_desc"
        ? limits.postDescDaily
        : null;
  const monthlyLimit = input.featureType === "web_ppt" ? limits.webPptMonthly : null;

  if (dailyLimit != null && dailyUsed >= dailyLimit) {
    return {
      allowed: false as const,
      code: "DAILY_LIMIT_EXCEEDED",
      tier,
      dailyRemaining: 0,
      monthlyRemaining: monthlyLimit == null ? null : Math.max(0, monthlyLimit - monthlyUsed),
      openUnlimitedPurchase: true
    };
  }
  if (monthlyLimit != null && monthlyUsed >= monthlyLimit) {
    return {
      allowed: false as const,
      code: "MONTHLY_LIMIT_EXCEEDED",
      tier,
      dailyRemaining: dailyLimit == null ? null : Math.max(0, dailyLimit - dailyUsed),
      monthlyRemaining: 0
    };
  }

  const dailyNow =
    dryRun || dailyLimit == null ? dailyUsed : await incrCounter(dKey, nextMidnightKstMs());
  const monthlyNow =
    dryRun || monthlyLimit == null ? monthlyUsed : await incrCounter(mKey, monthEndKstMs());

  return {
    allowed: true as const,
    tier,
    dailyRemaining: dailyLimit == null ? null : Math.max(0, dailyLimit - dailyNow),
    monthlyRemaining: monthlyLimit == null ? null : Math.max(0, monthlyLimit - monthlyNow),
    bypass: false
  };
}
