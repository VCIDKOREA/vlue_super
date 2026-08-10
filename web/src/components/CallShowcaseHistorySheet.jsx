import { useCallback, useEffect, useMemo, useState } from "react";
import { Phone, PhoneIncoming, PhoneOutgoing, ShieldCheck } from "lucide-react";
import { CALL_SHOWCASE_HISTORY_CHANGED } from "../lib/callShowcaseHistory.js";
import {
  enrichCallLogGroupsWithShowcaseHistory,
  fetchDeviceCallLogEntries,
  formatCallDuration,
  formatCallGroupLabel,
  formatCallWhen,
  groupConsecutiveCallLogEntries,
  resolveCallHistoryAvatar
} from "../lib/callLogList.js";
import { resolveVlueShowcasePeer } from "../lib/resolveVlueShowcasePeer.js";
import { applyShowcaseStyleToCard } from "../lib/showcase/applyShowcaseStyleToCard.js";
import { createDefaultShowcaseStyle } from "../lib/showcase/showcaseStyleStorage.js";
import { isPaidLetteringTier } from "../lib/letteringMembership.js";
import { hasPlayableShowcaseBgm } from "../lib/showcase/showcaseBgmPresets.js";
import LetteringIncomingNotification from "./LetteringIncomingNotification.jsx";
import AppFullScreenView from "./AppFullScreenView.jsx";
import { CLOSE_SHOWCASE_OVERLAYS_EVENT } from "../lib/showcase/closeShowcaseOverlays.js";
import {
  resolveCallPeerMatrix,
  resolveCallPeerMatrixSync
} from "../lib/call/callPeerMatrix.js";
import { runCallPeerMatrixAction } from "../lib/call/runCallPeerMatrixAction.js";
import { resolveIsKnownContactSync } from "../lib/contacts/hybridKnownContact.js";
import "./friend-showcase-list.css";
import "../styles/showcase-call-glass.css";
import "../styles/incall-controls.css";

function silentShowcaseStyle() {
  const base = createDefaultShowcaseStyle();
  return {
    ...base,
    bgm: {
      ...base.bgm,
      mode: "none",
      soundId: "",
      audioUrl: "",
      playlist: []
    }
  };
}

