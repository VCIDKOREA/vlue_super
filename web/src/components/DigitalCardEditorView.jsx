import { useEffect, useMemo, useState } from "react";
import {
  VLUE_CARD_PROMO_MAX,
  getDefaultMemberVlueEmail,
  getLegalName,
  getMemberHandle,
  readCardEmail,
  readCardEmailKind,
  readCardFax,
  readCardPromo,
  writeCardFields
} from "../lib/memberCardStorage.js";
import {
  clearJobVerification,
  readJobTitleRaw,
  readJobTitleVerified,
  readJobVerifyMethod,
  saveJobTitleDraft,
  verifyJobTitleByEmailDemo,
  verifyJobTitleByMasterDemo,
  JOB_NO_TITLE_KEY
} from "../lib/jobTitleVerify.js";
import BackButton from "./common/BackButton";

function readNoJobTitlePref() {
  try {
    return localStorage.getItem(JOB_NO_TITLE_KEY) === "1";
  } catch {
    return false;
  }
}

function RowReadonly({ label, value, isDarkMode }) {
  const box = isDarkMode
    ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
    : "rounded-xl border border-gray-200/80 bg-gray-50/90 px-3 py-2.5";
  const labelCls = isDarkMode ? "text-[10px] font-bold uppercase tracking-wide text-gray-400" : "text-[10px] font-bold uppercase tracking-wide text-gray-500";
  const valueCls = isDarkMode ? "mt-0.5 text-[13px] font-semibold text-gray-100" : "mt-0.5 text-[13px] font-semibold text-[#0f172a]";
  const hintCls = isDarkMode ? "mt-1 text-[10px] text-gray-400" : "mt-1 text-[10px] text-gray-500";
  return (
    <div className={box}>
      <p className={labelCls}>{label}</p>
      <p className={valueCls}>{value || "—"}</p>
      <p className={hintCls}>가입 정보 · 수정 불가</p>
    </div>
  );
}

