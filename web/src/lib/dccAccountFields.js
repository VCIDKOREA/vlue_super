/** DCC 명함 계좌 — 지갑 출금 계좌와 별개 (exportSnapshot / editable) */

export const DCC_ACCOUNT_TYPES = Object.freeze({
  PERSONAL: "PERSONAL",
  BUSINESS: "BUSINESS",
  GROUP: "GROUP"
});

export const DCC_BANK_OPTIONS = Object.freeze([
  "국민은행",
  "신한은행",
  "우리은행",
  "하나은행",
  "NH농협",
  "카카오뱅크",
  "토스뱅크",
  "IBK기업은행",
  "SC제일은행",
  "케이뱅크",
  "우체국",
  "새마을금고",
  "신협",
  "기타"
]);

export const DCC_ACCOUNT_DISCLAIMER =
  "본 명함에 기재된 계좌정보는 소유자의 입력에 의존하며, 송금 전 예금주명을 반드시 확인해주세요";

export function normalizeDccAccountType(raw) {
  const t = String(raw || "").trim().toUpperCase();
  if (t === "PERSONAL" || t === "BUSINESS" || t === "GROUP") return t;
  return "";
}

export function digitsOnlyAccount(raw) {
  return String(raw || "").replace(/\D/g, "");
}

/**
 * 클립보드용: `은행명 계좌번호(숫자만) 예금주`
 * 예: 국민은행 1234567890 홍길동
 */
export function formatDccAccountCopyText({ bankName, accountNumber, accountHolder }) {
  const bank = String(bankName || "").trim();
  const num = digitsOnlyAccount(accountNumber);
  const holder = String(accountHolder || "").trim();
  return [bank, num, holder].filter(Boolean).join(" ");
}

/** 뷰어 노출 가능 여부 — GROUP 은 승인 후에만. 은행·계좌번호만 있으면 표시(예금주 누락으로 숨김 방지) */
export function canShowDccAccountOnCard(card = {}) {
  let type = normalizeDccAccountType(card.accountType);
  const bank = String(card.bankName || "").trim();
  const num = digitsOnlyAccount(card.accountNumber);
  if (!bank || !num) return false;
  /* 유형만 비어 있어도 은행·계좌가 있으면 표시 */
  if (!type) type = DCC_ACCOUNT_TYPES.PERSONAL;
  if (type === DCC_ACCOUNT_TYPES.GROUP && !card.isGroupVerified) return false;
  return true;
}

export function sanitizeDccAccountFields(
  input = {},
  { lockedHolderName = "", lockedCompanyName = "" } = {}
) {
  let accountType = normalizeDccAccountType(input.accountType);
  const bankName = String(input.bankName || "").trim().slice(0, 40);
  const accountNumber = digitsOnlyAccount(input.accountNumber).slice(0, 30);
  let accountHolder = String(input.accountHolder || "").trim().slice(0, 80);

  /* 유형만 빠진 채 은행·계좌가 있으면 유실 방지 — 사업자/개인 추론 */
  if (!accountType && bankName && accountNumber) {
    accountType = lockedCompanyName ? DCC_ACCOUNT_TYPES.BUSINESS : DCC_ACCOUNT_TYPES.PERSONAL;
  }

  if (accountType === DCC_ACCOUNT_TYPES.PERSONAL && lockedHolderName) {
    accountHolder = String(lockedHolderName).trim().slice(0, 80);
  }
  if (accountType === DCC_ACCOUNT_TYPES.BUSINESS && lockedCompanyName) {
    accountHolder = String(lockedCompanyName).trim().slice(0, 80);
  }
  const isGroupVerified =
    accountType === DCC_ACCOUNT_TYPES.GROUP ? Boolean(input.isGroupVerified) : false;
  const accountGroupDocName =
    accountType === DCC_ACCOUNT_TYPES.GROUP
      ? String(input.accountGroupDocName || "").trim().slice(0, 200)
      : "";
  const accountGroupDocDataUrl =
    accountType === DCC_ACCOUNT_TYPES.GROUP
      ? String(input.accountGroupDocDataUrl || "").trim()
      : "";

  /* 유형이 없어도 입력값은 유지 — 빈 객체로 지우면 DCC에서 잠깐 보이다 사라짐 */
  if (!accountType) {
    return {
      accountType: "",
      bankName,
      accountNumber,
      accountHolder,
      isGroupVerified: false,
      accountGroupDocName: "",
      accountGroupDocDataUrl: ""
    };
  }

  return {
    accountType,
    bankName,
    accountNumber,
    accountHolder,
    isGroupVerified,
    accountGroupDocName,
    accountGroupDocDataUrl
  };
}
