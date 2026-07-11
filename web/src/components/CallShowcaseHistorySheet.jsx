import { useCallback, useEffect, useState } from "react";
import { Phone, PhoneIncoming, PhoneOutgoing, ShieldCheck } from "lucide-react";
import {
  CALL_SHOWCASE_HISTORY_CHANGED,
  formatCallDuration,
  formatCallWhen,
  readCallShowcaseHistory,
  resolveCallHistoryAvatar
} from "../lib/callShowcaseHistory.js";
import { resolveVlueShowcaseByPhone } from "../lib/resolveVlueShowcaseByPhone.js";
import { applyShowcaseStyleToCard } from "../lib/showcase/applyShowcaseStyleToCard.js";
import { isPaidLetteringTier } from "../lib/letteringMembership.js";
import LetteringIncomingNotification from "./LetteringIncomingNotification.jsx";
import AppFullScreenView from "./AppFullScreenView.jsx";
import { readShowcaseStyle } from "../lib/showcase/showcaseStyleStorage.js";
import "./friend-showcase-list.css";
import "../styles/showcase-call-glass.css";

function CallHistoryAvatar({ call }) {
  const url = resolveCallHistoryAvatar(call);
  const initial = String(call?.name || "?").trim().slice(0, 1) || "?";
  const Icon = call.direction === "out" ? PhoneOutgoing : PhoneIncoming;

  if (url) {
    return <img className="friend-showcase-list__avatar" src={url} alt="" />;
  }

  if (call?.name) {
    return (
      <span className="friend-showcase-list__avatar friend-showcase-list__avatar--initial" aria-hidden>
        {initial}
      </span>
    );
  }

  return (
    <span className="friend-showcase-list__avatar friend-showcase-list__avatar--initial" aria-hidden>
      <Icon size={18} />
    </span>
  );
}

export default function CallShowcaseHistorySheet({ open, onClose, isDarkMode = false }) {
  const [items, setItems] = useState(() => readCallShowcaseHistory());
  const [selected, setSelected] = useState(null);
  const [previewCard, setPreviewCard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const refresh = useCallback(() => setItems(readCallShowcaseHistory()), []);

  useEffect(() => {
    if (!open) return undefined;
    refresh();
    const onChange = () => refresh();
    window.addEventListener(CALL_SHOWCASE_HISTORY_CHANGED, onChange);
    return () => window.removeEventListener(CALL_SHOWCASE_HISTORY_CHANGED, onChange);
  }, [open, refresh]);

  useEffect(() => {
    if (!open) {
      setSelected(null);
      setPreviewCard(null);
      setExpanded(true);
    }
  }, [open]);

  const openCall = async (call) => {
    if (typeof window !== "undefined" && window.__vlueUnlockShowcaseBgm) {
      window.__vlueUnlockShowcaseBgm();
    }
    setSelected(call);
    setPreviewCard(null);
    setExpanded(true);
    setLoading(true);
    try {
      const avatar = resolveCallHistoryAvatar(call);
      if (call.cardSnapshot || call.showcaseSnapshot) {
        const tier = call.membershipTier || call.cardSnapshot?.membershipTier || "free";
        setPreviewCard({
          ...call.cardSnapshot,
          name: call.name || call.cardSnapshot?.name,
          phone: call.phoneDisplay || call.phone || call.cardSnapshot?.phone,
          membershipTier: tier,
          photoUrl: call.cardSnapshot?.photoUrl || call.cardSnapshot?.avatarUrl || avatar,
          avatarUrl: call.cardSnapshot?.avatarUrl || call.cardSnapshot?.photoUrl || avatar,
          showcaseStyle: call.showcaseSnapshot || readShowcaseStyle(),
          fromHistoryCache: true
        });
        return;
      }
      const payload = await resolveVlueShowcaseByPhone(call.phone);
      const tier = call.membershipTier || payload.card?.membershipTier || "free";
      setPreviewCard(
        applyShowcaseStyleToCard(
          {
            ...payload.card,
            name: call.name || payload.card?.name,
            phone: call.phoneDisplay || call.phone || payload.phone,
            membershipTier: tier,
            photoUrl: payload.card?.photoUrl || avatar,
            avatarUrl: payload.card?.avatarUrl || avatar
          },
          isPaidLetteringTier(tier) ? tier : "free"
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const closeDetail = () => {
    setSelected(null);
    setPreviewCard(null);
    setExpanded(true);
  };

  if (selected) {
    const tier = previewCard?.membershipTier || selected.membershipTier || "free";
    const phone = previewCard?.phone || selected.phoneDisplay || selected.phone;

    return (
      <AppFullScreenView
        open={open}
        onClose={closeDetail}
        title={selected.name}
        isDarkMode
        coverBottomNav
        hideHeader
        showFloatingClose
        className="bg-[#0B101B]"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          {loading ? (
            <p className="py-16 text-center text-[13px] font-semibold text-slate-400">쇼케이스 불러오는 중…</p>
          ) : previewCard ? (
            <div className="lettering-showcase-fs lettering-showcase-fs--history-embed">
              <div className="lettering-showcase-fs__shell">
                <LetteringIncomingNotification
                  className="lettering-ongoing--on-call lettering-ongoing--fullscreen-tent lettering-ongoing--history-replay"
                  previewMode
                  verified={selected?.verified !== false}
                  callPhase="connected"
                  platform="android"
                  isRecording={false}
                  callDurationSec={0}
                  recordingDurationSec={0}
                  incomingNumber={phone}
                  savedContactName={previewCard.name || selected.name}
                  isKnownContact
                  card={{
                    ...previewCard,
                    membershipTier: tier
                  }}
                  expanded={expanded}
                  onExpandedChange={setExpanded}
                  onSaveCard={() => {}}
                />
              </div>
            </div>
          ) : null}
        </div>
      </AppFullScreenView>
    );
  }

  return (
    <AppFullScreenView
      open={open}
      onClose={onClose}
      title="통화 목록"
      subtitle="종료 후 상대방 쇼케이스 다시보기"
      icon={Phone}
      isDarkMode={isDarkMode}
      reserveBottomNav
    >
      {items.length === 0 ? (
        <p className="px-4 py-16 text-center text-[13px] font-semibold text-slate-500">통화 기록이 없습니다.</p>
      ) : (
        <ul className="friend-showcase-list__rows m-0 list-none p-0">
          {items.map((call) => (
            <li key={call.id}>
              <button type="button" className="friend-showcase-list__row" onClick={() => openCall(call)}>
                <CallHistoryAvatar call={call} />
                <div className="friend-showcase-list__meta">
                  <p className="friend-showcase-list__name">
                    {call.name}
                    {isPaidLetteringTier(call.membershipTier) ? (
                      <ShieldCheck
                        size={15}
                        strokeWidth={2.4}
                        className="ml-1 inline-block align-[-2px] text-blue-600"
                        aria-label="유료 · VLUE 보안 인증"
                      />
                    ) : null}
                  </p>
                  <p className="friend-showcase-list__subtitle">
                    {call.phoneDisplay || call.phone} · {formatCallDuration(call.durationSec)}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-bold text-slate-400">{formatCallWhen(call.endedAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </AppFullScreenView>
  );
}
