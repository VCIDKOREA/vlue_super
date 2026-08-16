/** 숫자만 추출 (대조용) */
export function normalizePhoneDigits(raw) {
  return String(raw || "").replace(/\D/g, "");
}

/** 전국 대표번호 8자리 (1577·1588·1600·1800 등) — 010 휴대와 구분 */
export function isNationwideRepresentativeDigits(d) {
  return /^1[3-9]\d{6}$/.test(String(d || ""));
}

/**
 * 한국 번호 표시용 국내 자릿수 (010… / 02… / 1577…)
 * +82·82·010 혼용을 국내형으로 통일. 대표번호는 앞에 0을 붙이지 않는다.
 */
export function toKoreaNationalDigits(raw) {
  let d = normalizePhoneDigits(raw);
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("82")) {
    const rest = d.slice(2);
    if (isNationwideRepresentativeDigits(rest)) return rest;
    d = rest.startsWith("0") ? rest : `0${rest}`;
  }
  if (d.length === 9 && d.startsWith("0") && isNationwideRepresentativeDigits(d.slice(1))) {
    return d.slice(1);
  }
  return d;
}

/**
 * 화면 표시용 — 010-0000-0000 / 02-XXXX-XXXX / 1577-8746 통일
 */
export function formatLetteringPhoneDisplay(raw) {
  const d = toKoreaNationalDigits(raw);
  if (!d) return String(raw || "—").trim() || "—";

  if (isNationwideRepresentativeDigits(d)) {
    return `${d.slice(0, 4)}-${d.slice(4)}`;
  }
  if (d.length === 11 && d.startsWith("01")) {
    return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10 && d.startsWith("02")) {
    return `02-${d.slice(2, 6)}-${d.slice(6)}`;
  }
  if (d.length === 9 && d.startsWith("02")) {
    return `02-${d.slice(2, 5)}-${d.slice(5)}`;
  }
  if (d.length === 10 && d.startsWith("0")) {
    return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  }
  if (d.length === 11 && d.startsWith("0")) {
    return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  }
  return d.length >= 8 ? d : String(raw || "—").trim() || "—";
}

/**
 * 걸려온 번호 vs VLUE 등록 번호 대조
 * 불일치 시에는 미인증 UI로 분기하므로 mismatch 문구·상태는 사용하지 않음.
 * @returns {{ matched: boolean, status: "match"|"unknown", incomingDisplay: string, registeredDisplay: string, summary: string } | null}
 */
export function compareLetteringPhones(incomingRaw, registeredRaw) {
  const incoming = toKoreaNationalDigits(incomingRaw) || normalizePhoneDigits(incomingRaw);
  const registered = toKoreaNationalDigits(registeredRaw) || normalizePhoneDigits(registeredRaw);
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
