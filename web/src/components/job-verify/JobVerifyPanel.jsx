import { useCallback, useEffect, useState } from "react";
import { Briefcase, Building2, FileText, Loader2 } from "lucide-react";
import {
  JOB_VERIFY_DOC_KINDS,
  JOB_VERIFY_HELP,
  JOB_VERIFY_REVIEW_DAYS_HINT,
  isOtherJobOccupation
} from "../../lib/jobOccupationCatalog.js";
import { fetchJobOccupationStatus, submitJobOccupationReview } from "../../lib/jobOccupationVerifyApi.js";
import { prepareLetteringVerifyDocFromFile } from "../../lib/letteringBizcardVerification.js";
import JobOccupationPicker from "./JobOccupationPicker.jsx";

/**
 * 사업자인증 / 직업인증 트랙 + 직업 선택·서류 업로드
 */
export default function JobVerifyPanel({
  isDarkMode = false,
  onOpenBusinessAuth,
  onToast
}) {
  const [track, setTrack] = useState(""); // "" | "business" | "job"
  const [step, setStep] = useState("hub"); // hub | pick | upload | done
  const [occupation, setOccupation] = useState(null);
  const [customLabel, setCustomLabel] = useState("");
  const [docKind, setDocKind] = useState("license");
  const [docName, setDocName] = useState("");
  const [docDataUrl, setDocDataUrl] = useState("");
  const [docError, setDocError] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  const reloadStatus = useCallback(async () => {
    try {
      const s = await fetchJobOccupationStatus();
      setStatus(s);
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    void reloadStatus();
  }, [reloadStatus]);

  const panel = isDarkMode
    ? "rounded-2xl border border-white/10 bg-white/[0.03] p-3.5"
    : "rounded-2xl border border-slate-200 bg-white p-3.5";
  const muted = isDarkMode ? "text-gray-400" : "text-slate-500";
  const inputBase = isDarkMode
    ? "mt-1.5 w-full rounded-xl border border-white/15 bg-slate-900/90 px-3 py-2.5 text-[13px] text-gray-100 outline-none"
    : "mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[13px] text-[#0f172a] outline-none";

  const onDocPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    setDocError("");
    const result = await prepareLetteringVerifyDocFromFile(file);
    if (!result.ok) {
      setDocError(result.error);
      return;
    }
    setDocDataUrl(result.dataUrl);
    setDocName(result.fileName);
  };

  const submit = async () => {
    if (!occupation) return;
    if (isOtherJobOccupation(occupation.id) && !customLabel.trim()) {
      setDocError("기타 직업을 직접 입력해 주세요.");
      return;
    }
    if (!docDataUrl || !docName) {
      setDocError("증빙 서류를 첨부해 주세요.");
      return;
    }
    setBusy(true);
    setDocError("");
    try {
      await submitJobOccupationReview({
        occupationId: occupation.id,
        customLabel: customLabel.trim(),
        docKind,
        docFileName: docName,
        docDataUrl
      });
      onToast?.("직업 인증 서류를 제출했습니다. 승인까지 1~7일 소요됩니다.");
      setStep("done");
      await reloadStatus();
    } catch (e) {
      setDocError(e instanceof Error ? e.message : "제출에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  if (step === "pick") {
    return (
      <div className={`${panel} min-h-[420px] p-0 overflow-hidden`}>
        <div className="h-[min(70vh,560px)]">
          <JobOccupationPicker
            isDarkMode={isDarkMode}
            onBack={() => setStep("hub")}
            onSelect={(item) => {
              setOccupation(item);
              setCustomLabel("");
              setStep("upload");
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div id="dcc-settings-job-verify" className={`scroll-mt-4 space-y-3 ${panel}`}>
      <div className="flex items-start gap-2.5">
        <FileText className={`mt-0.5 h-5 w-5 shrink-0 ${isDarkMode ? "text-cyan-300" : "text-blue-600"}`} />
        <div className="min-w-0">
          <p className={`text-[13px] font-black ${isDarkMode ? "text-gray-100" : "text-slate-900"}`}>
            직업 증빙자료로 인증하기 (전문직, 사업자 등)
          </p>
          <p className={`mt-1 text-[11px] leading-relaxed ${muted}`}>{JOB_VERIFY_HELP}</p>
          <p className={`mt-1 text-[11px] font-semibold ${isDarkMode ? "text-cyan-200" : "text-blue-700"}`}>
            {JOB_VERIFY_REVIEW_DAYS_HINT}
          </p>
        </div>
      </div>

      {status?.reviewStatus ? (
        <div
          className={`rounded-xl px-3 py-2 text-[11px] font-semibold ${
            status.reviewStatus === "approved"
              ? "bg-emerald-500/15 text-emerald-700"
              : status.reviewStatus === "rejected"
                ? "bg-red-500/10 text-red-600"
                : isDarkMode
                  ? "bg-amber-500/10 text-amber-200"
                  : "bg-amber-50 text-amber-800"
          }`}
        >
          {status.reviewStatus === "approved"
            ? `직업인증 승인 · ${status.displayLabel || status.occupationLabel}`
            : status.reviewStatus === "rejected"
              ? `직업인증 반려${status.adminNote ? ` · ${status.adminNote}` : ""}`
              : `직업인증 검토 중 · ${status.displayLabel || status.occupationLabel} (1~7일)`}
        </div>
      ) : null}

      {step === "hub" || step === "done" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            className={`flex items-start gap-2 rounded-xl border px-3 py-3 text-left ${
              isDarkMode ? "border-white/10 hover:bg-white/5" : "border-slate-200 hover:bg-slate-50"
            }`}
            onClick={() => {
              setTrack("business");
              onOpenBusinessAuth?.();
              onToast?.(
                "사업자인증은 국세청 대조·사업자등록증 경로로 진행합니다. 기업명함 신청 또는 온보딩 사업자 트랙을 이용해 주세요."
              );
            }}
          >
            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
            <span>
              <span className="block text-[13px] font-black">사업자인증</span>
              <span className={`mt-0.5 block text-[10px] ${muted}`}>사업자등록 · 국세청 대조</span>
            </span>
          </button>
          <button
            type="button"
            className={`flex items-start gap-2 rounded-xl border px-3 py-3 text-left ${
              isDarkMode ? "border-white/10 hover:bg-white/5" : "border-slate-200 hover:bg-slate-50"
            }`}
            onClick={() => {
              setTrack("job");
              setStep("pick");
            }}
          >
            <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
            <span>
              <span className="block text-[13px] font-black">직업인증</span>
              <span className={`mt-0.5 block text-[10px] ${muted}`}>면허·자격·사원증 등 서류</span>
            </span>
          </button>
        </div>
      ) : null}

      {step === "upload" && occupation ? (
        <div className="space-y-3">
          <button
            type="button"
            className={`text-[11px] font-bold ${muted}`}
            onClick={() => setStep("pick")}
          >
            ← 직업 다시 선택 ({occupation.label})
          </button>
          {isOtherJobOccupation(occupation.id) ? (
            <label className="block">
              <span className={`text-[11px] font-bold ${muted}`}>직업명 (직접입력)</span>
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                className={inputBase}
                placeholder="예: 프리랜서 방송작가"
                maxLength={80}
              />
            </label>
          ) : null}
          <label className="block">
            <span className={`text-[11px] font-bold ${muted}`}>서류 종류</span>
            <select
              value={docKind}
              onChange={(e) => setDocKind(e.target.value)}
              className={inputBase}
            >
              {JOB_VERIFY_DOC_KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={`text-[11px] font-bold ${muted}`}>증빙 서류 업로드</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              className={`mt-1.5 w-full text-[12px] ${muted}`}
              onChange={(e) => void onDocPick(e)}
            />
            {docName ? (
              <p className={`mt-1 text-[10px] font-semibold ${isDarkMode ? "text-cyan-200" : "text-blue-700"}`}>
                첨부됨: {docName}
              </p>
            ) : null}
          </label>
          {docError ? <p className="text-[11px] font-bold text-red-500">{docError}</p> : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-[13px] font-bold text-white disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            직업인증 제출
          </button>
        </div>
      ) : null}
    </div>
  );
}
