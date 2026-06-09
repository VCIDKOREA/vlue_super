/** 사업자 등록·승인 완료 사용자 — POS 매출전표/장부 기능 노출 기준 */
export function readBusinessMemberFlag() {
  try {
    return localStorage.getItem("vlue_business_member") === "1";
  } catch {
    return false;
  }
}

export function canUsePosLedgerFeatures(serverFlag) {
  if (typeof serverFlag === "boolean") return serverFlag;
  return readBusinessMemberFlag();
}
