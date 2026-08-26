import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getBusinessCardByNumber } from "../lib/getBusinessCardByNumber.js";
import { mapLookupToLetteringCard } from "../lib/letteringCardMapper.js";
import { isUnknownPhoneToken } from "../lib/letteringPhoneMatch.js";
import { checkLetteringPhoneBlocked } from "../lib/letteringApi.js";
import { readLetteringEnabled } from "../lib/letteringSettings.js";
import { submitLetteringReport } from "../lib/letteringReport.js";
import { blockLetteringPhoneOnly } from "../lib/letteringPhoneBlock.js";
import { SHOWCASE_LIVE_STYLE_CHANGED_EVENT } from "../lib/showcase/showcaseStyleStorage.js";
import { CALL_STATES, normalizeCallState } from "../lib/showcase/tentShowcaseTypes.js";
import { appendCallShowcaseHistory } from "../lib/callShowcaseHistory.js";
import { reportLineCallEvent } from "../lib/lineCallHistoryApi.js";
import { syncDeviceContactsFromNative } from "../lib/contacts/deviceContactsCache.js";
import { findDeviceContactName } from "../lib/contacts/hybridKnownContact.js";
import { syncMemberIdentityToNative } from "../lib/showcaseSmsShare.js";
import { applyShowcaseStyleToCard } from "../lib/showcase/applyShowcaseStyleToCard.js";
import { fetchPeerLiveStylePublic } from "../lib/showcase/showcaseStyleApi.js";
import { fetchFollowProfile } from "../lib/followApi.js";
import { isPaidLetteringTier } from "../lib/letteringMembership.js";
import { createDefaultShowcaseStyle } from "../lib/showcase/showcaseStyleStorage.js";
import { resolveCallHistoryShowcasePeer } from "../lib/resolveCallHistoryShowcasePeer.js";
import {
  readCallHistoryPeerCache,
  writeCallHistoryPeerCache
} from "../lib/callHistoryPeerCache.js";
import { peerHasDccOrShowcaseContent } from "../lib/peerShowcaseContent.js";
import VlueAuthMemberPopup from "./VlueAuthMemberPopup.jsx";

/** 상대가 쇼케이스/DCC 를 송출 ON 으로 저장하지 않은 경우 — 인증 팝업만 */
function createPeerAuthOnlyShowcaseStyle() {
  return {
    ...createDefaultShowcaseStyle(),
    includeDigitalCard: false,
    verifiedBadgeOn: true,
    showBroadcastName: true
  };
}

function peerShowcaseBroadcastOn(style) {
  return Boolean(style && typeof style === "object" && style.includeDigitalCard === true);
}
import { normalizePhotoFocus } from "../lib/letteringBizcardStorage.js";
import { VlueBrandMark } from "./VlueBrandLogo.jsx";
import LetteringIncomingNotification from "./LetteringIncomingNotification.jsx";
import LetteringReportSheet from "./LetteringReportSheet.jsx";
import LetteringCertModal from "./LetteringCertModal.jsx";
import RenderErrorGuard from "./RenderErrorGuard.jsx";
import { resetCompanionMiniCaseSessionPos } from "./call/CompanionMiniCase.jsx";
import { COMPANION_MVP_DELEGATE_CALL_UI } from "../lib/call/companionMvpFlags.js";
import { trackCallInterfaceUse, trackShowcaseView } from "../lib/productMetrics.js";
import { ShowcaseBgmProvider, useShowcaseBgm } from "../context/ShowcaseBgmContext.jsx";
import { dcpCardMatchesIncoming, dcpRouteForIncoming, matchNationalAgency } from "../lib/nationalAgencyDcpClient.js";
import "../styles/tent-showcase.css";
import "../styles/showcase-call-glass.css";

/** 네이티브 card-lookup + 웹 useEffect 가 같은 peer 를 동시에 때리지 않도록 */
const overlayPeerEnrichInflight = new Map();

async function enrichPeerCardFromProfile(peerUserId, nextCard) {
  const data = await fetchFollowProfile(peerUserId);
  if (!data?.ok) return nextCard;
  const exp = data.cardExport && typeof data.cardExport === "object" ? data.cardExport : null;
  const photo = String(exp?.photoUrl || data.photoUrl || data.profile?.photoUrl || "").trim();
  const titlePhoto = String(exp?.titlePhotoUrl || data.titlePhotoUrl || data.profile?.titlePhotoUrl || "").trim();
  const profileEmail = String(data.profile?.email || "").trim();
  return {
    ...nextCard,
    name:
      String(nextCard?.name || nextCard?.displayName || "").trim() ||
      String(exp?.name || "").trim() ||
      String(data.profile?.legalName || data.profile?.name || "").trim(),
    displayName:
      String(nextCard?.displayName || nextCard?.name || "").trim() ||
      String(exp?.name || "").trim(),
    photoUrl: String(nextCard?.photoUrl || "").trim() || photo || "",
    titlePhotoUrl: String(nextCard?.titlePhotoUrl || "").trim() || titlePhoto || "",
    noTitlePhoto: Boolean(exp?.noTitlePhoto || nextCard?.noTitlePhoto),
    email:
      String(nextCard?.email || "").trim() ||
      String(exp?.email || "").trim() ||
      profileEmail,
    website: String(nextCard?.website || "").trim() || String(exp?.website || "").trim(),
    fax: String(nextCard?.fax || "").trim() || String(exp?.fax || "").trim(),
    address: String(nextCard?.address || "").trim() || String(exp?.address || "").trim(),
    organization:
      String(nextCard?.organization || "").trim() ||
      String(exp?.organization || "").trim() ||
      String(exp?.companyName || "").trim() ||
      String(data.profile?.companyName || data.profile?.organization || "").trim(),
    title: String(nextCard?.title || "").trim() || String(exp?.title || "").trim(),
    department:
      String(nextCard?.department || "").trim() || String(exp?.department || "").trim(),
    logoUrl: String(nextCard?.logoUrl || "").trim() || String(exp?.logoUrl || "").trim(),
    photoFocus: normalizePhotoFocus(exp?.photoFocus || nextCard?.photoFocus || "center"),
    publicHandle:
      String(nextCard?.publicHandle || nextCard?.loginId || "").trim() ||
      String(data.profile?.publicHandle || "").trim(),
    authPaidAt: nextCard?.authPaidAt || data.authPaidAt || null,
    authCycleEndAt: nextCard?.authCycleEndAt || data.authCycleEndAt || null,
    authValidUntil: nextCard?.authValidUntil || data.authValidUntil || null,
    membershipTier: data.membershipTier || nextCard.membershipTier || "free",
    digitalCardActive:
      nextCard?.digitalCardActive === true ||
      data.digitalCardActive === true ||
      Boolean(data.cardId)
  };
}

