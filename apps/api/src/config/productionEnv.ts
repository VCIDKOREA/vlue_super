/**
 * Production 인프라 ENV 최종 바인딩·락.
 * NODE_ENV=production 또는 VLUE_PRODUCTION_LOCK=1 시 필수 키 검증.
 */

export type ProductionEnvManifestEntry = {
  key: string;
  description: string;
  aliases?: string[];
};

/** 부팅 필수 — 없으면 프로세스 종료 */
export const PRODUCTION_ENV_MANIFEST: ProductionEnvManifestEntry[] = [
  {
    key: "DATABASE_URL",
    aliases: [
      "DATABASE_PRIVATE_URL",
      "DATABASE_PUBLIC_URL",
      "POSTGRES_URL",
      "POSTGRESQL_URL"
    ],
    description: "Prisma/PostgreSQL — 쇼핑·주문·보안함·채팅 히스토리"
  },
  {
    key: "PORTONE_API_SECRET",
    aliases: ["PORTONE_IMP_SECRET", "IAMPORT_API_SECRET"],
    description: "포트원 API 시크릿 — 결제·웹훅·vming_unlimited_* 멱등"
  },
  {
    key: "JWT_ACCESS_SECRET",
    aliases: ["JWT_SECRET"],
    description: "JWT access/refresh 서명"
  },
  {
    key: "SESSION_SECRET",
    aliases: ["JWT_ACCESS_SECRET", "JWT_SECRET"],
    description: "세션·쿠키 서명 (미설정 시 JWT_ACCESS_SECRET 상속)"
  },
  {
    key: "FILE_STORAGE_PROVIDER",
    description: "s3 | mock — 오피스 스캔·자산·보안함 Evidence 격리 저장"
  }
];

/** 없어도 기동 가능 — 기능 일부 제한·경고만 */
export const PRODUCTION_ENV_RECOMMENDED: ProductionEnvManifestEntry[] = [
  {
    key: "REDIS_URL",
    aliases: ["REDIS_PRIVATE_URL", "REDIS_PUBLIC_URL", "REDISCLOUD_URL"],
    description: "ioredis — 무료 회원 일 15,000 토큰 하드캡 (미설정 시 인메모리 폴백)"
  },
  {
    key: "GEMINI_API_KEY",
    aliases: ["GOOGLE_GENERATIVE_AI_API_KEY", "GOOGLE_AI_API_KEY"],
    description: "Gemini — Vming·사기 분석·캘린더 파싱"
  }
];

const S3_STORAGE_KEYS = [
  "S3_ENDPOINT",
  "S3_REGION",
  "S3_BUCKET",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY"
] as const;

const PLACEHOLDER_RE = /^(CHANGE_ME|__SET_|REPLACE_ME|<your-)/i;

/** Railway Variables에 `${{Postgres.DATABASE_URL}}` 를 문자열로만 넣은 경우(참조 미연결) */
function isUnresolvedRailwayReference(value: string): boolean {
  return /^\$\{\{[^}]+\}\}$/.test(value.trim());
}

function isSet(value: string | undefined): boolean {
  const v = String(value || "").trim();
  if (!v) return false;
  if (isUnresolvedRailwayReference(v)) return false;
  if (PLACEHOLDER_RE.test(v)) return false;
  return true;
}

function copyFirstEnv(targetKey: string, sourceKeys: string[]): void {
  if (isSet(process.env[targetKey])) return;
  for (const src of sourceKeys) {
    const val = process.env[src];
    if (isSet(val)) {
      process.env[targetKey] = val!.trim();
      return;
    }
  }
}

