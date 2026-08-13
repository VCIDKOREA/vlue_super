import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
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
  resolveCallPeerMatrixSync
} from "../lib/call/callPeerMatrix.js";
import { runCallPeerMatrixAction } from "../lib/call/runCallPeerMatrixAction.js";
import { resolveIsKnownContactSync } from "../lib/contacts/hybridKnownContact.js";
import { syncDeviceContactsFromNative } from "../lib/contacts/deviceContactsCache.js";
import { useShowcaseBgm } from "../context/ShowcaseBgmContext.jsx";
import { fetchPeerLiveStylePublic } from "../lib/showcase/showcaseStyleApi.js";
import {
  buildNationalAgencyDcpCard,
  isNationalAgencyDcpCard,
  matchNationalAgency
} from "../lib/nationalAgencyDcpClient.js";
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

/** 탭 즉시 표시용 — 네트워크 완료 전 스냅샷/목록 메타로 카드 구성 */
function buildOptimisticHistoryCard(call) {
  const phone = call.phoneDisplay || call.phone || "";
  const snap = call.cardSnapshot && typeof call.cardSnapshot === "object" ? call.cardSnapshot : {};
  const snapStyle =
    call.showcaseSnapshot && typeof call.showcaseSnapshot === "object"
      ? call.showcaseSnapshot
      : null;
  const matchedHint = call.verified === true;
  const tier = call.membershipTier || snap.membershipTier || "free";
  const peerStyle =
    matchedHint && snapStyle
      ? snapStyle
      : silentShowcaseStyle();
  const card = applyShowcaseStyleToCard(
    {
      userId: String(snap.userId || call.userId || "").trim(),
      ownerUserId: String(snap.userId || call.userId || "").trim(),
      name: matchedHint ? String(snap.name || call.name || "").trim() : "",
      phone,
      organization: matchedHint ? String(snap.organization || "").trim() : "",
      title: matchedHint ? String(snap.title || "").trim() : "",
      email: matchedHint ? String(snap.email || "").trim() : "",
      website: matchedHint ? String(snap.website || "").trim() : "",
      logoUrl: matchedHint ? String(snap.logoUrl || "").trim() : "",
      photoUrl: matchedHint ? String(snap.photoUrl || call.avatarUrl || "").trim() : "",
      avatarUrl: matchedHint
        ? String(snap.avatarUrl || snap.photoUrl || call.avatarUrl || "").trim()
        : "",
      photoFocus: String(snap.photoFocus || "center").trim() || "center",
      membershipTier: tier,
      showcaseStyle: peerStyle
    },
    isPaidLetteringTier(tier) ? tier : "free",
    { peerMode: true, style: peerStyle }
  );
  return { card, verified: matchedHint, peerStyle };
}

function styleHasShowcaseContent(style) {
  if (!style || typeof style !== "object") return false;
  if (Array.isArray(style.pages) && style.pages.some((p) => p && typeof p === "object")) return true;
  if (Array.isArray(style.gallery?.photos) && style.gallery.photos.length > 0) return true;
  return false;
}

/**
 * 인증 회원 + 로컬 스냅샷이 있으면 즉시 연다.
 * 페이지가 없어도 DCC/메타로 먼저 띄우고 네트워크로 보강한다.
 */