async function enrichOverlayPeerBundle(peerUserId, nextCard) {
  const id = String(peerUserId || "").trim();
  if (!id) {
    return {
      card: nextCard,
      style: createPeerAuthOnlyShowcaseStyle(),
      broadcastOn: false
    };
  }
  const peerNumber =
    String(nextCard?.phone || nextCard?.registeredPhone || nextCard?.incomingNumber || "").trim();
  const inflightKey = peerNumber ? `${id}:${peerNumber}` : id;
  const existing = overlayPeerEnrichInflight.get(inflightKey);
  if (existing) return existing;
  const run = (async () => {
    const [live, enriched] = await Promise.all([
      fetchPeerLiveStylePublic(id, { force: false, number: peerNumber }),
      enrichPeerCardFromProfile(id, nextCard)
    ]);
    /* live 없음 = 미설정 → 인증 팝업. live.includeDigitalCard===true 만 송출 ON */
    const style =
      live && typeof live === "object" ? live : createPeerAuthOnlyShowcaseStyle();
    const broadcastOn = peerShowcaseBroadcastOn(style);
    return {
      card: {
        ...enriched,
        /* 통화기록 스냅샷용 — 송출 OFF여도 실제 등급 유지 */
        membershipTier: enriched.membershipTier || nextCard?.membershipTier || "free"
      },
      style: broadcastOn ? style : { ...style, includeDigitalCard: false },
      broadcastOn
    };
  })();
  overlayPeerEnrichInflight.set(inflightKey, run);
  try {
    return await run;
  } finally {
    if (overlayPeerEnrichInflight.get(inflightKey) === run) {
      overlayPeerEnrichInflight.delete(inflightKey);
    }
  }
}

function parseOverlayParams() {
  const hash = typeof window !== "undefined" ? window.location.hash || "" : "";
  const qIndex = hash.indexOf("?");
  const query = qIndex >= 0 ? hash.slice(qIndex + 1) : window.location.search.replace(/^\?/, "");
  const params = new URLSearchParams(query);
  return {
    incoming: params.get("incoming") || params.get("phone") || "",
    platform: params.get("platform") === "ios" ? "ios" : "android",
    direction: params.get("direction") === "outgoing" ? "outgoing" : "incoming",
    native: params.get("native") === "1",
    forceLettering: params.get("forceLettering") === "1",
    phase: params.get("phase") || "",
    dcpRoute: params.get("dcp_route") || params.get("dcpRoute") || ""
  };
}

/** 웹 리스너 전에 도착한 네이티브 통화 상태 */
function readQueuedNativeCallState() {
  try {
    if (typeof window === "undefined") return "";
    return String(window.__VLUE_LAST_CALL_STATE__ || "");
  } catch {
    return "";
  }
}

/** 빠른 수화 시에도 빅푸시 바는 즉시 — 칩 홀드 최소화 */
const OVERLAY_IDENTITY_CHIP_MIN_MS = 0;

function applyOverlayPeerPack(pack, setters) {
  if (!pack?.card) return;
  setters.setCard(pack.card);
  setters.setShowcaseStyle(pack.card.showcaseStyle || pack.showcaseStyle || createDefaultShowcaseStyle());
  setters.setVerified(Boolean(pack.verified));
  setters.setLoading(false);
}

function scheduleOverlayPeerEnrich(phone, seedCard, applyPack) {
  const ph = String(phone || "").trim();
  if (!ph) return;
  void resolveCallHistoryShowcasePeer(ph, {
    displayName: seedCard?.name || seedCard?.displayName || "",
    avatarUrl: seedCard?.photoUrl || seedCard?.avatarUrl || ""
  })
    .then((payload) => {
      const pack = {
        card: payload.card,
        showcaseStyle: payload.card?.showcaseStyle || payload.showcaseStyle,
        verified: Boolean(payload.verified),
        phone: payload.phone || ph
      };
      writeCallHistoryPeerCache(ph, pack);
      applyPack(pack);
    })
    .catch(() => {});
}

function isUnknownIncoming(phone) {
  return isUnknownPhoneToken(phone);
}

function buildUnverifiedOverlayCard(phone) {
  return {
    name: "",
    displayName: "",
    organization: "",
    title: "",
    department: "",
    phone: String(phone || "").trim(),
    membershipTier: "free",
    verificationItems: [],
    profileKind: ""
  };
}

function overlayCardHasOrg(card) {
  if (!card || typeof card !== "object") return false;
  return Boolean(String(card.organization || card.companyName || "").trim());
}

