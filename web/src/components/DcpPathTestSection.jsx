import { useState } from "react";
import AgencyDcpCard from "./agency/AgencyDcpCard.jsx";
import AgencyRouteWarningOverlay from "./agency/AgencyRouteWarningOverlay.jsx";

const MOCK_DCP_CARD = {
  profileKind: "dcp",
  name: "경찰청",
  displayName: "경찰청",
  organization: "경찰청",
  phone: "112",
  website: "https://www.police.go.kr",
  dcp: {
    agencyName: "경찰청",
    shortNumber: "112",
    officialWebsite: "https://www.police.go.kr",
    logoUrl: "",
    routeStatus: "normal",
    warning: ""
  }
};

const ABNORMAL_WARNING =
  "🚨 현재 번호는 비정상 발신 번호로 의심됩니다! 즉시 통화를 종료하고 공식 정보를 확인하세요!!";

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

/** 홈 — 통화 경로 감지 엔진 정상/비정상 UI 즉시 확인 */
export default function DcpPathTestSection({ isDarkMode = false }) {
  const [preview, setPreview] = useState(null);

  const run = (abnormal) => {
    const native = callNativeDcpTest(abnormal);
    setPreview(abnormal ? "abnormal" : "normal");
    if (!native) {
      /* 브라우저/권한 없을 때도 같은 UI를 홈에서 바로 보여 준다 */
    }
  };

  const border = isDarkMode ? "border-white/10 bg-white/5" : "border-gray-100 bg-white";
  const title = isDarkMode ? "text-gray-100" : "text-gray-900";
  const hint = isDarkMode ? "text-gray-400" : "text-gray-500";

  return (
    <section className={`rounded-2xl border p-3 ${border}`} data-home="dcp-path-test">
      <p className={`mb-1 text-[12px] font-black ${title}`}>통화 경로 감지 테스트</p>
      <p className={`mb-3 text-[11px] leading-snug ${hint}`}>
        화이트리스트(112) 통화처럼 경로 검증을 거친 뒤, 정상은 DCP·비정상은 경고 오버레이를 띄웁니다.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="rounded-xl border border-blue-200 bg-blue-50 py-2.5 text-[12px] font-black text-blue-800"
          onClick={() => run(false)}
        >
          정상 테스트
        </button>
        <button
          type="button"
          className="rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-[12px] font-black text-rose-800"
          onClick={() => run(true)}
        >
          비정상 테스트
        </button>
      </div>
      {preview === "normal" ? (
        <div className="mt-3 overflow-hidden rounded-2xl bg-slate-950">
          <AgencyDcpCard card={MOCK_DCP_CARD} incomingNumber="112" compact />
        </div>
      ) : null}
      <AgencyRouteWarningOverlay
        open={preview === "abnormal"}
        warning={ABNORMAL_WARNING}
        agencyName="경찰청"
        officialWebsite="https://www.police.go.kr"
        onClose={() => setPreview(null)}
      />
    </section>
  );
}
