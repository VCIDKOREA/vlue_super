import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Phone, PhoneIncoming, PhoneOutgoing, ShieldCheck } from "lucide-react";
import { CALL_SHOWCASE_HISTORY_CHANGED } from "../lib/callShowcaseHistory.js";
import {
  applyLocalKnownPeersToCallGroups,
  applyMemberDirectoryToCallGroups,
  applyKnownContactsToCallGroups,
  preserveMemberHintsToCallGroups,
  buildCallHistoryList,
  fetchDeviceCallLogEntries,
  formatCallDuration,
  formatCallGroupLabel,
  formatCallWhen,
  resolveCallDisplayName,
  resolveCallHistoryAvatar
} from "../lib/callLogList.js";
import {
  applySafeCareLocalToCallGroups,
  needsSafeCareSave,
  saveSafeCareOneClick
} from "../lib/safeCareLocalCache.js";
import { fetchDccLines } from "../lib/dccLinesApi.js";
import { dccLineOptionLabel } from "../lib/dccLineLabel.js";
import { fetchLineCallHistory, fetchMemberNamesByNumbers } from "../lib/lineCallHistoryApi.js";
import { resolveCallHistoryShowcasePeer } from "../lib/resolveCallHistoryShowcasePeer.js";
import {
  invalidateCallHistoryPeerCache,
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
import {
  applyPersistedMemberHintsToCallGroups,
  rememberMemberDirectoryResults,
  writeCallHistoryMemberHint
} from "../lib/callHistoryMemberIndex.js";
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
import ShareShowcaseChannelSheet from "./call/ShareShowcaseChannelSheet.jsx";
import { CALL_PEER_CTA } from "../lib/call/callPeerMatrix.js";
import { resolveIsKnownContactSync } from "../lib/contacts/hybridKnownContact.js";
import {
  DEVICE_CONTACTS_CHANGED,
  syncDeviceContactsFromNative
} from "../lib/contacts/deviceContactsCache.js";
import { useShowcaseBgm } from "../context/ShowcaseBgmContext.jsx";
import {
  buildNationalAgencyDcpCard,
  isNationalAgencyDcpCard,
  matchNationalAgency
} from "../lib/nationalAgencyDcpClient.js";
import { peerHasDccOrShowcaseContent } from "../lib/peerShowcaseContent.js";
import {
  CALL_HISTORY_ROUTE,
  decideCallHistoryRoute,
  decideCallHistoryRouteFromPayload,
  mayApplyRoute,
  resolveHistoryRowMemberState
} from "../lib/call/callHistoryRoute.js";
import { formatAgencyTelHref } from "../lib/showcase/showcaseContactActions.js";
import VlueAuthMemberPopup from "./VlueAuthMemberPopup.jsx";
import AgencyDcpMiniPopup from "./agency/AgencyDcpMiniPopup.jsx";
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
  const listAvatar = String(call.avatarUrl || snap.photoUrl || snap.avatarUrl || "").trim();
  const peerStyle =
    matchedHint && snapStyle
      ? normalizeHistoryReplayStyle(snapStyle, tier)
      : snapStyle && typeof snapStyle === "object"
        ? normalizeHistoryReplayStyle(snapStyle, tier)
        : silentShowcaseStyle();
  const name = matchedHint
    ? String(snap.name || call.memberName || call.name || "").trim()
    : String(snap.name || "").trim();
  const card = applyShowcaseStyleToCard(
    {
      userId: snapUserId,
      ownerUserId: snapUserId,
      name,
      phone,
      organization: matchedHint ? String(snap.organization || "").trim() : "",
      title: matchedHint ? String(snap.title || "").trim() : "",
      email: matchedHint ? String(snap.email || "").trim() : "",
      website: matchedHint ? String(snap.website || "").trim() : "",
      logoUrl: matchedHint ? String(snap.logoUrl || "").trim() : "",
      photoUrl: matchedHint
        ? String(snap.photoUrl || call.avatarUrl || "").trim()
        : /^https:\/\//i.test(listAvatar)
          ? listAvatar
          : "",
      avatarUrl: matchedHint
        ? String(snap.avatarUrl || snap.photoUrl || call.avatarUrl || "").trim()
        : /^https:\/\//i.test(listAvatar)
          ? listAvatar
          : "",
      photoFocus: String(snap.photoFocus || "center").trim() || "center",
      membershipTier: tier,
      showcaseStyle: peerStyle,
      _optimistic: true
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
  /* DCC·쇼케이스 미디어가 있을 때만 풀 화면 — 없으면 VLUÉ 인증 팝업 */
  return peerHasDccOrShowcaseContent(call.cardSnapshot, call.showcaseSnapshot);
}

/** 네트워크 전에도 즉시 페인트를 시도할 수 있는지 */
function canPaintOptimisticCard(call) {
  if (!call) return false;
  if (snapshotIsCompleteEnough(call)) return true;
  if (call.verified === true) return true;
  if (call.phoneDisplay || call.phone) return true;
  return Boolean(call.name || call.memberName || call.avatarUrl);
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

function CallHistoryAvatar({ call, cacheTick = 0, onBrokenUrl }) {
  let url = "";
  try {
    url = typeof resolveCallHistoryAvatar === "function" ? resolveCallHistoryAvatar(call) : "";
  } catch {
    url = "";
  }
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
  }, [url, cacheTick]);
  const label = resolveCallDisplayName(call);
  const Icon = call.direction === "out" ? PhoneOutgoing : PhoneIncoming;

  if (url && !broken) {
    return (
      <img
        className="friend-showcase-list__avatar"
        src={url}
        alt=""
        referrerPolicy="no-referrer"
        decoding="async"
        onError={() => {
          setBroken(true);
          try {
            onBrokenUrl?.(url, call);
          } catch {
            /* ignore */
          }
        }}
      />
    );
  }

  if (label) {
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
  const variant = matrix.variant === "case" ? "case" : matrix.variant === "share" ? "share" : "";
  const short =
    variant === "case" ? "케이스함" : variant === "share" ? "전달" : matrix.label || "";
  return (
    <button
      type="button"
      className={`call-history-row__cta call-history-row__cta--inline${variant ? ` call-history-row__cta--${variant}` : ""}`}
      disabled={busy}
      onClick={(e) => {
        e.stopPropagation();
        onAction(call, matrix);
      }}
    >
      {busy ? "…" : short}
    </button>
  );
}

function openSystemDialer(phone) {
  const href = formatAgencyTelHref(phone);
  if (!href) return false;
  try {
    window.location.href = href;
    return true;
  } catch {
    return false;
  }
}

/** 좌: 카톡/SMS 전달 / 우: 기본 전화앱 — 배경 액션 노출 애니메이션 */
function CallHistorySwipeRow({ call, matrix, busy, onOpen, onShare, onAction, children }) {
  const startRef = useRef(null);
  const [offsetX, setOffsetX] = useState(0);
  const [settling, setSettling] = useState(false);

  const snapBack = () => {
    setSettling(true);
    setOffsetX(0);
    window.setTimeout(() => setSettling(false), 220);
  };

  const endSwipe = (e) => {
    const s = startRef.current;
    startRef.current = null;
    if (!s || (e.pointerId != null && s.id !== e.pointerId)) {
      snapBack();
      return;
    }
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 72 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      if (dx > 0) {
        setOffsetX(88);
        setSettling(true);
        window.setTimeout(() => {
          openSystemDialer(call.phoneDisplay || call.phone);
          snapBack();
        }, 160);
      } else {
        setOffsetX(-88);
        setSettling(true);
        window.setTimeout(() => {
          onShare?.(call, matrix);
          snapBack();
        }, 160);
      }
      return;
    }
    snapBack();
    if (!s.moved) onOpen?.(call);
  };

  const reveal = Math.max(-96, Math.min(96, offsetX));
  const showRight = reveal > 8;
  const showLeft = reveal < -8;

  return (
    <div className="call-history-swipe">
      <div
        className={`call-history-swipe__under call-history-swipe__under--dial${showRight ? " is-visible" : ""}`}
        aria-hidden
      >
        <Phone size={18} strokeWidth={2.4} />
        <span>전화</span>
      </div>
      <div
        className={`call-history-swipe__under call-history-swipe__under--share${showLeft ? " is-visible" : ""}`}
        aria-hidden
      >
        <span>전달</span>
        <span className="call-history-swipe__under-sub">카톡 · SMS</span>
      </div>
      <div
        className={`call-history-row call-history-row--samsung${settling ? " is-settling" : ""}`}
        style={{ transform: `translateX(${reveal}px)` }}
        onPointerDown={(e) => {
          if (e.button != null && e.button !== 0) return;
          if (e.target?.closest?.("button")) return;
          setSettling(false);
          startRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false };
          try {
            e.currentTarget.setPointerCapture?.(e.pointerId);
          } catch {
            /* ignore */
          }
        }}
        onPointerMove={(e) => {
          const s = startRef.current;
          if (!s || s.id !== e.pointerId) return;
          const dx = e.clientX - s.x;
          const dy = e.clientY - s.y;
          if (Math.abs(dx) > 10 || Math.abs(dy) > 10) s.moved = true;
          if (Math.abs(dx) > Math.abs(dy)) setOffsetX(dx);
        }}
        onPointerUp={endSwipe}
        onPointerCancel={() => {
          startRef.current = null;
          snapBack();
        }}
      >
        {children}
        <div className="call-history-row__trailing">
          <HistoryRowCta call={call} matrix={matrix} busy={busy} onAction={onAction} />
        </div>
      </div>
    </div>
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
  const [items, setItems] = useState(() =>
    applyPersistedMemberHintsToCallGroups(readCallHistoryListCache() || [])
  );
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
  const [sharePick, setSharePick] = useState(null);
  const [authPopup, setAuthPopup] = useState({ open: false, name: "", phone: "", handle: "" });
  const [contactSafePopup, setContactSafePopup] = useState({
    open: false,
    name: "",
    phone: ""
  });
  const [peerAvatarTick, setPeerAvatarTick] = useState(0);
  const openGenRef = useRef(0);
  const routeLockRef = useRef(CALL_HISTORY_ROUTE.PENDING);
  const { unlockAudioGesture, setPlaybackPhase } = useShowcaseBgm();

  useEffect(() => {
    const onPeerCache = () => {
      setPeerAvatarTick((n) => n + 1);
      setItems((prev) => {
        let changed = false;
        const next = prev.map((call) => {
          const phone = call.phoneDisplay || call.phone;
          const cached = readCallHistoryPeerCache(phone);
          if (!cached) return call;
          const url = String(
            cached?.card?.photoUrl || cached?.card?.avatarUrl || cached?.card?.image_url || ""
          ).trim();
          const becomeMember = cached.verified === true && call.verified !== true;
          const avatarMissing = !resolveCallHistoryAvatar(call);
          const goodUrl =
            url &&
            /^https:\/\//i.test(url) &&
            !/vlue-brand-logo|vlue-shield/i.test(url);
          if (!becomeMember && !(avatarMissing && goodUrl)) return call;
          changed = true;
          return {
            ...call,
            verified: becomeMember ? true : call.verified,
            peerIsVlueMember: becomeMember ? true : call.peerIsVlueMember,
            userId: call.userId || cached.card?.userId || "",
            memberName:
              call.memberName ||
              (cached.verified ? String(cached.card?.name || "").trim() : "") ||
              call.memberName,
            membershipTier: call.membershipTier || cached.card?.membershipTier || "free",
            avatarUrl: goodUrl && avatarMissing ? url : call.avatarUrl,
            cardSnapshot: {
              ...(call.cardSnapshot && typeof call.cardSnapshot === "object"
                ? call.cardSnapshot
                : {}),
              userId: call.userId || cached.card?.userId || "",
              photoUrl: goodUrl ? url : call.cardSnapshot?.photoUrl,
              avatarUrl: goodUrl ? url : call.cardSnapshot?.avatarUrl
            }
          };
        });
        if (changed) writeCallHistoryListCache(next);
        return changed ? next : prev;
      });
    };
    window.addEventListener("vlue-call-history-peer-cache-changed", onPeerCache);
    return () => window.removeEventListener("vlue-call-history-peer-cache-changed", onPeerCache);
  }, []);

  /* 상위 번호 light prefetch — by-number 만 (full profile/live 16개 동시 호출이 30초 지연 원인) */
  useEffect(() => {
    if (!open || !items.length) return undefined;
    const tops = items.slice(0, 8);
    for (const call of tops) {
      const phone = call.phoneDisplay || call.phone;
      if (!phone) continue;
      if (readCallHistoryPeerCache(phone)) continue;
      prefetchCallHistoryPeer(phone, () =>
        resolveCallHistoryShowcasePeer(phone, {
          light: true,
          displayName: call.name || call.memberName || "",
          avatarUrl: call.avatarUrl || ""
        }).then((payload) => peerPayloadFromResolve(payload))
      );
    }
    return undefined;
  }, [open, items]);

  const closeAuthPopup = useCallback(() => {
    setAuthPopup({ open: false, name: "", phone: "", handle: "" });
  }, []);

  const closeContactSafePopup = useCallback(() => {
    setContactSafePopup({ open: false, name: "", phone: "" });
  }, []);

  const openContactSafeForCall = useCallback((call, known = null) => {
    const phone = call?.phoneDisplay || call?.phone || "";
    const knownSync = known || resolveIsKnownContactSync(phone);
    const name =
      String(knownSync.matchedName || call?.contactName || call?.name || "").trim() ||
      "저장된 연락처";
    setAuthPopup({ open: false, name: "", phone: "", handle: "" });
    setSelected(null);
    setPreviewCard(null);
    setPreviewVerified(false);
    setExpanded(true);
    setLoading(false);
    /* 같은 번호 안심이 이미 열려 있으면 상태만 유지 — 닫혔다 다시 뜨는 플리커 방지 */
    setContactSafePopup((prev) => {
      if (prev.open && String(prev.phone || "") === String(phone || "")) {
        if (prev.name === name) return prev;
        return { ...prev, name };
      }
      return { open: true, name, phone };
    });
  }, []);

  const openAuthPopupForPeer = useCallback((call, card = null) => {
    setContactSafePopup({ open: false, name: "", phone: "" });
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

  const clearBrokenAvatarUrl = useCallback((brokenUrl, call) => {
    const bad = String(brokenUrl || "").trim();
    if (!bad) return;
    const phone = call?.phoneDisplay || call?.phone || "";
    setItems((prev) => {
      let changed = false;
      const next = prev.map((row) => {
        const samePhone =
          phone &&
          (row.phoneDisplay === phone || row.phone === phone || row.id === call?.id);
        const hit =
          samePhone ||
          row.avatarUrl === bad ||
          row.cardSnapshot?.photoUrl === bad ||
          row.cardSnapshot?.avatarUrl === bad;
        if (!hit) return row;
        changed = true;
        const snap =
          row.cardSnapshot && typeof row.cardSnapshot === "object" ? { ...row.cardSnapshot } : {};
        if (snap.photoUrl === bad) snap.photoUrl = "";
        if (snap.avatarUrl === bad) snap.avatarUrl = "";
        return {
          ...row,
          avatarUrl: row.avatarUrl === bad ? "" : row.avatarUrl,
          cardSnapshot: snap
        };
      });
      if (changed) writeCallHistoryListCache(next);
      return changed ? next : prev;
    });
    try {
      invalidateCallHistoryPeerCache(phone);
    } catch {
      /* ignore */
    }
    if (phone) {
      prefetchCallHistoryPeer(phone, () =>
        resolveCallHistoryShowcasePeer(phone, {
          displayName: call?.name || call?.memberName || "",
          avatarUrl: ""
        }).then((payload) => peerPayloadFromResolve(payload))
      );
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoadError("");
    const hasVisibleRows = Boolean(readCallHistoryListCache()?.length || items.length);
    if (!hasVisibleRows) setListLoading(true);
    try {
      /* 주소록 캐시를 먼저 맞춰 CallLog만으로도 저장 이름이 바로 붙게 */
      await syncDeviceContactsFromNative().catch(() => {});
      const prevHint = readCallHistoryListCache() || items;
      const phonesWarm = [
        ...new Set(prevHint.map((g) => g.phoneDisplay || g.phone).filter(Boolean))
      ].slice(0, 48);
      /* CallLog + 회원 디렉터리 병행 — 김광덕·김진현 CTA 가「전달」로 먼저 뜨지 않게 */
      const [raw, membersWarm] = await Promise.all([
        fetchDeviceCallLogEntries(200),
        phonesWarm.length
          ? fetchMemberNamesByNumbers(phonesWarm).catch(() => null)
          : Promise.resolve([])
      ]);
      if (membersWarm) rememberMemberDirectoryResults(phonesWarm, membersWarm);
      const quick = preserveMemberHintsToCallGroups(
        applyPersistedMemberHintsToCallGroups(
          applySafeCareLocalToCallGroups(
            applyKnownContactsToCallGroups(
              applyLocalKnownPeersToCallGroups(
                applyMemberDirectoryToCallGroups(
                  buildCallHistoryList({
                    deviceEntries: raw,
                    lineEvents: [],
                    selectedLine: "all",
                    lines: []
                  }),
                  membersWarm || []
                )
              )
            )
          )
        ),
        prevHint
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
        phonesForLookup.length && phonesForLookup.some((p) => !(phonesWarm || []).includes(p))
          ? fetchMemberNamesByNumbers(phonesForLookup).catch(() => membersWarm)
          : Promise.resolve(membersWarm)
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
      if (members) rememberMemberDirectoryResults(phonesForLookup, members);
      const enriched = preserveMemberHintsToCallGroups(
        applyPersistedMemberHintsToCallGroups(
          applySafeCareLocalToCallGroups(
            applyKnownContactsToCallGroups(
              applyLocalKnownPeersToCallGroups(
                applyMemberDirectoryToCallGroups(merged, members || [])
              )
            )
          )
        ),
        quick
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
      /* warm 스냅샷이 회원 플래그를 깎지 않게 — 현재 목록 힌트 유지 */
      setItems((prev) => {
        const merged = preserveMemberHintsToCallGroups(
          applyPersistedMemberHintsToCallGroups(cached),
          prev
        );
        writeCallHistoryListCache(merged);
        return merged;
      });
      setListLoading(false);
    };
    window.addEventListener(CALL_HISTORY_LIST_WARMED, onWarmed);
    return () => window.removeEventListener(CALL_HISTORY_LIST_WARMED, onWarmed);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const cached = applyPersistedMemberHintsToCallGroups(readCallHistoryListCache() || []);
    if (cached?.length) {
      setItems((prev) => {
        const merged = preserveMemberHintsToCallGroups(cached, prev);
        writeCallHistoryListCache(merged);
        return merged;
      });
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
    const next = {};
    for (const call of items) {
      const phone = call.phoneDisplay || call.phone;
      const memberState = resolveHistoryRowMemberState(call);
      if (memberState === "unknown") {
        next[call.id] = {
          phone,
          cta: CALL_PEER_CTA.NONE,
          label: "",
          variant: "",
          showCallLogAction: false,
          showInCallKakao: false
        };
        continue;
      }
      next[call.id] = resolveCallPeerMatrixSync({
        phone,
        isVlueMember: memberState === "member",
        verified: memberState === "member"
      });
    }
    setRowMatrix(next);
    return undefined;
  }, [open, items]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    const patchContactNames = () => {
      if (cancelled) return;
      setItems((prev) => {
        const next = applySafeCareLocalToCallGroups(applyKnownContactsToCallGroups(prev));
        const changed = next.some(
          (row, i) =>
            row.contactName !== prev[i]?.contactName ||
            row.name !== prev[i]?.name ||
            row.safeCareCached !== prev[i]?.safeCareCached
        );
        if (!changed) return prev;
        writeCallHistoryListCache(next);
        return next;
      });
    };
    void syncDeviceContactsFromNative()
      .then(() => patchContactNames())
      .catch(() => {});
    window.addEventListener(DEVICE_CONTACTS_CHANGED, patchContactNames);
    return () => {
      cancelled = true;
      window.removeEventListener(DEVICE_CONTACTS_CHANGED, patchContactNames);
    };
  }, [open]);

  const applyPeerPayload = useCallback(
    (payload, call, gen) => {
      if (gen !== openGenRef.current) return;
      const next = decideCallHistoryRouteFromPayload(call, payload || {});
      /* 네트워크 페이로드 = conclusive — 가입/탈퇴·송출 ON/OFF 반영 */
      if (!mayApplyRoute(routeLockRef.current, next.kind, { conclusive: true })) return;

      const phone = call?.phoneDisplay || call?.phone || "";
      const uuidOk =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          String(payload?.card?.userId || "").trim()
        );
      if (payload?.verified === true && uuidOk && phone) {
        writeCallHistoryMemberHint(phone, {
          verified: true,
          userId: payload?.card?.userId || "",
          name: payload?.card?.name || call?.memberName || call?.name || "",
          membershipTier: payload?.card?.membershipTier || call?.membershipTier || "free"
        });
      } else if (payload && payload.verified === false && phone) {
        writeCallHistoryMemberHint(phone, {
          verified: false,
          userId: "",
          name: call?.name || "",
          membershipTier: "free"
        });
      }

      if (routeLockRef.current === next.kind && next.kind !== CALL_HISTORY_ROUTE.PENDING) {
        if (next.kind === CALL_HISTORY_ROUTE.SHOWCASE && payload?.card) {
          setPreviewCard(payload.card);
          setPreviewVerified(true);
          setLoading(false);
        }
        return;
      }

      routeLockRef.current = next.kind;

      /* ③ 안심 (송출 OFF 회원 포함 — AUTH 팝업 쓰지 않음) */
      if (next.kind === CALL_HISTORY_ROUTE.SAFE) {
        setAuthPopup({ open: false, name: "", phone: "", handle: "" });
        openContactSafeForCall(call, resolveIsKnownContactSync(phone));
        return;
      }

      if (next.kind === CALL_HISTORY_ROUTE.AGENCY && next.agency) {
        const dcpCard = applyShowcaseStyleToCard(
          {
            ...buildNationalAgencyDcpCard(next.agency),
            showcaseStyle: silentShowcaseStyle()
          },
          "paid",
          { peerMode: true, style: silentShowcaseStyle() }
        );
        setAuthPopup({ open: false, name: "", phone: "", handle: "" });
        setContactSafePopup({ open: false, name: "", phone: "" });
        setSelected({
          ...call,
          name: next.agency.agencyName,
          verified: true,
          membershipTier: "paid"
        });
        setExpanded(true);
        setPreviewVerified(true);
        setPreviewCard(dcpCard);
        setLoading(false);
        return;
      }

      /* ①② 쇼케이스 */
      if (next.kind === CALL_HISTORY_ROUTE.SHOWCASE && (next.card || payload?.card)) {
        const card = next.card || payload.card;
        const tier = card.membershipTier || call.membershipTier || "free";
        setAuthPopup({ open: false, name: "", phone: "", handle: "" });
        setContactSafePopup({ open: false, name: "", phone: "" });
        setSelected({
          ...call,
          name: card.name || call.name,
          verified: true,
          membershipTier: tier,
          avatarUrl: card.photoUrl || card.avatarUrl || call.avatarUrl,
          showcaseVariant: next.variant || ""
        });
        setExpanded(true);
        setPreviewVerified(true);
        setPreviewCard(card);
        setLoading(false);
        return;
      }

      /* ④ 미인증 */
      {
        const card =
          next.card ||
          payload?.card || {
            name: call.name || "",
            phone: call.phoneDisplay || call.phone || "",
            membershipTier: "free",
            showcaseStyle: silentShowcaseStyle()
          };
        setAuthPopup({ open: false, name: "", phone: "", handle: "" });
        setContactSafePopup({ open: false, name: "", phone: "" });
        setSelected(call);
        setExpanded(true);
        setPreviewVerified(false);
        setPreviewCard(card);
        setLoading(false);
      }
    },
    [openContactSafeForCall]
  );

  const loadPeerPayload = useCallback(async (call, opts = {}) => {
    const phone = call.phoneDisplay || call.phone;
    return resolveCallHistoryShowcasePeer(phone, {
      force: Boolean(opts.force),
      light: Boolean(opts.light),
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
      const force = Boolean(opts.forceStyle);
      const light = Boolean(opts.light);
      const phone = call.phoneDisplay || call.phone;
      try {
        if (!background) setLoading(true);
        const payload = await prefetchCallHistoryPeer(
          phone,
          () => loadPeerPayload(call, { force, light }),
          { force }
        );
        applyPeerPayload(payload, call, gen);
      } finally {
        if (gen === openGenRef.current) setLoading(false);
      }
    },
    [applyPeerPayload, loadPeerPayload]
  );

  const runRowAction = async (call, matrix, shareChannel = null) => {
    const cta = matrix?.cta;
    if (
      (cta === CALL_PEER_CTA.SHARE_SHOWCASE || cta === CALL_PEER_CTA.KAKAO_SHARE) &&
      !shareChannel
    ) {
      setSharePick({ call, matrix });
      return;
    }
    setBusyId(call.id);
    try {
      let card = call.cardSnapshot || null;
      if (!card && cta !== CALL_PEER_CTA.SHARE_SHOWCASE && cta !== CALL_PEER_CTA.KAKAO_SHARE) {
        const payload = await resolveCallHistoryShowcasePeer(call.phoneDisplay || call.phone);
        card = payload.card;
      }
      const result = await runCallPeerMatrixAction({
        matrix,
        card: card || { name: call.name, phone: call.phoneDisplay || call.phone, userId: call.userId },
        call,
        phone: call.phoneDisplay || call.phone,
        shareChannel,
        onToast: showToast,
        onBeforeNavigate: () => {
          onClose?.();
        }
      });
      if (result?.needsChannel) {
        setSharePick({ call, matrix });
        return;
      }
      refresh();
    } finally {
      setBusyId("");
      setSharePick(null);
    }
  };

  const saveSafeCare = (call) => {
    const id = call?.id || "";
    setBusyId(id ? `safe:${id}` : "");
    try {
      const result = saveSafeCareOneClick(call);
      if (!result.ok) {
        showToast("저장할 번호·이름이 없습니다.");
        return;
      }
      setItems((prev) => {
        const next = applySafeCareLocalToCallGroups(prev);
        writeCallHistoryListCache(next);
        return next;
      });
      showToast("안심 저장 완료 — 다음 통화부터 기기에서 바로 표시됩니다.");
    } finally {
      setBusyId("");
    }
  };

  const openCall = (call) => {
    const gen = ++openGenRef.current;
    const phone = call.phoneDisplay || call.phone;

    try {
      unlockAudioGesture?.();
    } catch {
      /* ignore */
    }

    const cachedPeer = readCallHistoryPeerCache(phone);
    const decision = decideCallHistoryRoute(call, cachedPeer);
    routeLockRef.current = decision.kind;

    const paintShowcase = (card, verified, { backgroundHydrate = false, forceStyle = false } = {}) => {
      flushSync(() => {
        setAuthPopup({ open: false, name: "", phone: "", handle: "" });
        setContactSafePopup({ open: false, name: "", phone: "" });
        setSelected(call);
        setExpanded(true);
        setPreviewVerified(Boolean(verified));
        setPreviewCard(card);
        setLoading(false);
      });
      if (backgroundHydrate) {
        void hydrateCallFromNetwork(call, gen, { background: true, forceStyle });
      }
    };

    const paintPending = () => {
      flushSync(() => {
        setAuthPopup({ open: false, name: "", phone: "", handle: "" });
        setContactSafePopup({ open: false, name: "", phone: "" });
        setSelected(call);
        setExpanded(true);
        setPreviewCard(null);
        setPreviewVerified(false);
        setLoading(true);
      });
      /* force 기본 false — 캐시·light prefetch 활용, 30초 live 강제 재조회 금지 */
      void hydrateCallFromNetwork(call, gen, {
        background: false,
        forceStyle: !readCallHistoryPeerCache(phone)
      });
    };

    if (decision.kind === CALL_HISTORY_ROUTE.SAFE) {
      /* ③ 안심 — 저장비회원·송출OFF 회원. light 로 ①② 상향만 허용 */
      flushSync(() => {
        setAuthPopup({ open: false, name: "", phone: "", handle: "" });
        setSelected(null);
        setPreviewCard(null);
        setPreviewVerified(false);
        setLoading(false);
        openContactSafeForCall(call, resolveIsKnownContactSync(phone));
      });
      void hydrateCallFromNetwork(call, gen, {
        background: true,
        forceStyle: false,
        light: true
      });
      return;
    }

    if (decision.kind === CALL_HISTORY_ROUTE.AGENCY && decision.agency) {
      const dcpCard = applyShowcaseStyleToCard(
        {
          ...buildNationalAgencyDcpCard(decision.agency),
          showcaseStyle: silentShowcaseStyle()
        },
        "paid",
        { peerMode: true, style: silentShowcaseStyle() }
      );
      paintShowcase(dcpCard, true, { backgroundHydrate: false });
      return;
    }

    if (decision.kind === CALL_HISTORY_ROUTE.SHOWCASE && decision.card) {
      /* ①② 즉시 — 백그라운드에서 최신 스타일만 보강 */
      paintShowcase(decision.card, true, { backgroundHydrate: true, forceStyle: false });
      return;
    }

    /* PENDING / ④ 후보 — 네트워크 1회로 버킷 확정 */
    paintPending();
  };

  const closeDetail = () => {
    openGenRef.current += 1;
    routeLockRef.current = CALL_HISTORY_ROUTE.PENDING;
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
    setContactSafePopup({ open: false, name: "", phone: "" });
  };

  useEffect(() => {
    const onCloseOverlays = () => {
      /* ③ 안심만 열린 상태 — 글로벌 close 로 끄지 않음 */
      if (routeLockRef.current === CALL_HISTORY_ROUTE.SAFE) return;
      closeDetail();
    };
    window.addEventListener(CLOSE_SHOWCASE_OVERLAYS_EVENT, onCloseOverlays);
    return () => window.removeEventListener(CLOSE_SHOWCASE_OVERLAYS_EVENT, onCloseOverlays);
  }, []);

  const selectedKnown = useMemo(() => {
    if (!selected) return { isKnownContact: false, matchedName: "", sources: [] };
    return resolveIsKnownContactSync(selected.phoneDisplay || selected.phone);
  }, [selected]);

  const contactSafeCard = useMemo(
    () => ({
      name: contactSafePopup.name,
      displayName: contactSafePopup.name,
      phone: contactSafePopup.phone,
      dcp: {
        contactSafeCare: true,
        contactName: contactSafePopup.name,
        shortNumber: contactSafePopup.phone
      }
    }),
    [contactSafePopup.name, contactSafePopup.phone]
  );

  const emptyHint = (() => {
    if (loadError) return loadError;
    if (lineFilter !== "all") {
      return "이 번호로 쌓인 통화가 없습니다. VLUÉ 앱에서 이 번호로 걸면 이 계정 목록에 표시됩니다.";
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

  const detailView = (() => {
    if (!selected) return null;
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
        isDarkMode={isDarkMode}
        coverBottomNav
        hideHeader
        showFloatingClose
        className={isDarkMode ? "bg-[#0B101B]" : "bg-white"}
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
                  previewMode={false}
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
                  onToast={showToast}
                />
              </div>
            </div>
          )}
        </div>
      </AppFullScreenView>
    );
  })();

  const listView = selected ? null : (
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
        <p
          className={`px-4 py-16 text-center text-[13px] font-semibold ${
            isDarkMode ? "text-slate-400" : "text-slate-500"
          }`}
        >
          통화기록 불러오는 중…
        </p>
      ) : items.length === 0 ? (
        <p
          className={`px-4 py-16 text-center text-[13px] font-semibold ${
            isDarkMode ? "text-slate-400" : "text-slate-500"
          }`}
        >
          {emptyHint}
        </p>
      ) : (
        <ul className="call-history-samsung-list m-0 min-h-0 flex-1 list-none overflow-y-auto p-0">
          {items.map((call) => {
            const matrix = rowMatrix[call.id];
            const member = resolveHistoryRowMemberState(call) === "member";
            return (
              <li key={call.id} className="call-history-samsung-list__item">
                <CallHistorySwipeRow
                  call={call}
                  matrix={matrix}
                  busy={busyId === call.id}
                  onOpen={openCall}
                  onShare={(c, m) => {
                    setSharePick({
                      call: c,
                      matrix:
                        m?.showCallLogAction
                          ? m
                          : resolveCallPeerMatrixSync({
                              phone: c.phoneDisplay || c.phone,
                              isVlueMember: false,
                              verified: false
                            })
                    });
                  }}
                  onAction={runRowAction}
                >
                  <div className="call-history-row__main call-history-row__main--samsung">
                    <CallHistoryAvatar
                      call={call}
                      cacheTick={peerAvatarTick}
                      onBrokenUrl={clearBrokenAvatarUrl}
                    />
                    <div className="friend-showcase-list__meta call-history-row__meta">
                      <p className="friend-showcase-list__name call-history-row__name">
                        {formatCallGroupLabel(call)}
                        {member && isPaidLetteringTier(call.membershipTier) ? (
                          <ShieldCheck
                            size={14}
                            strokeWidth={2.4}
                            className="ml-1 inline-block align-[-2px] text-blue-500"
                            aria-label="유료 · VLUÉ 보안 인증"
                          />
                        ) : null}
                      </p>
                      <p className="friend-showcase-list__subtitle call-history-row__sub">
                        {formatCallDuration(call.durationSec)}
                      </p>
                    </div>
                    <span className="call-history-row__when">{formatCallWhen(call.endedAt)}</span>
                  </div>
                </CallHistorySwipeRow>
              </li>
            );
          })}
        </ul>
      )}
    </AppFullScreenView>
  );

  return (
    <>
      {detailView}
      {listView}
      <VlueAuthMemberPopup
        open={Boolean(open && authPopup.open)}
        name={authPopup.name}
        phone={authPopup.phone}
        handle={authPopup.handle}
        onClose={closeAuthPopup}
      />
      <AgencyDcpMiniPopup
        open={Boolean(open && contactSafePopup.open)}
        contactSafeCare
        incomingNumber={contactSafePopup.phone}
        card={contactSafeCard}
        onClose={closeContactSafePopup}
      />
      <ShareShowcaseChannelSheet
        open={Boolean(sharePick)}
        busy={Boolean(busyId)}
        onClose={() => setSharePick(null)}
        onPick={(channel) => {
          if (!sharePick) return;
          void runRowAction(sharePick.call, sharePick.matrix, channel);
        }}
      />
    </>
  );
}
