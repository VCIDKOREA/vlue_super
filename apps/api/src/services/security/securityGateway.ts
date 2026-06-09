import { createHash } from "node:crypto";

export type SecurityModuleId =
  | "family_protection"
  | "family_cross_security"
  | "pos_ledger"
  | "office_scan"
  | "fraud"
  | "broadcast_line";

export type GatewayEnvelope<T = Record<string, unknown>> = {
  module: SecurityModuleId;
  action: string;
  userId: string;
  payload: T;
  issuedAt: string;
  nonce: string;
};

const MAX_PAYLOAD_BYTES = 256 * 1024;

export function gatewayNonce(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** 모듈 간 데이터 교환 — 크기·모듈 화이트리스트 검증 */
export function assertGatewayEnvelope(
  module: SecurityModuleId,
  action: string,
  userId: string,
  payload: unknown
): GatewayEnvelope {
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("보안 게이트웨이: userId가 필요합니다.");
  const act = String(action || "").trim();
  if (!act) throw new Error("보안 게이트웨이: action이 필요합니다.");

  let safe: Record<string, unknown>;
  try {
    const json = JSON.stringify(payload ?? {});
    if (json.length > MAX_PAYLOAD_BYTES) {
      throw new Error("보안 게이트웨이: payload 크기 초과");
    }
    safe = JSON.parse(json) as Record<string, unknown>;
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "보안 게이트웨이: payload 직렬화 실패");
  }

  return {
    module,
    action,
    userId: uid,
    payload: safe,
    issuedAt: new Date().toISOString(),
    nonce: gatewayNonce()
  };
}

/** 로그 해시 체이닝 — 이전 log_hash를 다음 레코드에 포함 */
export function chainLogHash(prevLogHash: string | null | undefined, record: Record<string, unknown>): string {
  const base = JSON.stringify({
    prev: prevLogHash || "GENESIS",
    record
  });
  return sha256Hex(base);
}
