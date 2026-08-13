/** 숫자만 추출 (대조용) */
export function normalizePhoneDigits(raw) {
  return String(raw || "").replace(/\D/g, "");
}

/** 오버레이 extras / CallLog 가 넣는 미지정 토큰 — 화면에 그대로 보여주지 않음 */
export function isUnknownPhoneToken(raw) {
  const s = String(raw || "").trim();
  if (!s) return true;
  if (s === "-" || s === "—" || s === "-1") return true;
  const compact = s.toLowerCase().replace(/\s+/g, "");
  if (
    compact === "unknown" ||
    compact === "null" ||
    compact === "anonymous" ||
    compact === "private" ||
    compact === "restricted" ||
    compact === "withheld" ||
    compact === "알수없음" ||
    compact === "알수없음."
  ) {
    return true;
  }
  return !/\d/.test(s);
}

/**
 * 한국 번호 표시용 국내 자릿수 (010… / 02…)
 * +82·82·010 혼용을 0으로 시작하는 국내형으로 통일
 */
export function toKoreaNationalDigits(raw) {
  let d = normalizePhoneDigits(raw);
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("82") && d.length >= 10) {
    d = `0${d.slice(2)}`;
  }
  return d;
}

/**
 * 화면 표시용 — 010-0000-0000 / 02-XXXX-XXXX 통일
 * (82… 원시 숫자열·E.164 모두 동일 포맷)
 */
export function formatLetteringPhoneDisplay(raw) {
  if (isUnknownPhoneToken(raw)) return "";
  const d = toKoreaNationalDigits(raw);
  if (!d) return "";

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
