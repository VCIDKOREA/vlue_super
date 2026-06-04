import type { ChildBankTransaction } from "./childBankTransactionTypes.js";

/** 지원 에이전트 벤더 (확장 시 추가) */
export type BankingAgentVendor = "vlue_internal" | "openbanking_kft" | "openbanking_generic";

export type AgentRawPayload = Record<string, unknown>;

function pickString(obj: AgentRawPayload, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return "";
}

function pickNumber(obj: AgentRawPayload, keys: string[]): number {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return Math.abs(Math.floor(v));
    if (typeof v === "string" && v.trim()) {
      const n = Number(String(v).replace(/,/g, ""));
      if (Number.isFinite(n)) return Math.abs(Math.floor(n));
    }
  }
  return 0;
}

function mapDirection(raw: string): "in" | "out" {
  const s = raw.trim().toLowerCase();
  if (
    s === "in" ||
    s === "deposit" ||
    s === "입금" ||
    s === "credit" ||
    s === "1" ||
    s === "dep"
  ) {
    return "in";
  }
  return "out";
}

function detectVendor(body: AgentRawPayload): BankingAgentVendor {
  if (body.wardUserId || body.ward_user_id) return "vlue_internal";
  if (body.tran_amt != null || body.inout_type != null || body.print_content != null) {
    return "openbanking_kft";
  }
  if (body.transaction_id != null && body.account_number != null) return "openbanking_generic";
  return "vlue_internal";
}

/**
 * 금융 에이전트·오픈뱅킹 웹훅 RAW JSON → 표준 ChildBankTransaction
 */
export function mapAgentPayloadToChildBankTransaction(
  raw: unknown,
  vendor?: BankingAgentVendor
): { ok: true; tx: ChildBankTransaction; vendor: BankingAgentVendor } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "JSON body 필요" };
  }

  const body = raw as AgentRawPayload;
  const resolvedVendor = vendor || detectVendor(body);

  const wardUserId = pickString(body, [
    "wardUserId",
    "ward_user_id",
    "user_id",
    "userId",
    "member_id",
    "customer_id"
  ]);
  if (!wardUserId) {
    return { ok: false, error: "wardUserId(또는 user_id) 필요" };
  }

  const amountKrw = pickNumber(body, [
    "amountKrw",
    "amount_krw",
    "tran_amt",
    "transaction_amount",
    "amount",
    "trade_amount"
  ]);
  if (amountKrw <= 0) {
    return { ok: false, error: "amountKrw(또는 tran_amt) 필요" };
  }

  const directionRaw = pickString(body, [
    "direction",
    "inout_type",
    "transaction_type",
    "tran_type",
    "deposit_withdrawal"
  ]);
  const direction = mapDirection(directionRaw || (body.direction as string) || "out");

  const counterpartyName = pickString(body, [
    "counterpartyName",
    "counterparty_name",
    "print_content",
    "depositor_name",
    "withdrawal_account_holder_name",
    "sender_name",
    "receiver_name",
    "remitter_name",
    "payee_name"
  ]);

  const counterpartyMasked = pickString(body, [
    "counterpartyMasked",
    "counterparty_masked",
    "account_number_masked",
    "account_masked",
    "counter_account_no"
  ]);

  const accountMasked = pickString(body, [
    "accountMasked",
    "account_masked",
    "account_number",
    "acct_no"
  ]);

  const bankCode = pickString(body, ["bankCode", "bank_code", "bank_std_cd", "institution_code"]);

  const transactedAt = pickString(body, [
    "transactedAt",
    "transacted_at",
    "tran_dt",
    "transaction_datetime",
    "processed_at"
  ]);

  const externalTransactionId = pickString(body, [
    "externalTransactionId",
    "external_transaction_id",
    "transaction_id",
    "tran_id",
    "api_tran_id"
  ]);

  const explicitUnknown = body.isUnknownPayee;
  const isUnknownPayee =
    explicitUnknown === true
      ? true
      : explicitUnknown === false
        ? false
        : undefined;

  const tx: ChildBankTransaction = {
    wardUserId,
    amountKrw,
    direction,
    counterpartyName: counterpartyName || null,
    counterpartyMasked: counterpartyMasked || null,
    isUnknownPayee,
    source: "openbanking",
    requireConsent: true,
    externalTransactionId: externalTransactionId || null,
    transactedAt: transactedAt || null,
    accountMasked: accountMasked || null,
    bankCode: bankCode || null
  };

  return { ok: true, tx, vendor: resolvedVendor };
}
