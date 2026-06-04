import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import ModalCloseButton from "./common/ModalCloseButton";
import GeneralLetteringCard from "./GeneralLetteringCard.jsx";
import { VLUE_CARD_CAUTION, digitalCardBadgeText, digitalCardRoleLine } from "../lib/vlueDigitalCardUi.js";
import { enrichMessagesForUi, formatDatePill } from "../lib/chatMessageUi.js";
import VoiceWaveform from "./chat/VoiceWaveform.jsx";
import { getRoomNotice } from "../lib/chatRoomNoticeStorage.js";
import { noticeReadLabel } from "../lib/chatRoomNoticeService.js";
import VmingConsentChatBubble from "./chat/VmingConsentChatBubble.jsx";

const MessageList = forwardRef(function MessageList({
  roomId,
  messages,
  roomName,
  onOpenMenu,
  onOpenProfileMenu,
  myMembershipTier,
  myCardUserId = "me",
  cardOrganization,
  cardTitle,
  cardName,
  cardPhone = "",
  cardIntroBack = "",
  walletCards = [],
  profileByRoomId = {},
  onSaveCardToWallet,
  onSaveToContacts,
  isDarkMode = false,
  isGroupRoom = false,
  groupMemberCount = 3,
  scrollerClassName = "",
  showReadReceipts = true,
  onOpenCalendarNotice,
  vmingConsentStatus = null,
  myName = "",
  onVmingAcceptConsent,
  onVmingDeclineConsent,
  onVmingOpenConsentModal
}, ref) {
  const scrollToBottom = (behavior = "smooth") => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight + 9999, behavior });
  };
  const scrollerRef = useRef(null);
  const audioRefById = useRef({});
  const [playingAudioId, setPlayingAudioId] = useState("");
  const [flippedCardId, setFlippedCardId] = useState("");
  const [saveModal, setSaveModal] = useState({ open: false, fileName: "", content: "" });
  const [saveNotice, setSaveNotice] = useState("");
  const seenCardViewIdsRef = useRef(new Set());

  const saveContactsFromCard = async (card) => {
    if (!onSaveToContacts) return;
    const r = await onSaveToContacts(card);
    if (r?.cancelled) return;
    if (r?.ok) {
      setSaveNotice(
        r.method === "share"
          ? "공유 메뉴에서 연락처 앱을 선택하세요."
          : r.method === "native"
            ? "연락처 앱으로 전달했습니다."
            : "vCard를 받았습니다. 파일을 열어 주소록에 추가하세요."
      );
    } else {
      setSaveNotice(r?.error || "연락처 저장에 실패했습니다.");
    }
  };

  useImperativeHandle(ref, () => ({
    scrollToBottom
  }));

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    // 방 전환/신규 메시지 모두 강제 하단 고정
    scrollToBottom("auto");
    const rafId = requestAnimationFrame(() => {
      scrollToBottom("smooth");
      setTimeout(() => scrollToBottom("smooth"), 24);
    });
    return () => cancelAnimationFrame(rafId);
  }, [messages, roomId]);

  useEffect(() => {
    if (!saveNotice) return;
    const t = setTimeout(() => setSaveNotice(""), 1800);
    return () => clearTimeout(t);
  }, [saveNotice]);

  useEffect(() => {
    messages.forEach((msg) => {
      const isCardMessage = Boolean(msg.card) || (msg.text || "").startsWith("[명함카드]");
      if (!isCardMessage || msg.type === "me") return;
      if (seenCardViewIdsRef.current.has(msg.id)) return;
      seenCardViewIdsRef.current.add(msg.id);
      window.dispatchEvent(new CustomEvent("vlue-kpi-event", { detail: { kind: "card_viewed" } }));
    });
  }, [messages]);

  const uiMessages = useMemo(() => enrichMessagesForUi(messages), [messages]);

  let lastMeIndex = -1;
  uiMessages.forEach((m, idx) => {
    if (m.type === "me") lastMeIndex = idx;
  });

  const scrollerBg = isDarkMode ? "bg-[#0b1220]" : "bg-white";

  const bindLongPress = (msg, isInteractive) => (e) => {
    if (!isInteractive || !onOpenMenu) return;
    const openAt = (clientX, clientY) => {
      onOpenMenu?.(
        { clientX, clientY, preventDefault() {}, stopPropagation() {} },
        msg
      );
    };
    if (e.type === "contextmenu") {
      e.preventDefault();
      openAt(e.clientX, e.clientY);
      return;
    }
    const touch = e.touches?.[0];
    if (!touch) return;
    const timer = setTimeout(() => openAt(touch.clientX, touch.clientY), 500);
    e.currentTarget._holdTimer = timer;
  };

  return (
    <div ref={scrollerRef} className={`flex-1 overflow-y-auto px-2 pb-3 pt-3 ${scrollerBg} ${scrollerClassName}`}>
      <div className="min-h-full flex flex-col justify-end">
      {uiMessages.map((msg, idx) => {
        const isCardMessage = Boolean(msg.card) || (msg.text || "").startsWith("[명함카드]");
        if (isCardMessage) {
          const isMe = msg.type === "me";
          const cardData = msg.card || {
            userId: myCardUserId,
            membershipTier: myMembershipTier,
            organization: cardOrganization,
            title: cardTitle,
            name: cardName,
            phone: cardPhone,
            introBack: cardIntroBack
          };
          const liveProfile = profileByRoomId[cardData.userId] || {};
          const mergedCard = { ...cardData, ...liveProfile };
          const tier = mergedCard.membershipTier || "free";
          const isPremium = tier === "premium";
          const isStandard = tier === "standard";
          const isFree = !isPremium && !isStandard;
          const tierKey = isPremium ? "premium" : isStandard ? "standard" : "free";
          const badge = digitalCardBadgeText(tierKey);
          const org = (mergedCard.organization || "VLUE").trim();
          const stdRoleLine = digitalCardRoleLine({
            title: mergedCard.title,
            name: mergedCard.name,
            organization: org
          });
          // 등급별 카드 UI는 vcidLettering 토글과 분리해서 항상 노출
          const showGeneralLettering = isFree;
          const isFlipped = flippedCardId === msg.id;
          const isSaved = walletCards.some((item) => item.userId === mergedCard.userId);
          const logoUrl = mergedCard.logoUrl || "";
          const backText = String(mergedCard.introBack || "서비스 소개 내용을 등록해보세요.").trim();
          const backLines = [
            { icon: "✉", label: "e-mail", value: mergedCard.email || "" },
            { icon: "📍", label: "주소", value: mergedCard.address || "" },
            { icon: "☎", label: "대표번호", value: mergedCard.landline || "" },
            { icon: "📠", label: "팩스번호", value: mergedCard.fax || "" }
          ].filter((line) => line.value);
          const backNote = String(mergedCard.backNote || backText).trim();
          const BackIcon = ({ type }) => {
            const cls = "h-3.5 w-3.5 shrink-0 text-violet-200/90";
            if (type === "email") {
              return (
                <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.9">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M4 7l8 6 8-6" />
                </svg>
              );
            }
            if (type === "address") {
              return (
                <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.9">
                  <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11z" />
                  <circle cx="12" cy="10" r="2.4" />
                </svg>
              );
            }
            if (type === "fax") {
              return (
                <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.9">
                  <path d="M7 8V4h10v4" />
                  <rect x="5" y="8" width="14" height="10" rx="2" />
                  <path d="M8 13h8M8 16h5" />
                </svg>
              );
            }
            return (
              <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.9">
                <path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 11.2 19a19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.2 4.3 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2.1z" />
              </svg>
            );
          };
          if (showGeneralLettering) {
            return (
              <div key={msg.id} className={`mb-3 flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className="mx-auto w-[min(292px,84vw)] max-w-full">
                  <GeneralLetteringCard />
                  <div className="mt-1.5 flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSaveCardToWallet?.(mergedCard);
                        window.dispatchEvent(new CustomEvent("vlue-kpi-event", { detail: { kind: "card_saved" } }));
                      }}
                      className="rounded-md border border-blue-200 bg-white px-2 py-0.5 text-[10px] font-bold text-blue-600"
                    >
                      {isSaved ? "명함 저장됨" : "명함 저장하기"}
                    </button>
                    {!isMe && onSaveToContacts && (
                      <button
                        type="button"
                        onClick={() => void saveContactsFromCard(mergedCard)}
                        className="rounded-md border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-bold text-emerald-700"
                      >
                        휴대폰에 저장
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          }
          return (
            <div key={msg.id} className={`mb-3 flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className="w-[min(292px,84vw)] max-w-full mx-auto">
                <button
                  type="button"
                  onClick={() => {
                    if (isPremium) setFlippedCardId((prev) => (prev === msg.id ? "" : msg.id));
                  }}
                  className={`digital-card-message relative h-[174px] w-full overflow-hidden rounded-3xl border p-2.5 text-center shadow-[0_8px_24px_rgba(37,99,235,0.12)] ${
                    isPremium
                      ? "border border-violet-900/70 bg-gradient-to-br from-[#0b1020] via-[#1e1b4b] via-[#312e81] to-[#111827]"
                      : "border border-blue-200/90 bg-gradient-to-b from-[#e0efff] via-[#eaf4ff] to-[#d2e8fc]"
                  }`}
                >
                  {isPremium ? (
                    <div
                      className="pointer-events-none absolute inset-0 z-0 rounded-3xl bg-gradient-to-r from-transparent via-violet-300/35 via-cyan-300/25 via-fuchsia-300/25 to-transparent shimmer-bg"
                      aria-hidden
                    />
                  ) : isStandard ? (
                    <div
                      className="pointer-events-none absolute inset-0 z-0 rounded-3xl bg-gradient-to-r from-blue-100/30 via-sky-400/75 via-blue-500/72 via-blue-600/68 via-sky-300/70 to-blue-100/30 shimmer-bg"
                      aria-hidden
                    />
                  ) : null}
                  {isPremium ? (
                    <div className="relative z-10 h-[138px] card-flip-wrap">
                      <div className={`card-flip-inner ${isFlipped ? "is-flipped" : ""}`}>
                        <div className="card-face front flex flex-col justify-start pt-0.5 pb-0 text-center">
                          <div className="mb-1 flex items-center justify-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#c4b5fd" aria-hidden>
                              <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
                            </svg>
                            <span className="text-[9px] font-black tracking-widest text-violet-200">{badge}</span>
                          </div>
                          <div className="flex items-center justify-center gap-2">
                            <span className="inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-md border border-violet-300/60 bg-violet-950/30 text-[8px] font-black text-violet-100">
                              {logoUrl ? <img src={logoUrl} alt="logo" className="h-full w-full object-cover" /> : "LOGO"}
                            </span>
                            <p className="text-center text-[18px] font-black tracking-tight text-slate-100">{org}</p>
                          </div>
                          {stdRoleLine ? <p className="mt-1.5 text-center text-[13px] font-bold text-violet-100">{stdRoleLine}</p> : null}
                          {mergedCard.phone && <p className="mt-1 text-center text-[11px] text-slate-300">{mergedCard.phone}</p>}
                          <div className="mt-1.5 flex justify-center gap-2">
                            <span className="rounded-md border border-violet-300/70 bg-violet-950/30 px-2 py-0.5 text-[10px] font-bold text-violet-100">상세보기</span>
                            <span className="rounded-md border border-violet-300/70 bg-violet-950/30 px-2 py-0.5 text-[10px] font-bold text-violet-100">인증서보기</span>
                          </div>
                          <p className="mt-0 text-center text-[10px] leading-tight text-slate-400">{VLUE_CARD_CAUTION}</p>
                        </div>
                        <div className="card-face back flex flex-col justify-start pt-0.5 pb-0 text-center">
                          <div className="mx-auto w-full max-w-[210px] text-left">
                            {backLines.map((line) => (
                              <div key={line.label} className="flex items-start gap-1.5 text-[9.5px] leading-snug text-slate-300">
                                <BackIcon type={line.label === "e-mail" ? "email" : line.label === "주소" ? "address" : line.label === "팩스번호" ? "fax" : "phone"} />
                                <p>{line.label} : {line.value}</p>
                              </div>
                            ))}
                            {backNote && <p className="mt-1 text-[9.5px] leading-snug text-slate-300">{backNote}</p>}
                          </div>
                          <p className="mt-0 text-center text-[10px] leading-tight text-slate-300">탭하면 앞면으로 돌아갑니다.</p>
                        </div>
                      </div>
                    </div>
                  ) : isStandard ? (
                    <div className="absolute inset-0 z-10 flex flex-col justify-center px-1 text-center">
                      <div className="mt-0.5 flex items-center justify-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#2563eb" aria-hidden>
                          <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
                        </svg>
                        <p className="text-center text-[12px] font-bold text-blue-600">{badge}</p>
                      </div>
                      <div className="mt-2 flex items-center justify-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg border border-blue-200/90 bg-white text-[8px] font-black text-blue-700 shadow-sm">
                          {logoUrl ? <img src={logoUrl} alt="logo" className="h-full w-full object-cover" /> : "LOGO"}
                        </span>
                        <p className="text-center text-[18px] font-black tracking-tight text-[#0f172a]">{org}</p>
                      </div>
                      {stdRoleLine ? <p className="mt-2 text-center text-[13px] font-bold text-[#0f172a]">{stdRoleLine}</p> : null}
                      {mergedCard.phone ? <p className="mt-1 text-center text-[12px] font-medium text-[#4b5563]">{mergedCard.phone}</p> : null}
                      <p className="mt-2.5 text-center text-[10px] leading-snug text-[#6b7280]">{VLUE_CARD_CAUTION}</p>
                    </div>
                  ) : null}
                </button>
                <div className="mt-1.5 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSaveCardToWallet?.(mergedCard);
                      window.dispatchEvent(new CustomEvent("vlue-kpi-event", { detail: { kind: "card_saved" } }));
                    }}
                    className="rounded-md border border-blue-200 bg-white px-2 py-0.5 text-[10px] font-bold text-blue-600"
                  >
                    {isSaved ? "명함 저장됨" : "명함 저장하기"}
                  </button>
                  {!isMe && onSaveToContacts && (
                    <button
                      type="button"
                      onClick={() => void saveContactsFromCard(mergedCard)}
                      className="rounded-md border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-bold text-emerald-700"
                    >
                      휴대폰에 저장
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        }
        if (msg.type === "room_notice") {
          const notice = getRoomNotice(roomId);
          const readLabel = notice ? noticeReadLabel(notice, myCardUserId) : "";
          return (
            <div key={msg.id} className="mb-3 flex justify-center px-2">
              <button
                type="button"
                onClick={() => notice && onOpenCalendarNotice?.(notice)}
                className="w-full max-w-[95%] rounded-2xl border border-amber-200 bg-amber-50 p-3 text-left ring-1 ring-amber-100 active:scale-[0.99]"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-black text-amber-800">📌 일정 공지</p>
                  {readLabel ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                        readLabel.includes("안 읽음") ? "bg-rose-500 text-white" : "bg-amber-200 text-amber-900"
                      }`}
                    >
                      {readLabel}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-[13px] font-bold leading-snug text-gray-900">{notice?.title || msg.text}</p>
                {notice?.whenLabel ? (
                  <p className="mt-0.5 text-[11px] text-gray-600">{notice.whenLabel}</p>
                ) : null}
              </button>
            </div>
          );
        }
        if (msg.type === "system" && msg.vmingEvent) {
          return (
            <VmingConsentChatBubble
              key={msg.id}
              msg={msg}
              isDarkMode={isDarkMode}
              myUserId={myCardUserId}
              myName={myName}
              consentStatus={vmingConsentStatus}
              onAcceptConsent={onVmingAcceptConsent}
              onDeclineConsent={onVmingDeclineConsent}
              onOpenConsentModal={onVmingOpenConsentModal}
            />
          );
        }
        if (msg.type === "system") {
          const isSecurityGuardMessage =
            msg.securityGuard === true ||
            msg.intent_type === "generate_evidence" ||
            msg.risk_level === "high" ||
            msg.risk_level === "critical" ||
            String(msg.text || "").includes("[VLUE 보안 가드]");
          if (isSecurityGuardMessage) {
            const vaultHref = String(msg.securityVaultPath || "/mypage?tab=security-vault");
            return (
              <div key={msg.id} className="mb-3 flex justify-center px-2">
                <div className="w-full max-w-[95%] rounded-2xl border border-[#2f3440] bg-[#151922] p-3 text-left shadow-[0_8px_24px_rgba(15,23,42,0.45)]">
                  <p className="rounded-lg border border-red-500/40 bg-red-900/30 px-2 py-1 text-[11px] font-black text-red-200">
                    🚨 [VLUE 보안 가드] 데이터 격리 및 불멸화 완료
                  </p>
                  <p className="mt-2 text-[12px] leading-relaxed text-slate-100">
                    본 대화방의 안전한 거래 보장을 위해 법적 무결성 증거 패키지 보관이 완료되었습니다.
                  </p>
                  <a
                    href={vaultHref}
                    className="mt-2 inline-flex rounded-lg border border-red-400/50 bg-red-950/40 px-2.5 py-1 text-[11px] font-bold text-red-200"
                  >
                    마이페이지 보안함에서 확인하기
                  </a>
                </div>
              </div>
            );
          }
          const isCallTranscript = String(msg.text || "").startsWith("[통화 기록]");
          if (isCallTranscript) {
            const transcriptBody = String(msg.text || "").replace("[통화 기록]", "").trim();
            return (
              <div key={msg.id} className="mb-3 flex justify-center px-2">
                <div className="w-full max-w-[95%] rounded-2xl border border-blue-100 bg-white p-3 ring-1 ring-blue-50">
                  <p className="text-[11px] font-black text-blue-700">통화 기록</p>
                  <div className="mt-1 max-h-[105px] overflow-y-auto rounded-xl bg-gray-50 px-3 py-2 text-[12px] leading-5 text-gray-700 whitespace-pre-wrap">
                    {transcriptBody}
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const ts = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "-");
                        setSaveModal({
                          open: true,
                          fileName: `통화기록_${roomName}_${ts}.txt`,
                          content: transcriptBody
                        });
                      }}
                      className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700"
                    >
                      저장하기
                    </button>
                  </div>
                </div>
              </div>
            );
          }
          return (
            <div key={msg.id} className="mb-3 flex justify-center px-2">
              <p className="max-w-[95%] rounded-2xl bg-gray-50 px-4 py-2 text-center text-[12px] leading-relaxed text-gray-500 ring-1 ring-gray-100">
                {msg.text}
              </p>
            </div>
          );
        }
        const isMe = msg.type === "me";
        const sameAsPrev = !msg.uiClusterHead;
        const sameAsNext = !msg.uiClusterTail;
        const isLastMeMessage = isMe && idx === lastMeIndex;
        const showReadText = showReadReceipts && isLastMeMessage && !isGroupRoom && msg.status === "read";
        const groupUnread =
          showReadReceipts && isGroupRoom && isLastMeMessage && msg.status !== "read"
            ? Math.max(1, groupMemberCount - 1)
            : 0;
        const showSentMark =
          showReadReceipts && isMe && !showReadText && !groupUnread && msg.status !== "read";
        const hasPromoCard = Boolean(msg.promoCard);
        const hasImage = Boolean(msg.imageUrl);
        const hasAudio = Boolean(msg.audioUrl || /^\[음성메시지\]/i.test(msg.text || ""));
        const hasLocation = Boolean(msg.location?.mapUrl);
        const hasMetaRow = Boolean(msg.uiShowTime) || showReadText || groupUnread > 0 || showSentMark;

        return (
          <div key={msg.id}>
            {msg.uiShowDate ? (
              <div className="mb-3 flex justify-center">
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                    isDarkMode ? "bg-white/10 text-gray-400" : "bg-black/5 text-gray-500"
                  }`}
                >
                  {formatDatePill(msg.uiAt)}
                </span>
              </div>
            ) : null}
          <div
            className={`flex ${isMe ? "justify-end" : "justify-start"} ${isMe ? "" : "items-start gap-2"} ${
              sameAsNext ? "mb-1" : "mb-3"
            }`}
          >
            {!isMe && msg.uiShowAvatar && (
              <button
                onClick={(e) => onOpenProfileMenu?.(e)}
                className="w-9 h-9 rounded-[13px] bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200 cursor-pointer"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-gray-400 p-1.5">
                  <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" fill="currentColor"/>
                  <path d="M18 19C18 16.7909 15.3137 15 12 15C8.68629 15 6 16.7909 6 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}
            {!isMe && !msg.uiShowAvatar && <div className="w-9 h-9 shrink-0" />}
            <div className={`max-w-[80%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
              {!isMe && msg.uiShowName && (
                <span className={`mb-1 ml-1 text-[11px] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>{roomName}</span>
              )}
              {hasPromoCard ? (
                <div className={`w-[220px] rounded-2xl border p-2 ${isMe ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-white"}`}>
                  <div className={`rounded-xl bg-gradient-to-r ${msg.promoCard?.templateTone || "from-blue-600 to-indigo-700"} p-2.5`}>
                    {msg.promoCard?.imageDataUrl ? <img src={msg.promoCard.imageDataUrl} alt="" className="mb-1.5 h-24 w-full rounded-md object-cover" /> : null}
                    <p className="text-[10px] font-black text-white">
                      {msg.promoCard?.type === "coupon" ? "EVENT COUPON" : "PROMOTION CARD"}
                    </p>
                    <p
                      className={`mt-1 text-[12px] text-white ${
                        msg.promoCard?.font === "serif"
                          ? "font-serif"
                          : msg.promoCard?.font === "mono"
                            ? "font-mono"
                            : "font-sans"
                      }`}
                    >
                      {msg.promoCard?.title || "(제목 없음)"}
                    </p>
                    <p
                      className={`mt-0.5 text-[10px] text-white/90 ${
                        msg.promoCard?.font === "serif"
                          ? "font-serif"
                          : msg.promoCard?.font === "mono"
                            ? "font-mono"
                            : "font-sans"
                      }`}
                    >
                      {msg.promoCard?.body || "(내용 없음)"}
                    </p>
                    {msg.promoCard?.templateCode ? (
                      <p className="mt-1 inline-block rounded bg-white/20 px-2 py-0.5 text-[9px] font-black text-white">
                        TPL {msg.promoCard.templateCode}
                      </p>
                    ) : null}
                    {msg.promoCard?.masterCode ? (
                      <p className="mt-1 inline-block rounded bg-white/20 px-2 py-0.5 text-[9px] font-black text-white">
                        MASTER {msg.promoCard.masterCode}
                      </p>
                    ) : null}
                    {msg.promoCard?.code ? (
                      <p className="mt-1 inline-block rounded bg-white/20 px-2 py-0.5 text-[10px] font-black text-white">{msg.promoCard.code}</p>
                    ) : null}
                    {msg.promoCard?.expiresAt ? (
                      <p className="mt-1 text-[9px] font-semibold text-white/90">
                        유효기간 {new Date(msg.promoCard.expiresAt).toLocaleString("ko-KR")}
                      </p>
                    ) : null}
                    {msg.promoCard?.fileMeta?.name ? <p className="mt-1 text-[9px] font-semibold text-white/85">첨부 {msg.promoCard.fileMeta.name}</p> : null}
                  </div>
                  {msg.promoCard?.cta ? (
                    <button
                      type="button"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent("vlue-kpi-event", { detail: { kind: "shop_clicked" } }));
                      }}
                      className="mt-2 w-full rounded-lg border border-blue-200 bg-white py-1.5 text-[10px] font-black text-blue-700"
                    >
                      {msg.promoCard.cta}
                    </button>
                  ) : null}
                </div>
              ) : hasImage ? (
                <div className={`rounded-2xl overflow-hidden border ${isMe ? "border-blue-200" : "border-gray-100"}`}>
                  <img src={msg.imageUrl} alt="uploaded" className="block max-w-[220px] max-h-[280px] object-cover" />
                </div>
              ) : hasLocation ? (
                <div className={`block rounded-2xl px-3 py-2 border text-sm ${isMe ? "border-blue-200 bg-blue-50 text-blue-700" : "border-gray-100 bg-white text-gray-800"}`}>
                  {msg.location.staticMapUrl && (
                    <img src={msg.location.staticMapUrl} alt="미니맵" className="mb-2 w-full max-w-[220px] h-24 object-cover rounded-xl border border-white/70" />
                  )}
                  <p className="font-bold">현재 위치 공유</p>
                  {msg.location.placeName && <p className="text-[12px] mt-0.5 font-semibold">{msg.location.placeName}</p>}
                  {msg.location.address && <p className="text-[11px] mt-0.5">{msg.location.address}</p>}
                  <p className="text-[11px] mt-0.5">위도 {msg.location.lat.toFixed(5)}, 경도 {msg.location.lng.toFixed(5)}</p>
                  <div className="mt-1 flex items-center gap-2 text-[12px]">
                    <a href={msg.location.mapUrl} target="_blank" rel="noreferrer" className="underline">
                      {msg.location.mapProvider === "kakao" ? "선택 지도(카카오)" : "선택 지도(구글)"}
                    </a>
                    {msg.location.kakaoMapUrl && (
                      <a href={msg.location.kakaoMapUrl} target="_blank" rel="noreferrer" className="underline">카카오지도</a>
                    )}
                    {msg.location.googleMapUrl && (
                      <a href={msg.location.googleMapUrl} target="_blank" rel="noreferrer" className="underline">구글지도</a>
                    )}
                  </div>
                </div>
              ) : hasAudio ? (
                <div
                  className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm ${
                    isMe
                      ? "border-blue-500/40 bg-blue-600 text-white"
                      : isDarkMode
                        ? "border-white/10 bg-[#1f2937] text-gray-100"
                        : "border-gray-100 bg-white text-gray-800"
                  }`}
                  onContextMenu={bindLongPress(msg, true)}
                  onTouchStart={bindLongPress(msg, true)}
                  onTouchEnd={(e) => clearTimeout(e.currentTarget._holdTimer)}
                  onTouchMove={(e) => clearTimeout(e.currentTarget._holdTimer)}
                >
                  {!isMe && msg.uiShowAvatar && (
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-[11px] font-bold text-white">
                      {roomName.slice(0, 1)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const a = audioRefById.current[msg.id];
                      if (!a && !msg.audioUrl) return;
                      if (playingAudioId === msg.id && a && !a.paused) {
                        a.pause();
                        setPlayingAudioId("");
                      } else if (a) {
                        Object.values(audioRefById.current).forEach((el) => el && el.pause());
                        a.currentTime = 0;
                        a.play();
                        setPlayingAudioId(msg.id);
                      }
                    }}
                    className="flex min-w-[120px] items-center gap-2 font-bold"
                  >
                    <span>{playingAudioId === msg.id ? "⏸" : "▶"}</span>
                    <VoiceWaveform active={playingAudioId === msg.id} isMe={isMe} />
                    <span className="text-[11px] tabular-nums">
                      {String(Math.floor((msg.audioDurationSec || 0) / 60)).padStart(2, "0")}:
                      {String((msg.audioDurationSec || 0) % 60).padStart(2, "0")}
                    </span>
                  </button>
                  {msg.audioUrl ? (
                    <audio
                      ref={(el) => {
                        audioRefById.current[msg.id] = el;
                      }}
                      src={msg.audioUrl}
                      preload="metadata"
                      onEnded={() => setPlayingAudioId("")}
                      className="hidden"
                    />
                  ) : null}
                </div>
              ) : (
                <div
                  className={`chat-bubble-unit inline-block w-fit rounded-2xl px-3 py-2 text-sm ${
                    isMe
                      ? `${sameAsPrev ? "" : "rounded-tr-none"} bg-blue-600 text-white`
                      : isDarkMode
                        ? `${msg.uiClusterHead ? "rounded-tl-none" : ""} border border-white/10 bg-[#1f2937] text-gray-100`
                        : `${msg.uiClusterHead ? "rounded-tl-none" : ""} border border-gray-100 bg-white text-gray-800`
                  }`}
                  onContextMenu={bindLongPress(msg, true)}
                  onTouchStart={bindLongPress(msg, true)}
                  onTouchEnd={(e) => clearTimeout(e.currentTarget._holdTimer)}
                  onTouchMove={(e) => clearTimeout(e.currentTarget._holdTimer)}
                >
                  {msg.text}
                </div>
              )}
              <div
                className={`flex items-center gap-1.5 transition-all duration-200 ${
                  hasMetaRow ? "mt-1" : "mt-0 h-0 overflow-hidden"
                } ${sameAsNext ? "mb-0" : ""} ${isMe ? "justify-end" : ""}`}
              >
                {msg.uiShowTime && (
                  <span className={`text-[11px] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>{msg.timeText}</span>
                )}
                {isMe && showReadText && (
                  <span className={`text-[10px] font-semibold ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>읽음</span>
                )}
                {isMe && groupUnread > 0 && (
                  <span className="rounded-full bg-gray-200/90 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">
                    {groupUnread}
                  </span>
                )}
                {isMe && showSentMark && (
                  <span className="text-[12px] font-bold text-blue-400">✓</span>
                )}
              </div>
            </div>
          </div>
          </div>
        );
      })}
      {saveModal.open && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/45 px-6" onMouseDown={() => setSaveModal({ open: false, fileName: "", content: "" })}>
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-4 pt-12 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <ModalCloseButton variant="default" onClick={() => setSaveModal({ open: false, fileName: "", content: "" })} />
            <h4 className="text-[15px] font-black text-gray-900">대화내용 저장</h4>
            <input
              value={saveModal.fileName}
              onChange={(e) => setSaveModal((s) => ({ ...s, fileName: e.target.value }))}
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-[12px] outline-none"
              placeholder="파일 이름"
            />
            <textarea
              value={saveModal.content}
              onChange={(e) => setSaveModal((s) => ({ ...s, content: e.target.value }))}
              className="mt-2 min-h-28 w-full rounded-lg border border-gray-200 px-3 py-2 text-[12px] leading-relaxed outline-none"
              placeholder="저장 내용"
            />
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setSaveModal({ open: false, fileName: "", content: "" })} className="flex-1 rounded-xl bg-gray-100 py-2 text-[12px] font-bold text-gray-600">
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  const name = saveModal.fileName.trim();
                  const content = saveModal.content.trim();
                  if (!name || !content) return;
                  const key = "vlue_saved_files";
                  let prev = [];
                  try {
                    prev = JSON.parse(localStorage.getItem(key) || "[]");
                  } catch {
                    prev = [];
                  }
                  const next = [{ id: `sf-${Date.now()}`, name, content, createdAt: new Date().toISOString() }, ...prev];
                  localStorage.setItem(key, JSON.stringify(next));
                  window.dispatchEvent(new Event("vlue-files-updated"));
                  setSaveModal({ open: false, fileName: "", content: "" });
                  setSaveNotice("파일에 저장되었습니다.");
                }}
                className="flex-1 rounded-xl bg-blue-600 py-2 text-[12px] font-bold text-white"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
      {saveNotice && (
        <div className="fixed bottom-24 left-1/2 z-[161] w-[80%] max-w-xs -translate-x-1/2 rounded-xl border border-blue-100 bg-white/95 px-4 py-2 text-center text-[12px] font-bold text-blue-700 shadow-lg">
          {saveNotice}
        </div>
      )}
      </div>
    </div>
  );
});

export default MessageList;
