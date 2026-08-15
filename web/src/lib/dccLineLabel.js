/** 번호 드롭다운·목록에 쓰는 한 줄 라벨. 예: 010-6335-8746 전중희 (사용 중) */
export function dccLineOptionLabel(line) {
  const phone = String(line?.displayPhone || "").trim();
  const name = String(line?.displayName || "").trim();
  const inUse = Boolean(line?.agentId || name);
  const core = [phone, name].filter(Boolean).join(" ");
  if (!core) return "번호";
  return inUse ? `${core} (사용 중)` : core;
}
