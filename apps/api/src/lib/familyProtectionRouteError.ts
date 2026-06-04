import type { Context } from "hono";

export function handleFamilyProtectionRouteError(c: Context, route: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[family-protection${route}]`, err);

  const schemaHint =
    msg.includes("does not exist") ||
    msg.includes("Unknown column") ||
    msg.includes("Invalid") ||
    msg.includes("family_protection") ||
    msg.includes("Cannot read properties of undefined") ||
    msg.includes("is not a function");

  if (schemaHint) {
    return c.json(
      {
        error:
          "가족 보호 DB가 아직 준비되지 않았습니다. packages/db에서 `npx prisma generate` 와 `npx prisma migrate deploy` 실행 후 API를 재시작해 주세요.",
        code: "FAMILY_SCHEMA_NOT_READY",
        detail: msg
      },
      503
    );
  }

  const fkHint = msg.includes("Foreign key constraint") || msg.includes("violates foreign key");
  if (fkHint) {
    return c.json(
      {
        error: "로그인 계정이 서버에 등록되지 않았습니다. 다시 로그인한 뒤 시도해 주세요.",
        code: "FAMILY_USER_NOT_FOUND",
        detail: msg
      },
      400
    );
  }

  return c.json({ error: msg || "가족 보호 API 오류", code: "FAMILY_INTERNAL" }, 500);
}
