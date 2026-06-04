/** 가족보호 — 표준 입출금 이벤트 (recordChildBankTransaction 입력) */
export type ChildBankTransaction = {
  wardUserId: string;
  amountKrw: number;
  direction: "in" | "out";
  counterpartyName?: string | null;
  counterpartyMasked?: string | null;
  /** 미지정 시 화이트리스트·동의 scopes 로 자동 판별 */
  isUnknownPayee?: boolean;
  source?: string;
  requireConsent?: boolean;
  /** 에이전트 원거래 ID (멱등·감사) */
  externalTransactionId?: string | null;
  transactedAt?: string | null;
  accountMasked?: string | null;
  bankCode?: string | null;
};

export type ChildBankTransactionResult = {
  ok: boolean;
  notified?: number;
  isAccountAgreed?: boolean;
  isUnknownPayee?: boolean;
  reason?: string;
  message?: string;
  transactionId?: string;
  filterReasons?: string[];
  error?: string;
};
