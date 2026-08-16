import { formatLetteringPhoneDisplay } from "./letteringPhoneMatch.js";

function isCertifiedLine(line) {
  return Boolean(line?.isCertified || line?.kind === "mobile" || line?.kindLabel === "인증번호");
}

/** 번호 드롭다운·목록 라벨. 예: 010-6335-8746 (인증번호) 전중희 (사용 중) */
export function dccLineOptionLabel(line) {
  const phone = formatLetteringPhoneDisplay(line?.displayPhone || line?.phoneE164) || String(line?.displayPhone || "").trim();
  const name = String(line?.displayName || "").trim();
  const cert = isCertifiedLine(line) ? " (인증번호)" : "";
  const inUse = Boolean(line?.agentId || name);
  const core = `${phone}${cert}${name ? ` ${name}` : ""}`.trim();
  if (!core) return "번호";
  return inUse ? `${core} (사용 중)` : core;
}

export { isCertifiedLine };
