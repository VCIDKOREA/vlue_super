import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchMyEnterpriseDccApplication,
  requestEnterpriseDccOwnerApproval,
  saveEnterpriseDccDetails,
  sendEnterpriseDccOtp,
  submitEnterpriseDccApplication,
  uploadEnterpriseDccDocuments,
  verifyEnterpriseDccBusiness,
  verifyEnterpriseDccOtp
} from "../lib/enterpriseDccApi.js";
import { sendAuthCode, verifyAuthCode, EMAIL_AUTH_SUPPORT } from "../lib/emailAuthApi.js";
import { writeLetteringBizcardEditable } from "../lib/letteringBizcardStorage.js";
import { DIGITAL_CARD_ACTIVE_KEY } from "../lib/bizcardAccountSync.js";
import DccSecurityLocationGate from "./DccSecurityLocationGate.jsx";
import { VLUE_SSE_APP_EVENT } from "../lib/vlueSse.js";

const STEPS = [
  { id: "start", label: "신청 시작" },
  { id: "biz", label: "사업자 인증" },
  { id: "party", label: "직장 선택" },
  { id: "docs", label: "서류 제출" },
  { id: "owner_wait", label: "대표 승인" },
  { id: "details", label: "상세 입력" },
  { id: "security", label: "위치·보안" },
  { id: "pending", label: "승인 대기" },
  { id: "payment", label: "발급·결제" }
];

const SME_DOC_SLOTS = [
  { kind: "employment_certificate", label: "재직증명서" },
  { kind: "insurance_enrollment", label: "4대보험 가입자 가입내역 확인서" },
  { kind: "tax_clearance", label: "납세증명서" }
];

function maskLegalName(name) {
  const n = String(name || "").trim();
  if (n.length <= 1) return "*";
  if (n.length === 2) return `${n[0]}*`;
  return `${n[0]}*${n.slice(-1)}`;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsDataURL(file);
  });
}

function statusToStep(status, isFirstRegistrant) {
  switch (status) {
    case "draft":
      return "start";
    case "biz_verified":
      return isFirstRegistrant ? "docs" : "party";
    case "awaiting_related_otp":
      return "otp";
    case "awaiting_owner_approval":
      return "owner_wait";
    case "docs_submitted":
    case "related_verified":
      return "details";
    case "details_ready":
    case "awaiting_security_gate":
      return "security";
    case "security_verified":
      return "security";
    case "pending_approval":
      return "pending";
    case "approved":
    case "paid":
      return "payment";
    case "rejected":
      return "start";
    default:
      return "start";
  }
}

/**
 * 기업/대표번호 디지털 인증명함 발급 — 7단계 위자드
 */
