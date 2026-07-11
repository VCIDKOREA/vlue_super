import { useCallback, useEffect, useMemo, useState } from "react";
import { getBusinessCardByNumber } from "../lib/getBusinessCardByNumber.js";
import { mapLookupToLetteringCard } from "../lib/letteringCardMapper.js";
import { checkLetteringPhoneBlocked } from "../lib/letteringApi.js";
import { readLetteringEnabled } from "../lib/letteringSettings.js";
import { submitLetteringReport } from "../lib/letteringReport.js";
import { blockLetteringPhoneOnly } from "../lib/letteringPhoneBlock.js";
import { readShowcaseStyle } from "../lib/showcase/showcaseStyleStorage.js";
import { CALL_STATES, normalizeCallState } from "../lib/showcase/tentShowcaseTypes.js";
import { appendCallShowcaseHistory } from "../lib/callShowcaseHistory.js";
import { syncDeviceContactsFromNative } from "../lib/contacts/deviceContactsCache.js";
import TentShowcaseOverlay from "./showcase/TentShowcaseOverlay.jsx";
import LetteringReportSheet from "./LetteringReportSheet.jsx";
import LetteringCertModal from "./LetteringCertModal.jsx";
import "../styles/tent-showcase.css";

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
 * TentShowcaseOverlay 천막 UI + 통화 상태 스트림 융합
 */
export default function LetteringOverlayHost() {
  const [{ incoming, direction, phase }, setParams] = useState(parseOverlayParams);
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
  const [showcaseStyle, setShowcaseStyle] = useState(() => readShowcaseStyle());

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
      setShowcaseStyle(readShowcaseStyle());
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [incoming]);

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
        membershipTier: card?.membershipTier || "free",
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
    [incoming, card, direction, verified, showcaseStyle]
  );

  const handleEnd = useCallback(() => {
    cacheHistory(CALL_STATES.ENDED);
  }, [cacheHistory]);

  const handleReject = useCallback(() => {
    cacheHistory(CALL_STATES.MISSED);
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

  return (
    <div className="lettering-overlay-host lettering-overlay-host--tent">
      <div className="lettering-overlay-host__tent-shell">
        <TentShowcaseOverlay
          callState={callState}
          onCallStateChange={setCallState}
          verified={verified}
          membershipTier={card?.membershipTier || "free"}
          peerPhone={incoming}
          displayName={card?.name || card?.displayName || ""}
          organization={card?.organization || ""}
          card={card}
          showcaseStyle={showcaseStyle}
          onReject={handleReject}
          onEnd={handleEnd}
          onOpenVault={() => {
            showToast("케이스 자료실은 통화 중 앱에서 열 수 있습니다");
            try {
              window.VlueLettering?.openCertInfo?.({ type: "vault", phone: incoming });
            } catch {
              /* ignore */
            }
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
