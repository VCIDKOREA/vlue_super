import { useCallback, useEffect, useState } from "react";
import {
  activateB2bCart,
  addB2bCartLine,
  fetchB2bEnterpriseMe,
  patchB2bCartLine,
  removeB2bCartLine,
  saveB2bEnterpriseSetup,
  submitB2bEnrollment,
  fetchB2bEnrollmentStatus
} from "../lib/b2bEnterpriseApi.js";
import { logB2bPipeline } from "../lib/b2bPipelineLog.js";
import B2BEnrollmentDocumentsSection, {
  B2B_REQUIRED_DOCS
} from "./B2BEnrollmentDocumentsSection.jsx";
import EnterpriseBrandingEditor from "./EnterpriseBrandingEditor.jsx";
import { ENTERPRISE_LINE_ROLES, ENTERPRISE_ROLE_LABELS } from "../lib/enterpriseRoles.js";

const CARRIERS = [
  { id: "LGUPLUS", label: "LG U+" },
  { id: "KT", label: "KT" }
];

const PANEL_TABS = [
  { id: "enroll", label: "기업 가입 신청" },
  { id: "branding", label: "CI/BI 브랜딩" }
];

function formatKrw(n) {
  return `${Number(n || 0).toLocaleString("ko-KR")}원`;
}

function docUploadCount(enrollment) {
  if (!enrollment?.uploadedDocuments) return 0;
  return B2B_REQUIRED_DOCS.filter((d) =>
    enrollment.uploadedDocuments.some((u) => u.kind === d.kind)
  ).length;
}

/**
 * B2B 기업 가입 — 회선 등록 + 증빙 서류 + 원클릭 제출 (통합 화면)
 */
