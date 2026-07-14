import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  resolveCallPeerMatrix,
  resolveCallPeerMatrixSync
} from "../lib/call/callPeerMatrix.js";
import { runCallPeerMatrixAction } from "../lib/call/runCallPeerMatrixAction.js";
import { resolveIsKnownContactSync } from "../lib/contacts/hybridKnownContact.js";
import "./friend-showcase-list.css";
import "../styles/showcase-call-glass.css";
import "../styles/incall-controls.css";

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

function HistoryRowCta({ call, matrix, busy, onAction }) {
  if (!matrix?.showCallLogAction) return null;
  return (
    <button
      type="button"
      className="call-history-row__cta"
      disabled={busy}
      onClick={(e) => {
        e.stopPropagation();
        onAction(call, matrix);
      }}
    >
      {busy ? "…" : matrix.label}
    </button>
  );
}

export default function CallShowcaseHistorySheet({ open, onClose, isDarkMode = false }) {
  const [items, setItems] = useState(() => readCallShowcaseHistory());
  const [selected, setSelected] = useState(null);
  const [previewCard, setPreviewCard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [rowMatrix, setRowMatrix] = useState({});
  const [busyId, setBusyId] = useState("");
  const [toast, setToast] = useState("");

  const showToast = useCallback((msg) => {
    setToast(String(msg || "").trim());
    window.setTimeout(() => setToast(""), 2600);
  }, []);

  const refresh = useCallback(() => setItems(readCallShowcaseHistory()), []);

  useEffect(() => {
    if (!open) return undefined;
    refresh();
    const onChange = () => refresh();
    window.addEventListener(CALL_SHOWCASE_HISTORY_CHANGED, onChange);
    window.addEventListener("vlue-card-wallet-changed", onChange);
    return () => {
      window.removeEventListener(CALL_SHOWCASE_HISTORY_CHANGED, onChange);
      window.removeEventListener("vlue-card-wallet-changed", onChange);
    };
  }, [open, refresh]);

  useEffect(() => {
    if (!open) {
      setSelected(null);
      setPreviewCard(null);
      setExpanded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const next = {};
      for (const call of items) {
        const phone = call.phoneDisplay || call.phone;
        const isVlueMember = call.verified !== false;
        next[call.id] = await resolveCallPeerMatrix({
          phone,
          isVlueMember,
          verified: isVlueMember
        });
      }
      if (!cancelled) setRowMatrix(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, items]);

  const runRowAction = async (call, matrix) => {
    setBusyId(call.id);
    try {
      let card = call.cardSnapshot || null;
      if (!card && matrix.cta !== "kakao_share") {
        const payload = await resolveVlueShowcaseByPhone(call.phone);
        card = payload.card;
      }
      await runCallPeerMatrixAction({
        matrix,
        card: card || { name: call.name, phone: call.phoneDisplay || call.phone },
        phone: call.phoneDisplay || call.phone,
        onToast: showToast
      });
      refresh();
    } finally {
      setBusyId("");
    }
  };

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

  const selectedKnown = useMemo(() => {
    if (!selected) return { isKnownContact: false, matchedName: "", sources: [] };
    return resolveIsKnownContactSync(selected.phoneDisplay || selected.phone);
  }, [selected]);

  if (selected) {
    const tier = previewCard?.membershipTier || selected.membershipTier || "free";
    const phone = previewCard?.phone || selected.phoneDisplay || selected.phone;
    const isMember = selected.verified !== false;

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
          {toast ? (
            <p className="call-history-toast" role="status">
              {toast}
            </p>
          ) : null}
          {loading ? (
            <p className="py-16 text-center text-[13px] font-semibold text-slate-400">쇼케이스 불러오는 중…</p>
          ) : previewCard ? (
            <div className="lettering-showcase-fs lettering-showcase-fs--history-embed">
              <div className="lettering-showcase-fs__shell">
                <LetteringIncomingNotification
                  className="lettering-ongoing--on-call lettering-ongoing--fullscreen-tent lettering-ongoing--history-replay"
                  previewMode
                  fromCallHistory
                  verified={isMember}
                  callPhase="connected"
                  platform="android"
                  isRecording={false}
                  callDurationSec={0}
                  recordingDurationSec={0}
                  incomingNumber={phone}
                  savedContactName={selectedKnown.matchedName || previewCard.name || selected.name}
                  isKnownContact={selectedKnown.isKnownContact}
                  card={{
                    ...previewCard,
                    membershipTier: tier
                  }}
                  expanded={expanded}
                  onExpandedChange={setExpanded}
                  onSaveCard={async ({ card, incomingNumber }) => {
                    const matrix = resolveCallPeerMatrixSync({
                      phone: incomingNumber || phone,
                      isVlueMember: isMember,
                      knownContact: selectedKnown
                    });
                    await runCallPeerMatrixAction({
                      matrix,
                      card,
                      phone: incomingNumber || phone,
                      onToast: showToast
                    });
                    refresh();
                  }}
                  onToast={showToast}
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
      subtitle="종료 후 상대방 쇼케이스 · 규제 매트릭스 저장"
      icon={Phone}
      isDarkMode={isDarkMode}
      reserveBottomNav
    >
      {toast ? (
        <p className="call-history-toast call-history-toast--list" role="status">
          {toast}
        </p>
      ) : null}
      {items.length === 0 ? (
        <p className="px-4 py-16 text-center text-[13px] font-semibold text-slate-500">통화 기록이 없습니다.</p>
      ) : (
        <ul className="friend-showcase-list__rows m-0 list-none p-0">
          {items.map((call) => {
            const matrix = rowMatrix[call.id];
            return (
              <li key={call.id}>
                <div className="friend-showcase-list__row call-history-row">
                  <button type="button" className="call-history-row__main" onClick={() => openCall(call)}>
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
                    <span className="shrink-0 text-[11px] font-bold text-slate-400">
                      {formatCallWhen(call.endedAt)}
                    </span>
                  </button>
                  <HistoryRowCta
                    call={call}
                    matrix={matrix}
                    busy={busyId === call.id}
                    onAction={runRowAction}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AppFullScreenView>
  );
}