function hasUsableLocalSnapshot(call) {
  if (call?.verified !== true) return false;
  const snap = call?.cardSnapshot;
  const style = call?.showcaseSnapshot;
  return Boolean(style || snap?.photoUrl || snap?.name || snap?.userId || call?.userId);
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

function CallHistoryLoadingGuide({ syncing = false }) {
  return (
    <div className="call-history-loading" role="status" aria-live="polite">
      <div className="call-history-loading__spinner" aria-hidden />
      <p className="call-history-loading__title">
        {syncing ? "최신 쇼케이스를 불러오는 중…" : "쇼케이스를 불러오는 중…"}
      </p>
      <p className="call-history-loading__hint">잠시만 기다려 주세요</p>
    </div>
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
  const openGenRef = useRef(0);
  const { unlockAudioGesture, setPlaybackPhase } = useShowcaseBgm();

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
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    const buildMatrix = () => {
      const next = {};
      for (const call of items) {
        const phone = call.phoneDisplay || call.phone;
        const isVlueMember = call.verified === true;
        next[call.id] = resolveCallPeerMatrixSync({
          phone,
          isVlueMember,
          verified: isVlueMember
        });
      }
      if (!cancelled) setRowMatrix(next);
    };
    /* 캐시로 즉시 CTA — 네이티브 주소록 dump는 목록이 반응한 뒤 지연(탭 지연 방지) */
    buildMatrix();
    const syncTimer = window.setTimeout(() => {
      void syncDeviceContactsFromNative()
        .then(() => {
          if (!cancelled) buildMatrix();
        })
        .catch(() => {});
    }, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(syncTimer);
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

  const hydrateCallFromNetwork = useCallback(async (call, gen, opts = {}) => {
    const background = Boolean(opts.background);
    const phone = call.phoneDisplay || call.phone;
    const hasLocalPages = styleHasShowcaseContent(call.showcaseSnapshot);
    const hasLocalBgm = hasPlayableShowcaseBgm(call.showcaseSnapshot);
    /* 페이지·BGM이 모두 있는 스냅샷만 백그라운드 재조회 생략 — DCC만 있는 스냅샷은 반드시 라이브 보강 */
    if (background && hasLocalPages && hasLocalBgm) return;
    try {
      if (!background) setLoading(true);
      const uidHint = String(call.cardSnapshot?.userId || call.userId || "").trim();
      const needForce =
        !hasLocalPages || !hasLocalBgm || Boolean(opts.forceStyle);
      const payload = await resolveVlueShowcasePeer({
        phone,
        userId: uidHint,
        displayName: call.name || "",
        membershipTier: call.membershipTier || "free",
        avatarUrl: call.avatarUrl || "",
        /* 콘텐츠/음악 없으면 캐시 우회해 최신 라이브 */
        forceStyle: needForce
      });
      if (gen !== openGenRef.current) return;

      const isDcp = isNationalAgencyDcpCard(payload.card);
      const matched = isDcp || Boolean(String(payload.card?.userId || "").trim());
      const peerUserId = isDcp ? "" : String(payload.card?.userId || uidHint || "").trim();
      let peerStyle =
        matched && !isDcp && payload.showcaseStyle && typeof payload.showcaseStyle === "object"
          ? payload.showcaseStyle
          : silentShowcaseStyle();

      /* resolve 결과에 페이지가 없을 때만 공개 라이브 보강 (중복 GET 제거) */
      if (matched && peerUserId && !isDcp && !styleHasShowcaseContent(peerStyle)) {
        const live = await fetchPeerLiveStylePublic(peerUserId, { force: true });
        if (live && typeof live === "object") {
          peerStyle = {
            ...peerStyle,
            ...live,
            bgm: live.bgm || peerStyle.bgm,
            pages:
              Array.isArray(live.pages) && live.pages.length
                ? live.pages
                : peerStyle.pages,
            gallery: live.gallery || peerStyle.gallery
          };
        }
      }

      const tierRaw = payload.card?.membershipTier || call.membershipTier || "";
      const tier = isDcp
        ? "paid"
        : isPaidLetteringTier(tierRaw) || !matched
          ? tierRaw || (matched ? "paid" : "free")
          : "paid";
      const card = applyShowcaseStyleToCard(
        {
          ...payload.card,
          name: matched ? payload.card?.name || call.name || phone : "",
          phone: isDcp
            ? payload.card?.dcp?.shortNumber || payload.card?.phone || phone
            : payload.phone || phone,
          membershipTier: tier,
          photoUrl: matched ? payload.card?.photoUrl || call.avatarUrl || "" : "",
          avatarUrl: matched ? payload.card?.avatarUrl || call.avatarUrl || "" : "",
          photoFocus: payload.card?.photoFocus || call.cardSnapshot?.photoFocus || "center",
          publicHandle: payload.card?.publicHandle || payload.card?.loginId || "",
          profileKind: isDcp ? "dcp" : payload.card?.profileKind || "",
          dcp: isDcp ? payload.card?.dcp : payload.card?.dcp || null,
          showcaseStyle: peerStyle
        },
        isPaidLetteringTier(tier) ? tier : "free",
        { peerMode: true, style: peerStyle }
      );

      setPreviewVerified(matched);
      setPreviewCard(card);
      /* BGM은 LetteringIncomingNotification→ShowcaseCallCarousel 마운트 시에만 — 로딩 중 선재생 금지 */

      if (matched && (payload.card?.name || isDcp)) {
        setSelected((prev) =>
          prev
            ? {
                ...prev,
                name: payload.card?.name || prev.name,
                verified: true,
                membershipTier: tier,
                avatarUrl: card.photoUrl || card.avatarUrl || prev.avatarUrl
              }
            : prev
        );
      }
    } finally {
      if (gen === openGenRef.current) setLoading(false);
    }
  }, []);

  const openCall = (call) => {
    const gen = ++openGenRef.current;

    /* 제스처 unlock만 — 즉시 재생하지 않음. 기존 곡도 로딩 동안 정지 */
    try {
      unlockAudioGesture?.();
      setPlaybackPhase?.("idle", { steal: true, owner: "call-history" });
    } catch {
      /* ignore */
    }

    const hasPages = styleHasShowcaseContent(call.showcaseSnapshot);
    const hasBgm = hasPlayableShowcaseBgm(call.showcaseSnapshot);
    const agency = matchNationalAgency(call.phoneDisplay || call.phone);

    if (agency) {
      const dcpCard = applyShowcaseStyleToCard(
        {
          ...buildNationalAgencyDcpCard(agency),
          showcaseStyle: silentShowcaseStyle()
        },
        "paid",
        { peerMode: true, style: silentShowcaseStyle() }
      );
      flushSync(() => {
        setSelected({
          ...call,
          name: agency.agencyName,
          verified: true,
          membershipTier: "paid"
        });
        setExpanded(true);
        setPreviewVerified(true);
        setPreviewCard(dcpCard);
        setLoading(false);
      });
      void hydrateCallFromNetwork(call, gen, { background: true, forceStyle: false });
      return;
    }

    /* 페이지+BGM 스냅샷이 완전할 때만 즉시 표시(캐러셀 마운트와 동시에 BGM). 불완전하면 로딩만 */
    if (hasUsableLocalSnapshot(call) && hasPages && hasBgm) {
      const optimistic = buildOptimisticHistoryCard(call);
      flushSync(() => {
        setSelected(call);
        setExpanded(true);
        setPreviewVerified(true);
        setPreviewCard(optimistic.card);
        setLoading(false);
      });
      void hydrateCallFromNetwork(call, gen, { background: true, forceStyle: false });
      return;
    }

    flushSync(() => {
      setSelected(call);
      setExpanded(true);
      setPreviewCard(null);
      setPreviewVerified(false);
      setLoading(true);
    });
    void hydrateCallFromNetwork(call, gen, { background: false, forceStyle: true });
  };

  const closeDetail = () => {
    openGenRef.current += 1;
    try {
      setPlaybackPhase?.("idle", { fade: true, steal: true, owner: "call-history" });
    } catch {
      /* ignore */
    }
    setSelected(null);
    setPreviewCard(null);
    setPreviewVerified(false);
    setExpanded(true);
    setLoading(false);
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
          {loading || !previewCard ? (
            <CallHistoryLoadingGuide />
          ) : (
            <div className="lettering-showcase-fs lettering-showcase-fs--history-embed relative">
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
                  includeDigitalCard={
                    isNationalAgencyDcpCard(previewCard) ||
                    (isMember && previewCard.showcaseStyle?.includeDigitalCard !== false)
                  }
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
          )}
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