export default function DigitalCardEditorView({ mode, myCard, isDarkMode = false, onBack, onSaved }) {
  const legalName = getLegalName() || String(myCard?.name || "").trim() || "—";
  const memberHandle = getMemberHandle();
  const companyEmail = useMemo(() => getDefaultMemberVlueEmail(), []);

  const [jobInput, setJobInput] = useState(() => readJobTitleRaw());
  const [noJobTitleOnCard, setNoJobTitleOnCard] = useState(() => readNoJobTitlePref());
  const [jobUiTick, setJobUiTick] = useState(0);
  const jobVerified = useMemo(() => readJobTitleVerified(), [jobUiTick]);
  const jobVerifyMethod = useMemo(() => readJobVerifyMethod(), [jobUiTick]);

  const orgLocked = useMemo(() => {
    try {
      return String(localStorage.getItem("vlue_company_locked") || "").trim() || String(myCard?.organization || "").trim() || "(개인 회원)";
    } catch {
      return String(myCard?.organization || "").trim() || "(개인 회원)";
    }
  }, [myCard?.organization]);

  const phoneLocked = String(myCard?.phone || "").trim() || "—";

  const [fax, setFax] = useState("");
  const [extensionPhone, setExtensionPhone] = useState("");
  const [repPhone, setRepPhone] = useState("");
  const [promo, setPromo] = useState("");
  const [usePersonal, setUsePersonal] = useState(false);
  const [personalEmail, setPersonalEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [verifySent, setVerifySent] = useState(false);
  const [verifiedDemo, setVerifiedDemo] = useState(false);
  const [toast, setToast] = useState("");

  const reload = () => {
    setFax(readCardFax());
    try {
      setExtensionPhone(String(localStorage.getItem("vlue_apply_extension_phone") || ""));
      setRepPhone(String(localStorage.getItem("vlue_apply_rep_phone") || ""));
    } catch {
      setExtensionPhone("");
      setRepPhone("");
    }
    setPromo(readCardPromo());
    setJobInput(readJobTitleRaw());
    setNoJobTitleOnCard(readNoJobTitlePref());
    setJobUiTick((n) => n + 1);
    const kind = readCardEmailKind();
    const saved = readCardEmail();
    if (kind === "personal" && saved && saved !== companyEmail) {
      setUsePersonal(true);
      setPersonalEmail(saved);
      setPendingEmail(saved);
      setVerifiedDemo(true);
    } else {
      setUsePersonal(false);
      setPersonalEmail("");
      setPendingEmail("");
      setVerifiedDemo(false);
    }
    setVerifySent(false);
  };

  useEffect(() => {
    reload();
  }, [mode]);

  const shownEmail = usePersonal && personalEmail ? personalEmail : companyEmail;

  const persistNoJob = (checked) => {
    try {
      if (checked) localStorage.setItem(JOB_NO_TITLE_KEY, "1");
      else localStorage.removeItem(JOB_NO_TITLE_KEY);
      clearJobVerification();
    } catch {
      /* ignore */
    }
    setNoJobTitleOnCard(checked);
  };

  const save = () => {
    if (usePersonal && !String(personalEmail || "").trim()) {
      setToast("개인 이메일 인증을 완료해 주세요.");
      setTimeout(() => setToast(""), 2200);
      return;
    }
    const p = promo.slice(0, VLUE_CARD_PROMO_MAX);
    try {
      localStorage.setItem("vlue_apply_extension_phone", String(extensionPhone || "").trim());
      localStorage.setItem("vlue_apply_rep_phone", String(repPhone || "").trim());
    } catch {
      /* ignore */
    }
    if (usePersonal && personalEmail) {
      writeCardFields({ fax, email: personalEmail, emailKind: "personal", promo: p });
    } else {
      writeCardFields({ fax, email: companyEmail, emailKind: "company", promo: p });
    }
    if (mode === "apply") {
      try {
        localStorage.setItem("vlue_digital_card_active", "1");
        window.dispatchEvent(new CustomEvent("vlue-digital-card-changed"));
      } catch {
        /* ignore */
      }
    }
    setToast(mode === "apply" ? "신청이 접수되었습니다. 승인 후 명함이 활성화됩니다." : "저장되었습니다.");
    setTimeout(() => setToast(""), 2000);
    onSaved?.();
  };

  const title = mode === "apply" ? "VLUE 인증명함 신청" : "명함 내용 편집";

  const startPersonalFlow = () => {
    setUsePersonal(true);
    setPersonalEmail("");
    setPendingEmail("");
    setVerifySent(false);
    setVerifiedDemo(false);
  };

  const revertCompany = () => {
    setUsePersonal(false);
    setPersonalEmail("");
    setPendingEmail("");
    setVerifySent(false);
    setVerifiedDemo(false);
  };

  const headBorder = isDarkMode ? "border-white/10" : "border-gray-100";
  const titleMain = isDarkMode ? "text-[17px] font-black text-gray-100" : "text-[17px] font-black text-gray-900";
  const subMuted = isDarkMode ? "mt-0.5 text-[11px] text-gray-400" : "mt-0.5 text-[11px] text-gray-500";
  const backBtn = isDarkMode
    ? "shrink-0 rounded-lg border border-white/15 px-2.5 py-1 text-[11px] font-bold text-gray-200"
    : "shrink-0 rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-bold text-gray-600";

  const fieldLabel = isDarkMode ? "text-[12px] font-black text-gray-100" : "text-[12px] font-black text-gray-900";
  const inputBase = isDarkMode
    ? "mt-1 w-full rounded-xl border border-white/15 bg-slate-900/90 px-3 py-2.5 text-[13px] text-gray-100 outline-none focus:border-blue-400"
    : "mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[13px] text-[#0f172a] outline-none focus:border-blue-400";
  const hintSm = isDarkMode ? "mt-1 text-[10px] text-gray-400" : "mt-1 text-[10px] text-gray-500";

  const emailBlock = isDarkMode ? "rounded-2xl border border-white/10 bg-white/5 p-3" : "rounded-2xl border border-gray-200/90 bg-gray-50/50 p-3";
  const emailIntro = isDarkMode ? "mt-1 text-[11px] leading-relaxed text-gray-300" : "mt-1 text-[11px] leading-relaxed text-gray-600";
  const emailInner = isDarkMode ? "mt-2 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2" : "mt-2 rounded-xl border border-gray-200 bg-white px-3 py-2";
  const emailMuted = isDarkMode ? "text-[10px] font-bold text-gray-400" : "text-[10px] font-bold text-gray-400";
  const emailValue = isDarkMode ? "mt-0.5 break-all text-[13px] font-semibold text-gray-100" : "mt-0.5 break-all text-[13px] font-semibold text-[#0f172a]";

  const personalFlowBtn = isDarkMode
    ? "mt-2 w-full rounded-xl border border-blue-500/40 bg-blue-950/40 py-2 text-[12px] font-black text-blue-200"
    : "mt-2 w-full rounded-xl border border-blue-200 bg-blue-50 py-2 text-[12px] font-black text-blue-700";

  const amberBox = isDarkMode
    ? "mt-3 space-y-2 rounded-xl border border-amber-500/30 bg-amber-950/20 p-3"
    : "mt-3 space-y-2 rounded-xl border border-amber-200/80 bg-amber-50/50 p-3";
  const amberLabel = isDarkMode ? "text-[11px] font-bold text-amber-200" : "text-[11px] font-bold text-amber-900";
  const smallInput = isDarkMode
    ? "w-full rounded-lg border border-white/15 bg-slate-900/90 px-2.5 py-2 text-[13px] text-gray-100 disabled:opacity-60"
    : "w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-[13px] text-[#0f172a] disabled:opacity-60";
  const demoBtn = isDarkMode ? "rounded-lg border border-amber-400/40 bg-slate-900 px-3 py-1.5 text-[11px] font-black text-amber-100" : "rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[11px] font-black text-amber-900";
  const underlineMuted = isDarkMode ? "text-[11px] font-bold text-gray-400 underline" : "text-[11px] font-bold text-gray-600 underline";

  const promoCounter = (len) =>
    len >= VLUE_CARD_PROMO_MAX ? "text-amber-600" : isDarkMode ? "text-gray-400" : "text-gray-400";

  const saveBtn = isDarkMode ? "w-full rounded-2xl bg-blue-500 py-3.5 text-[14px] font-black text-white shadow-md active:scale-[0.99]" : "w-full rounded-2xl bg-blue-600 py-3.5 text-[14px] font-black text-white shadow-md active:scale-[0.99]";
  const applyExtraBox = isDarkMode
    ? "rounded-2xl border border-amber-500/25 bg-amber-950/20 p-3"
    : "rounded-2xl border border-amber-200/80 bg-amber-50/55 p-3";

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className={`flex shrink-0 items-center gap-1 border-b px-3 py-2.5 ${headBorder}`}>
        <BackButton variant="inline" onBack={onBack} isDarkMode={isDarkMode} />
        <div className="min-w-0 flex-1">
          <p className={titleMain}>{title}</p>
          <p className={subMuted}>사업자·실명·전화는 가입 정보로 자동 반영되며 수정할 수 없습니다.</p>
        </div>
      </div>

      <div className="vlue-scroll-pad-bottom-nav min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="space-y-3">
          <RowReadonly label="실명 (본인인증)" value={legalName} isDarkMode={isDarkMode} />
          {mode !== "apply" ? <RowReadonly label="회원 ID" value={memberHandle} isDarkMode={isDarkMode} /> : null}
          <RowReadonly label="사업자 / 소속 표기" value={orgLocked} isDarkMode={isDarkMode} />
          <div className={emailBlock}>
            <label className={fieldLabel}>직책 (명함 노출)</label>
            <p className={emailIntro}>
              <b className={isDarkMode ? "text-amber-200" : "text-amber-900"}>미인증 직책은 명함에 표시되지 않습니다.</b> 기업 장(Master) 승인 또는 기업 이메일 인증이 완료된 직책만 카드에 노출됩니다.
            </p>
            <label className={`mt-2 flex cursor-pointer items-center gap-2 text-[12px] font-bold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              <input
                type="checkbox"
                checked={noJobTitleOnCard}
                onChange={(e) => persistNoJob(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              직책 없음 · 명함에는 성명만 표시
            </label>
            <input
              type="text"
              value={jobInput}
              onChange={(e) => setJobInput(e.target.value)}
              disabled={noJobTitleOnCard}
              placeholder="예: 팀장 · 대표 · 책임매니저"
              className={`${inputBase} disabled:opacity-50`}
            />
            <p className={hintSm}>
              상태:{" "}
              {noJobTitleOnCard
                ? "직책 비표시"
                : jobVerified
                  ? `인증됨 (${jobVerifyMethod === "email" ? "기업 메일" : jobVerifyMethod === "master" ? "마스터" : "확인됨"})`
                  : "미인증 — 저장 후 아래에서 인증해 주세요"}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (noJobTitleOnCard) {
                    setToast("직책 없음을 해제하거나 직책을 입력해 주세요.");
                    setTimeout(() => setToast(""), 2200);
                    return;
                  }
                  saveJobTitleDraft(jobInput);
                  setToast("직책 초안이 저장되었습니다. 인증을 마치면 명함에 반영됩니다.");
                  setTimeout(() => setToast(""), 2200);
                  onSaved?.();
                }}
                className={demoBtn}
              >
                직책 저장
              </button>
              <button
                type="button"
                onClick={() => {
                  verifyJobTitleByMasterDemo();
                  setJobUiTick((n) => n + 1);
                  setToast("마스터 승인(데모) 처리되었습니다.");
                  setTimeout(() => setToast(""), 2200);
                  onSaved?.();
                }}
                disabled={noJobTitleOnCard || !String(jobInput).trim()}
                className={demoBtn}
              >
                마스터 승인 (데모)
              </button>
              <button
                type="button"
                onClick={() => {
                  verifyJobTitleByEmailDemo();
                  setJobUiTick((n) => n + 1);
                  setToast("기업 메일 인증(데모) 완료 처리되었습니다.");
                  setTimeout(() => setToast(""), 2200);
                  onSaved?.();
                }}
                disabled={noJobTitleOnCard || !String(jobInput).trim()}
                className={demoBtn}
              >
                기업 메일 인증 (데모)
              </button>
            </div>
          </div>
          <RowReadonly label="전화번호" value={phoneLocked} isDarkMode={isDarkMode} />
          {mode === "apply" ? (
            <div className={applyExtraBox}>
              <label className={fieldLabel}>추가 번호 입력 (선택)</label>
              <input
                type="tel"
                value={extensionPhone}
                onChange={(e) => setExtensionPhone(e.target.value)}
                placeholder="내선번호 추가 입력"
                className={inputBase}
              />
              <input
                type="tel"
                value={repPhone}
                onChange={(e) => setRepPhone(e.target.value)}
                placeholder="대표번호 추가 입력"
                className={inputBase}
              />
              <p className={hintSm}>내선번호/대표번호 추가 시 추가 결제가 필요합니다.</p>
            </div>
          ) : null}

          <div>
            <label className={fieldLabel}>팩스번호</label>
            <input type="tel" value={fax} onChange={(e) => setFax(e.target.value)} placeholder="예: 02-1234-5678" className={inputBase} />
            <p className={hintSm}>직접 입력</p>
          </div>

          <div className={emailBlock}>
            <p className={fieldLabel}>이메일</p>
            <p className={emailIntro}>
              기본은 VLUE 회원용 <b className={isDarkMode ? "text-gray-200" : "text-gray-800"}>@member.vlue.kr</b> 주소입니다. 개인 메일은 인증 후 저장됩니다.
            </p>
            <div className={emailInner}>
              <p className={emailMuted}>현재 명함에 표시될 이메일</p>
              <p className={emailValue}>{shownEmail}</p>
            </div>

            {!usePersonal && (
              <button type="button" onClick={startPersonalFlow} className={personalFlowBtn}>
                개인 이메일로 변경 (인증)
              </button>
            )}

            {usePersonal && (
              <div className={amberBox}>
                <label className={amberLabel}>개인 이메일</label>
                <input
                  type="email"
                  value={pendingEmail}
                  onChange={(e) => setPendingEmail(e.target.value)}
                  placeholder="name@example.com"
                  disabled={verifiedDemo && !!personalEmail}
                  className={smallInput}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!pendingEmail.trim()) {
                        setToast("이메일을 입력해 주세요.");
                        setTimeout(() => setToast(""), 2000);
                        return;
                      }
                      setVerifySent(true);
                      setToast("인증 메일을 발송했습니다. (데모)");
                      setTimeout(() => setToast(""), 2200);
                    }}
                    className="rounded-lg bg-amber-600 px-3 py-1.5 text-[11px] font-black text-white"
                  >
                    인증 메일 발송
                  </button>
                  <button
                    type="button"
                    disabled={!verifySent}
                    onClick={() => {
                      if (!pendingEmail.trim()) return;
                      setPersonalEmail(pendingEmail.trim());
                      setVerifiedDemo(true);
                      setToast("이메일 인증이 완료되었습니다. (데모)");
                      setTimeout(() => setToast(""), 2000);
                    }}
                    className={demoBtn}
                  >
                    인증 완료 (데모)
                  </button>
                </div>
                <button type="button" onClick={revertCompany} className={underlineMuted}>
                  기본(@member.vlue.kr)으로 되돌리기
                </button>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-2">
              <label className={fieldLabel}>홍보 문구</label>
              <span className={`text-[11px] font-bold ${promoCounter(promo.length)}`}>
                {promo.length}/{VLUE_CARD_PROMO_MAX}자
              </span>
            </div>
            <textarea
              value={promo}
              onChange={(e) => setPromo(e.target.value.slice(0, VLUE_CARD_PROMO_MAX))}
              placeholder="명함 뒷면·소개에 노출될 짧은 문구를 입력하세요."
              rows={4}
              className={inputBase + " resize-none"}
            />
            <p className={hintSm}>최대 {VLUE_CARD_PROMO_MAX}자 · 줄바꿈 가능</p>
          </div>

          <button type="button" onClick={save} className={saveBtn}>
            저장
          </button>
        </div>
      </div>

      {toast ? (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-[100] max-w-[90vw] -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-center text-[12px] font-bold text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
