import { useCallback, useEffect, useState } from "react";
import AgencyDcpMiniPopup from "./agency/AgencyDcpMiniPopup.jsx";
import { getBusinessCardByNumber } from "../lib/getBusinessCardByNumber.js";
import { mapLookupToLetteringCard } from "../lib/letteringCardMapper.js";
import {
  buildNationalAgencyDcpCard,
  matchNationalAgency
} from "../lib/nationalAgencyDcpClient.js";

const ABNORMAL_WARNING =
  "🚨 현재 번호는 비정상 발신 번호로 의심됩니다! 즉시 통화를 종료하고 공식 정보를 확인하세요!!";

function fallbackPoliceCard() {
  const agency = matchNationalAgency("112");
  return agency ? buildNationalAgencyDcpCard(agency) : null;
}

async function loadPoliceDcpCard(abnormal) {
  const lookup = await getBusinessCardByNumber("112", {
    dcpRoute: abnormal ? "abnormal" : "normal",
    forCallOverlay: true
  });
  if (lookup?.ok && lookup.matched) {
    const mapped = mapLookupToLetteringCard(lookup, "112");
    if (mapped) return mapped;
  }
  const fallback = fallbackPoliceCard();
  if (!fallback) return null;
  if (!abnormal) return fallback;
  return {
    ...fallback,
    dcp: {
      ...(fallback.dcp || {}),
      routeStatus: "abnormal",
      warning: ABNORMAL_WARNING
    }
  };
}

function callNativeDcpTest(abnormal) {
  try {
    const fn = abnormal ? window.Android?.testDcpPathAbnormal : window.Android?.testDcpPathNormal;
    if (typeof fn === "function") {
      fn();
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

function clearDcpTestStorage() {
  try {
    sessionStorage.removeItem("vlue_dcp_test_route");
    sessionStorage.removeItem("vlue_dcp_test_number");
  } catch {
    /* ignore */
  }
}

/** 홈 — 통화 경로 감지 엔진 정상/비정상 UI 즉시 확인 */
export default function DcpPathTestSection({ isDarkMode = false }) {
  const [preview, setPreview] = useState(null);
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(false);

  const closePreview = useCallback(() => {
    setPreview(null);
    clearDcpTestStorage();
  }, []);

  const prefetch = useCallback(async () => {
    const next = await loadPoliceDcpCard(false);
    if (next) setCard(next);
  }, []);

  useEffect(() => {
    void prefetch();
  }, [prefetch]);

  useEffect(() => {
    const onHide = () => closePreview();
    const onCall = () => closePreview();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    window.addEventListener("vlue-call-session", onCall);
    window.addEventListener("vlue-dcp-dismiss", onCall);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("vlue-call-session", onCall);
      window.removeEventListener("vlue-dcp-dismiss", onCall);
    };
  }, [closePreview]);

  const run = async (abnormal) => {
    const native = callNativeDcpTest(abnormal);
    if (native) {
      /* 오버레이가 테스트 UI. 홈 팝업을 남기면 다음 실제 통화에 경찰청 경고가 겹친다. */
      closePreview();
      return;
    }
    setLoading(true);
    setPreview(abnormal ? "abnormal" : "normal");
    try {
      sessionStorage.setItem("vlue_dcp_test_route", abnormal ? "abnormal" : "normal");
      sessionStorage.setItem("vlue_dcp_test_number", "112");
    } catch {
      /* ignore */
    }
    try {
      const next = await loadPoliceDcpCard(abnormal);
      if (next) setCard(next);
    } finally {
      setLoading(false);
    }
  };

  const border = isDarkMode ? "border-white/10 bg-white/5" : "border-gray-100 bg-white";
  const title = isDarkMode ? "text-gray-100" : "text-gray-900";
  const hint = isDarkMode ? "text-gray-400" : "text-gray-500";

  return (
    <section className={`rounded-2xl border p-3 ${border}`} data-home="dcp-path-test">
      <p className={`mb-1 text-[12px] font-black ${title}`}>통화 경로 감지 테스트</p>
      <p className={`mb-3 text-[11px] leading-snug ${hint}`}>
        화이트리스트(112) 통화처럼 경로 검증을 거친 뒤, 정상·비정상 모두 VLUE 미니케이스로 띄웁니다. 옆으로 빼 두고
        드래그로 옮길 수 있습니다.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="rounded-xl border border-blue-200 bg-blue-50 py-2.5 text-[12px] font-black text-blue-800"
          onClick={() => void run(false)}
        >
          정상 테스트
        </button>
        <button
          type="button"
          className="rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-[12px] font-black text-rose-800"
          onClick={() => void run(true)}
        >
          비정상 테스트
        </button>
      </div>
      {loading ? <p className={`mt-2 text-[11px] ${hint}`}>공식 로고·번호를 불러오는 중…</p> : null}
      <AgencyDcpMiniPopup
        open={Boolean(preview) && Boolean(card)}
        card={card}
        incomingNumber="112"
        abnormal={preview === "abnormal"}
        warning={ABNORMAL_WARNING}
        onClose={closePreview}
      />
    </section>
  );
}
