import type { Context } from "hono";

/** Prisma/DB 스키마 불일치 시 500 대신 안내 메시지 반환 */
export function handleB2bRouteError(c: Context, route: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[b2b${route}]`, err);

  const schemaHint =
    msg.includes("does not exist") ||
    msg.includes("Unknown column") ||
    msg.includes("Invalid") ||
    msg.includes("b2b_enterprise") ||
    msg.includes("enum");

  if (schemaHint) {
    return c.json(
      {
        error:
          "B2B DB 스키마가 아직 적용되지 않았습니다. 터미널에서 packages/db 폴더로 이동 후 `npx prisma migrate deploy` 를 실행하고 API 서버를 재시작해 주세요.",
        code: "B2B_SCHEMA_NOT_READY",
        detail: msg
      },
      503
    );
  }

  return c.json({ error: msg || "B2B API 오류", code: "B2B_INTERNAL" }, 500);
}