/** 플랫폼·플러그인이 다른 이름으로 주입한 값 → 표준 키로 복사 */
export function normalizePlatformEnv(): void {
  for (const entry of [...PRODUCTION_ENV_MANIFEST, ...PRODUCTION_ENV_RECOMMENDED]) {
    copyFirstEnv(entry.key, entry.aliases ?? []);
  }
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

/** Railway·Render 등 — .env.production 파일 없이 플랫폼 Variables 만 사용 */
function isCloudRuntime(): boolean {
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_SERVICE_NAME ||
      process.env.RAILWAY_PROJECT_ID ||
      process.env.RENDER ||
      process.env.FLY_APP_NAME
  );
}

function entrySatisfied(entry: ProductionEnvManifestEntry): boolean {
  if (isSet(process.env[entry.key])) return true;
  return (entry.aliases ?? []).some((a) => isSet(process.env[a]));
}

export function envPresenceSummary(): string {
  const keys = [
    ...PRODUCTION_ENV_MANIFEST.map((e) => e.key),
    ...PRODUCTION_ENV_RECOMMENDED.map((e) => e.key),
    "PORTONE_API_KEY",
    "DIRECT_URL"
  ];
  return keys
    .map((k) => `${k}=${isSet(process.env[k]) ? "set" : "missing"}`)
    .join(", ");
}

export function checkProductionEnv(): ProductionEnvCheckResult {
  normalizePlatformEnv();
  applyProductionEnvAliases();

  if (!isSet(process.env.FILE_STORAGE_PROVIDER)) {
    process.env.FILE_STORAGE_PROVIDER = "mock";
  }

  const missing: string[] = [];
  const warnings: string[] = [];

  for (const entry of PRODUCTION_ENV_MANIFEST) {
    if (!entrySatisfied(entry)) {
      missing.push(entry.key);
    }
  }

  for (const entry of PRODUCTION_ENV_RECOMMENDED) {
    if (!entrySatisfied(entry)) {
      warnings.push(`${entry.key} — ${entry.description}`);
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

export function formatProductionEnvHelp(missing: string[]): string {
  const lines = missing.map((key) => {
    const entry = PRODUCTION_ENV_MANIFEST.find((e) => e.key === key);
    const aliases = entry?.aliases?.length ? ` (또는 ${entry.aliases.join(", ")})` : "";
    return `  - ${key}${aliases}: ${entry?.description ?? ""}`;
  });
  const where = isCloudRuntime()
    ? "Railway 대시보드 → @vlue/api 서비스 → Variables 탭에 아래 키를 추가하세요. (PostgreSQL/Redis 플러그인 연결 시 DATABASE_URL·REDIS_URL 자동 주입 가능)"
    : "로컬: apps/api/.env.production 또는 환경 변수에 설정하세요.";
  return `${where}\n${lines.join("\n")}`;
}

export function assertProductionEnvLocked(): void {
  const shouldLock =
    process.env.NODE_ENV === "production" || process.env.VLUE_PRODUCTION_LOCK === "1";
  if (!shouldLock) return;

  if (process.env.VLUE_SKIP_PRODUCTION_ENV_CHECK === "1") {
    console.warn(
      "[vlue-api] VLUE_SKIP_PRODUCTION_ENV_CHECK=1 — Production ENV 검증 생략 (스테이징 전용)"
    );
    return;
  }

  const result = checkProductionEnv();
  if (!result.ok) {
    const hint = isCloudRuntime()
      ? "\n[진단] Variables가 @vlue/api 서비스에 연결됐는지, Postgres는 「Add Reference」로 DATABASE_URL을 넣었는지 확인하세요. `${{...}}` 문자열이 그대로면 미설정으로 간주됩니다."
      : "";
    throw new Error(
      `[vlue-api] Production ENV 누락 (${result.missing.length}개):\n${formatProductionEnvHelp(result.missing)}${hint}\n[env] ${envPresenceSummary()}`
    );
  }
  for (const w of result.warnings) {
    console.warn(`[vlue-api] Production ENV 권장: ${w}`);
  }
}

export const PRODUCTION_READY_LOG =
  "VLUE AI & CORE SERVICE ENGINE - PRODUCTION READY SUCCESS";
