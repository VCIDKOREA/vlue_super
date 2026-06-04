/**
 * Production 인프라 ENV 최종 바인딩·락.
 * NODE_ENV=production 또는 VLUE_PRODUCTION_LOCK=1 시 필수 키 검증.
 */

export type ProductionEnvManifestEntry = {
  key: string;
  description: string;
  aliases?: string[];
};

export const PRODUCTION_ENV_MANIFEST: ProductionEnvManifestEntry[] = [
  {
    key: "DATABASE_URL",
    description: "Prisma/PostgreSQL — 쇼핑·주문·보안함·채팅 히스토리"
  },
  {
    key: "REDIS_URL",
    description: "ioredis — 무료 회원 일 15,000 토큰 하드캡·안티 어뷰징"
  },
  {
    key: "GEMINI_API_KEY",
    description: "Gemini 프로덕션 — Vming·사기 분석·캘린더 파싱 원가 방어"
  },
  {
    key: "PORTONE_API_SECRET",
    description: "포트원 API 시크릿 — 결제·웹훅·vming_unlimited_* 멱등"
  },
  {
    key: "JWT_ACCESS_SECRET",
    aliases: ["JWT_SECRET"],
    description: "JWT access/refresh 서명"
  },
  {
    key: "SESSION_SECRET",
    description: "세션·쿠키 서명 (미설정 시 JWT_ACCESS_SECRET 상속)"
  },
  {
    key: "FILE_STORAGE_PROVIDER",
    description: "s3 | mock — 오피스 스캔·자산·보안함 Evidence 격리 저장"
  }
];

const S3_STORAGE_KEYS = [
  "S3_ENDPOINT",
  "S3_REGION",
  "S3_BUCKET",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY"
] as const;

const PLACEHOLDER_RE =
  /^(CHANGE_ME|__SET_|REPLACE_ME|<your-|\$\{)/i;

function isSet(value: string | undefined): boolean {
  const v = String(value || "").trim();
  if (!v) return false;
  if (PLACEHOLDER_RE.test(v)) return false;
  return true;
}

/** 레거시·플랫폼 별칭 → 런타임 process.env 정규화 */
export function applyProductionEnvAliases(): void {
  if (!isSet(process.env.JWT_ACCESS_SECRET) && isSet(process.env.JWT_SECRET)) {
    process.env.JWT_ACCESS_SECRET = process.env.JWT_SECRET!.trim();
  }
  if (!isSet(process.env.JWT_SECRET) && isSet(process.env.JWT_ACCESS_SECRET)) {
    process.env.JWT_SECRET = process.env.JWT_ACCESS_SECRET!.trim();
  }
  if (!isSet(process.env.SESSION_SECRET) && isSet(process.env.JWT_ACCESS_SECRET)) {
    process.env.SESSION_SECRET = process.env.JWT_ACCESS_SECRET!.trim();
  }
  if (!isSet(process.env.PORTONE_API_KEY) && isSet(process.env.PORTONE_IMP_KEY)) {
    process.env.PORTONE_API_KEY = process.env.PORTONE_IMP_KEY!.trim();
  }
}

export type ProductionEnvCheckResult = {
  ok: boolean;
  missing: string[];
  warnings: string[];
};

export function checkProductionEnv(): ProductionEnvCheckResult {
  applyProductionEnvAliases();
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const entry of PRODUCTION_ENV_MANIFEST) {
    const primary = process.env[entry.key];
    const aliasHit = entry.aliases?.some((a) => isSet(process.env[a]));
    if (!isSet(primary) && !aliasHit) {
      missing.push(entry.key);
    }
  }

  if (!isSet(process.env.PORTONE_API_KEY)) {
    warnings.push("PORTONE_API_KEY (imp_key) — 결제 API 호출에 권장");
  }
  if (!isSet(process.env.PORTONE_WEBHOOK_SECRET)) {
    warnings.push("PORTONE_WEBHOOK_SECRET — 웹훅 서명 검증에 권장");
  }

  const storage = String(process.env.FILE_STORAGE_PROVIDER || "mock")
    .trim()
    .toLowerCase();
  if (storage === "s3") {
    for (const k of S3_STORAGE_KEYS) {
      if (!isSet(process.env[k])) missing.push(k);
    }
  } else if (storage !== "mock") {
    warnings.push(`FILE_STORAGE_PROVIDER=${storage} — 지원: s3, mock`);
  }

  return { ok: missing.length === 0, missing, warnings };
}

export function assertProductionEnvLocked(): void {
  const shouldLock =
    process.env.NODE_ENV === "production" || process.env.VLUE_PRODUCTION_LOCK === "1";
  if (!shouldLock) return;

  const result = checkProductionEnv();
  if (!result.ok) {
    throw new Error(
      `[vlue-api] Production ENV 누락: ${result.missing.join(", ")}. apps/api/.env.production 매핑을 확인하세요.`
    );
  }
  for (const w of result.warnings) {
    console.warn(`[vlue-api] Production ENV 권장: ${w}`);
  }
}

export const PRODUCTION_READY_LOG =
  "VLUE AI & CORE SERVICE ENGINE - PRODUCTION READY SUCCESS";