/** Android OverlayCardOrgFill 와 동일 — CEO 상호를 조회 전에 즉시 채움 */
function applyLocalOverlayCardDefaults(card, phoneHint = "") {
  if (!card || typeof card !== "object") return card;
  const next = { ...card };
  const handle = String(next.publicHandle || next.loginId || next.vlueId || "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
  const digits = String(next.phone || next.phoneE164 || phoneHint || "").replace(/\D/g, "");
  const national = digits.startsWith("82") && digits.length >= 11 ? `0${digits.slice(2)}` : digits;
  const isCeo =
    handle === "ceo" || national === "01080144666" || digits === "821080144666";
  if (isCeo) {
    if (!String(next.organization || next.companyName || "").trim()) {
      next.organization = "VCID KOREA";
      next.companyName = "VCID KOREA";
    }
    if (!String(next.name || next.displayName || "").trim()) {
      next.name = "이종근";
      next.displayName = "이종근";
    }
    if (!isPaidLetteringTier(next.membershipTier)) {
      next.membershipTier = "paid";
    }
  }
  return next;
}

/**
 * live 송출 플래그 도착 전 — 명시적 includeDigitalCard 만 신뢰.
 * digitalCardActive 로 낙관적 ON 하면 이상춘처럼 송출 OFF 계정이
 * 「sangchoon1 Showcase」로 깜빡인 뒤 이름표시로 바뀐다.
 */
function provisionalBroadcastStyle(card) {
  const live = card?.showcaseStyle;
  if (live && typeof live === "object") {
    if (live.includeDigitalCard === true) {
      return { ...createDefaultShowcaseStyle(), ...live, includeDigitalCard: true };
    }
    if (live.includeDigitalCard === false) {
      return {
        ...createPeerAuthOnlyShowcaseStyle(),
        ...live,
        includeDigitalCard: false
      };
    }
  }
  return createPeerAuthOnlyShowcaseStyle();
}

function isDcpOverlayCard(card) {
  if (!card || typeof card !== "object") return false;
  if (isContactSafeCareCard(card)) return false;
  return String(card.profileKind || "").trim() === "dcp" || Boolean(card.dcp && typeof card.dcp === "object");
}

function isExpiredLineCard(card) {
  if (!card || typeof card !== "object") return false;
  return (
    String(card.profileKind || "").trim() === "expired_line" ||
    String(card.lineBillingStatus || "").trim() === "grace"
  );
}

function isContactSafeCareCard(card) {
  if (!card || typeof card !== "object") return false;
  return (
    String(card.profileKind || "").trim() === "contact_safe_care" ||
    Boolean(card.dcp && card.dcp.contactSafeCare)
  );
}

function buildContactSafeCareCard(phone, name, route = "normal") {
  const display = String(name || "").trim();
  return {
    ...buildUnverifiedOverlayCard(phone),
    name: display,
    displayName: display,
    profileKind: "contact_safe_care",
    dcp: {
      contactSafeCare: true,
      contactName: display,
      routeStatus: route === "abnormal" ? "abnormal" : "normal"
    }
  };
}

function dcpLogoUrl(card) {
  if (!card) return "";
  return String(card.logoUrl || card.dcp?.logoUrl || card.photoUrl || "").trim();
}

function mergeDcpCard(prev, mapped) {
  const next = { ...(prev || {}), ...mapped };
  const keepLogo = dcpLogoUrl(prev);
  if (isDcpOverlayCard(mapped) && !dcpLogoUrl(mapped) && keepLogo) {
    return {
      ...next,
      logoUrl: keepLogo,
      photoUrl: prev.photoUrl || next.photoUrl,
      dcp: { ...(next.dcp || {}), logoUrl: keepLogo }
    };
  }
  return next;
}

/**
 * 조회 매칭이 끝난 카드 — 미인증 플레이스홀더로 덮지 않음
 */
function isResolvedOverlayCard(card) {
  if (!card) return false;
  if (isDcpOverlayCard(card)) return true;
  if (isExpiredLineCard(card)) return true;
  if (isContactSafeCareCard(card)) return true;
  if (String(card.userId || card.ownerUserId || "").trim()) return true;
  const handle = String(card.publicHandle || card.loginId || card.vlueId || "")
    .trim()
    .replace(/^@/, "");
  return Boolean(handle);
}

/**
 * 네이티브 CallOverlay WebView / #lettering-overlay 진입점
 * 웹 홈·마케팅과 동일 — LetteringIncomingNotification 쇼케이스 바 → 풀 쇼케이스
 */
export default function LetteringOverlayHost() {
  return (
    <ShowcaseBgmProvider>
      <LetteringOverlayHostInner />
    </ShowcaseBgmProvider>
  );
}

function LetteringOverlayHostInner() {
  const [{ incoming, platform, direction, native, forceLettering, phase, dcpRoute }, setParams] = useState(parseOverlayParams);
  const [card, setCard] = useState(null);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [certOpen, setCertOpen] = useState(false);
  const [certPayload, setCertPayload] = useState(null);
  const [authMemberPopupOpen, setAuthMemberPopupOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [callState, setCallState] = useState(() => {
    const queued = normalizeCallState(readQueuedNativeCallState());
    if (queued === CALL_STATES.CONNECTED) return CALL_STATES.CONNECTED;
    return normalizeCallState(phase) === CALL_STATES.CONNECTED
      ? CALL_STATES.CONNECTED
      : CALL_STATES.RINGING;
  });
  const [showcaseStyle, setShowcaseStyle] = useState(() => createPeerAuthOnlyShowcaseStyle());
  /* 수화 직후 신원 칩이 끝나기 전에는 풀 DCC를 펼치지 않음 */
  const [expanded, setExpanded] = useState(false);
  /* Native BIG_PUSH 창 — 앱 쇼케이스바(접힘) 강제. MiniCase 금지 */
  const [forceShowcaseBar, setForceShowcaseBar] = useState(true);
  const [identityHold, setIdentityHold] = useState(true);
  /* Mini→풀 복원 직후 늦게 도착하는 big_push_bar 로 다시 접히는 레이스 방지 */
  const restoreHoldUntilRef = useRef(0);
  const loadingStartedAtRef = useRef(Date.now());
  const autoExpandedOnceRef = useRef(false);
  /* 네이티브/웹 조회가 한 번 매칭되면 timeout·unmatched 로 되돌리지 않음 */
  const matchedRef = useRef(false);
  const peerAuthPopupOnlyRef = useRef(false);

  const showToast = useCallback((msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2800);
  }, []);

  useEffect(() => {
    try {
      window.Android?.setOverlayModal?.(reportOpen ? "1" : "0");
    } catch {
      /* ignore */
    }
    return () => {
      try {
        window.Android?.setOverlayModal?.("0");
      } catch {
        /* ignore */
      }
    };
  }, [reportOpen]);

  useEffect(() => {
    console.log("[VlueBigPushTrace] [9] React Root Mounted", {
      incoming,
      native,
      forceLettering,
      phase
    });
    try {
      window.Android?.logBigPushTrace?.(
        "[9] React Root Mounted",
        `incoming=${incoming} native=${native}`
      );
    } catch {
      /* ignore */
    }
    return () => {
      console.log("[VlueBigPushTrace] React Root Unmounted");
    };
  }, []);

  useEffect(() => {
    if (loading || blocked) {
      if (blocked) {
        try {
          window.Android?.logBigPushTrace?.(
            "SKIP after [9]",
            "reason = blocked or lettering disabled in WebView"
          );
        } catch {
          /* ignore */
        }
      }
      return undefined;
    }
    const t = window.setTimeout(() => {
      console.log("[VlueBigPushTrace] [10] Showcase Visible", {
        incoming,
        hasCard: Boolean(card),
        verified,
        expanded,
        callState
      });
      try {
        window.Android?.logBigPushTrace?.(
          "[10] Showcase Visible",
          `incoming=${incoming} hasCard=${Boolean(card)} expanded=${expanded} verified=${verified}`
        );
      } catch {
        /* ignore */
      }
    }, 50);
    return () => window.clearTimeout(t);
  }, [loading, blocked, card, verified, expanded, callState, incoming]);

  useEffect(() => {
    const onHash = () => setParams(parseOverlayParams());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    trackCallInterfaceUse("live_call");
    trackShowcaseView("live_call");
  }, []);

  useEffect(() => {
    try {
      syncMemberIdentityToNative();
    } catch {
      /* ignore */
    }
    const t = window.setTimeout(() => {
      void syncDeviceContactsFromNative();
    }, 800);
    return () => window.clearTimeout(t);
  }, []);

  const { setPlaybackPhase } = useShowcaseBgm();

  useEffect(() => {
    matchedRef.current = false;
    autoExpandedOnceRef.current = false;
    setIdentityHold(true);
    setExpanded(false);
    setForceShowcaseBar(true);
    loadingStartedAtRef.current = Date.now();

    const cached = readCallHistoryPeerCache(incoming);
    if (cached?.card) {
      matchedRef.current = true;
      const seeded = applyLocalOverlayCardDefaults(cached.card, incoming);
      setCard(seeded);
      setShowcaseStyle(
        seeded.showcaseStyle || cached.showcaseStyle || provisionalBroadcastStyle(seeded)
      );
      setVerified(Boolean(cached.verified));
      setLoading(false);
      return;
    }

    const ceoSeed = applyLocalOverlayCardDefaults({ phone: incoming }, incoming);
    if (overlayCardHasOrg(ceoSeed) && isPaidLetteringTier(ceoSeed.membershipTier)) {
      matchedRef.current = true;
      const provisional = provisionalBroadcastStyle(ceoSeed);
      setCard({ ...ceoSeed, showcaseStyle: provisional });
      setShowcaseStyle(provisional);
      setVerified(true);
      setLoading(false);
      return;
    }

    setVerified(false);
    setCard(null);
    setShowcaseStyle(createPeerAuthOnlyShowcaseStyle());
    setLoading(true);
  }, [incoming]);

  useEffect(() => {
    if (loading) return undefined;
    /* 링잉 중에는 칩을 붙잡지 않음 — 수화 전에 빅푸시 바가 바로 뜨게 */
    if (callState !== CALL_STATES.CONNECTED) {
      setIdentityHold(false);
      return undefined;
    }
    const elapsed = Date.now() - loadingStartedAtRef.current;
    const wait = Math.max(0, OVERLAY_IDENTITY_CHIP_MIN_MS - elapsed);
    const t = window.setTimeout(() => setIdentityHold(false), wait);
    return () => window.clearTimeout(t);
  }, [loading, callState]);

  const identityReady = !loading && !identityHold;

  useEffect(() => {
    const onNativeCard = (ev) => {
      try {
        const detail = ev?.detail || window.__VLUE_CARD_LOOKUP__;
        if (!detail) return;
        if (detail.matched === false) {
          if (matchedRef.current) return;
          const phone = incoming || detail.phoneE164 || "";
          /*
           * lookup_pending 은 조회 중 — 미인증 앰버로 고정하면 전중희 등 회원이
           * 수 초간 「신고·제보 이력」만 보인다. pending 유지하고 by-number 를 기다린다.
           */
          if (String(detail.profileKind || "") === "lookup_pending") {
            setCard({
              ...buildUnverifiedOverlayCard(phone),
              profileKind: "lookup_pending",
              name: "",
              displayName: ""
            });
            setVerified(false);
            setLoading(true);
            return;
          }
          if (String(detail.profileKind || "") === "contact_safe_care" || detail.dcp?.contactSafeCare) {
            matchedRef.current = true;
            setCard(
              buildContactSafeCareCard(
                phone,
                detail.displayName || detail.contactName || findDeviceContactName(phone),
                detail.dcp?.routeStatus || dcpRoute
              )
            );
            setVerified(false);
            setLoading(false);
            return;
          }
          const deviceName = findDeviceContactName(phone);
          if (deviceName) {
            matchedRef.current = true;
            setCard(buildContactSafeCareCard(phone, deviceName, dcpRoute));
            setVerified(false);
            setLoading(false);
            return;
          }
          /*
           * 네이티브 unmatched 를 즉시 미인증으로 그리면 by-number 전에
           * 「VLUE Showcase」앰버가 고정된다. pending 유지.
           */
          setCard({
            ...buildUnverifiedOverlayCard(phone),
            profileKind: "lookup_pending",
            name: "",
            displayName: ""
          });
          setVerified(false);
          setLoading(true);
          return;
        }
        const mapped = mapLookupToLetteringCard(detail, incoming || detail.phoneE164 || "");
        if (mapped) {
          if (isDcpOverlayCard(mapped) && incoming && !dcpCardMatchesIncoming(mapped, incoming)) {
            return;
          }
          const seeded = applyLocalOverlayCardDefaults(mapped, incoming);
          const waitForLogo = isDcpOverlayCard(seeded);
          matchedRef.current = !waitForLogo || Boolean(seeded.userId || seeded.name);
          const provisional = provisionalBroadcastStyle(seeded);
          setCard((prev) => ({
            ...mergeDcpCard(prev, seeded),
            showcaseStyle: provisional
          }));
          setShowcaseStyle(provisional);
          setVerified(true);
          setLoading(false);
          if (!isDcpOverlayCard(seeded)) {
            void reportLineCallEvent(
              incoming || detail.phoneE164 || seeded.phone || "",
              direction === "outgoing" ? "out" : "in"
            );
          }
          scheduleOverlayPeerEnrich(incoming || detail.phoneE164 || seeded.phone, seeded, (pack) => {
            setCard((prev) => ({
              ...(prev || {}),
              ...pack.card,
              showcaseStyle: pack.showcaseStyle
            }));
            setShowcaseStyle(pack.showcaseStyle);
          });
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("vlue-card-lookup", onNativeCard);
    if (window.__VLUE_CARD_LOOKUP__) onNativeCard({ detail: window.__VLUE_CARD_LOOKUP__ });
    return () => window.removeEventListener("vlue-card-lookup", onNativeCard);
  }, [incoming, direction, dcpRoute]);

  useEffect(() => {
    let cancelled = false;
    let unknownTimer = 0;
    (async () => {
      /*
       * 네이티브 오버레이는 SharedPreferences 로 이미 게이트됨.
       * forceLettering / native 이면 웹 localStorage 가 비어도 UI 를 숨기지 않는다.
       */
      if (forceLettering || native) {
        try {
          localStorage.setItem("vlue_lettering_enabled", "1");
        } catch {
          /* ignore */
        }
      } else if (!readLetteringEnabled()) {
        setBlocked(true);
        setLoading(false);
        return;
      }

      const unknown = isUnknownIncoming(incoming);
      if (unknown) {
        /* 조회 전 미인증 앰버 UI를 먼저 띄우지 않음 — 치명적 깜빡임 방지 */
        setCard({
          ...buildUnverifiedOverlayCard(incoming),
          profileKind: "lookup_pending",
          name: "",
          displayName: ""
        });
        setVerified(false);
        setLoading(true);
        unknownTimer = window.setTimeout(() => {
          if (cancelled || matchedRef.current) return;
          const deviceName = findDeviceContactName(incoming);
          if (deviceName) {
            matchedRef.current = true;
            setCard(buildContactSafeCareCard(incoming, deviceName, dcpRoute));
          } else {
            setCard(buildUnverifiedOverlayCard(incoming));
          }
          setVerified(false);
          setLoading(false);
        }, 2200);
      } else {
        /* 알려진 번호도 조회 전엔 미인증으로 그리지 않음 */
        setCard((prev) => {
          if (prev && String(prev.profileKind || "") !== "lookup_pending" && prev.matched !== false) {
            return prev;
          }
          if (prev && (prev.displayName || prev.name) && prev.profileKind !== "lookup_pending") {
            return prev;
          }
          return {
            ...buildUnverifiedOverlayCard(incoming),
            profileKind: "lookup_pending",
            name: "",
            displayName: ""
          };
        });
        setVerified(false);
        setLoading(true);
      }

      void syncDeviceContactsFromNative().catch(() => {});

      const blockCheckPromise = Promise.race([
        checkLetteringPhoneBlocked(incoming),
        new Promise((resolve) => {
          window.setTimeout(() => resolve({ blocked: false }), 300);
        })
      ]);
      if (cancelled) return;
      const blockCheck = await blockCheckPromise;
      if (cancelled) return;
      if (blockCheck.blocked) {
        setBlocked(true);
        setLoading(false);
        return;
      }
      if (unknown && !matchedRef.current) return;
      if (matchedRef.current) return;

      /*
       * 네이티브 card-lookup 이 이미 있으면 by-number 재조회 생략.
       * matched:false 는 웹 조회를 건너뛰지 않음 — 네이티브 타임아웃/미매칭 후에도 CEO 등 회원 카드를 살린다.
       */
      const nativeDetail =
        native || forceLettering ? window.__VLUE_CARD_LOOKUP__ : null;
      if (nativeDetail && nativeDetail.matched !== false) {
        const mapped = mapLookupToLetteringCard(
          nativeDetail,
          incoming || nativeDetail.phoneE164 || ""
        );
        if (mapped) {
          const isDcp = isDcpOverlayCard(mapped);
          const staleDcp = isDcp && incoming && !dcpCardMatchesIncoming(mapped, incoming);
          if (!staleDcp) {
            const seeded = applyLocalOverlayCardDefaults(mapped, incoming);
            matchedRef.current = true;
            const provisional = provisionalBroadcastStyle(seeded);
            setCard((prev) => ({
              ...mergeDcpCard(prev, seeded),
              showcaseStyle: provisional
            }));
            setShowcaseStyle(provisional);
            setVerified(true);
            setLoading(false);
            if (!isDcp) {
              scheduleOverlayPeerEnrich(incoming, seeded, (pack) => {
                if (cancelled) return;
                setCard((prev) => ({ ...(prev || {}), ...pack.card, showcaseStyle: pack.showcaseStyle }));
                setShowcaseStyle(pack.showcaseStyle);
              });
            }
            return;
          }
        }
      }

      let resolvedDcpRoute = dcpRouteForIncoming(incoming, dcpRoute);
      if (!resolvedDcpRoute) {
        try {
          const stored = String(sessionStorage.getItem("vlue_dcp_test_route") || "").trim();
          const testNumber = String(sessionStorage.getItem("vlue_dcp_test_number") || "112").trim();
          if (matchNationalAgency(incoming) && matchNationalAgency(testNumber)) {
            resolvedDcpRoute = dcpRouteForIncoming(incoming, stored);
          }
        } catch {
          /* ignore */
        }
      }
      if (cancelled) return;
      if (matchedRef.current) return;

      scheduleOverlayPeerEnrich(incoming, null, (pack) => {
        if (cancelled || matchedRef.current) return;
        /* 미매칭/미인증 번들로 matchedRef 를 잠그면 by-number 가 스킵되어 미인증 고착 */
        if (!pack?.verified || !pack?.card) return;
        matchedRef.current = true;
        setCard(pack.card);
        setVerified(true);
        setShowcaseStyle(pack.showcaseStyle);
        setLoading(false);
        if (!isDcpOverlayCard(pack.card)) {
          void reportLineCallEvent(incoming, direction === "outgoing" ? "out" : "in");
        }
      });

      const lookup = await getBusinessCardByNumber(incoming, {
        dcpRoute: resolvedDcpRoute,
        forCallOverlay: true
      });
      if (cancelled) return;
      if (matchedRef.current) return;

      let nextCard = null;
      let nextVerified = false;
      if (lookup?.ok && lookup.matched) {
        nextCard = applyLocalOverlayCardDefaults(
          mapLookupToLetteringCard(lookup, incoming),
          incoming
        );
        nextVerified = true;
        if (nextCard && !isDcpOverlayCard(nextCard)) {
          void reportLineCallEvent(incoming, direction === "outgoing" ? "out" : "in");
        }
      }

      const isDcp = isDcpOverlayCard(nextCard);
      const peerStyle = provisionalBroadcastStyle(nextCard);

      if (nextCard) {
        matchedRef.current = true;
        setCard((prev) => ({ ...mergeDcpCard(prev, nextCard), showcaseStyle: peerStyle }));
        setShowcaseStyle(peerStyle);
        setVerified(nextVerified);
        setLoading(false);
        if (!isDcp && !isExpiredLineCard(nextCard)) {
          scheduleOverlayPeerEnrich(incoming, nextCard, (pack) => {
            if (cancelled) return;
            setCard((prev) => ({ ...(prev || {}), ...pack.card, showcaseStyle: pack.showcaseStyle }));
            setShowcaseStyle(pack.showcaseStyle);
          });
        }
        return;
      }

      if (!matchedRef.current) {
        const deviceName = findDeviceContactName(incoming);
        if (deviceName) {
          matchedRef.current = true;
          setCard(buildContactSafeCareCard(incoming, deviceName, resolvedDcpRoute || dcpRoute));
          setVerified(false);
        } else {
          setCard(buildUnverifiedOverlayCard(incoming));
          setVerified(false);
        }
        setShowcaseStyle(createDefaultShowcaseStyle());
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
      if (unknownTimer) window.clearTimeout(unknownTimer);
    };
  }, [incoming, native, forceLettering, dcpRoute]);

  useEffect(() => {
    if (verified || loading) return undefined;
    setPlaybackPhase("idle", { steal: true, fade: true, owner: "unverified" });
    return () => {
      setPlaybackPhase("idle", { release: true, steal: true, owner: "unverified" });
    };
  }, [verified, loading, setPlaybackPhase]);

  useEffect(() => {
    /* 라이브 이벤트는 본인 편집용 — 통화 오버레이에서는 상대 스타일을 덮어쓰지 않음 */
    if (native || forceLettering) return undefined;
    const onLive = () => {
      /* no-op for non-native host paths that still mount this */
    };
    window.addEventListener(SHOWCASE_LIVE_STYLE_CHANGED_EVENT, onLive);
    return () => window.removeEventListener(SHOWCASE_LIVE_STYLE_CHANGED_EVENT, onLive);
  }, [native, forceLettering]);

  const cacheHistoryRef = useRef(null);
  const lastHistoryAtRef = useRef(0);

  useEffect(() => {
    const onExpand = (e) => {
      const ex = e?.detail?.expanded;
      if (ex === false) setExpanded(false);
      else setExpanded(true);
    };
    window.addEventListener("vlue-native-expand-showcase", onExpand);
    try {
      window.VlueLettering = window.VlueLettering || {};
      window.VlueLettering.setExpanded = (v) => setExpanded(Boolean(v));
    } catch {
      /* ignore */
    }
    return () => {
      window.removeEventListener("vlue-native-expand-showcase", onExpand);
    };
  }, []);

  useEffect(() => {
    const onNativeCall = (e) => {
      const rawState = String(e?.detail?.state || e?.detail?.callState || "");
      /*
       * big_push_bar / minimize / restore 는 CallState 가 아님.
       * normalizeCallState("") → early-return 되면 하단 바가 풀쇼케이스/미니로 남음.
       */
      if (rawState === "big_push_bar") {
        /*
         * 연속 수신: 직전 answer/restore hold(3.5s) 가 남아 있으면 MiniCase 가
         * big_push_bar 를 무시 → 삼성 미니 UI 와 VLUE 미니가 겹친다. hold 해제 필수.
         */
        restoreHoldUntilRef.current = 0;
        autoExpandedOnceRef.current = false;
        resetCompanionMiniCaseSessionPos();
        setForceShowcaseBar(true);
        setExpanded(false);
      } else if (
        rawState === "minimize_showcase" ||
        rawState === "reveal_system_call_ui"
      ) {
        setForceShowcaseBar(false);
        setExpanded(false);
      } else if (rawState === "restore_showcase") {
        restoreHoldUntilRef.current = Date.now() + 3500;
        autoExpandedOnceRef.current = true;
        setForceShowcaseBar(false);
        setExpanded(true);
      }
      const next = normalizeCallState(rawState);
      if (next) {
        setCallState(next);
        if (next === CALL_STATES.CONNECTED) {
          restoreHoldUntilRef.current = Date.now() + 3500;
          setForceShowcaseBar(false);
          if (peerAuthPopupOnlyRef.current) {
            /*
             * DCC·쇼케이스 미송출(이상춘): 이름바/풀쇼케이스 유지 금지.
             * 네이티브 중앙 「경로 검증 · 정상」팝업만.
             */
            autoExpandedOnceRef.current = false;
            setExpanded(false);
            try {
              window.Android?.notifyVlueAuthMemberReady?.(incoming || "");
              window.VlueLettering?.notifyVlueAuthMemberReady?.(incoming || "");
            } catch {
              /* ignore */
            }
          } else {
            /*
             * 송출 ON: 풀 쇼케이스.
             * 링잉 중 Mini Case로 접은 뒤 수락해도 expanded=false 로 남으면
             * 네이티브 FULLSCREEN + 웹 미니 UI 가 겹친다.
             */
            autoExpandedOnceRef.current = true;
            setExpanded(true);
          }
        }
        if (next === CALL_STATES.RINGING) {
          /* BigPush = 앱 쇼케이스바 — 연속 수신 시 직전 MiniCase hold/좌표 제거 */
          restoreHoldUntilRef.current = 0;
          autoExpandedOnceRef.current = false;
          resetCompanionMiniCaseSessionPos();
          setForceShowcaseBar(true);
          setExpanded(false);
        }
      }
      /* 시스템 전화 종료 — End 버튼 없이도 통화목록에 기록 */
      const ended =
        next === CALL_STATES.ENDED ||
        next === CALL_STATES.IDLE ||
        /ended|idle|dismiss/i.test(rawState);
      if (ended) {
        /* Mini Case 세션 좌표 초기화 — 다음 통화는 기본 위치. 앱은 종료하지 않음 */
        restoreHoldUntilRef.current = 0;
        resetCompanionMiniCaseSessionPos();
        if (COMPANION_MVP_DELEGATE_CALL_UI) {
          try {
            /* Companion: 통화 UI만 닫기 (네이티브 onCallEnded 와 이중 호출돼도 dismiss 가드) */
            window.VlueLettering?.dismissOverlay?.();
            window.Android?.dismissOverlay?.();
          } catch {
            /* ignore */
          }
        }
        const now = Date.now();
        if (now - lastHistoryAtRef.current < 2500) return;
        lastHistoryAtRef.current = now;
        cacheHistoryRef.current?.(CALL_STATES.ENDED);
      }
    };
    window.addEventListener("vlue-native-call-state", onNativeCall);
    return () => window.removeEventListener("vlue-native-call-state", onNativeCall);
  }, []);

  const membershipTier = card?.membershipTier || "free";
  const styledCard = useMemo(() => {
    if (!card) return null;
    return applyShowcaseStyleToCard(
      { ...card, showcaseStyle: card.showcaseStyle || showcaseStyle },
      membershipTier,
      /* 통화 오버레이 = 상대 명함 — scrub/내 고정신원으로 이메일·상호를 지우지 않음 */
      { peerMode: true, skipFixedIdentity: true }
    );
  }, [card, showcaseStyle, membershipTier]);

  const peerAuthPopupOnly = useMemo(() => {
    if (!verified || !styledCard) return false;
    if (String(styledCard.profileKind || "") === "contact_safe_care") return false;
    if (matchNationalAgency(incoming)) return false;
    /* 송출 OFF / 공개 DCC·쇼케이스 없음 → 수화 후 중앙 인증 팝업 */
    return !peerHasDccOrShowcaseContent(styledCard, styledCard.showcaseStyle || showcaseStyle);
  }, [verified, styledCard, showcaseStyle, incoming]);

  useEffect(() => {
    peerAuthPopupOnlyRef.current = peerAuthPopupOnly;
  }, [peerAuthPopupOnly]);

  useEffect(() => {
    if (callState !== CALL_STATES.CONNECTED || !identityReady) return;
    if (autoExpandedOnceRef.current) return;
    autoExpandedOnceRef.current = true;
    setForceShowcaseBar(false);
    if (peerAuthPopupOnly) {
      /* 수화 후만 — 네이티브가 별도 중앙 팝업(경로 검증 · 정상 스타일)을 띄움.
         빅푸시(156dp) 안에서 웹 모달을 열면 레이아웃이 깨지므로 웹 팝업은 열지 않음. */
      setExpanded(false);
      setAuthMemberPopupOpen(false);
      try {
        window.Android?.notifyVlueAuthMemberReady?.(incoming || "");
        window.VlueLettering?.notifyVlueAuthMemberReady?.(incoming || "");
      } catch {
        /* ignore */
      }
      return;
    }
    /* 바 크롬만 있고 본문(pages/DCC) 없으면 접힘 유지 — 빈 풀스크린 금지 */
    const style = styledCard?.showcaseStyle || showcaseStyle;
    if (!peerHasDccOrShowcaseContent(styledCard, style)) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
  }, [callState, identityReady, peerAuthPopupOnly, incoming, styledCard, showcaseStyle]);

  /* 수신 중(빅푸시)에는 인증 팝업을 열지 않음 — 카드 조회 완료(~수 초) 후에도 유지 */

  const reportTarget = useMemo(
    () => ({
      phone: incoming,
      cardName: card?.name || "",
      card,
      verified
    }),
    [incoming, card, verified]
  );

  const cacheHistory = useCallback(
    (state) => {
      const peerUserId = String(card?.userId || card?.ownerUserId || "").trim();
      if (verified && !peerUserId) return;
      appendCallShowcaseHistory({
        phone: incoming,
        userId: peerUserId,
        name: card?.name || card?.displayName || "",
        direction: direction === "outgoing" ? "out" : "in",
        durationSec: 0,
        callState: state,
        verified,
        membershipTier,
        showcaseSnapshot: showcaseStyle,
        cardSnapshot: card
          ? {
              userId: card.userId || card.ownerUserId || "",
              name: card.name,
              organization: card.organization,
              title: card.title,
              phone: card.phone,
              email: card.email,
              photoUrl: card.photoUrl,
              titlePhotoUrl: card.titlePhotoUrl || "",
              noTitlePhoto: Boolean(card.noTitlePhoto),
              avatarUrl: card.avatarUrl || card.photoUrl || "",
              logoUrl: card.logoUrl,
              website: card.website,
              photoFocus: card.photoFocus || "center",
              membershipTier: card.membershipTier,
              kakaoAvatarUrl: card.kakaoAvatarUrl || "",
              instagramAvatarUrl: card.instagramAvatarUrl || ""
            }
          : null
      });
    },
    [incoming, card, direction, verified, showcaseStyle, membershipTier]
  );

  useEffect(() => {
    cacheHistoryRef.current = cacheHistory;
  }, [cacheHistory]);

  const handleEnd = useCallback(() => {
    cacheHistory(CALL_STATES.ENDED);
    setExpanded(false);
    try {
      window.VlueLettering?.dismissOverlay?.();
      window.Android?.dismissOverlay?.();
    } catch {
      /* ignore */
    }
  }, [cacheHistory]);

  const handleReject = useCallback(() => {
    cacheHistory(CALL_STATES.MISSED);
    setExpanded(false);
    try {
      window.VlueLettering?.dismissOverlay?.();
      window.Android?.dismissOverlay?.();
    } catch {
      /* ignore */
    }
  }, [cacheHistory]);

  const handleReportSubmit = useCallback(
    async ({ reasonId, detail }) => {
      const { report, blockResult } = await submitLetteringReport({
        phone: incoming,
        reasonId,
        detail,
        card,
        verified
      });
      showToast(`신고 접수 · 자동 차단 (${report.reasonLabel})`);
      setReportOpen(false);
      setBlocked(true);
      try {
        window.VlueLettering?.dismissOverlay?.();
        window.Android?.dismissOverlay?.();
      } catch {
        /* ignore */
      }
      if (!blockResult?.ok) showToast("차단 목록 동기화를 확인해 주세요.");
    },
    [incoming, card, verified, showToast]
  );

  const handleBlockOnly = useCallback(async () => {
    const blockResult = await blockLetteringPhoneOnly(incoming, { cardName: card?.name || "" });
    if (!blockResult.ok) {
      showToast("차단할 번호를 확인할 수 없습니다.");
      return;
    }
    showToast("차단 완료");
    setReportOpen(false);
    setBlocked(true);
    try {
      window.VlueLettering?.dismissOverlay?.();
    } catch {
      /* ignore */
    }
  }, [incoming, card, showToast]);

  if (blocked || (!native && !forceLettering && !readLetteringEnabled())) {
    return null;
  }

  const showLoadingChip =
    loading &&
    !(forceShowcaseBar && (styledCard || card || incoming)) &&
    !(identityHold && callState === CALL_STATES.CONNECTED && !expanded);

  const isLookupPendingCard =
    String(styledCard?.profileKind || card?.profileKind || "").trim() === "lookup_pending";

  /* 「번호 확인 중」빅푸시 바는 내지 않음 — 조회 완료 전엔 투명만 */
  if (isLookupPendingCard && callState !== CALL_STATES.CONNECTED) {
    return (
      <div
        className="lettering-overlay-host lettering-overlay-host--tent lettering-overlay-host--loading"
        style={{ background: "transparent", opacity: 0 }}
        aria-hidden
      />
    );
  }

  if (showLoadingChip) {
    /* FULLSCREEN 흰 바탕 점유 금지 — 투명 호스트 + 브랜드 확인 칩만 */
    return (
      <div
        className="lettering-overlay-host lettering-overlay-host--tent lettering-overlay-host--loading"
        style={{ background: "transparent" }}
      >
        <div className="lettering-overlay-verify-chip" role="status" aria-live="polite">
          <span className="lettering-overlay-verify-chip__mark">
            <VlueBrandMark size={18} />
          </span>
          <span className="lettering-overlay-verify-chip__copy">
            <span className="lettering-overlay-verify-chip__brand">VLUE</span>
            <span className="lettering-overlay-verify-chip__label">신원 확인 중</span>
          </span>
          <span className="lettering-overlay-verify-chip__dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
        </div>
      </div>
    );
  }

  const onCall = callState === CALL_STATES.CONNECTED;
  const callPhase = onCall ? "connected" : direction === "outgoing" ? "outgoing" : "ringing";
  const miniCollapsed = onCall && !expanded;

  return (
    <div
      className={`lettering-overlay-host lettering-overlay-host--tent ${
        onCall ? "lettering-overlay-host--connected" : "lettering-overlay-host--ringing"
      }${miniCollapsed ? " lettering-overlay-host--mini" : ""}`}
      data-call-phase={callPhase}
      data-expanded={expanded ? "true" : "false"}
      data-mini={miniCollapsed ? "true" : "false"}
    >
      <div className="lettering-overlay-host__tent-shell">
        <RenderErrorGuard
          fallback={
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-[15px] font-black text-slate-100">쇼케이스를 표시하지 못했습니다</p>
              <p className="text-[12px] text-slate-400">{incoming || "발신 번호"}</p>
            </div>
          }
        >
        <LetteringIncomingNotification
          className={`lettering-ongoing--on-call lettering-ongoing--fullscreen-tent lettering-ongoing--home-glass ${
            onCall ? "lettering-ongoing--phase-connected" : "lettering-ongoing--phase-ringing"
          }`}
          verified={verified}
          previewMode={false}
          showOwnerSettings={false}
          callPhase={callPhase}
          platform={platform}
          incomingNumber={incoming}
          card={styledCard || undefined}
          expanded={expanded}
          forceShowcaseBar={forceShowcaseBar}
          onExpandedChange={(next) => {
            if (next) {
              if (peerAuthPopupOnly) {
                /* 웹 모달은 156dp 바 안에서 깨짐 — 네이티브 중앙 안심팝업 */
                try {
                  window.Android?.notifyVlueAuthMemberReady?.(incoming || "");
                  window.VlueLettering?.notifyVlueAuthMemberReady?.(incoming || "");
                } catch {
                  /* ignore */
                }
                return;
              }
              const style = styledCard?.showcaseStyle || showcaseStyle;
              /* 텅 빈 쇼케이스 펼침 방지 — DCC/미디어 준비될 때까지 바 유지 */
              if (!peerHasDccOrShowcaseContent(styledCard, style)) return;
              setExpanded(true);
              setForceShowcaseBar(false);
              try {
                window.VlueLettering?.restoreShowcaseOverlay?.();
                window.Android?.restoreShowcaseOverlay?.();
              } catch {
                /* ignore */
              }
              return;
            }
            setExpanded(false);
          }}
          includeDigitalCard={Boolean(
            verified && peerShowcaseBroadcastOn(styledCard?.showcaseStyle || showcaseStyle)
          )}
          showcaseOffPreview={Boolean(peerAuthPopupOnly)}
          digitalCardOnly={false}
          savedContactName={
            String(styledCard?.profileKind || "") === "contact_safe_care"
              ? String(styledCard?.displayName || styledCard?.name || "").trim()
              : ""
          }
          isKnownContact={verified}
          onEndCall={onCall ? handleEnd : handleReject}
          onToast={showToast}
          onReport={() => setReportOpen(true)}
          onOpenFeed={(payload) => {
            setCertPayload(payload);
            setCertOpen(true);
          }}
        />
        </RenderErrorGuard>
      </div>

      {toast ? (
        <p className="pointer-events-none fixed bottom-8 left-1/2 z-[240] -translate-x-1/2 rounded-full bg-[#0F172A]/95 px-4 py-2 text-[11px] font-semibold text-[#E2E8F0] ring-1 ring-[#00D2FF]/25">
          {toast}
        </p>
      ) : null}

      <LetteringReportSheet
        contained={false}
        open={reportOpen}
        phone={reportTarget.phone}
        cardName={reportTarget.cardName}
        onClose={() => setReportOpen(false)}
        onBlockOnly={handleBlockOnly}
        onSubmit={handleReportSubmit}
      />

      <LetteringCertModal open={certOpen} payload={certPayload} onClose={() => setCertOpen(false)} />
      <VlueAuthMemberPopup
        open={Boolean(authMemberPopupOpen && peerAuthPopupOnly)}
        name={styledCard?.name || styledCard?.displayName || ""}
        phone={incoming}
        handle={styledCard?.publicHandle || ""}
        onClose={() => setAuthMemberPopupOpen(false)}
      />
    </div>
  );
}
