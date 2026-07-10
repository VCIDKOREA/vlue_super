import { useCallback, useEffect, useState } from "react";
import { Phone, PhoneIncoming, PhoneOutgoing } from "lucide-react";
import {
  CALL_SHOWCASE_HISTORY_CHANGED,
  formatCallDuration,
  formatCallWhen,
  readCallShowcaseHistory
} from "../lib/callShowcaseHistory.js";
import { resolveVlueShowcaseByPhone } from "../lib/resolveVlueShowcaseByPhone.js";
import { applyShowcaseStyleToCard } from "../lib/showcase/applyShowcaseStyleToCard.js";
import { isPaidLetteringTier } from "../lib/letteringMembership.js";
import TentShowcaseOverlay from "./showcase/TentShowcaseOverlay.jsx";
import AppFullScreenView from "./AppFullScreenView.jsx";
import { readShowcaseStyle } from "../lib/showcase/showcaseStyleStorage.js";
import { CALL_STATES } from "../lib/showcase/tentShowcaseTypes.js";
import "./friend-showcase-list.css";
import "../styles/tent-showcase.css";

export default function CallShowcaseHistorySheet({ open, onClose, isDarkMode = false }) {
  const [items, setItems] = useState(() => readCallShowcaseHistory());
  const [selected, setSelected] = useState(null);
  const [previewCard, setPreviewCard] = useState(null);
  const [loading, setLoading] = useState(false);

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
    }
  }, [open]);

  const openCall = async (call) => {
    if (typeof window !== "undefined" && window.__vlueUnlockShowcaseBgm) {
      window.__vlueUnlockShowcaseBgm();
    }
    setSelected(call);
    setPreviewCard(null);
    setLoading(true);
    try {
      if (call.cardSnapshot || call.showcaseSnapshot) {
        const tier = call.membershipTier || call.cardSnapshot?.membershipTier || "free";
        setPreviewCard({
          ...call.cardSnapshot,
          name: call.cardSnapshot?.name || call.name,
          phone: call.phoneDisplay || call.phone,
          membershipTier: tier,
          showcaseStyle: call.showcaseSnapshot || readShowcaseStyle(),
          fromHistoryCache: true
        });
        return;
      }
      const payload = await resolveVlueShowcaseByPhone(call.phone);
      const tier = payload.card?.membershipTier || "free";
      setPreviewCard(
        applyShowcaseStyleToCard(
          {
            ...payload.card,
            name: payload.card?.name || call.name,
            phone: payload.phone || call.phoneDisplay || call.phone,
            membershipTier: tier
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
  };

  if (selected) {
    return (
      <AppFullScreenView
        open={open}
        onClose={closeDetail}
        title={selected.name}
        subtitle="통화 쇼케이스 다시보기"
        icon={Phone}
        isDarkMode
        coverBottomNav
        className="bg-[#0B101B]"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          {loading ? (
            <p className="py-16 text-center text-[13px] font-semibold text-slate-400">쇼케이스 불러오는 중…</p>
          ) : previewCard ? (
            <TentShowcaseOverlay
              previewMode
              forceInteractive
              callState={CALL_STATES.CONNECTED}
              verified={selected?.verified !== false}
              membershipTier={previewCard.membershipTier || "free"}
              peerPhone={previewCard.phone || selected.phone}
              displayName={previewCard.name || selected.name}
              organization={previewCard.organization || ""}
              card={previewCard}
              showcaseStyle={previewCard.showcaseStyle || readShowcaseStyle()}
              className="tent-showcase--fill"
            />
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
          {items.map((call) => {
            const Icon = call.direction === "out" ? PhoneOutgoing : PhoneIncoming;
            return (
              <li key={call.id}>
                <button type="button" className="friend-showcase-list__row" onClick={() => openCall(call)}>
                  <span className="friend-showcase-list__avatar friend-showcase-list__avatar--initial">
                    <Icon size={18} aria-hidden />
                  </span>
                  <div className="friend-showcase-list__meta">
                    <p className="friend-showcase-list__name">{call.name}</p>
                    <p className="friend-showcase-list__subtitle">
                      {call.phoneDisplay || call.phone} · {formatCallDuration(call.durationSec)}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] font-bold text-slate-400">{formatCallWhen(call.endedAt)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </AppFullScreenView>
  );
}
