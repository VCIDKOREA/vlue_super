import { useRef, useCallback } from "react";
import { FileText, Upload } from "lucide-react";
import {
  LETTERING_VERIFY_DOC_ACCEPT,
  LETTERING_VERIFY_DOC_ACCEPT_LABEL,
  LETTERING_VERIFY_DOC_KINDS,
  LETTERING_VERIFY_DOC_MAX_AGE_DAYS,
  TITLE_DEPT_APPROVAL,
  isVerifyDocIssuedWithinLimit,
  prepareLetteringVerifyDocFromFile
} from "../lib/letteringBizcardVerification.js";

function Field({ label, hint, children, isDarkMode }) {
  const labelCls = isDarkMode ? "text-[11px] font-black text-gray-100" : "text-[11px] font-black text-gray-900";
  const hintCls = isDarkMode ? "mt-0.5 text-[10px] text-gray-400" : "mt-0.5 text-[10px] text-gray-500";
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {hint ? <p className={hintCls}>{hint}</p> : null}
      {children}
    </label>
  );
}

/**
 * 직책·부서 확인 서류 — 승인 후 수신 명함에 반영
 */
export default function LetteringBizcardTitleDeptVerifySection({
  isDarkMode = false,
  inputBase,
  approvalStatus = "",
  verifyDocKind,
  setVerifyDocKind,
  verifyDocName,
  verifyDocIssuedAt,
  setVerifyDocIssuedAt,
  onDocPick,
  docError = "",
  needsSubmit = false
}) {
  const inputRef = useRef(null);
  const scrollSnapshot = useRef({ top: 0, el: null });

  const captureScroll = useCallback(() => {
    const scrollEl =
      inputRef.current?.closest(".overflow-y-auto, .vlue-scroll-pad-bottom-nav") ||
      document.scrollingElement;
    scrollSnapshot.current = {
      top: scrollEl?.scrollTop ?? window.scrollY ?? 0,
      el: scrollEl
    };
  }, []);

  const restoreScroll = useCallback(() => {
    const { top, el } = scrollSnapshot.current;
    requestAnimationFrame(() => {
      if (el && el !== document.documentElement && el !== document.body) {
        el.scrollTop = top;
      } else {
        window.scrollTo(0, top);
      }
    });
  }, []);

  const openPicker = useCallback(
    (e) => {
      e.preventDefault();
      captureScroll();
      const onWindowFocus = () => {
        restoreScroll();
        window.removeEventListener("focus", onWindowFocus);
      };
      window.addEventListener("focus", onWindowFocus);
      inputRef.current?.click();
    },
    [captureScroll, restoreScroll]
  );

  const panel = isDarkMode
    ? "rounded-2xl border border-amber-500/25 bg-amber-950/20 p-3.5"
    : "rounded-2xl border border-amber-200/90 bg-amber-50/60 p-3.5";
  const statusCls =
    approvalStatus === TITLE_DEPT_APPROVAL.PENDING
      ? isDarkMode
        ? "text-amber-300"
        : "text-amber-800"
      : approvalStatus === TITLE_DEPT_APPROVAL.APPROVED
        ? isDarkMode
          ? "text-emerald-300"
          : "text-emerald-800"
        : isDarkMode
          ? "text-gray-400"
          : "text-slate-600";

  const issuedOk = verifyDocIssuedAt ? isVerifyDocIssuedWithinLimit(verifyDocIssuedAt) : null;

  return (
    <div className={`${panel} sm:col-span-2 space-y-3`}>
      <div className="flex items-start gap-2">
        <FileText className={`mt-0.5 h-4 w-4 shrink-0 ${isDarkMode ? "text-amber-400" : "text-amber-700"}`} />
        <div className="min-w-0">
          <p className={`text-[12px] font-black ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
            직책 · 부서 확인 서류
          </p>
          <p className={`mt-1 text-[10px] leading-relaxed ${isDarkMode ? "text-gray-400" : "text-slate-600"}`}>
            직책과 부서는 서류 확인 후 승인됩니다. 수정 시 <b>최근 1개월 이내 재발급</b> 서류로 다시 제출해 주세요.
            (재직증명서, 4대보험 가입명부 등)
          </p>
          {approvalStatus === TITLE_DEPT_APPROVAL.PENDING ? (
            <p className={`mt-1.5 text-[10px] font-bold ${statusCls}`}>검토 중 — 승인 전까지 기존 직책·부서가 표시됩니다.</p>
          ) : approvalStatus === TITLE_DEPT_APPROVAL.APPROVED ? (
            <p className={`mt-1.5 text-[10px] font-bold ${statusCls}`}>승인 완료된 직책·부서가 수신 명함에 반영됩니다.</p>
          ) : needsSubmit ? (
            <p className={`mt-1.5 text-[10px] font-bold ${isDarkMode ? "text-amber-300" : "text-amber-800"}`}>
              직책·부서 변경 신청 시 서류 첨부 후 「신청하기」를 눌러 주세요.
            </p>
          ) : null}
        </div>
      </div>

      <Field label="서류 종류" isDarkMode={isDarkMode}>
        <select
          value={verifyDocKind}
          onChange={(e) => setVerifyDocKind(e.target.value)}
          className={inputBase}
        >
          <option value="">선택</option>
          {LETTERING_VERIFY_DOC_KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="서류 발급일" hint={`발급일 기준 ${LETTERING_VERIFY_DOC_MAX_AGE_DAYS}일 이내 서류만 유효`} isDarkMode={isDarkMode}>
        <input
          type="date"
          value={verifyDocIssuedAt}
          onChange={(e) => setVerifyDocIssuedAt(e.target.value)}
          className={inputBase}
        />
        {verifyDocIssuedAt && issuedOk === false ? (
          <p className="mt-1 text-[10px] font-bold text-red-500">
            발급일이 1개월을 초과했습니다. 재발급 서류를 첨부해 주세요.
          </p>
        ) : null}
      </Field>

      <Field label="서류 사본 첨부" hint={LETTERING_VERIFY_DOC_ACCEPT_LABEL} isDarkMode={isDarkMode}>
        <div className="mt-1.5 space-y-2">
          <button
            type="button"
            onClick={openPicker}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold ${
              isDarkMode ? "bg-blue-600 text-white" : "bg-slate-900 text-white"
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            서류 첨부
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={LETTERING_VERIFY_DOC_ACCEPT}
            onChange={(e) => {
              onDocPick(e);
              restoreScroll();
            }}
            className="lbq-hidden-file-input"
            tabIndex={-1}
            aria-hidden
          />
          {verifyDocName ? (
            <p className={`text-[10px] font-semibold ${isDarkMode ? "text-gray-400" : "text-slate-600"}`}>
              첨부됨: {verifyDocName}
            </p>
          ) : null}
          {docError ? <p className="text-[10px] font-bold text-red-500">{docError}</p> : null}
        </div>
      </Field>
    </div>
  );
}
