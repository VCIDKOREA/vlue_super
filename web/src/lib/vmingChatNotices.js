/** 채팅창 인라인 브이밍 시스템 알림 페이로드 */

export const VMING_EVENTS = {
  CONSENT_REQUEST: "consent_request",
  CONSENT_PROGRESS: "consent_progress",
  JOINED: "joined",
  LEFT: "left",
  DECLINED: "declined"
};

export function buildVmingConsentRequestMessage({
  requesterName,
  requesterUserId = "",
  acceptedCount = 0,
  requiredCount = 1,
  forRequester = false
}) {
  const progressLine = forRequester ? "멤버 동의를 기다리는 중이에요." : "";
  const actionLine = forRequester ? "" : "아래 [동의하기]를 눌러주세요.";

  return {
    type: "system",
    disableAutoReply: true,
    vmingEvent: VMING_EVENTS.CONSENT_REQUEST,
    vmingMeta: { requesterName, requesterUserId, acceptedCount, requiredCount, forRequester },
    text: [`🔐 ${requesterName}님이 브이밍 AI 초대를 요청했어요.`, progressLine, actionLine]
      .filter(Boolean)
      .join("\n")
  };
}

export function buildVmingConsentProgressMessage({ acceptedCount, requiredCount, pendingUsers = [] }) {
  const pending =
    pendingUsers.length > 0 ? `\n대기 중: ${pendingUsers.join(", ")}` : "";
  return {
    type: "system",
    disableAutoReply: true,
    vmingEvent: VMING_EVENTS.CONSENT_PROGRESS,
    vmingMeta: { acceptedCount, requiredCount, pendingUsers },
    text: `🔐 브이밍 AI 동의 현황: ${acceptedCount}/${requiredCount}명${pending}`
  };
}

export function buildVmingJoinedMessage() {
  return {
    type: "system",
    disableAutoReply: true,
    vmingEvent: VMING_EVENTS.JOINED,
    text: "🤖 브이밍 AI가 채팅방에 합류하였습니다."
  };
}

export function buildVmingLeftMessage() {
  return {
    type: "system",
    disableAutoReply: true,
    vmingEvent: VMING_EVENTS.LEFT,
    text: "🔐 브이밍 AI가 채팅방에서 퇴장하였습니다."
  };
}

export function buildVmingDeclinedMessage({ userName }) {
  return {
    type: "system",
    disableAutoReply: true,
    vmingEvent: VMING_EVENTS.DECLINED,
    text: userName
      ? `${userName}님이 브이밍 AI 초대를 거절했어요.`
      : "브이밍 AI 초대가 거절되었어요."
  };
}

export function isVmingConsentSatisfied(status) {
  if (!status) return false;
  const total = status.requiredCount ?? status.totalCount ?? 0;
  const accepted = status.acceptedCount ?? 0;
  if (total <= 0) return false;
  const mode = status.consentMode || "all";
  if (mode === "all") return accepted >= total;
  if (mode === "majority") return accepted >= Math.ceil(total / 2);
  if (mode === "partial") return accepted >= 1;
  return false;
}
