/** 숫자만 추출 (대조용) */
export function normalizePhoneDigits(raw) {
  return String(raw || "").replace(/\D/g, "");
}

/** 화면 표시용 포맷 */
export function formatLetteringPhoneDisplay(raw) {
  const digits = normalizePhoneDigits(raw);
  if (digits.length === 11 && digits.startsWith("010")) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 9 && digits.startsWith("02")) {
    return `02-${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  if (digits.length >= 8) return digits;
  return String(raw || "—").trim() || "—";
}

/**
 * 걸려온 번호 vs VLUE 등록 번호 대조
 * 불일치 시에는 미인증 UI로 분기하므로 mismatch 문구·상태는 사용하지 않음.
 * @returns {{ matched: boolean, status: "match"|"unknown", incomingDisplay: string, registeredDisplay: string, summary: string } | null}
 */
export function compareLetteringPhones(incomingRaw, registeredRaw) {
  const incoming = normalizePhoneDigits(incomingRaw);
  const registered = normalizePhoneDigits(registeredRaw);
  const incomingDisplay = formatLetteringPhoneDisplay(incomingRaw);
  const registeredDisplay = formatLetteringPhoneDisplay(registeredRaw);

  if (!incoming || !registered) {
    return {
      matched: false,
      status: "unknown",
      incomingDisplay,
      registeredDisplay,
      summary: "번호 정보를 확인할 수 없습니다."
    };
  }

  if (incoming !== registered) {
    return null;
  }

  return {
    matched: true,
    status: "match",
    incomingDisplay,
    registeredDisplay,
    summary: "VLUE 인증 등록번호 입니다."
  };
}
