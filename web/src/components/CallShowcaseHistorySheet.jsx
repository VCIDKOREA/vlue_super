import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Phone, PhoneIncoming, PhoneOutgoing, ShieldCheck } from "lucide-react";
import { CALL_SHOWCASE_HISTORY_CHANGED } from "../lib/callShowcaseHistory.js";
import {
  applyLocalKnownPeersToCallGroups,
  applyMemberDirectoryToCallGroups,
  buildCallHistoryList,
  fetchDeviceCallLogEntries,
  formatCallDuration,
  formatCallGroupLabel,
  formatCallWhen,
  resolveCallHistoryAvatar
} from "../lib/callLogList.js";
import { fetchDccLines } from "../lib/dccLinesApi.js";
import { dccLineOptionLabel } from "../lib/dccLineLabel.js";
import { fetchLineCallHistory, fetchMemberNamesByNumbers } from "../lib/lineCallHistoryApi.js";
import { resolveCallHistoryShowcasePeer } from "../lib/resolveCallHistoryShowcasePeer.js";
import {
  prefetchCallHistoryPeer,
  readCallHistoryPeerCache,
  writeCallHistoryPeerCache
} from "../lib/callHistoryPeerCache.js";
import {
  CALL_HISTORY_LIST_WARMED,
  readCallHistoryListCache,
  warmCallHistoryList,
  writeCallHistoryListCache
} from "../lib/callHistoryListCache.js";
import { applyShowcaseStyleToCard } from "../lib/showcase/applyShowcaseStyleToCard.js";
import { createDefaultShowcaseStyle } from "../lib/showcase/showcaseStyleStorage.js";
import { isPaidLetteringTier } from "../lib/letteringMembership.js";
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
import {
  buildNationalAgencyDcpCard,
  isNationalAgencyDcpCard,
  matchNationalAgency
} from "../lib/nationalAgencyDcpClient.js";
import { peerHasDccOrShowcaseContent } from "../lib/peerShowcaseContent.js";
import VlueAuthMemberPopup from "./VlueAuthMemberPopup.jsx";
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

