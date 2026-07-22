import { useCallback, useEffect, useMemo, useState } from "react";
import { getBusinessCardByNumber } from "../lib/getBusinessCardByNumber.js";
import { mapLookupToLetteringCard } from "../lib/letteringCardMapper.js";
import { checkLetteringPhoneBlocked } from "../lib/letteringApi.js";
import { readLetteringEnabled } from "../lib/letteringSettings.js";
import { submitLetteringReport } from "../lib/letteringReport.js";
import { blockLetteringPhoneOnly } from "../lib/letteringPhoneBlock.js";
import { readActiveShowcaseStyle, SHOWCASE_LIVE_STYLE_CHANGED_EVENT } from "../lib/showcase/showcaseStyleStorage.js";
import { hydrateLiveBroadcastFromServer } from "../lib/showcase/syncMycaseLiveBroadcast.js";
import { CALL_STATES, normalizeCallState } from "../lib/showcase/tentShowcaseTypes.js";
import { appendCallShowcaseHistory } from "../lib/callShowcaseHistory.js";
import { syncDeviceContactsFromNative } from "../lib/contacts/deviceContactsCache.js";
import { applyShowcaseStyleToCard } from "../lib/showcase/applyShowcaseStyleToCard.js";
import { isPaidLetteringTier } from "../lib/letteringMembership.js";
import LetteringIncomingNotification from "./LetteringIncomingNotification.jsx";
import LetteringReportSheet from "./LetteringReportSheet.jsx";
import LetteringCertModal from "./LetteringCertModal.jsx";
import "../styles/tent-showcase.css";
import "../styles/showcase-call-glass.css";

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
    phase: params.get("phase") || ""
  };
}

/**
 * 네이티브 CallOverlay WebView / #lettering-overlay 진입점
 * 웹 홈·마케팅과 동일 — LetteringIncomingNotification 쇼케이스 바 → 풀 쇼케이스
 */
export default function LetteringOverlayHost() {
  const [{ incoming, platform, direction, phase }, setParams] = useState(parseOverlayParams);
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
  const [showcaseStyle, setShowcaseStyle] = useState(() => readActiveShowcaseStyle());
  const [expanded, setExpanded] = useState(() => normalizeCallState(phase) === CALL_STATES.CONNECTED);

  const showToast = useCallback((msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2800);
  }, []);

  useEffect(() => {
    const onHash = () => setParams(parseOverlayParams());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    void syncDeviceContactsFromNative();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!readLetteringEnabled()) {
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
      const lookup = await getBusinessCardByNumber(incoming);
      if (cancelled) return;
      if (lookup?.ok && lookup.matched) {
        setCard(mapLookupToLetteringCard(lookup, incoming));
        setVerified(true);
      } else {
        setCard(null);
        setVerified(false);
      }
      await hydrateLiveBroadcastFromServer();
      if (cancelled) return;
      setShowcaseStyle(readActiveShowcaseStyle());
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [incoming]);

  useEffect(() => {
    const onLive = () => setShowcaseStyle(readActiveShowcaseStyle());
    window.addEventListener(SHOWCASE_LIVE_STYLE_CHANGED_EVENT, onLive);
    return () => window.removeEventListener(SHOWCASE_LIVE_STYLE_CHANGED_EVENT, onLive);
  }, []);

  useEffect(() => {
    const onNativeCall = (e) => {
      const next = normalizeCallState(e?.detail?.state || e?.detail?.callState || "");
      if (!next) return;
      setCallState(next);
      if (next === CALL_STATES.CONNECTED) setExpanded(true);
      if (next === CALL_STATES.RINGING) setExpanded(false);
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
      membershipTier
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
              name: card.name,
              organization: card.organization,
              phone: card.phone,
              photoUrl: card.photoUrl,
              avatarUrl: card.avatarUrl || card.photoUrl || "",
              logoUrl: card.logoUrl,
              website: card.website,
              membershipTier: card.membershipTier,
              kakaoAvatarUrl: card.kakaoAvatarUrl || "",
              instagramAvatarUrl: card.instagramAvatarUrl || ""
            }
          : null
      });
    },
    [incoming, card, direction, verified, showcaseStyle, membershipTier]
  );

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

  if (blocked || !readLetteringEnabled()) {
    return null;
  }

  if (loading) {
    return (
      <div className="lettering-overlay-host lettering-overlay-host--tent fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
        <p className="rounded-full bg-[#0F172A]/90 px-4 py-2 text-[11px] font-semibold tracking-wide text-[#E2E8F0]">
          VLUE 신원 확인 중…
        </p>
      </div>
    );
  }

  const onCall = callState === CALL_STATES.CONNECTED;
  const callPhase = onCall ? "connected" : direction === "outgoing" ? "outgoing" : "ringing";

  return (
    <div className="lettering-overlay-host lettering-overlay-host--tent">
      <div className="lettering-overlay-host__tent-shell">
        <LetteringIncomingNotification
          className="lettering-ongoing--on-call lettering-ongoing--fullscreen-tent"
          verified={verified}
          previewMode={false}
          callPhase={callPhase}
          platform={platform}
          incomingNumber={incoming}
          card={styledCard || undefined}
          expanded={expanded}
          onExpandedChange={setExpanded}
          includeDigitalCard={Boolean(verified && isPaid)}
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