function CallHistoryAvatar({ call }) {
  const url = resolveCallHistoryAvatar(call);
  const label = String(call?.name || "").trim();
  const phoneDisp = String(call?.phoneDisplay || call?.phone || "").trim();
  const isPhoneLabel =
    !label ||
    label === phoneDisp ||
    label.replace(/\D/g, "") === phoneDisp.replace(/\D/g, "");
  const Icon = call.direction === "out" ? PhoneOutgoing : PhoneIncoming;

  if (url) {
    return <img className="friend-showcase-list__avatar" src={url} alt="" />;
  }

  if (label && !isPhoneLabel) {
    return (
      <span className="friend-showcase-list__avatar friend-showcase-list__avatar--initial" aria-hidden>
        {label.slice(0, 1)}
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
  const [items, setItems] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [selected, setSelected] = useState(null);
  const [previewCard, setPreviewCard] = useState(null);
  const [previewVerified, setPreviewVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [rowMatrix, setRowMatrix] = useState({});
  const [busyId, setBusyId] = useState("");
  const [toast, setToast] = useState("");

  const showToast = useCallback((msg) => {
    setToast(String(msg || "").trim());
    window.setTimeout(() => setToast(""), 2600);
  }, []);

  const refresh = useCallback(async () => {
    setListLoading(true);
    setLoadError("");
    try {
      const raw = await fetchDeviceCallLogEntries(200);
      if (!raw.length) {
        /* 권한 없거나 기록 없음 — localStorage만으로는 채우지 않음(계획: CallLog SoT) */
        setItems([]);
        setLoadError(
          typeof window !== "undefined" &&
            !(window.Android?.getDeviceCallLogJson || window.VlueLettering?.getDeviceCallLogJson)
            ? "이 환경에서는 시스템 통화기록을 읽을 수 없습니다."
            : ""
        );
        return;
      }
      const grouped = groupConsecutiveCallLogEntries(raw);
      setItems(enrichCallLogGroupsWithShowcaseHistory(grouped));
    } catch {
      setItems([]);
      setLoadError("통화기록을 불러오지 못했습니다.");
    } finally {
      setListLoading(false);
    }
  }, []);

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
      setPreviewVerified(false);
      setExpanded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const next = {};
      for (const call of items) {
        const phone = call.phoneDisplay || call.phone;
        const isVlueMember = call.verified === true;
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
        const payload = await resolveVlueShowcasePeer({ phone: call.phone });
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
    setSelected(call);
    setPreviewCard(null);
    setPreviewVerified(false);
    setExpanded(true);
    setLoading(true);
    try {
      const phone = call.phoneDisplay || call.phone;
      const payload = await resolveVlueShowcasePeer({ phone });
      const matched = Boolean(payload.verified && payload.card?.userId);
      const peerStyle =
        matched && payload.showcaseStyle && typeof payload.showcaseStyle === "object"
          ? payload.showcaseStyle
          : silentShowcaseStyle();

      if (matched && hasPlayableShowcaseBgm(peerStyle)) {
        if (typeof window !== "undefined" && window.__vlueUnlockShowcaseBgm) {
          window.__vlueUnlockShowcaseBgm();
        }
      }

      const tier = payload.card?.membershipTier || call.membershipTier || "free";
      const card = applyShowcaseStyleToCard(
        {
          ...payload.card,
          name: matched
            ? payload.card?.name || call.name || phone
            : "",
          phone: payload.phone || phone,
          membershipTier: tier,
          photoUrl: matched ? payload.card?.photoUrl || call.avatarUrl || "" : "",
          avatarUrl: matched ? payload.card?.avatarUrl || call.avatarUrl || "" : "",
          showcaseStyle: peerStyle
        },
        isPaidLetteringTier(tier) ? tier : "free",
        { peerMode: true, style: peerStyle }
      );

      setPreviewVerified(matched);
      setPreviewCard(card);

      /* 목록 표시명 enrich (회원명) */
      if (matched && payload.card?.name) {
        setSelected((prev) =>
          prev
            ? {
                ...prev,
                name: payload.card.name,
                verified: true,
                membershipTier: tier,
                avatarUrl: card.photoUrl || card.avatarUrl || prev.avatarUrl
              }
            : prev
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const closeDetail = () => {
    setSelected(null);
    setPreviewCard(null);
    setPreviewVerified(false);
    setExpanded(true);
  };

  useEffect(() => {
    const onCloseOverlays = () => closeDetail();
    window.addEventListener(CLOSE_SHOWCASE_OVERLAYS_EVENT, onCloseOverlays);
    return () => window.removeEventListener(CLOSE_SHOWCASE_OVERLAYS_EVENT, onCloseOverlays);
  }, []);

  const selectedKnown = useMemo(() => {
    if (!selected) return { isKnownContact: false, matchedName: "", sources: [] };
    return resolveIsKnownContactSync(selected.phoneDisplay || selected.phone);
  }, [selected]);

  if (selected) {
    const tier = previewCard?.membershipTier || selected.membershipTier || "free";
    const phone = previewCard?.phone || selected.phoneDisplay || selected.phone;
    const isMember = previewVerified;
    const titleName =
      (isMember && (previewCard?.name || selected.name)) || formatCallGroupLabel(selected);

    return (
      <AppFullScreenView
        open={open}
        onClose={closeDetail}
        title={titleName}
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
                  savedContactName={
                    isMember
                      ? selectedKnown.matchedName || previewCard.name || selected.name
                      : selectedKnown.matchedName || ""
                  }
                  isKnownContact={selectedKnown.isKnownContact}
                  card={{
                    ...previewCard,
                    membershipTier: tier,
                    showcaseStyle: isMember
                      ? previewCard.showcaseStyle
                      : silentShowcaseStyle()
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
      subtitle="시스템 통화기록 · 상대 쇼케이스"
      icon={Phone}
      isDarkMode={isDarkMode}
      reserveBottomNav
    >
      {toast ? (
        <p className="call-history-toast call-history-toast--list" role="status">
          {toast}
        </p>
      ) : null}
      {listLoading ? (
        <p className="px-4 py-16 text-center text-[13px] font-semibold text-slate-500">
          통화기록 불러오는 중…
        </p>
      ) : items.length === 0 ? (
        <p className="px-4 py-16 text-center text-[13px] font-semibold text-slate-500">
          {loadError || "통화 기록이 없습니다. 전화·통화기록 권한을 확인해 주세요."}
        </p>
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
                        {formatCallGroupLabel(call)}
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
