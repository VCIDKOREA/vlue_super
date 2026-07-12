import { useCallback, useRef, useState } from "react";
import { Building2, Upload } from "lucide-react";
import {
  ORG_CHANGE_APPROVAL,
  ORG_CHANGE_EVIDENCE_KINDS,
  prepareLetteringPhotoFromFile,
  submitOrgChangeRequest
} from "../lib/letteringBizcardStorage.js";

/**
 * 디지털 인증명함 — 상호 변경 신청 (성함 고정 · 상호만 승인 후 반영)
 */
export default function LetteringBizcardOrgChangeSection({
  isDarkMode = false,
  inputBase = "",
  currentOrganization = "",
  approvalStatus = "",
  pendingName = "",
  onSubmitted,
  onToast
}) {
  const [desiredName, setDesiredName] = useState("");
  const [evidenceKind, setEvidenceKind] = useState("storefront");
  const [evidencePreview, setEvidencePreview] = useState("");
  const [evidenceName, setEvidenceName] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const onPick = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    const result = await prepareLetteringPhotoFromFile(file);
    if (!result.ok) {
      setError(result.error || "이미지를 첨부할 수 없습니다.");
      return;
    }
    setEvidencePreview(result.dataUrl);
    setEvidenceName(result.fileName || file.name || "evidence.jpg");
  }, []);

  const onSubmit = () => {
    setError("");
    const result = submitOrgChangeRequest({
      pendingName: desiredName,
      evidenceKind,
      evidenceName,
      evidenceDataUrl: evidencePreview
    });
    if (!result.ok) {
      setError(result.error || "신청에 실패했습니다.");
      return;
    }
    setDesiredName("");
    setEvidencePreview("");
    setEvidenceName("");
    onSubmitted?.();
    onToast?.("상호 변경 신청이 접수되었습니다. 승인되면 자동 반영됩니다.");
  };

  const panel = isDarkMode
    ? "rounded-2xl border border-sky-500/25 bg-sky-950/20 p-3.5"
    : "rounded-2xl border border-sky-200/90 bg-sky-50/70 p-3.5";
  const statusCls =
    approvalStatus === ORG_CHANGE_APPROVAL.PENDING
      ? isDarkMode
        ? "text-amber-300"
        : "text-amber-800"
      : approvalStatus === ORG_CHANGE_APPROVAL.APPROVED
        ? isDarkMode
          ? "text-emerald-300"
          : "text-emerald-800"
        : approvalStatus === ORG_CHANGE_APPROVAL.REJECTED
          ? isDarkMode
            ? "text-red-300"
            : "text-red-700"
          : isDarkMode
            ? "text-gray-400"
            : "text-slate-600";

  return (
    <div className={`${panel} space-y-3`}>
      <div className="flex items-start gap-2">
        <Building2 className={`mt-0.5 h-4 w-4 shrink-0 ${isDarkMode ? "text-sky-400" : "text-sky-700"}`} />
        <div className="min-w-0 flex-1">
          <p className={`text-[12px] font-black ${isDarkMode ? "text-gray-100" : "text-slate-900"}`}>
            상호 변경 신청
          </p>
          <p className={`mt-0.5 text-[10px] font-medium leading-relaxed ${isDarkMode ? "text-gray-400" : "text-slate-500"}`}>
            성함은 수정할 수 없습니다. 상호는 가게 간판 또는 서비스 웹/앱 화면을 첨부해 신청하면, 승인 후 자동
            변경됩니다.
          </p>
          <p className={`mt-1 text-[11px] font-semibold ${statusCls}`}>
            현재 상호: {currentOrganization || "—"}
            {approvalStatus === ORG_CHANGE_APPROVAL.PENDING
              ? ` · 심사 중 (${pendingName || "—"})`
              : approvalStatus === ORG_CHANGE_APPROVAL.REJECTED
                ? " · 최근 신청 반려"
                : ""}
          </p>
        </div>
      </div>

      {approvalStatus === ORG_CHANGE_APPROVAL.PENDING ? (
        <p className={`text-[11px] font-bold ${isDarkMode ? "text-amber-200" : "text-amber-800"}`}>
          상호 변경 심사가 진행 중입니다. 승인되면 명함·쇼케이스에 바로 반영됩니다.
        </p>
      ) : (
        <>
          <label className="block">
            <span className={`text-[11px] font-black ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
              변경할 상호
            </span>
            <input
              type="text"
              value={desiredName}
              onChange={(e) => setDesiredName(e.target.value)}
              className={inputBase}
              placeholder="예: VLUE 카페 강남점"
            />
          </label>

          <label className="block">
            <span className={`text-[11px] font-black ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
              증빙 종류
            </span>
            <select
              value={evidenceKind}
              onChange={(e) => setEvidenceKind(e.target.value)}
              className={inputBase}
            >
              {ORG_CHANGE_EVIDENCE_KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>

          <div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={`flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-3 text-[12px] font-bold ${
                isDarkMode
                  ? "border-white/20 bg-slate-900/50 text-gray-200"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              <Upload className="h-4 w-4" aria-hidden />
              {evidencePreview ? "증빙 사진 변경" : "증빙 사진 첨부"}
            </button>
            <input ref={inputRef} type="file" accept="image/*" className="sr-only" onChange={onPick} />
            {evidencePreview ? (
              <img
                src={evidencePreview}
                alt=""
                className="mt-2 max-h-28 w-full rounded-xl object-cover"
              />
            ) : null}
            {evidenceName ? (
              <p className={`mt-1 text-[10px] font-semibold ${isDarkMode ? "text-gray-400" : "text-slate-500"}`}>
                {evidenceName}
              </p>
            ) : null}
          </div>

          {error ? <p className="text-[10px] font-bold text-red-500">{error}</p> : null}

          <button
            type="button"
            onClick={onSubmit}
            className="w-full rounded-xl bg-sky-600 py-2.5 text-[13px] font-black text-white active:scale-[0.99]"
          >
            상호 변경 신청
          </button>
        </>
      )}
    </div>
  );
}
