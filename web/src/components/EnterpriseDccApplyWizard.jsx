import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchMyEnterpriseDccApplication,
  saveEnterpriseDccDetails,
  sendEnterpriseDccOtp,
  submitEnterpriseDccApplication,
  verifyEnterpriseDccBusiness,
  verifyEnterpriseDccOtp
} from "../lib/enterpriseDccApi.js";
import { sendAuthCode, verifyAuthCode, EMAIL_AUTH_SUPPORT } from "../lib/emailAuthApi.js";
import { writeLetteringBizcardEditable } from "../lib/letteringBizcardStorage.js";
import { DIGITAL_CARD_ACTIVE_KEY } from "../lib/bizcardAccountSync.js";

const STEPS = [
  { id: "start", label: "신청 시작" },
  { id: "biz", label: "사업자 인증" },
  { id: "party", label: "관계자 인증" },
  { id: "otp", label: "인증번호" },
  { id: "details", label: "상세 입력" },
  { id: "pending", label: "승인 대기" },
  { id: "payment", label: "발급·결제" }
];

function statusToStep(status, isFirstRegistrant) {
  switch (status) {
    case "draft":
      return "start";
    case "biz_verified":
      return isFirstRegistrant ? "details" : "party";
    case "awaiting_related_otp":
      return "otp";
    case "related_verified":
    case "details_ready":
      return "details";
    case "pending_approval":
      return "pending";
    case "approved":
      return "payment";
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
        setStep("details");
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
      await submitEnterpriseDccApplication(application.id);
      setApplication((prev) => (prev ? { ...prev, status: "pending_approval" } : prev));
      setStep("pending");
      toast("승인 요청이 접수되었습니다.");
    } catch (e) {
      setError(e?.message || "저장 실패");
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
          <p className={`text-[10px] ${muted}`}>사업자 검증 → 관계자 인증 → 승인 → 발급·결제</p>
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
              <li>사업자번호 공식 검증</li>
              <li>등록된 관계자 선택 · 인증번호</li>
              <li>상호 고정 · 부서·담당자·DCC 번호</li>
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
              상호 <strong className="text-blue-600">{companyLocked}</strong> 의 등록된 관계자만 선택할 수
              있습니다. 허위 신청 방지를 위해 선택된 관계자에게만 인증번호가 발송됩니다.
            </p>
            {!parties.length ? (
              <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-[12px] text-amber-700">
                등록된 관계자가 없습니다. 이전 단계에서 최초 사업자로 상세 입력을 진행하세요.
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
              onClick={() => void runSendOtp()}
              className="w-full rounded-xl bg-blue-600 py-3 text-[13px] font-black text-white disabled:opacity-50"
            >
              {busy ? "발송 중…" : "인증번호 발송"}
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
                최초 사업자 경로입니다. 관계자 OTP 없이 승인 대기로 제출됩니다.
              </p>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => void runSaveDetails()}
              className="w-full rounded-xl bg-blue-600 py-3 text-[13px] font-black text-white disabled:opacity-50"
            >
              {busy ? "제출 중…" : "승인 요청 제출"}
            </button>
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
