import { useCallback, useEffect, useMemo, useState } from "react";
import { getBusinessCardByNumber } from "../lib/getBusinessCardByNumber.js";
import { mapLookupToLetteringCard } from "../lib/letteringCardMapper.js";
import { checkLetteringPhoneBlocked } from "../lib/letteringApi.js";
import { readLetteringEnabled } from "../lib/letteringSettings.js";
import { saveLetteringCardToWallet } from "../lib/letteringCardWallet.js";
import { submitLetteringReport } from "../lib/letteringReport.js";
import { blockLetteringPhoneOnly } from "../lib/letteringPhoneBlock.js";
import LetteringIncomingNotification from "./LetteringIncomingNotification.jsx";
import LetteringReportSheet from "./LetteringReportSheet.jsx";
import LetteringCertModal from "./LetteringCertModal.jsx";

function parseOverlayParams() {
  const hash = typeof window !== "undefined" ? window.location.hash || "" : "";
  const qIndex = hash.indexOf("?");
  const query = qIndex >= 0 ? hash.slice(qIndex + 1) : window.location.search.replace(/^\?/, "");
  const params = new URLSearchParams(query);
  return {
    incoming: params.get("incoming") || params.get("phone") || "",
    platform: params.get("platform") === "ios" ? "ios" : "android",
    direction: params.get("direction") === "outgoing" ? "outgoing" : "incoming",
    native: params.get("native") === "1"
  };
}

/**
 * 네이티브 CallOverlay WebView / #lettering-overlay 진입점
 */
export default function LetteringOverlayHost() {
  const [{ incoming, platform, direction }, setParams] = useState(parseOverlayParams);
  const [card, setCard] = useState(null);
  const [verified, setVerified] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [certOpen, setCertOpen] = useState(false);
  const [certPayload, setCertPayload] = useState(null);
  const [toast, setToast] = useState("");

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

  const handleOpenFeed = useCallback((payload) => {
    setCertPayload(payload);
    setCertOpen(true);
    try {
      window.VlueLettering?.onCertModalOpen?.();
    } catch {
      /* ignore */
    }
  }, []);

  const handleSaveCard = useCallback(
    ({ card: c }) => {
      const result = saveLetteringCardToWallet(c);
      showToast(result.ok ? "명함이 지갑에 저장되었습니다" : "저장할 수 없습니다");
    },
    [showToast]
  );

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
      <div className="lettering-overlay-host fixed inset-x-0 top-0 z-[200] flex justify-center pt-6 pointer-events-none">
        <p className="rounded-full bg-slate-900/80 px-4 py-2 text-[11px] font-bold text-white">VLUE 조회 중…</p>
      </div>
    );
  }

  return (
    <div className="lettering-overlay-host fixed inset-x-0 top-0 z-[200] flex justify-center px-2 pt-2 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-[390px] lettering-overlay-host__enter">
        <LetteringIncomingNotification
          verified={verified}
          callPhase="active"
          platform={platform}
          incomingNumber={incoming}
          card={card || undefined}
          expanded={expanded}
          onExpandedChange={setExpanded}
          onOpenFeed={handleOpenFeed}
          onSaveCard={handleSaveCard}
          onReport={() => setReportOpen(true)}
          className="lettering-ongoing--native-overlay shadow-2xl"
        />
      </div>

      {toast ? (
        <p className="pointer-events-none fixed bottom-8 left-1/2 z-[210] -translate-x-1/2 rounded-full bg-slate-900/90 px-4 py-2 text-[11px] font-bold text-white">
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
