import { useEffect, useState } from "react";
import ModalCloseButton from "./common/ModalCloseButton";
import { useB2bMembership } from "../context/B2bMembershipContext.jsx";
import { VLUER_COMPLIANCE_BLOCK_MESSAGE } from "../lib/vluerCompliance.js";
import { issueVluerReferralCode } from "../lib/vluerApi.js";

const VLUER_VIEWS = {
  main: "main",
  referral: "referral",
  rewards: "rewards",
  commission: "commission"
};

function ComplianceBlockModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-6" onMouseDown={onClose}>
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 pt-12 shadow-xl text-center" onMouseDown={(e) => e.stopPropagation()}>
        <ModalCloseButton variant="default" onClick={onClose} />
        <p className="text-[14px] font-bold leading-relaxed text-gray-900">
          {VLUER_COMPLIANCE_BLOCK_MESSAGE}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-blue-600 py-2.5 text-[13px] font-black text-white"
        >
          확인
        </button>
      </div>
    </div>
  );
}

export default function VluerPartnerSection({ isDarkMode = false, onForceMainView }) {
  const { vluerLocked, vluerMe, refresh } = useB2bMembership();
  const [view, setView] = useState(VLUER_VIEWS.main);
  const [blockOpen, setBlockOpen] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const subText = isDarkMode ? "text-gray-400" : "text-gray-500";
  const headText = isDarkMode ? "text-gray-100" : "text-gray-900";
  const boxCls = isDarkMode
    ? "border-white/10 bg-white/5"
    : "border-gray-100 bg-white";

  useEffect(() => {
    if (vluerMe?.profile?.referralCode) {
      setReferralCode(vluerMe.profile.referralCode);
    }
  }, [vluerMe]);

  const tryEnter = (nextView) => {
    if (vluerLocked) {
      setBlockOpen(true);
      setView(VLUER_VIEWS.main);
      onForceMainView?.();
      return;
    }
    setView(nextView);
  };

  const handleBlockClose = () => {
    setBlockOpen(false);
    setView(VLUER_VIEWS.main);
    onForceMainView?.();
  };

  const issueCode = async () => {
    setBusy(true);
    setMsg("");
    try {
      const data = await issueVluerReferralCode();
      setReferralCode(data.referralCode || "");
      setMsg("추천 코드가 발급되었습니다.");
      refresh();
    } catch (e) {
      setMsg(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  if (view === VLUER_VIEWS.main) {
    return (
      <div className={`mt-6 rounded-[28px] border-2 p-4 shadow-sm ${boxCls}`}>
        <p className={`text-[11px] font-bold uppercase tracking-wide ${subText}`}>VLUER 파트너</p>
        <p className={`mt-1 text-[13px] font-black ${headText}`}>추천 · 리워드 · 정산</p>
        {vluerLocked ? (
          <p className="mt-2 text-[11px] font-semibold text-amber-800">
            기업 귀속 계정 — VLUER 활동 제한 적용 중
          </p>
        ) : null}
        <div className="mt-3 grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={() => tryEnter(VLUER_VIEWS.referral)}
            className="rounded-xl border border-violet-200 bg-violet-50 py-2.5 text-[12px] font-black text-violet-900"
          >
            VLUER 추천 코드 발급
          </button>
          <button
            type="button"
            onClick={() => tryEnter(VLUER_VIEWS.rewards)}
            className="rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-[12px] font-black text-emerald-900"
          >
            리워드/커미션 정산 대시보드
          </button>
          <button
            type="button"
            onClick={() => tryEnter(VLUER_VIEWS.commission)}
            className="rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-[12px] font-black text-amber-900"
          >
            수수료 정산 내역
          </button>
        </div>
        <ComplianceBlockModal open={blockOpen} onClose={handleBlockClose} />
      </div>
    );
  }

  if (vluerLocked) {
    return (
      <>
        <ComplianceBlockModal open onClose={handleBlockClose} />
      </>
    );
  }

  return (
    <div className={`mt-6 rounded-[28px] border-2 p-4 shadow-sm ${boxCls}`}>
      <button
        type="button"
        onClick={() => setView(VLUER_VIEWS.main)}
        className={`mb-3 text-[12px] font-bold ${subText}`}
      >
        ← VLUER 파트너
      </button>

      {view === VLUER_VIEWS.referral ? (
        <>
          <p className={`text-[14px] font-black ${headText}`}>추천 코드 발급</p>
          <p className={`mt-1 text-[11px] ${subText}`}>
            {vluerMe?.tierLabel || "지인 추천"} · SNS 인증·승인 후 홍보 VLUER 고유 코드 발급
          </p>
          <p className="mt-3 rounded-xl bg-violet-50 px-3 py-3 text-center text-[18px] font-black tracking-widest text-violet-900">
            {referralCode || "미발급"}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={issueCode}
            className="mt-3 w-full rounded-xl bg-violet-600 py-2.5 text-[12px] font-black text-white disabled:opacity-50"
          >
            {referralCode ? "코드 재발급" : "코드 발급"}
          </button>
        </>
      ) : null}

      {view === VLUER_VIEWS.rewards ? (
        <>
          <p className={`text-[14px] font-black ${headText}`}>리워드/커미션 정산 대시보드</p>
          <p className={`mt-2 text-[12px] leading-relaxed ${subText}`}>
            정산 적격: {vluerMe?.isEligibleForVluerSettlement ? "예" : "아니오"}
            <br />
            리워드 동결: {vluerMe?.profile?.rewardsFrozen ? "예" : "아니오"}
          </p>
        </>
      ) : null}

      {view === VLUER_VIEWS.commission ? (
        <>
          <p className={`text-[14px] font-black ${headText}`}>수수료 정산 내역</p>
          <p className={`mt-2 text-[12px] ${subText}`}>
            최근 정산 내역 API 연동 예정입니다. 티어 정책은 서버 `commission_ledgers`와 동기화됩니다.
          </p>
        </>
      ) : null}

      {msg ? <p className="mt-2 text-[11px] font-bold text-blue-600">{msg}</p> : null}
    </div>
  );
}
