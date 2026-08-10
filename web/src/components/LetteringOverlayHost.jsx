import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getBusinessCardByNumber } from "../lib/getBusinessCardByNumber.js";
import { mapLookupToLetteringCard } from "../lib/letteringCardMapper.js";
import { checkLetteringPhoneBlocked } from "../lib/letteringApi.js";
import { readLetteringEnabled } from "../lib/letteringSettings.js";
import { submitLetteringReport } from "../lib/letteringReport.js";
import { blockLetteringPhoneOnly } from "../lib/letteringPhoneBlock.js";
import { SHOWCASE_LIVE_STYLE_CHANGED_EVENT } from "../lib/showcase/showcaseStyleStorage.js";
import { CALL_STATES, normalizeCallState } from "../lib/showcase/tentShowcaseTypes.js";
import { appendCallShowcaseHistory } from "../lib/callShowcaseHistory.js";
import { syncDeviceContactsFromNative } from "../lib/contacts/deviceContactsCache.js";
import { applyShowcaseStyleToCard } from "../lib/showcase/applyShowcaseStyleToCard.js";
import { isPaidLetteringTier } from "../lib/letteringMembership.js";
import { fetchPeerLiveStylePublic } from "../lib/showcase/showcaseStyleApi.js";
import { fetchFollowProfile } from "../lib/followApi.js";
import { createDefaultShowcaseStyle } from "../lib/showcase/showcaseStyleStorage.js";
import { normalizePhotoFocus } from "../lib/letteringBizcardStorage.js";
import LetteringIncomingNotification from "./LetteringIncomingNotification.jsx";
import LetteringReportSheet from "./LetteringReportSheet.jsx";
import LetteringCertModal from "./LetteringCertModal.jsx";
import { resetCompanionMiniCaseSessionPos } from "./call/CompanionMiniCase.jsx";
import { COMPANION_MVP_DELEGATE_CALL_UI } from "../lib/call/companionMvpFlags.js";
import { trackCallInterfaceUse, trackShowcaseView } from "../lib/productMetrics.js";
import { ShowcaseBgmProvider } from "../context/ShowcaseBgmContext.jsx";
import "../styles/tent-showcase.css";
import "../styles/showcase-call-glass.css";

/** 네이티브 card-lookup + 웹 useEffect 가 같은 peer 를 동시에 때리지 않도록 */
const overlayPeerEnrichInflight = new Map();

async function enrichPeerCardFromProfile(peerUserId, nextCard) {
  const data = await fetchFollowProfile(peerUserId);
  if (!data?.ok) return nextCard;
  const exp = data.cardExport && typeof data.cardExport === "object" ? data.cardExport : null;
  const photo = String(exp?.photoUrl || data.photoUrl || data.profile?.photoUrl || "").trim();
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
    membershipTier: data.membershipTier || nextCard.membershipTier || "paid"
  };
}

