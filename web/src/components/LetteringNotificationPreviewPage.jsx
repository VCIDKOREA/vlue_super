import { useEffect, useState } from "react";
import { isPaidLetteringTier } from "../lib/letteringMembership.js";
import LetteringCallScreenPreview from "./LetteringCallScreenPreview.jsx";

/** 개발용 — http://localhost:5173/#lettering-preview */
export default function LetteringNotificationPreviewPage() {
  const [verified, setVerified] = useState(true);
  const [membershipTier, setMembershipTier] = useState("premium");
  const [expanded, setExpanded] = useState(false);
  const isPaid = verified && isPaidLetteringTier(membershipTier);
  const canExpandPreview = isPaid || !verified;
  const [callPhase, setCallPhase] = useState("active");
  const [isRecording, setIsRecording] = useState(true);
  const [platform, setPlatform] = useState("android");
  const [callDurationSec, setCallDurationSec] = useState(141);
  const [recordingDurationSec, setRecordingDurationSec] = useState(91);
  const [toast, setToast] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  useEffect(() => {
    if (callPhase !== "active") return undefined;
    const id = window.setInterval(() => {
      setCallDurationSec((s) => s + 1);
      if (isRecording && platform === "android") {
        setRecordingDurationSec((s) => s + 1);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [callPhase, isRecording, platform]);

  return (
    <div className="relative min-h-[100dvh] bg-[#050810]">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-indigo-950/40 via-transparent to-[#050810]" aria-hidden />

      <div className="relative z-[1] px-4 pb-4 pt-8 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300/80">VLUE Lettering</p>
        <h1 className="mt-2 text-[18px] font-black text-white">실제 통화 화면 위 빅푸시</h1>
        <p className="mt-2 text-[11px] font-medium text-white/45">
          {isPaid
            ? "유료 회원 · 로고·상호·명함 펼침 · 뒷면(회사소개·꾸미기)"
            : verified
              ? "일반번호 · 010-1234-5678 + V · 유선 거래 주의"
              : "미인증 · ▼ 펼치면 신고·제보 이력"}
        </p>
        {platform === "ios" ? (
          <p className="mt-1 text-[10px] font-semibold text-violet-200/90">
            iOS · 상태바 바로 아래(번호 114 가리지 않음) · 통화중만 표시
          </p>
        ) : null}
      </div>

      <LetteringCallScreenPreview
        verified={verified}
        membershipTier={membershipTier}
        callPhase={callPhase}
        expanded={expanded}
        setExpanded={setExpanded}
        showToast={showToast}
        isRecording={isRecording}
        platform={platform}
        callDurationSec={callDurationSec}
        recordingDurationSec={recordingDurationSec}
      />

      <div className="lettering-preview-controls relative z-[1] mx-auto flex flex-wrap justify-center gap-2 pb-10">
        <button
          type="button"
          disabled={!canExpandPreview}
          onClick={() => canExpandPreview && setExpanded((v) => !v)}
          className={`rounded-full px-4 py-2.5 text-[11px] font-black shadow-lg ${
            canExpandPreview ? "bg-white text-blue-900" : "cursor-not-allowed bg-white/30 text-white/40"
          }`}
        >
          {expanded ? "접기" : "펼치기"}
        </button>
        <button
          type="button"
          disabled={!verified}
          onClick={() => {
            setMembershipTier((t) => (isPaidLetteringTier(t) ? "free" : "premium"));
            setExpanded(false);
          }}
          className="rounded-full border border-cyan-400/40 bg-cyan-500/20 px-4 py-2.5 text-[11px] font-black text-cyan-100 disabled:opacity-40"
        >
          {isPaid ? "무료 회원" : "유료 회원"}
        </button>
        <button
          type="button"
          onClick={() => setCallPhase((p) => (p === "active" ? "ringing" : "active"))}
          className="rounded-full border border-white/25 bg-white/10 px-4 py-2.5 text-[11px] font-black text-white"
        >
          {callPhase === "active" ? "수신 대기" : "통화 시작"}
        </button>
        <button
          type="button"
          onClick={() => setIsRecording((v) => !v)}
          className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-4 py-2.5 text-[11px] font-black text-emerald-100"
        >
          {isRecording ? "녹음 OFF" : "녹음 ON"}
        </button>
        <button
          type="button"
          onClick={() => setPlatform((p) => (p === "android" ? "ios" : "android"))}
          className="rounded-full border border-violet-400/40 bg-violet-500/20 px-4 py-2.5 text-[11px] font-black text-violet-100"
        >
          {platform === "android" ? "iOS" : "Android"}
        </button>
        <button
          type="button"
          onClick={() => setVerified((v) => !v)}
          className="rounded-full border border-white/20 px-4 py-2.5 text-[11px] font-black text-white/80"
        >
          {verified ? "미인증" : "인증"}
        </button>
      </div>

      {toast ? (
        <p className="fixed bottom-6 left-1/2 z-[30] -translate-x-1/2 rounded-2xl bg-slate-900/95 px-5 py-2.5 text-[13px] font-bold text-white shadow-xl">
          {toast}
        </p>
      ) : null}
    </div>
  );
}
