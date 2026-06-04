import { VMING_EVENTS } from "../../lib/vmingChatNotices.js";
import { VMING_CONSENT_LEGAL } from "../../lib/vmingConsentApi.js";
import { canShowConsentButton, isConsentRequester } from "../../lib/vmingConsentUi.js";

export default function VmingConsentChatBubble({
  msg,
  isDarkMode = false,
  myUserId = "",
  myName = "",
  consentStatus,
  onAcceptConsent,
  onDeclineConsent,
  onOpenConsentModal
}) {
  const event = msg.vmingEvent;
  const meta = msg.vmingMeta || {};

  if (event === VMING_EVENTS.CONSENT_PROGRESS) return null;

  const amRequester = isConsentRequester({
    myUserId,
    myName,
    requestedBy: consentStatus?.requestedBy || meta.requesterUserId,
    requesterName: meta.requesterName || consentStatus?.requesterName
  });

  const showConsentBtn = canShowConsentButton({
    myUserId,
    myName,
    consentStatus,
    msgMeta: meta
  });

  const requesterLabel = meta.requesterName || consentStatus?.requesterName || "방장";
  const displayText =
    event === VMING_EVENTS.CONSENT_REQUEST
      ? amRequester
        ? `🔐 ${requesterLabel}님이 브이밍 AI 초대를 요청했어요.\n멤버 동의를 기다리는 중이에요.`
        : `🔐 ${requesterLabel}님이 브이밍 AI 초대를 요청했어요.\n아래 [동의하기]를 눌러주세요.`
      : msg.text;

  const shell =
    event === VMING_EVENTS.JOINED
      ? isDarkMode
        ? "border-violet-500/40 bg-violet-950/40"
        : "border-violet-200 bg-violet-50"
      : event === VMING_EVENTS.LEFT
        ? isDarkMode
          ? "border-slate-500/40 bg-slate-800/50"
          : "border-slate-200 bg-slate-100"
        : isDarkMode
          ? "border-blue-500/35 bg-blue-950/35"
          : "border-blue-200 bg-blue-50";

  return (
    <div className="mb-3 flex justify-center px-2">
      <div className={`w-full max-w-[min(100%,22rem)] rounded-2xl border px-4 py-3 text-center shadow-sm ${shell}`}>
        <p className="whitespace-pre-wrap text-[12px] font-semibold leading-relaxed text-gray-800 dark:text-gray-100">
          {displayText}
        </p>

        {event === VMING_EVENTS.CONSENT_REQUEST && showConsentBtn ? (
          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              className="w-full rounded-xl bg-blue-600 py-3 text-[14px] font-bold text-white shadow-sm active:scale-[0.98]"
              onClick={onAcceptConsent}
            >
              동의하기
            </button>
            <button
              type="button"
              className="w-full rounded-xl border border-gray-300 bg-white py-2.5 text-[13px] font-bold text-gray-700 dark:border-white/20 dark:bg-transparent dark:text-gray-200"
              onClick={onDeclineConsent}
            >
              거절
            </button>
            <button
              type="button"
              className="w-full text-[11px] font-semibold text-blue-700 underline dark:text-blue-300"
              onClick={onOpenConsentModal}
            >
              자세히 보기
            </button>
          </div>
        ) : null}

        {event === VMING_EVENTS.CONSENT_REQUEST && amRequester ? (
          <p className="mt-2 text-[11px] text-gray-600 dark:text-gray-400">상대방 동의가 완료되면 브이밍이 입장합니다.</p>
        ) : null}

        {event === VMING_EVENTS.CONSENT_REQUEST && showConsentBtn ? (
          <p className="mt-2 text-[10px] leading-snug text-gray-500 dark:text-gray-400">{VMING_CONSENT_LEGAL}</p>
        ) : null}
      </div>
    </div>
  );
}