export default function EnterpriseDccApplyWizard({
  isDarkMode = false,
  onBack,
  onRequestPayment,
  onToast
}) {
  const [step, setStep] = useState("start");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [application, setApplication] = useState(null);
  const [parties, setParties] = useState([]);
  const [isFirstRegistrant, setIsFirstRegistrant] = useState(false);
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [devOtp, setDevOtp] = useState("");

  const [bizNo, setBizNo] = useState("");
  const [repName, setRepName] = useState("");
  const [openDate, setOpenDate] = useState("");
  const [proposedCompanyName, setProposedCompanyName] = useState("");
  const [companyLocked, setCompanyLocked] = useState("");

  const [otp, setOtp] = useState("");
  const [department, setDepartment] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactEmailOtp, setContactEmailOtp] = useState("");
  const [contactEmailHint, setContactEmailHint] = useState("");
  const [contactEmailToken, setContactEmailToken] = useState("");
  const [dccPhone, setDccPhone] = useState("");
  const [manageLoginId, setManageLoginId] = useState("");
  const [managePassword, setManagePassword] = useState("");
  const [managePassword2, setManagePassword2] = useState("");
  const [ownerConfirmOpen, setOwnerConfirmOpen] = useState(false);
  const [docFiles, setDocFiles] = useState({});
  const [workplaceAddress, setWorkplaceAddress] = useState("");
  const [docBusyKind, setDocBusyKind] = useState("");

  const panelCls = isDarkMode ? "bg-[#0f172a] text-slate-100" : "bg-white text-slate-900";
  const inputCls = isDarkMode
    ? "w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-[13px]"
    : "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px]";
  const muted = isDarkMode ? "text-slate-400" : "text-slate-500";

  const stepIndex = useMemo(() => Math.max(0, STEPS.findIndex((s) => s.id === step)), [step]);

  const hydrate = useCallback(async () => {
    try {
      const data = await fetchMyEnterpriseDccApplication();
      const app = data.application;
      if (!app) return;
      setApplication(app);
      setCompanyLocked(app.companyNameLocked || "");
      setDepartment(app.department || "");
      setContactName(app.contactName || "");
      setContactEmail(app.dccContactEmail || "");
      setDccPhone(app.dccOutboundPhone || "");
      setBizNo(app.businessRegistrationNo || "");
      setWorkplaceAddress(app.workplaceAddress || "");
      let first = false;
      if (app.businessRegistrationNo) {
        try {
          const { fetchEnterpriseRelatedParties } = await import("../lib/enterpriseDccApi.js");
          const rel = await fetchEnterpriseRelatedParties(app.businessRegistrationNo);
          setParties(rel.parties || []);
          first = !(rel.parties || []).length;
          setIsFirstRegistrant(first);
          if (rel.lockedCompanyName) setCompanyLocked(rel.lockedCompanyName);
        } catch {
          /* ignore */
        }
      }
      setStep(statusToStep(app.status, first));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const onSse = (ev) => {
      const t = ev?.detail?.type;
      if (t === "vlue-dcc-owner-approved" || t === "vlue-dcc-owner-rejected") {
        void hydrate();
        if (t === "vlue-dcc-owner-approved") {
          onToast?.("대표자가 승인했습니다. 상세 입력·위치 인증을 진행해 주세요.");
        } else {
          onToast?.("대표자가 인증 요청을 거절했습니다.");
        }
      }
    };
    window.addEventListener(VLUE_SSE_APP_EVENT, onSse);
    return () => window.removeEventListener(VLUE_SSE_APP_EVENT, onSse);
  }, [hydrate, onToast]);

  const toast = (msg) => {
    onToast?.(msg);
  };

  const runVerifyBiz = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await verifyEnterpriseDccBusiness({
        businessRegistrationNo: bizNo,
        representativeName: repName,
        openDate,
        proposedCompanyName: proposedCompanyName || undefined
      });
      setApplication(res.application);
      setParties(res.relatedParties || []);
      setIsFirstRegistrant(Boolean(res.isFirstRegistrant));
      setCompanyLocked(res.companyNameLocked || res.application?.companyNameLocked || "");
      if (res.nextStep === "details") {
        setStep("docs");
      } else {
        setStep("party");
      }
      toast("사업자번호 인증이 완료되었습니다.");
    } catch (e) {
      setError(e?.message || "사업자 인증 실패");
    } finally {
      setBusy(false);
    }
  };

  const selectedParty = useMemo(
    () => parties.find((p) => p.userId === selectedPartyId) || null,
    [parties, selectedPartyId]
  );

  const openOwnerConfirm = () => {
    if (!application?.id || !selectedPartyId) {
      setError("등록된 직장을 선택해 주세요. 임의 상호 입력은 불가합니다.");
      return;
    }
    setError("");
    setOwnerConfirmOpen(true);
  };

  const runRequestOwnerApproval = async () => {
    if (!application?.id || !selectedPartyId) return;
    setBusy(true);
    setError("");
    try {
      const res = await requestEnterpriseDccOwnerApproval(application.id, {
        relatedPartyUserId: selectedPartyId,
        department: department || undefined,
        contactName: contactName || undefined,
        confirmAcknowledged: true
      });
      setApplication(res.application);
      setOwnerConfirmOpen(false);
      setStep("owner_wait");
      toast("대표자에게 인증 알림을 전송했습니다.");
    } catch (e) {
      setError(e?.message || "대표자 인증 요청 실패");
    } finally {
      setBusy(false);
    }
  };

  const runSendOtp = async () => {
    if (!application?.id || !selectedPartyId) {
      setError("관계자를 선택해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await sendEnterpriseDccOtp(application.id, selectedPartyId);
      setDevOtp(res.devOtp || "");
      setStep("otp");
      const emailHint = res.sentTo?.emailMasked ? ` (${res.sentTo.emailMasked})` : "";
      toast(`${res.sentTo?.legalName || "관계자"} 등록 이메일${emailHint}로 인증번호를 발송했습니다.`);
    } catch (e) {
      setError(e?.message || "인증번호 발송 실패");
    } finally {
      setBusy(false);
    }
  };

  const runVerifyOtp = async () => {
    if (!application?.id) return;
    setBusy(true);
    setError("");
    try {
      const res = await verifyEnterpriseDccOtp(application.id, otp);
      setApplication(res.application);
      setStep("details");
      toast("관계자 인증이 완료되었습니다.");
    } catch (e) {
      setError(e?.message || "인증 실패");
    } finally {
      setBusy(false);
    }
  };

  const runSubmitDocs = async () => {
    if (!application?.id) return;
    const missing = SME_DOC_SLOTS.filter((s) => !docFiles[s.kind]?.url);
    if (missing.length) {
      setError(`${missing.map((m) => m.label).join("·")}를 모두 업로드해 주세요.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await uploadEnterpriseDccDocuments(application.id, {
        documents: SME_DOC_SLOTS.map((s) => ({
          kind: s.kind,
          url: docFiles[s.kind].url,
          fileName: docFiles[s.kind].fileName
        })),
        workplaceAddress: workplaceAddress.trim() || undefined
      });
      setApplication(res.application);
      setStep("details");
      toast("증빙 서류가 접수되었습니다.");
    } catch (e) {
      setError(e?.message || "서류 제출 실패");
    } finally {
      setBusy(false);
    }
  };

  const onPickDoc = async (kind, file) => {
    if (!file) return;
    setDocBusyKind(kind);
    setError("");
    try {
      const url = await fileToDataUrl(file);
      setDocFiles((prev) => ({
        ...prev,
        [kind]: { url, fileName: file.name || `${kind}.pdf` }
      }));
    } catch (e) {
      setError(e?.message || "파일 읽기 실패");
    } finally {
      setDocBusyKind("");
    }
  };

  const runSendContactEmailOtp = async () => {
    const email = contactEmail.trim();
    if (!email) {
      setError("담당 이메일을 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await sendAuthCode({ purpose: "dcc_email", email }, { auth: true });
      setContactEmailToken("");
      setContactEmailHint(
        data.devCode
          ? `개발 모드 인증번호: ${data.devCode}`
          : `${data.maskedEmail || email} 로 인증번호를 보냈습니다.`
      );
    } catch (e) {
      setError(e?.message || "이메일 인증번호 발송 실패");
    } finally {
      setBusy(false);
    }
  };

  const runVerifyContactEmailOtp = async () => {
    const email = contactEmail.trim();
    const code = contactEmailOtp.trim();
    if (!email || code.length !== 6) {
      setError("이메일과 인증번호 6자리를 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await verifyAuthCode({ purpose: "dcc_email", email, code }, { auth: true });
      setContactEmailToken(data.token || "");
      setContactEmailHint("이메일 인증이 완료되었습니다.");
    } catch (e) {
      setError(e?.message || "이메일 인증 실패");
    } finally {
      setBusy(false);
    }
  };

  const runSaveDetails = async () => {
    if (!application?.id) return;
    if (!contactEmail.trim()) {
      setError("DCC 담당 이메일을 입력하고 인증해 주세요.");
      return;
    }
    if (!contactEmailToken) {
      setError("담당 이메일 인증을 완료해 주세요.");
      return;
    }
    if (!manageLoginId.trim()) {
      setError("이 번호를 관리할 아이디를 입력해 주세요.");
      return;
    }
    if (managePassword !== managePassword2) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await saveEnterpriseDccDetails(application.id, {
        department,
        contactName,
        contactEmail: contactEmail.trim(),
        emailVerifyToken: contactEmailToken,
        dccOutboundPhone: dccPhone,
        manageLoginId,
        managePassword
      });
      setApplication(res.application);
      setStep("security");
      toast("상세 정보가 저장되었습니다. 위치·보안 인증을 진행해 주세요.");
    } catch (e) {
      setError(e?.message || "저장 실패");
    } finally {
      setBusy(false);
    }
  };

  const runAfterSecurityPassed = async (attestRes) => {
    if (attestRes?.application) setApplication(attestRes.application);
    if (!application?.id) return;
    setBusy(true);
    setError("");
    try {
      const res = await submitEnterpriseDccApplication(application.id);
      setApplication(res.application || { ...application, status: "pending_approval" });
      setStep("pending");
      toast("승인 요청이 접수되었습니다.");
    } catch (e) {
      setError(e?.message || "제출 실패");
    } finally {
      setBusy(false);
    }
  };

  const goPayment = () => {
    try {
      writeLetteringBizcardEditable({
        organization: companyLocked,
        department,
        title: department,
        name: contactName,
        phone: dccPhone
      });
      localStorage.setItem("vlue_company_locked", "1");
      localStorage.setItem("vlue_company_name", companyLocked);
    } catch {
      /* ignore */
    }
    onRequestPayment?.({
      applicationId: application?.id,
      companyName: companyLocked,
      department,
      contactName,
      dccOutboundPhone: dccPhone
    });
  };

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${panelCls}`}>
      <header
        className={`flex shrink-0 items-center gap-2 border-b px-3 py-2.5 ${
          isDarkMode ? "border-white/10" : "border-slate-100"
        }`}
      >
        <button
          type="button"
          onClick={onBack}
          className={`rounded-lg px-2 py-1 text-[12px] font-bold ${isDarkMode ? "bg-white/10" : "bg-slate-100"}`}
        >
          ←
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-black">기업·대표번호 인증명함</p>
          <p className={`text-[10px] ${muted}`}>사업자 검증 → 대표 승인/서류 → 위치·보안 → 승인 → 발급</p>
        </div>
      </header>

      <div className="flex gap-1 overflow-x-auto px-3 py-2">
        {STEPS.map((s, i) => (
          <span
            key={s.id}
            className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${
              i === stepIndex
                ? "bg-blue-600 text-white"
                : i < stepIndex
                  ? isDarkMode
                    ? "bg-blue-500/20 text-blue-200"
                    : "bg-blue-50 text-blue-700"
                  : isDarkMode
                    ? "bg-white/5 text-slate-500"
                    : "bg-slate-100 text-slate-400"
            }`}
          >
            {i + 1}. {s.label}
          </span>
        ))}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {error ? (
          <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-[12px] font-semibold text-rose-600">{error}</p>
        ) : null}

        {step === "start" ? (
          <section className="space-y-3">
            <p className={`text-[13px] leading-relaxed ${muted}`}>
              기업·대표번호(유선) 디지털 인증명함은 사업자번호 공식 검증과, 이미 등록된 관계자 인증을 거쳐
              발급됩니다. 상호는 대표자가 등록한 명칭으로 고정됩니다.
            </p>
            <ol className={`list-decimal space-y-1 pl-4 text-[12px] ${muted}`}>
              <li>사업자번호 공식 검증 (드롭다운 직장만 선택)</li>
              <li>대표자 승인 또는 중소기업 증빙 서류</li>
              <li>사업장 위치·모바일 데이터·VPN/원격 차단 검증</li>
              <li>관리자 승인 후 발급·결제</li>
            </ol>
            <button
              type="button"
              onClick={() => setStep("biz")}
              className="w-full rounded-xl bg-blue-600 py-3 text-[13px] font-black text-white"
            >
              신청하기 시작
            </button>
          </section>
        ) : null}

        {step === "biz" ? (
          <section className="space-y-2">
            <label className="block text-[11px] font-bold">
              사업자등록번호
              <input
                className={`${inputCls} mt-1`}
                value={bizNo}
                onChange={(e) => setBizNo(e.target.value)}
                placeholder="000-00-00000"
                inputMode="numeric"
              />
            </label>
            <label className="block text-[11px] font-bold">
              대표자 성명 (사업자등록 기준)
              <input
                className={`${inputCls} mt-1`}
                value={repName}
                onChange={(e) => setRepName(e.target.value)}
                placeholder="홍길동"
              />
            </label>
            <label className="block text-[11px] font-bold">
              개업연월일 (YYYYMMDD)
              <input
                className={`${inputCls} mt-1`}
                value={openDate}
                onChange={(e) => setOpenDate(e.target.value)}
                placeholder="20200101"
                inputMode="numeric"
              />
            </label>
            <label className="block text-[11px] font-bold">
              상호(회사명) — 최초 사업자만 입력
              <input
                className={`${inputCls} mt-1`}
                value={proposedCompanyName}
                onChange={(e) => setProposedCompanyName(e.target.value)}
                placeholder="이미 등록된 사업자면 자동 고정됩니다"
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runVerifyBiz()}
              className="w-full rounded-xl bg-blue-600 py-3 text-[13px] font-black text-white disabled:opacity-50"
            >
              {busy ? "검증 중…" : "사업자번호 인증"}
            </button>
          </section>
        ) : null}

        {step === "party" ? (
          <section className="space-y-2">
            <p className={`text-[12px] ${muted}`}>
              상호 <strong className="text-blue-600">{companyLocked}</strong> 의 등록된 직장(관계자)만 선택할 수
              있습니다. 임의 상호 입력은 불가하며, 선택 시 대표자에게 인증 알림이 전송됩니다.
            </p>
            {!parties.length ? (
              <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-[12px] text-amber-700">
                등록된 관계자가 없습니다. 이전 단계에서 중소기업 서류 제출 경로로 진행하세요.
              </p>
            ) : (
              <ul className="space-y-2">
                {parties.map((p) => (
                  <li key={p.userId}>
                    <button
                      type="button"
                      onClick={() => setSelectedPartyId(p.userId)}
                      className={`w-full rounded-xl border px-3 py-2 text-left text-[12px] ${
                        selectedPartyId === p.userId
                          ? "border-blue-500 bg-blue-50 text-blue-900"
                          : isDarkMode
                            ? "border-white/10"
                            : "border-slate-200"
                      }`}
                    >
                      <span className="font-black">{p.legalName}</span>
                      {p.jobTitle ? <span className={`ml-2 ${muted}`}>{p.jobTitle}</span> : null}
                      <span className={`mt-0.5 block text-[10px] ${muted}`}>
                        @{p.publicHandle || "—"} · {p.phoneMasked || "번호 비공개"}
                        {p.emailMasked ? ` · ${p.emailMasked}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              disabled={busy || !selectedPartyId}
              onClick={openOwnerConfirm}
              className="w-full rounded-xl bg-blue-600 py-3 text-[13px] font-black text-white disabled:opacity-50"
            >
              대표자 인증 요청
            </button>
            {ownerConfirmOpen ? (
              <div
                className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
                role="dialog"
                aria-modal="true"
              >
                <div
                  className={`w-full max-w-sm space-y-3 rounded-2xl p-4 shadow-xl ${
                    isDarkMode ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"
                  }`}
                >
                  <p className="text-[14px] font-black">대표자 인증 알림</p>
                  <p className={`text-[12px] leading-relaxed ${muted}`}>
                    선택하신 업체 대표자(예: 대표자 {maskLegalName(selectedParty?.legalName)})에게 인증 알림을
                    전송합니다. 진행하시겠습니까?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void runRequestOwnerApproval()}
                      className="flex-1 rounded-xl bg-blue-600 py-2.5 text-[12px] font-black text-white disabled:opacity-50"
                    >
                      {busy ? "전송 중…" : "진행"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setOwnerConfirmOpen(false)}
                      className={`flex-1 rounded-xl py-2.5 text-[12px] font-bold ${
                        isDarkMode ? "bg-white/10" : "bg-slate-100"
                      }`}
                    >
                      취소
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {step === "docs" ? (
          <section className="space-y-2">
            <p className={`text-[12px] ${muted}`}>
              대표자가 아직 미가입인 중소기업 경로입니다. 사업자등록번호 검증 후 공식 증빙 서류 3종을
              업로드해 주세요.
            </p>
            <label className="block text-[11px] font-bold">
              사업장 주소 (위치 인증용)
              <input
                className={`${inputCls} mt-1`}
                value={workplaceAddress}
                onChange={(e) => setWorkplaceAddress(e.target.value)}
                placeholder="예: 서울특별시 …"
              />
            </label>
            {SME_DOC_SLOTS.map((slot) => {
              const uploaded = docFiles[slot.kind];
              return (
                <div
                  key={slot.kind}
                  className={`rounded-xl border px-3 py-2.5 ${
                    uploaded
                      ? "border-emerald-200 bg-emerald-50/70"
                      : isDarkMode
                        ? "border-white/10"
                        : "border-dashed border-slate-300"
                  }`}
                >
                  <p className="text-[11px] font-black">
                    {uploaded ? "✓ " : ""}
                    {slot.label}
                  </p>
                  <label className="mt-2 flex cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white/80 py-2.5">
                    <span className="text-[10px] font-semibold text-slate-700">
                      {docBusyKind === slot.kind
                        ? "처리 중…"
                        : uploaded
                          ? "파일 교체"
                          : "PDF·이미지 선택"}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      className="sr-only"
                      disabled={Boolean(docBusyKind)}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void onPickDoc(slot.kind, f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              );
            })}
            <button
              type="button"
              disabled={busy}
              onClick={() => void runSubmitDocs()}
              className="w-full rounded-xl bg-blue-600 py-3 text-[13px] font-black text-white disabled:opacity-50"
            >
              {busy ? "제출 중…" : "서류 제출 후 계속"}
            </button>
          </section>
        ) : null}

        {step === "owner_wait" ? (
          <section className="space-y-3 text-center">
            <p className="text-[15px] font-black">대표자 승인 대기</p>
            <p className={`text-[12px] leading-relaxed ${muted}`}>
              선택하신 직장 대표자에게 인증 요청을 보냈습니다. 대표자가 승인하면 상세 입력·위치 인증으로
              이어집니다. 거절·사칭 신고 시 DCC 생성 권한이 영구 차단될 수 있습니다.
            </p>
            <button
              type="button"
              onClick={() => void hydrate()}
              className={`rounded-xl px-4 py-2 text-[12px] font-bold ${isDarkMode ? "bg-white/10" : "bg-slate-100"}`}
            >
              상태 새로고침
            </button>
          </section>
        ) : null}

        {step === "otp" ? (
          <section className="space-y-2">
            <p className={`text-[12px] ${muted}`}>
              선택된 관계자 등록 이메일로 발송된 6자리 인증번호를 입력하세요. 관계자에게 전달받은 번호를
              입력해 주세요.
            </p>
            {devOtp ? (
              <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700">
                개발용 OTP: <strong>{devOtp}</strong>
              </p>
            ) : null}
            <input
              className={inputCls}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6자리"
              inputMode="numeric"
            />
            <button
              type="button"
              disabled={busy || otp.length !== 6}
              onClick={() => void runVerifyOtp()}
              className="w-full rounded-xl bg-blue-600 py-3 text-[13px] font-black text-white disabled:opacity-50"
            >
              {busy ? "확인 중…" : "인증번호 확인"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runSendOtp()}
              className={`w-full rounded-xl py-2 text-[12px] font-bold ${isDarkMode ? "bg-white/10" : "bg-slate-100"}`}
            >
              인증번호 재발송
            </button>
          </section>
        ) : null}

        {step === "details" ? (
          <section className="space-y-2">
            <label className="block text-[11px] font-bold">
              상호 (고정 · 변경 불가)
              <input className={`${inputCls} mt-1 opacity-80`} value={companyLocked} readOnly />
            </label>
            <label className="block text-[11px] font-bold">
              부서 이름
              <input
                className={`${inputCls} mt-1`}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="영업팀"
              />
            </label>
            <label className="block text-[11px] font-bold">
              담당자 이름
              <input
                className={`${inputCls} mt-1`}
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="김담당"
              />
            </label>
            <label className="block text-[11px] font-bold">
              DCC 담당 이메일 (필수 · 인증)
              <input
                className={`${inputCls} mt-1`}
                type="email"
                value={contactEmail}
                onChange={(e) => {
                  setContactEmail(e.target.value);
                  setContactEmailToken("");
                  setContactEmailHint("");
                }}
                placeholder="contact@company.com"
              />
            </label>
            <div className="flex gap-2">
              <input
                className={inputCls}
                value={contactEmailOtp}
                onChange={(e) => setContactEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="인증번호 6자리"
                inputMode="numeric"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void runSendContactEmailOtp()}
                className="shrink-0 rounded-xl bg-blue-600 px-3 py-2.5 text-[12px] font-bold text-white disabled:opacity-50"
              >
                인증번호
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void runVerifyContactEmailOtp()}
                className={`shrink-0 rounded-xl border px-3 py-2.5 text-[12px] font-bold disabled:opacity-50 ${isDarkMode ? "border-white/15" : "border-slate-200"}`}
              >
                확인
              </button>
            </div>
            {contactEmailHint ? <p className={`text-[11px] ${muted}`}>{contactEmailHint}</p> : null}
            <p className={`text-[10px] ${muted}`}>{EMAIL_AUTH_SUPPORT}</p>
            <label className="block text-[11px] font-bold">
              DCC 발신 전화번호
              <input
                className={`${inputCls} mt-1`}
                value={dccPhone}
                onChange={(e) => setDccPhone(e.target.value)}
                placeholder="02-0000-0000"
                inputMode="tel"
              />
            </label>
            <div className={`rounded-xl border px-3 py-2 space-y-2 ${isDarkMode ? "border-white/10" : "border-blue-100 bg-blue-50/40"}`}>
              <p className="text-[11px] font-black text-blue-700">웹 관리 계정 (유선·대표번호용)</p>
              <p className={`text-[10px] ${muted}`}>
                휴대기기 앱 대신 www.vlue.kr 에서 쇼케이스·명함·음원을 꾸밀 아이디와 비밀번호입니다.
              </p>
              <label className="block text-[11px] font-bold">
                관리 아이디
                <input
                  className={`${inputCls} mt-1`}
                  value={manageLoginId}
                  onChange={(e) => setManageLoginId(e.target.value)}
                  placeholder="영문·숫자·밑줄 3~20자"
                  autoComplete="username"
                />
              </label>
              <label className="block text-[11px] font-bold">
                관리 비밀번호
                <input
                  type="password"
                  className={`${inputCls} mt-1`}
                  value={managePassword}
                  onChange={(e) => setManagePassword(e.target.value)}
                  placeholder="대문자·숫자·특수문자 포함 8자+"
                  autoComplete="new-password"
                />
              </label>
              <label className="block text-[11px] font-bold">
                비밀번호 확인
                <input
                  type="password"
                  className={`${inputCls} mt-1`}
                  value={managePassword2}
                  onChange={(e) => setManagePassword2(e.target.value)}
                  autoComplete="new-password"
                />
              </label>
            </div>
            {isFirstRegistrant ? (
              <p className={`text-[11px] ${muted}`}>
                중소기업(대표자 미가입) 경로입니다. 서류 제출 후 상세 입력을 진행 중입니다.
              </p>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => void runSaveDetails()}
              className="w-full rounded-xl bg-blue-600 py-3 text-[13px] font-black text-white disabled:opacity-50"
            >
              {busy ? "저장 중…" : "저장 후 위치·보안 인증"}
            </button>
          </section>
        ) : null}

        {step === "security" ? (
          <section className="space-y-3">
            <DccSecurityLocationGate
              applicationId={application?.id}
              workplaceAddress={workplaceAddress || application?.workplaceAddress || ""}
              isDarkMode={isDarkMode}
              onToast={toast}
              onPassed={(res) => void runAfterSecurityPassed(res)}
            />
            {application?.status === "security_verified" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void runAfterSecurityPassed({ application })}
                className="w-full rounded-xl bg-blue-600 py-3 text-[13px] font-black text-white disabled:opacity-50"
              >
                {busy ? "제출 중…" : "관리자 승인 요청 제출"}
              </button>
            ) : null}
          </section>
        ) : null}

        {step === "pending" ? (
          <section className="space-y-3 text-center">
            <p className="text-[15px] font-black">승인 대기 중</p>
            <p className={`text-[12px] leading-relaxed ${muted}`}>
              관리자 검증이 완료되면 관계자(또는 대표)에게 알림톡/문자로 안내되며, 등록한 아이디·비밀번호로
              www.vlue.kr 에 로그인해 쇼케이스를 꾸밀 수 있습니다.
              <br />
              상호 <strong>{companyLocked}</strong>
              {application?.manageLoginId ? (
                <>
                  <br />
                  관리 아이디 <strong>{application.manageLoginId}</strong>
                </>
              ) : null}
            </p>
            <button
              type="button"
              onClick={() => void hydrate().then(() => {
                /* re-read status */
              })}
              className={`rounded-xl px-4 py-2 text-[12px] font-bold ${isDarkMode ? "bg-white/10" : "bg-slate-100"}`}
            >
              상태 새로고침
            </button>
            {application?.status === "approved" ? (
              <button
                type="button"
                onClick={() => setStep("payment")}
                className="w-full rounded-xl bg-blue-600 py-3 text-[13px] font-black text-white"
              >
                발급·결제로 이동
              </button>
            ) : null}
          </section>
        ) : null}

        {step === "payment" ? (
          <section className="space-y-3">
            <p className="text-[15px] font-black">디지털 인증명함 발급 · 결제</p>
            <p className={`text-[12px] ${muted}`}>
              승인이 완료되었습니다. 결제를 진행하면 디지털 인증명함이 최종 활성화됩니다.
            </p>
            <ul className={`rounded-xl border px-3 py-2 text-[12px] ${isDarkMode ? "border-white/10" : "border-slate-200"}`}>
              <li>상호: {companyLocked || application?.companyNameLocked}</li>
              <li>부서: {department || application?.department}</li>
              <li>담당자: {contactName || application?.contactName}</li>
              <li>DCC: {dccPhone || application?.dccOutboundPhone}</li>
            </ul>
            <button
              type="button"
              onClick={goPayment}
              className="w-full rounded-xl bg-blue-600 py-3 text-[13px] font-black text-white"
            >
              결제 · 발급 진행
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.setItem(DIGITAL_CARD_ACTIVE_KEY, "1");
                } catch {
                  /* ignore */
                }
                onBack?.();
              }}
              className={`w-full rounded-xl py-2 text-[12px] font-bold ${isDarkMode ? "bg-white/10" : "bg-slate-100"}`}
            >
              나중에
            </button>
          </section>
        ) : null}
      </div>
    </div>
  );
}