/** 통화기록 재생 — 송출 OFF 스냅샷이어도 등록된 유료 명함은 그대로 */
function normalizeHistoryReplayStyle(style, tier) {
  const base = style && typeof style === "object" ? style : silentShowcaseStyle();
  if (!isPaidLetteringTier(tier)) return base;
  return { ...base, includeDigitalCard: true };
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
  const snapUserId = String(snap.userId || call.userId || "").trim();
  const peerStyle =
    matchedHint && snapStyle && snapUserId
      ? normalizeHistoryReplayStyle(snapStyle, tier)
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
 */
function hasUsableLocalSnapshot(call) {
  if (call?.verified !== true) return false;
  const snap = call?.cardSnapshot;
  const style = call?.showcaseSnapshot;
  return Boolean(style || snap?.photoUrl || snap?.name || snap?.userId || call?.userId);
}

function snapshotIsCompleteEnough(call) {
  if (!hasUsableLocalSnapshot(call)) return false;
  /* DCC·쇼케이스 미디어가 있을 때만 풀 화면 — 없으면 VLUE 인증 팝업 */
  return peerHasDccOrShowcaseContent(call.cardSnapshot, call.showcaseSnapshot);
}

function styleHasPages(style) {
  if (!style || typeof style !== "object") return false;
  if (Array.isArray(style.pages) && style.pages.some((p) => p && typeof p === "object")) return true;
  if (Array.isArray(style.gallery?.photos) && style.gallery.photos.length > 0) return true;
  return false;
}

function peerPayloadFromResolve(payload) {
  return {
    card: payload.card,
    showcaseStyle: payload.card?.showcaseStyle || payload.showcaseStyle,
    verified: Boolean(payload.verified),
    phone: payload.phone,
    tier: payload.card?.membershipTier || "free"
  };
}

function cachePayloadIsUsable(pack) {
  if (!pack?.card) return false;
  if (!pack.verified) return false;
  return peerHasDccOrShowcaseContent(pack.card, pack.showcaseStyle || pack.card.showcaseStyle);
}

function buildAuthPopupFromCall(call, card = null) {
  const phone = call?.phoneDisplay || call?.phone || card?.phone || "";
  return {
    open: true,
    name:
      String(card?.name || call?.memberName || call?.name || "").trim() ||
      "",
    phone,
    handle: String(card?.publicHandle || call?.publicHandle || "").trim()
  };
}

function memberLikelyHasShowcase(call, cachedPeer = null) {
  const tier = call?.membershipTier || cachedPeer?.card?.membershipTier || cachedPeer?.tier;
  if (isPaidLetteringTier(tier)) return true;
  if (snapshotIsCompleteEnough(call)) return true;
  if (cachedPeer && cachePayloadIsUsable(cachedPeer)) return true;
  return false;
}

const CALL_HISTORY_LINE_KEY = "vlue_call_history_line_id";

function readCallHistoryLineId() {
  try {
    return String(sessionStorage.getItem(CALL_HISTORY_LINE_KEY) || "").trim();
  } catch {
    return "";
  }
}

function writeCallHistoryLineId(id) {
  try {
    if (id) sessionStorage.setItem(CALL_HISTORY_LINE_KEY, String(id));
    else sessionStorage.removeItem(CALL_HISTORY_LINE_KEY);
  } catch {
    /* ignore */
  }
}

function CallHistoryAvatar({ call }) {
  const url = resolveCallHistoryAvatar(call);
  const label = String(call?.memberName || call?.name || "").trim();
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
  const [items, setItems] = useState(() => readCallHistoryListCache() || []);
  const [lines, setLines] = useState([]);
  const [lineFilter, setLineFilter] = useState(() => readCallHistoryLineId() || "all");
  const [loadError, setLoadError] = useState("");
  const [selected, setSelected] = useState(null);
  const [previewCard, setPreviewCard] = useState(null);
  const [previewVerified, setPreviewVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(() => !(readCallHistoryListCache()?.length));
  const [expanded, setExpanded] = useState(true);
  const [rowMatrix, setRowMatrix] = useState({});
  const [busyId, setBusyId] = useState("");
  const [toast, setToast] = useState("");
  const [authPopup, setAuthPopup] = useState({ open: false, name: "", phone: "", handle: "" });
  const openGenRef = useRef(0);
  const { unlockAudioGesture, setPlaybackPhase } = useShowcaseBgm();

  const closeAuthPopup = useCallback(() => {
    setAuthPopup({ open: false, name: "", phone: "", handle: "" });
  }, []);

  const openAuthPopupForPeer = useCallback((call, card = null) => {
    setSelected(null);
    setPreviewCard(null);
    setPreviewVerified(false);
    setExpanded(true);
    setLoading(false);
    setAuthPopup(buildAuthPopupFromCall(call, card));
  }, []);

  const showToast = useCallback((msg) => {
    setToast(String(msg || "").trim());
    window.setTimeout(() => setToast(""), 2600);
  }, []);

  const refresh = useCallback(async () => {
    setLoadError("");
    const hasVisibleRows = Boolean(readCallHistoryListCache()?.length || items.length);
    if (!hasVisibleRows) setListLoading(true);
    try {
      const raw = await fetchDeviceCallLogEntries(200);
      /* 1차: 기기 로그 + 로컬 히스토리 + CEO 시드 — 번호만 보이다가 이름 붙는 깜빡임 방지 */
      const quick = applyLocalKnownPeersToCallGroups(
        buildCallHistoryList({
          deviceEntries: raw,
          lineEvents: [],
          selectedLine: "all",
          lines: []
        })
      );
      setItems(quick);
      if (quick.length) writeCallHistoryListCache(quick);
      setListLoading(false);

      const phonesForLookup = [
        ...new Set(quick.map((g) => g.phoneDisplay || g.phone).filter(Boolean))
      ].slice(0, 48);
      const [lineRows, lineEvents, members] = await Promise.all([
        fetchDccLines()
          .then((d) => (Array.isArray(d.lines) ? d.lines : []))
          .catch(() => []),
        fetchLineCallHistory(lineFilter).catch(() => []),
        fetchMemberNamesByNumbers(phonesForLookup).catch(() => [])
      ]);
      setLines(lineRows);
      const selectedLine =
        lineFilter && lineFilter !== "all" ? lineRows.find((l) => l.id === lineFilter) || null : "all";
      const merged = buildCallHistoryList({
        deviceEntries: raw,
        lineEvents,
        selectedLine,
        lines: lineRows
      });
      const enriched = applyLocalKnownPeersToCallGroups(
        applyMemberDirectoryToCallGroups(merged, members)
      );
      setItems(enriched);
      if (enriched.length) writeCallHistoryListCache(enriched);
      if (!raw.length && !lineEvents.length) {
        setLoadError(
          typeof window !== "undefined" &&
            !(window.Android?.getDeviceCallLogJson || window.VlueLettering?.getDeviceCallLogJson) &&
            lineFilter === "all"
            ? "이 환경에서는 시스템 통화기록을 읽을 수 없습니다."
            : ""
        );
      }
    } catch {
      setItems([]);
      setLoadError("통화기록을 불러오지 못했습니다.");
      setListLoading(false);
    } finally {
      setListLoading(false);
    }
  }, [lineFilter]);

  useEffect(() => {
    void warmCallHistoryList();
    const onWarmed = () => {
      const cached = readCallHistoryListCache();
      if (!cached?.length) return;
      setItems(cached);
      setListLoading(false);
    };
    window.addEventListener(CALL_HISTORY_LIST_WARMED, onWarmed);
    return () => window.removeEventListener(CALL_HISTORY_LIST_WARMED, onWarmed);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const cached = readCallHistoryListCache();
    if (cached?.length) {
      setItems(cached);
      setListLoading(false);
    }
    const frame = requestAnimationFrame(() => {
      void refresh();
    });
    const onChange = () => refresh();
    window.addEventListener(CALL_SHOWCASE_HISTORY_CHANGED, onChange);
    window.addEventListener("vlue-card-wallet-changed", onChange);
    return () => {
      window.cancelAnimationFrame(frame);
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
      setAuthPopup({ open: false, name: "", phone: "", handle: "" });
      return undefined;
    }
    let cancelled = false;
    const buildMatrix = () => {
      const next = {};
      for (const call of items) {
        const phone = call.phoneDisplay || call.phone;
        const isVlueMember =
          call.verified === true || Boolean(call.memberName) || Boolean(call.userId);
        next[call.id] = resolveCallPeerMatrixSync({
          phone,
          isVlueMember,
          verified: isVlueMember
        });
      }
      if (!cancelled) setRowMatrix(next);
    };
    buildMatrix();
    void syncDeviceContactsFromNative()
      .then(() => {
        if (!cancelled) buildMatrix();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, items]);

  /* 목록에 보이는 VLUE 회원 쇼케이스 — 탭 전 미리 불러오기 */
  useEffect(() => {
    if (!open || !items.length) return undefined;
    const tops = items.filter((c) => c.verified === true).slice(0, 12);
    for (const call of tops) {
      const phone = call.phoneDisplay || call.phone;
      if (!phone || readCallHistoryPeerCache(phone)) continue;
      prefetchCallHistoryPeer(phone, () =>
        resolveCallHistoryShowcasePeer(phone, {
          displayName: call.name || call.memberName || "",
          avatarUrl: call.avatarUrl || ""
        }).then((payload) => peerPayloadFromResolve(payload))
      );
    }
    return undefined;
  }, [open, items]);

  const applyPeerPayload = useCallback(
    (payload, call, gen) => {
      if (gen !== openGenRef.current || !payload?.card) return;
      const tier = payload.card.membershipTier || call.membershipTier || "free";
      const verified = Boolean(payload.verified);
      const hasContent = peerHasDccOrShowcaseContent(
        payload.card,
        payload.showcaseStyle || payload.card.showcaseStyle
      );

      /* 인증 회원인데 DCC·쇼케이스 없음 → 빈 풀스크린 대신 VLUE 인증 팝업 */
      if (verified && !hasContent && !isNationalAgencyDcpCard(payload.card)) {
        openAuthPopupForPeer(call, payload.card);
        return;
      }

      setPreviewVerified(verified);
      setPreviewCard(payload.card);
      setLoading(false);
      if (verified && payload.card?.name) {
        setSelected((prev) =>
          prev
            ? {
                ...prev,
                name: payload.card.name || prev.name,
                verified: true,
                membershipTier: tier,
                avatarUrl: payload.card.photoUrl || payload.card.avatarUrl || prev.avatarUrl
              }
            : prev
        );
      }
    },
    [openAuthPopupForPeer]
  );

  const loadPeerPayload = useCallback(async (call, opts = {}) => {
    const phone = call.phoneDisplay || call.phone;
    return resolveCallHistoryShowcasePeer(phone, {
      force: Boolean(opts.force),
      displayName: call.name || call.memberName || "",
      avatarUrl: call.avatarUrl || ""
    }).then((payload) => {
      const packed = peerPayloadFromResolve(payload);
      writeCallHistoryPeerCache(phone, packed);
      return packed;
    });
  }, []);

  const hydrateCallFromNetwork = useCallback(
    async (call, gen, opts = {}) => {
      const background = Boolean(opts.background);
      const phone = call.phoneDisplay || call.phone;
      try {
        if (!background) setLoading(true);
        const payload = await prefetchCallHistoryPeer(phone, () =>
          loadPeerPayload(call, { force: Boolean(opts.forceStyle) })
        );
        applyPeerPayload(payload, call, gen);
      } finally {
        if (gen === openGenRef.current) setLoading(false);
      }
    },
    [applyPeerPayload, loadPeerPayload]
  );

  const runRowAction = async (call, matrix) => {
    setBusyId(call.id);
    try {
      let card = call.cardSnapshot || null;
      if (!card && matrix.cta !== "kakao_share") {
        const payload = await resolveCallHistoryShowcasePeer(call.phoneDisplay || call.phone);
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

  const openCall = (call) => {
    const gen = ++openGenRef.current;
    const phone = call.phoneDisplay || call.phone;

    /* 제스처 unlock만 — 통화 열 때 BGM을 끊지 않음 (쇼케이스/케이스함이 이어서 재생) */
    try {
      unlockAudioGesture?.();
    } catch {
      /* ignore */
    }

    const cachedPeer = readCallHistoryPeerCache(phone);

    /* 캐시된 인증 회원 + 송출 없음 — 유료·로컬 완전 스냅샷은 인증 팝업 생략 */
    if (
      cachedPeer?.verified &&
      cachedPeer?.card &&
      !peerHasDccOrShowcaseContent(
        cachedPeer.card,
        cachedPeer.showcaseStyle || cachedPeer.card.showcaseStyle
      )
    ) {
      if (memberLikelyHasShowcase(call, cachedPeer)) {
        if (cachePayloadIsUsable(cachedPeer)) {
          flushSync(() => {
            setAuthPopup({ open: false, name: "", phone: "", handle: "" });
            setSelected(call);
            setExpanded(true);
            setPreviewVerified(true);
            setPreviewCard(cachedPeer.card);
            setLoading(false);
          });
          void hydrateCallFromNetwork(call, gen, { background: true, forceStyle: false });
          return;
        }
        flushSync(() => {
          setAuthPopup({ open: false, name: "", phone: "", handle: "" });
          setSelected(call);
          setExpanded(true);
          setPreviewCard(null);
          setPreviewVerified(true);
          setLoading(true);
        });
        void hydrateCallFromNetwork(call, gen, { background: false, forceStyle: true });
        return;
      }
      openAuthPopupForPeer(call, cachedPeer.card);
      void hydrateCallFromNetwork(call, gen, { background: true, forceStyle: false });
      return;
    }

    const agency = matchNationalAgency(phone);

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
        setAuthPopup({ open: false, name: "", phone: "", handle: "" });
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

    /* VLUE 회원 + 송출 콘텐츠 없음 → 즉시 인증 팝업 (무료·유료·송출 OFF 공통) */
    const listLooksLikeMember =
      call.verified === true ||
      Boolean(call.memberName) ||
      Boolean(call.userId) ||
      Boolean(cachedPeer?.verified);
    if (
      listLooksLikeMember &&
      !peerHasDccOrShowcaseContent(call.cardSnapshot, call.showcaseSnapshot)
    ) {
      if (memberLikelyHasShowcase(call, cachedPeer)) {
        const cachedPack = readCallHistoryPeerCache(phone);
        if (cachedPack?.card && cachePayloadIsUsable(cachedPack)) {
          flushSync(() => {
            setAuthPopup({ open: false, name: "", phone: "", handle: "" });
            setSelected(call);
            setExpanded(true);
            setPreviewVerified(true);
            setPreviewCard(cachedPack.card);
            setLoading(false);
          });
          void hydrateCallFromNetwork(call, gen, { background: true, forceStyle: false });
          return;
        }
        if (snapshotIsCompleteEnough(call)) {
          const optimistic = buildOptimisticHistoryCard(call);
          flushSync(() => {
            setAuthPopup({ open: false, name: "", phone: "", handle: "" });
            setSelected(call);
            setExpanded(true);
            setPreviewVerified(true);
            setPreviewCard(optimistic.card);
            setLoading(false);
          });
          void hydrateCallFromNetwork(call, gen, { background: true, forceStyle: true });
          return;
        }
        flushSync(() => {
          setAuthPopup({ open: false, name: "", phone: "", handle: "" });
          setSelected(call);
          setExpanded(true);
          setPreviewCard(null);
          setPreviewVerified(true);
          setLoading(true);
        });
        void hydrateCallFromNetwork(call, gen, { background: false, forceStyle: true });
        return;
      }
      const cachedEmpty = readCallHistoryPeerCache(phone);
      if (cachedEmpty?.card && cachePayloadIsUsable(cachedEmpty)) {
        flushSync(() => {
          setAuthPopup({ open: false, name: "", phone: "", handle: "" });
          setSelected(call);
          setExpanded(true);
          setPreviewVerified(Boolean(cachedEmpty.verified));
          setPreviewCard(cachedEmpty.card);
          setLoading(false);
        });
        void hydrateCallFromNetwork(call, gen, { background: true, forceStyle: false });
        return;
      }
      if (
        cachedEmpty?.verified &&
        cachedEmpty?.card &&
        !peerHasDccOrShowcaseContent(cachedEmpty.card, cachedEmpty.showcaseStyle)
      ) {
        openAuthPopupForPeer(call, cachedEmpty.card);
        return;
      }
      openAuthPopupForPeer(call, call.cardSnapshot || cachedEmpty?.card || null);
      void loadPeerPayload(call, { force: true }).then((payload) => {
        if (openGenRef.current !== gen) return;
        if (
          payload?.verified &&
          peerHasDccOrShowcaseContent(payload.card, payload.showcaseStyle)
        ) {
          flushSync(() => {
            setAuthPopup({ open: false, name: "", phone: "", handle: "" });
            setSelected(call);
            setExpanded(true);
            setPreviewVerified(true);
            setPreviewCard(payload.card);
            setLoading(false);
          });
          return;
        }
        if (payload?.card) {
          setAuthPopup(buildAuthPopupFromCall(call, payload.card));
        }
      });
      return;
    }

    const cached = readCallHistoryPeerCache(phone);
    if (cached?.card && cachePayloadIsUsable(cached)) {
      flushSync(() => {
        setAuthPopup({ open: false, name: "", phone: "", handle: "" });
        setSelected(call);
        setExpanded(true);
        setPreviewVerified(Boolean(cached.verified));
        setPreviewCard(cached.card);
        setLoading(false);
      });
      void hydrateCallFromNetwork(call, gen, { background: true, forceStyle: false });
      return;
    }

    if (
      cached?.verified &&
      cached?.card &&
      !peerHasDccOrShowcaseContent(cached.card, cached.showcaseStyle)
    ) {
      openAuthPopupForPeer(call, cached.card);
      return;
    }

    /* 완전한 로컬 스냅샷만 즉시 표시 — 불완전 DCC 깜빡임 방지 */
    if (snapshotIsCompleteEnough(call)) {
      const optimistic = buildOptimisticHistoryCard(call);
      flushSync(() => {
        setAuthPopup({ open: false, name: "", phone: "", handle: "" });
        setSelected(call);
        setExpanded(true);
        setPreviewVerified(true);
        setPreviewCard(optimistic.card);
        setLoading(false);
      });
      void hydrateCallFromNetwork(call, gen, { background: true, forceStyle: true });
      return;
    }

    flushSync(() => {
      setAuthPopup({ open: false, name: "", phone: "", handle: "" });
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
    setAuthPopup({ open: false, name: "", phone: "", handle: "" });
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
                    (isMember && isPaidLetteringTier(tier))
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

  const emptyHint = (() => {
    if (loadError) return loadError;
    if (lineFilter !== "all") {
      return "이 번호로 쌓인 통화가 없습니다. VLUE 앱에서 이 번호로 걸면 이 계정 목록에 표시됩니다.";
    }
    return "통화 기록이 없습니다. 전화·통화기록 권한을 확인해 주세요.";
  })();

  const lineFilterBar =
    lines.length > 1 ? (
      <div className="call-history-line-filter">
        <label className="call-history-line-filter__label" htmlFor="call-history-line-select">
          번호
        </label>
        <div className="call-history-line-filter__wrap">
          <select
            id="call-history-line-select"
            className="call-history-line-filter__select"
            value={lineFilter}
            aria-label="통화목록 번호"
            onChange={(e) => {
              const next = e.target.value || "all";
              writeCallHistoryLineId(next);
              setLineFilter(next);
            }}
          >
            <option value="all">전체 번호</option>
            {lines.map((line) => (
              <option key={line.id} value={line.id}>
                {dccLineOptionLabel(line)}
              </option>
            ))}
          </select>
        </div>
      </div>
    ) : null;

  return (
    <>
    <AppFullScreenView
      open={open}
      onClose={onClose}
      title="통화 목록"
      subtitle="번호별 통화기록 · 상대 쇼케이스"
      icon={Phone}
      isDarkMode={isDarkMode}
      reserveBottomNav
    >
      {toast ? (
        <p className="call-history-toast call-history-toast--list" role="status">
          {toast}
        </p>
      ) : null}
      {lineFilterBar}
      {listLoading ? (
        <p className="px-4 py-16 text-center text-[13px] font-semibold text-slate-500">
          통화기록 불러오는 중…
        </p>
      ) : items.length === 0 ? (
        <p className="px-4 py-16 text-center text-[13px] font-semibold text-slate-500">{emptyHint}</p>
      ) : (
        <ul className="friend-showcase-list__rows m-0 min-h-0 flex-1 list-none overflow-y-auto p-0">
          {items.map((call) => {
            const matrix = rowMatrix[call.id];
            const member = Boolean(call.memberName || call.verified);
            return (
              <li key={call.id}>
                <div className="friend-showcase-list__row call-history-row">
                  <button type="button" className="call-history-row__main" onClick={() => openCall(call)}>
                    <CallHistoryAvatar call={call} />
                    <div className="friend-showcase-list__meta">
                      <p className="friend-showcase-list__name">
                        {formatCallGroupLabel(call)}
                        {member && isPaidLetteringTier(call.membershipTier) ? (
                          <ShieldCheck
                            size={15}
                            strokeWidth={2.4}
                            className="ml-1 inline-block align-[-2px] text-blue-600"
                            aria-label="유료 · VLUE 보안 인증"
                          />
                        ) : null}
                      </p>
                      <p className="friend-showcase-list__subtitle">
                        {formatCallDuration(call.durationSec)}
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
    <VlueAuthMemberPopup
      open={Boolean(open && authPopup.open)}
      name={authPopup.name}
      phone={authPopup.phone}
      handle={authPopup.handle}
      onClose={closeAuthPopup}
    />
    </>
  );
}
