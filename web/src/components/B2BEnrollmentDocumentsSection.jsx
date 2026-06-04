import { useCallback } from "react";
import { uploadB2bEnrollmentDocument } from "../lib/b2bEnterpriseApi.js";
import { logB2bPipeline } from "../lib/b2bPipelineLog.js";

export const B2B_REQUIRED_DOCS = [
  { kind: "employment_certificate", label: "재직증명서" },
  { kind: "wage_contract", label: "위축계약서" },
  { kind: "business_registration", label: "사업자등록증" }
];

/**
 * 가입 신청 화면 내 증빙 서류 업로드 (제출 버튼은 상위 통합)
 */
export default function B2BEnrollmentDocumentsSection({
  enrollment,
  onEnrollmentUpdate,
  onToast,
  busyKind,
  setBusyKind
}) {
  const uploadFile = useCallback(
    async (kind, file) => {
      if (!file) return;
      setBusyKind(kind);
      try {
        const result = await uploadB2bEnrollmentDocument({
          kind,
          fileName: file.name,
          file
        });
        logB2bPipeline("enrollment.documents_uploaded", { kind });
        onEnrollmentUpdate(result.enrollment);
        onToast?.(`${B2B_REQUIRED_DOCS.find((d) => d.kind === kind)?.label} 첨부 완료`);
      } catch (e) {
        onToast?.(e?.message || String(e));
      } finally {
        setBusyKind("");
      }
    },
    [onEnrollmentUpdate, onToast, setBusyKind]
  );

  const uploadedByKind = (kind) =>
    enrollment?.uploadedDocuments?.find((d) => d.kind === kind);

  const uploadedCount = B2B_REQUIRED_DOCS.filter((d) => uploadedByKind(d.kind)).length;

  return (
    <section className="rounded-xl border border-amber-100 bg-amber-50/40 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-black text-amber-950">③ 기업 증빙 서류 (필수 3종)</p>
        <span className="text-[10px] font-bold text-amber-800">
          {uploadedCount}/3
        </span>
      </div>

      <div className="space-y-2">
        {B2B_REQUIRED_DOCS.map((slot) => {
          const uploaded = uploadedByKind(slot.kind);
          return (
            <div
              key={slot.kind}
              className={`rounded-lg border px-3 py-2.5 ${
                uploaded
                  ? "border-emerald-200 bg-emerald-50/80"
                  : "border-dashed border-amber-300/80 bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-black text-slate-800">
                  {uploaded ? "✓ " : ""}
                  {slot.label}
                </p>
                {uploaded ? (
                  <a
                    href={uploaded.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-blue-600 underline"
                  >
                    보기
                  </a>
                ) : null}
              </div>
              <label className="mt-2 flex cursor-pointer items-center justify-center rounded-lg border border-amber-200 bg-amber-50/50 py-3 text-center">
                <span className="text-[10px] font-semibold text-amber-900">
                  {uploaded ? "파일 교체" : "PDF·이미지 선택"}
                </span>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  className="sr-only"
                  disabled={busyKind === slot.kind}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadFile(slot.kind, f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          );
        })}
      </div>
    </section>
  );
}
