/** 브이밍 동의 UI — 초대자 제외 인원 계산 */

export function votersRequiredCount({ isGroupRoom, groupMemberCount = 2 }) {
  if (isGroupRoom) return Math.max(1, groupMemberCount - 1);
  return 1;
}

export function resolveMyIdentityIds(myUserId = "") {
  const ids = [myUserId];
  try {
    const sid = localStorage.getItem("vlue_server_user_id");
    if (sid) ids.push(sid);
  } catch {
    /* ignore */
  }
  return ids.filter(Boolean);
}

export function isSameVlueUser(a, b) {
  if (!a || !b) return false;
  return String(a) === String(b);
}

export function isConsentRequester({
  myUserId = "",
  myName = "",
  requestedBy = "",
  requesterName = ""
}) {
  const ids = resolveMyIdentityIds(myUserId);
  if (requestedBy && ids.some((id) => isSameVlueUser(id, requestedBy))) return true;
  const me = String(myName || "").trim();
  const req = String(requesterName || "").trim();
  if (me && req && me === req) return true;
  return false;
}

export function canShowConsentButton({
  myUserId = "",
  myName = "",
  consentStatus,
  msgMeta = {}
}) {
  const requestedBy = consentStatus?.requestedBy || msgMeta.requesterUserId || "";
  const requesterName = msgMeta.requesterName || consentStatus?.requesterName || "";
  if (isConsentRequester({ myUserId, myName, requestedBy, requesterName })) return false;

  const ids = resolveMyIdentityIds(myUserId);
  const myRow = consentStatus?.members?.find((m) => ids.some((id) => isSameVlueUser(id, m.userId)));
  if (myRow?.consentStatus === "pending") return true;
  if (myRow?.consentStatus === "accepted" || myRow?.consentStatus === "declined") return false;

  // API 미연결·데모: 초대자가 아니면 동의 버튼 표시
  return true;
}

export function consentCountsFromStatus(status) {
  if (!status) return { accepted: 0, required: 1 };
  return {
    accepted: status.acceptedCount ?? 0,
    required: status.requiredCount ?? status.totalCount ?? 1
  };
}