async function enrichOverlayPeerBundle(peerUserId, nextCard) {
  const id = String(peerUserId || "").trim();
  if (!id) {
    return {
      card: nextCard,
      style: createDefaultShowcaseStyle()
    };
  }
  const existing = overlayPeerEnrichInflight.get(id);
  if (existing) return existing;
  const run = (async () => {
    const [live, enriched] = await Promise.all([
      fetchPeerLiveStylePublic(id, { force: false }),
      enrichPeerCardFromProfile(id, nextCard)
    ]);
    return {
      card: enriched,
      style: live && typeof live === "object" ? live : createDefaultShowcaseStyle()
    };
  })();
  overlayPeerEnrichInflight.set(id, run);
  try {
    return await run;
  } finally {
    if (overlayPeerEnrichInflight.get(id) === run) overlayPeerEnrichInflight.delete(id);
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
    phase: params.get("phase") || ""
  };
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
  const [{ incoming, platform, direction, native, forceLettering, phase }, setParams] = useState(parseOverlayParams);
  const [card, setCard] = useState(null);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [certOpen, setCertOpen] = useState(false);
  const [certPayload, setCertPayload] = useState(null);
  const [toast, setToast] = useState("");
  const [callState, setCallState] = useState(() =>
    normalizeCallState(phase) === CALL_STATES.CONNECTED ? CALL_STATES.CONNECTED : CALL_STATES.RINGING
  );
  const [showcaseStyle, setShowcaseStyle] = useState(() => createDefaultShowcaseStyle());
  const [expanded, setExpanded] = useState(() => normalizeCallState(phase) === CALL_STATES.CONNECTED);
  /* Native BIG_PUSH 창 — 앱 쇼케이스바(접힘) 강제. MiniCase 금지 */
  const [forceShowcaseBar, setForceShowcaseBar] = useState(true);

  const showToast = useCallback((msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2800);
  }, []);

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
    const t = window.setTimeout(() => {
      void syncDeviceContactsFromNative();
    }, 800);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const onNativeCard = (ev) => {
      try {
        const detail = ev?.detail || window.__VLUE_CARD_LOOKUP__;
        if (!detail || detail.matched === false) return;
        const mapped = mapLookupToLetteringCard(detail, incoming || detail.phoneE164 || "");
        if (mapped) {
          setCard((prev) => ({ ...(prev || {}), ...mapped }));
          setVerified(true);
          setLoading(false);
          const peerUserId = String(mapped.userId || mapped.ownerUserId || "").trim();
          if (peerUserId) {
            void enrichOverlayPeerBundle(peerUserId, mapped).then(({ card, style }) => {
              setCard((prev) => ({
                ...(prev || {}),
                ...card,
                showcaseStyle: style
              }));
              setShowcaseStyle(style);
            });
          }
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("vlue-card-lookup", onNativeCard);
    if (window.__VLUE_CARD_LOOKUP__) onNativeCard({ detail: window.__VLUE_CARD_LOOKUP__ });
    return () => window.removeEventListener("vlue-card-lookup", onNativeCard);
  }, [incoming]);

  useEffect(() => {
    let cancelled = false;
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
      const blockCheck = await checkLetteringPhoneBlocked(incoming);
      if (cancelled) return;
      if (blockCheck.blocked) {
        setBlocked(true);
        setLoading(false);
        return;
      }
      if (!String(incoming || "").trim() || String(incoming).toLowerCase() === "unknown") {
        /* 번호 업그레이드(Native loadUrl / card-lookup) 대기 — unknown 으로 확정하지 않음 */
        setLoading(true);
        return;
      }

      /*
       * 네이티브 card-lookup 이 이미 있으면 by-number 재조회 생략.
       * 스타일·프로필 enrich 는 in-flight 맵으로 리스너와 합친다.
       */
      const nativeDetail =
        native || forceLettering ? window.__VLUE_CARD_LOOKUP__ : null;
      if (nativeDetail && nativeDetail.matched !== false) {
        const mapped = mapLookupToLetteringCard(
          nativeDetail,
          incoming || nativeDetail.phoneE164 || ""
        );
        if (mapped) {
          setCard((prev) => ({ ...(prev || {}), ...mapped }));
          setVerified(true);
          setLoading(false);
          const peerUserId = String(mapped.userId || mapped.ownerUserId || "").trim();
          if (peerUserId) {
            const { card, style } = await enrichOverlayPeerBundle(peerUserId, mapped);
            if (cancelled) return;
            setCard((prev) => ({ ...(prev || {}), ...card, showcaseStyle: style }));
            setShowcaseStyle(style);
          }
          return;
        }
      }

      const lookup = await getBusinessCardByNumber(incoming);
      if (cancelled) return;
      let nextCard = null;
      let nextVerified = false;
      if (lookup?.ok && lookup.matched) {
        nextCard = mapLookupToLetteringCard(lookup, incoming);
        nextVerified = true;
      }

      /* 상대(발신/수신 번호 소유자) 라이브 쇼케이스 — 본인 hydrateLive 금지 */
      let peerStyle = createDefaultShowcaseStyle();
      const peerUserId = String(nextCard?.userId || nextCard?.ownerUserId || "").trim();

      /* lookup 직후 DCC 먼저 표시 — 스타일·프로필은 병렬 */
      if (nextCard) {
        setCard({ ...nextCard, showcaseStyle: peerStyle });
        setVerified(nextVerified);
        setLoading(false);
      }

      if (peerUserId) {
        const { card, style } = await enrichOverlayPeerBundle(peerUserId, nextCard);
        if (cancelled) return;
        nextCard = card;
        peerStyle = style;
      }

      if (cancelled) return;
      if (nextCard) {
        setCard({ ...nextCard, showcaseStyle: peerStyle });
        setVerified(nextVerified);
      } else {
        setCard(null);
        setVerified(false);
      }
      setShowcaseStyle(peerStyle);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [incoming, native, forceLettering]);

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
        setForceShowcaseBar(true);
        setExpanded(false);
      } else if (
        rawState === "minimize_showcase" ||
        rawState === "reveal_system_call_ui"
      ) {
        setForceShowcaseBar(false);
        setExpanded(false);
      } else if (rawState === "restore_showcase") {
        setForceShowcaseBar(false);
        setExpanded(true);
      }
      const next = normalizeCallState(rawState);
      if (next) {
        setCallState(next);
        if (next === CALL_STATES.CONNECTED) {
          /*
           * CONNECTED = Web Content Ready / UI sync only.
           * OverlayState(SHOWCASE)는 Native ANSWER/OFFHOOK/ACTIVE → Controller.onAnswer 단일 책임.
           * restoreShowcaseOverlay는 사용자 Mini→Showcase 명시 요청에서만 호출.
           */
          setForceShowcaseBar(false);
          setExpanded(true);
        }
        if (next === CALL_STATES.RINGING) {
          /* BigPush = 앱 쇼케이스바 */
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
  const isPaid = isPaidLetteringTier(membershipTier);
  const styledCard = useMemo(() => {
    if (!card) return null;
    return applyShowcaseStyleToCard(
      { ...card, showcaseStyle: card.showcaseStyle || showcaseStyle },
      membershipTier,
      /* 통화 오버레이 = 상대 명함 — scrub/내 고정신원으로 이메일·상호를 지우지 않음 */
      { peerMode: true, skipFixedIdentity: true }
    );
  }, [card, showcaseStyle, membershipTier]);

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
      appendCallShowcaseHistory({
        phone: incoming,
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

  if (loading) {
    /* FULLSCREEN 흰 바탕 점유 금지 — 투명 호스트 + 작은 상태 칩만 */
    return (
      <div
        className="lettering-overlay-host lettering-overlay-host--tent lettering-overlay-host--loading fixed inset-0 z-[200] flex items-start justify-center pointer-events-none bg-transparent"
        style={{ background: "transparent" }}
      >
        <p className="mt-16 rounded-full bg-[#0F172A]/90 px-4 py-2 text-[11px] font-semibold tracking-wide text-[#E2E8F0]">
          VLUE 신원 확인 중…
        </p>
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
            setExpanded(next);
            if (next) {
              setForceShowcaseBar(false);
              try {
                window.VlueLettering?.restoreShowcaseOverlay?.();
                window.Android?.restoreShowcaseOverlay?.();
              } catch {
                /* ignore */
              }
            }
          }}
          includeDigitalCard={Boolean(
            verified && isPaid && styledCard?.showcaseStyle?.includeDigitalCard !== false
          )}
          isKnownContact={verified}
          onEndCall={onCall ? handleEnd : handleReject}
          onToast={showToast}
          onReport={() => setReportOpen(true)}
          onOpenFeed={(payload) => {
            setCertPayload(payload);
            setCertOpen(true);
          }}
        />
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
    </div>
  );
}
