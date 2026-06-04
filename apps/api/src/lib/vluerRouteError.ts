import type { Context } from "hono";

function errCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err) {
    const c = (err as { code?: unknown }).code;
    return typeof c === "string" ? c : undefined;
  }
  return undefined;
}

/** VLUER 대시보드·레퍼럴 API — DB 미적용·인증 오류 구분 */
export function handleVluerRouteError(c: Context, route: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  const code = errCode(err);
  console.error(`[vluer${route}]`, err);

  if (code === "USER_NOT_FOUND" || msg.includes("USER_NOT_FOUND")) {
    return c.json(
      {
        error: "로그인 계정이 서버에 없습니다. 다시 로그인해 주세요.",
        code: "USER_NOT_FOUND",
        detail: msg
      },
      401
    );
  }

  const schemaHint =
    msg.includes("does not exist") ||
    msg.includes("Unknown column") ||
    msg.includes("referral_attributions") ||
    msg.includes("vluer_code_change") ||
    msg.includes("vluer_referral_penalt") ||
    msg.includes("b2b_enterprise") ||
    msg.includes("commission_ledger") ||
    msg.includes("cumulative_b2b_enterprises") ||
    msg.includes("Invalid `prisma") ||
    msg.includes("Cannot read properties of undefined") ||
    msg.includes("is not a function");

  if (schemaHint) {
    return c.json(
      {
        error:
          "VLUER 레퍼럴 DB가 아직 적용되지 않았습니다. packages/db 에서 `npx prisma generate` 와 `npx prisma migrate deploy` 실행 후 API를 재시작해 주세요.",
        code: "VLUER_SCHEMA_NOT_READY",
        detail: msg
      },
      503
    );
  }

  const fkHint =
    msg.includes("Foreign key constraint") ||
    msg.includes("violates foreign key") ||
    msg.includes("P2003");
  if (fkHint) {
    return c.json(
      {
        error: "로그인 계정이 서버에 등록되지 않았습니다. 다시 로그인한 뒤 시도해 주세요.",
        code: "USER_NOT_FOUND",
        detail: msg
      },
      401
    );
  }

  return c.json({ error: msg || "VLUER API 오류", code: "VLUER_INTERNAL" }, 500);
}