export default function B2BLineCartPanel({ onToast, onActivated }) {
  const [panelTab, setPanelTab] = useState("enroll");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [docBusyKind, setDocBusyKind] = useState("");
  const [enterprise, setEnterprise] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [enrollment, setEnrollment] = useState(null);

  const [companyName, setCompanyName] = useState("");
  const [masterDisplay, setMasterDisplay] = useState("1588-0000");
  const [carrier, setCarrier] = useState("LGUPLUS");
  const [billingCycle, setBillingCycle] = useState("monthly");

  const [lineKind, setLineKind] = useState("extension");
  const [realCliPhone, setRealCliPhone] = useState("");
  const [assigneeName, setAssigneeName] = useState("");
  const [assigneeTitle, setAssigneeTitle] = useState("");
  const [enterpriseRole, setEnterpriseRole] = useState("STAFF");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [data, enr] = await Promise.all([
        fetchB2bEnterpriseMe(),
        fetchB2bEnrollmentStatus().catch(() => ({ enrollment: null }))
      ]);
      const ent = data.enterprise;
      setEnterprise(ent);
      setInvoice(data.invoice || null);
      setEnrollment(enr.enrollment);
      if (ent) {
        setCompanyName(ent.companyName || "");
        setMasterDisplay(ent.masterDisplayNumber || "1588-0000");
        setCarrier(ent.carrier || "LGUPLUS");
        setBillingCycle(ent.billingCycle || "monthly");
      }
    } catch (e) {
      onToast?.(e?.message || "B2B 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const lines = enterprise?.cartLines || [];
  const lineCount = invoice?.lineCount ?? lines.length;
  const canCheckout = lineCount >= 10;
  const docsComplete = enrollment?.documentsComplete ?? docUploadCount(enrollment) >= 3;
  const isPendingVerification =
    enrollment?.statusLabel === "PENDING_DOC_VERIFICATION" ||
    enterprise?.status === "pending_doc_verification";
  const canSubmitNow =
    canCheckout && docsComplete && !isPendingVerification && enterprise?.status === "draft";

  const addLine = async () => {
    if (!assigneeName.trim() || !realCliPhone.trim()) {
      onToast?.("실제 발신 번호와 담당자 성명을 입력해 주세요.");
      return;
    }
    setBusy(true);
    try {
      await saveB2bEnterpriseSetup({
        companyName,
        masterDisplayNumber: masterDisplay,
        carrier,
        billingCycle
      });
      const data = await addB2bCartLine({
        lineKind,
        realCliPhone,
        assigneeName,
        assigneeTitle,
        enterpriseRole,
        memberPhone: lineKind === "mobile" ? realCliPhone : undefined
      });
      setInvoice(data.invoice);
      setRealCliPhone("");
      setAssigneeName("");
      setAssigneeTitle("");
      setEnterpriseRole("STAFF");
      await refresh();
      onToast?.("회선이 등록되었습니다.");
    } catch (e) {
      onToast?.(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const removeLine = async (lineId) => {
    setBusy(true);
    try {
      const data = await removeB2bCartLine(lineId);
      setInvoice(data.invoice);
      await refresh();
    } catch (e) {
      onToast?.(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  /** 마스터 정보 저장 + 증빙 확인 + 본사 승인 대기 제출 (원클릭) */
  const submitEnrollment = async () => {
    if (!canCheckout) {
      onToast?.("회선을 10명 이상 등록해 주세요.");
      return;
    }
    if (!docsComplete) {
      onToast?.("재직증명서·위축계약서·사업자등록증 3종을 모두 첨부해 주세요.");
      return;
    }
    setBusy(true);
    try {
      await saveB2bEnterpriseSetup({
        companyName,
        masterDisplayNumber: masterDisplay,
        carrier,
        billingCycle
      });
      const result = await submitB2bEnrollment();
      logB2bPipeline("enrollment.submitted", { enterpriseId: result.enterpriseId });
      onToast?.(result.message || "가입 신청이 접수되었습니다. 본사 승인을 기다려 주세요.");
      await refresh();
    } catch (e) {
      logB2bPipeline("enrollment.submit_failed", { error: e?.message });
      onToast?.(e?.payload?.error || e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const changeLineRole = async (lineId, role) => {
    setBusy(true);
    try {
      await patchB2bCartLine(lineId, { enterpriseRole: role });
      await refresh();
      onToast?.("역할이 변경되었습니다.");
    } catch (e) {
      onToast?.(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const tryActivate = async () => {
    setBusy(true);
    try {
      const data = await activateB2bCart();
      logB2bPipeline("cart.activated", { cardsCreated: data.cardsCreated });
      onToast?.(`회선 개통(목업) · 명함 ${data.cardsCreated}건 생성`);
      if (data.credentials?.length) {
        onToast?.(`직원 로그인 ${data.credentials.length}건 — 마이페이지에서 ID/PW를 확인하세요.`);
      }
      onActivated?.(data);
      await refresh();
    } catch (e) {
      onToast?.(e?.payload?.error || e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="py-8 text-center text-[12px] text-slate-500">불러오는 중…</p>;
  }

  return (
    <div className="box-border min-w-0 max-w-full space-y-4 overflow-x-hidden">
      <div className="flex max-w-full flex-wrap gap-2">
        {PANEL_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setPanelTab(t.id)}
            className={`max-w-full rounded-full px-3 py-1.5 text-[10px] font-black ${
              panelTab === t.id ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {panelTab === "branding" ? (
        <EnterpriseBrandingEditor
          onToast={onToast}
          companyName={companyName}
          onSaved={() => refresh()}
        />
      ) : (
        <>
          {isPendingVerification ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-[11px] font-bold text-amber-950">
              <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500 align-middle" />
              본사 승인 대기 중 — 승인 후 아래에서 회선 개통을 진행할 수 있습니다.
            </div>
          ) : null}

          <div className="box-border max-w-full rounded-xl border border-indigo-100 bg-indigo-50/80 p-3 text-[11px] leading-relaxed break-words text-indigo-950">
            <p className="font-black">B2B 단체 회선 가입</p>
            <p className="mt-1 break-words">
              회선 {lineCount}/10 · 서류 {docUploadCount(enrollment)}/3 · 아래 한 번에 제출
            </p>
            <p className="mt-1 break-words text-[10px] leading-snug">
              {invoice?.hasReferral
                ? `전 회선 ${billingCycle === "annual" ? "연 147,000원" : "월 14,700원"} · 연동비 0원`
                : `대표 ${billingCycle === "annual" ? "연 283,000원" : "월 28,300원"} · 하부 ${billingCycle === "annual" ? "연 147,000원" : "월 14,700원"}/회선 · 연동비 0원`}
            </p>
            <p className="mt-2 break-words text-[10px] font-semibold leading-snug text-indigo-900/90">
              개인 30% 할인(19,800원) 이용 중 전환 시, 기업 할인은 등록·승인 완료 후 <b>익월</b> 결제부터 적용됩니다.
            </p>
          </div>

          {/* ① 기업 정보 */}
          <section className="box-border min-w-0 max-w-full rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[12px] font-black text-slate-900">① 기업·마스터 정보</p>
            <label className="mt-2 block text-[10px] font-bold text-slate-500">
              상호
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-[13px]"
              />
            </label>
            <label className="mt-2 block text-[10px] font-bold text-slate-500">
              마스터 대표번호 (고객 화면 표시)
              <input
                value={masterDisplay}
                onChange={(e) => setMasterDisplay(e.target.value)}
                placeholder="1588-0000"
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-[13px]"
              />
            </label>
            <label className="mt-2 block text-[10px] font-bold text-slate-500">
              통신사
              <select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-[13px] font-bold"
              >
                {CARRIERS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`flex-1 rounded-lg py-2 text-[11px] font-black ${
                  billingCycle === "monthly" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                월간권
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("annual")}
                className={`flex-1 rounded-lg py-2 text-[11px] font-black ${
                  billingCycle === "annual" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                연간권
              </button>
            </div>
          </section>

          {/* ② 회선 등록 */}
          <section className="box-border min-w-0 max-w-full rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
            <p className="text-[12px] font-black text-emerald-950">
              ② 임직원 회선 등록 ({lineCount}명)
            </p>
            <p className="mt-1 text-[10px] text-emerald-900/80">
              유선은 지역번호 포함(02·031 등), 휴대는 010 번호를 등록합니다. <b>경리·대리인</b>은 각 1명만
              지정할 수 있습니다.
            </p>
            <select
              value={enterpriseRole}
              onChange={(e) => setEnterpriseRole(e.target.value)}
              className="mt-2 w-full rounded-lg border border-indigo-200 bg-indigo-50/50 px-2 py-2 text-[11px] font-bold text-indigo-950"
            >
              {ENTERPRISE_LINE_ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label} — {r.hint}
                </option>
              ))}
            </select>
            <select
              value={lineKind}
              onChange={(e) => setLineKind(e.target.value)}
              className="mt-2 w-full rounded-lg border border-emerald-200 bg-white px-2 py-2 text-[12px] font-bold"
            >
              <option value="extension">유선 (지역번호)</option>
              <option value="mobile">업무용 휴대 (010)</option>
            </select>
            <input
              value={realCliPhone}
              onChange={(e) => setRealCliPhone(e.target.value)}
              placeholder={lineKind === "mobile" ? "010-0000-0000" : "02-1234-5678"}
              className="mt-2 w-full rounded-lg border border-emerald-200 px-2 py-2 text-[13px]"
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                value={assigneeName}
                onChange={(e) => setAssigneeName(e.target.value)}
                placeholder="성명"
                className="rounded-lg border border-emerald-200 px-2 py-2 text-[13px]"
              />
              <input
                value={assigneeTitle}
                onChange={(e) => setAssigneeTitle(e.target.value)}
                placeholder="직급"
                className="rounded-lg border border-emerald-200 px-2 py-2 text-[13px]"
              />
            </div>
            {lineKind === "mobile" ? (
              <p className="mt-1 text-[10px] text-amber-800">
                010 등록 시 VLUE·VLUER 회원은 자동으로 귀속 검증이 시작됩니다.
              </p>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={addLine}
              className="mt-2 w-full rounded-lg bg-emerald-700 py-2.5 text-[12px] font-black text-white disabled:opacity-50"
            >
              회선 추가
            </button>

            {lines.length > 0 ? (
              <ul className="mt-3 max-h-40 space-y-1.5 overflow-y-auto">
                {lines.map((line) => (
                  <li
                    key={line.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px]"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-black text-blue-700">
                        {line.lineKind === "mobile" ? "휴대" : "유선"}
                      </span>{" "}
                      {line.assigneeName}
                      <span className="text-slate-500"> · {line.realCliPhoneE164}</span>
                      <select
                        value={line.enterpriseRole || "STAFF"}
                        disabled={busy}
                        onChange={(e) => changeLineRole(line.id, e.target.value)}
                        className="mt-1 block w-full rounded border border-indigo-100 bg-indigo-50/40 px-1 py-0.5 text-[9px] font-bold"
                      >
                        {ENTERPRISE_LINE_ROLES.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => removeLine(line.id)}
                      className="shrink-0 text-[10px] font-bold text-red-600"
                    >
                      삭제
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          {/* 요금 요약 */}
          <section
            className={`rounded-xl border p-3 text-[11px] ${
              canCheckout ? "border-blue-100 bg-blue-50/60" : "border-amber-200 bg-amber-50"
            }`}
          >
            <p className="font-black text-slate-900">예상 이용 요금</p>
            <p className="mt-1 text-slate-600">
              {invoice?.hasReferral ? (
                <>
                  직원 {lineCount}회선 + 대표 1 · 전 회선 {formatKrw(invoice?.unitPriceKrw)} ={" "}
                  <span className="font-black text-slate-900">{formatKrw(invoice?.totalKrw)}</span>
                </>
              ) : (
                <>
                  대표 {formatKrw(invoice?.masterUnitPriceKrw)} + 직원 {lineCount}×
                  {formatKrw(invoice?.subordinateUnitPriceKrw)} ={" "}
                  <span className="font-black text-slate-900">{formatKrw(invoice?.totalKrw)}</span>
                </>
              )}
            </p>
            {invoice?.pricingNote ? (
              <p className="mt-1 text-[10px] font-semibold text-slate-500">{invoice.pricingNote}</p>
            ) : null}
            {!canCheckout ? (
              <p className="mt-1 font-bold text-amber-900">10회선 이상 등록 후 제출할 수 있습니다.</p>
            ) : null}
          </section>

          {/* ③ 증빙 서류 */}
          <B2BEnrollmentDocumentsSection
            enrollment={enrollment}
            onEnrollmentUpdate={setEnrollment}
            onToast={onToast}
            busyKind={docBusyKind}
            setBusyKind={setDocBusyKind}
          />

          {/* 체크리스트 + 원클릭 제출 */}
          <section className="box-border min-w-0 max-w-full space-y-2 rounded-xl border-2 border-indigo-200 bg-white p-3">
            <p className="text-[12px] font-black text-indigo-900">제출 전 확인</p>
            <ul className="space-y-1 text-[11px] text-slate-700">
              <li>{companyName.trim() ? "✓" : "○"} 기업·마스터 정보 입력</li>
              <li>
                {canCheckout ? "✓" : "○"} 회선 10명 이상 ({lineCount}명)
              </li>
              <li>
                {docsComplete ? "✓" : "○"} 증빙 서류 3종 ({docUploadCount(enrollment)}/3)
              </li>
            </ul>

            <button
              type="button"
              disabled={busy || !canSubmitNow}
              onClick={submitEnrollment}
              className="w-full rounded-xl bg-indigo-700 py-3.5 text-[14px] font-black text-white shadow-md disabled:opacity-40"
            >
              {busy ? "처리 중…" : "기업 가입 신청 제출"}
            </button>
            {!canSubmitNow && !isPendingVerification ? (
              <p className="text-center text-[10px] text-slate-500">
                위 항목을 모두 완료하면 제출할 수 있습니다.
              </p>
            ) : null}
          </section>

          {isPendingVerification ? (
            <button
              type="button"
              disabled={busy}
              onClick={tryActivate}
              className="w-full rounded-xl border border-blue-300 bg-blue-50 py-3 text-[12px] font-black text-blue-800 disabled:opacity-40"
            >
              본사 승인 완료 후 — 회선 개통(목업)
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
