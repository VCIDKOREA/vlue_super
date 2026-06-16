/** 발신번호 유형 — 송출 명함에 성명 포함 여부 */

export function digitsOnly(raw) {
  return String(raw ?? "").replace(/\D/g, "");
}

/** @typedef {'national_rep' | 'regional' | 'mobile' | 'unknown'} OutboundPhoneKind */

/**
 * @param {string} raw
 * @returns {OutboundPhoneKind}
 */
export function classifyOutboundPhone(raw) {
  const d = digitsOnly(raw);
  if (!d) return "unknown";

  if (d.length === 8) return "national_rep";

  if (d.startsWith("010") || d.startsWith("011") || d.startsWith("016") || d.startsWith("017") || d.startsWith("018") || d.startsWith("019")) {
    if (d.length === 10 || d.length === 11) return "mobile";
  }

  if (d.startsWith("02")) {
    if (d.length === 9 || d.length === 10) return "regional";
  }

  if (/^0[3-6]\d/.test(d) && d.length >= 9 && d.length <= 11) {
    return "regional";
  }

  if (/^070/.test(d) && d.length >= 10) return "mobile";

  return "unknown";
}

/** 8자리 대표번호(1588·070 등) — 상호+번호만 송출 */
export function isCompanyNameOnlyOutbound(raw) {
  return classifyOutboundPhone(raw) === "national_rep";
}

/** 지역번호 포함 9~10자리 — 담당자 정보·서류 승인 필요 */
export function isStaffLineOutbound(raw) {
  return classifyOutboundPhone(raw) === "regional";
}

export function outboundPhoneKindLabel(kind) {
  if (kind === "national_rep") return "전국 대표번호 (8자리)";
  if (kind === "regional") return "지역번호 대표전화 (9~10자리)";
  if (kind === "mobile") return "휴대폰 번호";
  return "번호 형식 확인 필요";
}
