import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { TERMS_ARTICLES, TERMS_CHECKLIST_IDS, TERMS_VERSION } from "../legal/vlueTermsArticles.js";
import { REFERRAL_PRECAUTION_AGREE, REFERRAL_PRECAUTION_BULLETS, REFERRAL_PRECAUTION_TITLE } from "../legal/vlueReferralNotice.js";
import { setVlueSessionTokens } from "../lib/vlueAuthHeaders.js";
import { logTermsAgreement } from "../lib/termsLog.js";
import { apiUrl } from "../lib/apiBase.js";
import { makeDevLocalImpUid, postPortoneIdentityComplete } from "../lib/identityCompleteApi.js";
import { requestIamportCertification } from "../lib/iamportClient.js";
import { getPortoneUserCode } from "../lib/portoneEnv.js";
import { DEV_SAMPLE_ROAD_ADDRESS, openDaumPostcode } from "../lib/daumPostcode.js";
import { formatPhoneE164ForKoreaDisplay } from "../lib/phoneDisplay.js";
import { isValidMemberHandleSlug, normalizeMemberHandleSlug } from "../lib/memberHandleRules.js";
import { isValidMemberPassword, MEMBER_PASSWORD_HINT, MEMBER_PASSWORD_INVALID_MESSAGE } from "../lib/memberPasswordRules.js";
import {
  getBiometricProfile,
  isWebAuthnSupported,
  registerBiometric as webauthnRegisterBiometric
} from "../lib/webauthnBiometric.js";
import { formatKrw, isBillableMembershipKind, isB2bMembershipKind, isPaidMembershipKind, paidAmountKrw, buildPaymentPreview, PAID_MEMBERSHIP_SUBLINE, B2B_MEMBERSHIP_SUBLINE, POST_SIGNUP_PAYMENT_NOTICE } from "../lib/membershipBm.js";
import ReferralCodeVerifyBlock, { validateReferralMeta } from "./ReferralCodeVerifyBlock.jsx";
import B2bSignupFields, { validateReferralMetaB2b } from "./B2bSignupFields.jsx";
import MembershipBenefitsCompare from "./MembershipBenefitsCompare.jsx";
import BackButton from "./common/BackButton";
import {
  emptyGroupSignupDraft,
  groupLineTotalKrw,
  INDIVIDUAL_TO_GROUP_CONVERSION_NOTICE,
  readGroupSignupDraftFromStorage,
  serializeGroupSignupForApi,
  validateGroupSignupDraft,
  writeGroupSignupDraftToStorage,
  countGroupBillableLines,
  syncDraftToPlannedLineCount,
  GROUP_SIGNUP_MIN_LINES
} from "../lib/groupSignupBm.js";

/** 좌측 라벨 + 우측 필드 (공공기관 스타일 행) */
function FormRow({ icon, label, children, className = "" }) {
  return (
    <div className={`flex w-full overflow-hidden rounded-xl border border-slate-200/90 bg-white text-[13px] shadow-sm ${className}`}>
      <div className="flex w-[30%] min-w-[92px] shrink-0 items-center gap-1.5 border-r border-slate-100 bg-[#eef3f9] px-2.5 py-2.5">
        <span className="shrink-0 text-slate-500">{icon}</span>
        <span className="font-bold leading-tight text-slate-800">{label}</span>
      </div>
      <div className="min-w-0 flex-1 bg-white px-2 py-1.5">{children}</div>
    </div>
  );
}

function IconPin({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function IconBriefcase({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function IconUsers({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="3" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconLayers({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

export default function VlueOnboarding({ onComplete, onCancel }) {
  const [step, setStep] = useState("tier");
  const [busy, setBusy] = useState(false);
  const [agreedById, setAgreedById] = useState(() =>
    TERMS_CHECKLIST_IDS.reduce((acc, id) => {
      acc[id] = false;
      return acc;
    }, {})
  );
  const [masterAgree, setMasterAgree] = useState(false);
  const [jointGuarantorAgree, setJointGuarantorAgree] = useState(false);
  const [passOk, setPassOk] = useState(false);
  /** PASS 단계 — 사업자(법인·개인사업자) 트랙: 승인 대기 pending_approval */
  const [passBusinessMember, setPassBusinessMember] = useState(false);
  /** PASS 단계 — 사업자 등록번호(10자리)·관련 사업체 직책 */
  const [passBusinessRegNo, setPassBusinessRegNo] = useState("");
  const [passBusinessJobTitle, setPassBusinessJobTitle] = useState("");
  /** 사업자 가입 시 직책 미표시(명함에는 성명만) */
  const [passBusinessNoJobTitle, setPassBusinessNoJobTitle] = useState(false);
  /** 가입 시 1회 확정(서버 unique). 영문 소문자 시작 3~20자 */
  const [desiredMemberId, setDesiredMemberId] = useState("");
  /** 체크 시 본인인증 완료 API에서 digital_cards 행 생성 */
  const [requestDigitalCard, setRequestDigitalCard] = useState(false);

  /** BM: free | paid (구 standard/premium 폐기) */
  const [membershipKind, setMembershipKind] = useState("free");
  const [paidBillingCycle, setPaidBillingCycle] = useState("monthly");
  const [referralCode, setReferralCode] = useState("");
  const [referralMeta, setReferralMeta] = useState({
    hasCode: false,
    verified: false,
    discountAgree: false,
    codeForApi: null,
    sponsorDisplayName: "",
    sponsorHandle: ""
  });
  const [authMode, setAuthMode] = useState("direct");
  const [bioRegistered, setBioRegistered] = useState(false);
  const bioProfile = useMemo(() => getBiometricProfile(), []);
  const [benefitsModalOpen, setBenefitsModalOpen] = useState(false);
  const [benefitsModalTab, setBenefitsModalTab] = useState("compare");
  const [bioNote, setBioNote] = useState("");
  const [groupSignupDraft, setGroupSignupDraft] = useState(() => readGroupSignupDraftFromStorage());
  const isB2b = isB2bMembershipKind(membershipKind);

  const [roadAddress, setRoadAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");

  const [jobType, setJobType] = useState("");
  const [companyLocked, setCompanyLocked] = useState("");
  const [bizNumber, setBizNumber] = useState("");
  const [bizVerified, setBizVerified] = useState(false);
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseVerified, setLicenseVerified] = useState(false);
  const [creatorPlatform, setCreatorPlatform] = useState("youtube");
  const [channelUrl, setChannelUrl] = useState("");
  const [vlueCode, setVlueCode] = useState("");
  const [issuedCode, setIssuedCode] = useState("");
  const [freelancePurpose, setFreelancePurpose] = useState("");

  const [guarantorContact, setGuarantorContact] = useState("");
  const [guarantorJobReason, setGuarantorJobReason] = useState("");
  const [recPhase, setRecPhase] = useState(1);
  const [guarantorOtp, setGuarantorOtp] = useState("");
  const [recName, setRecName] = useState("");

  const [verifyZone, setVerifyZone] = useState(null);

  const [signupPassword, setSignupPassword] = useState("");
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState("");
  /** idle | checking | ok | taken | invalid */
  const [idCheck, setIdCheck] = useState({ status: "idle", message: "" });

  const runCheckLoginId = useCallback(async (slug) => {
    const s = String(slug || "").trim();
    if (!s || !isValidMemberHandleSlug(s)) {
      setIdCheck({
        status: "invalid",
        message: "영문 소문자 시작, 3~20자(소문자·숫자·_), 숫자 1자 이상이어야 합니다."
      });
      return;
    }
    setIdCheck({ status: "checking", message: "" });
    try {
      const res = await fetch(apiUrl(`/api/auth/check-login-id?loginId=${encodeURIComponent(s)}`));
      const data = await res.json().catch(() => ({}));
      if (data.available) {
        setIdCheck({ status: "ok", message: "사용 가능한 아이디입니다." });
      } else if (data.normalized == null) {
        setIdCheck({ status: "invalid", message: data.reason || "아이디 형식이 올바르지 않습니다." });
      } else {
        setIdCheck({ status: "taken", message: data.reason || "이미 사용 중인 아이디입니다." });
      }
    } catch {
      setIdCheck({ status: "invalid", message: "중복 확인 요청에 실패했습니다." });
    }
  }, []);

  useEffect(() => {
    const slug = normalizeMemberHandleSlug(desiredMemberId);
    if (!slug) {
      setIdCheck({ status: "idle", message: "" });
      return;
    }
    if (!isValidMemberHandleSlug(slug)) {
      setIdCheck({ status: "invalid", message: "형식을 확인해 주세요. (숫자 포함)" });
      return;
    }
    const t = setTimeout(() => {
      runCheckLoginId(slug);
    }, 450);
    return () => clearTimeout(t);
  }, [desiredMemberId, runCheckLoginId]);

  const allArticlesAgreed = useMemo(() => TERMS_CHECKLIST_IDS.every((id) => agreedById[id]), [agreedById]);
  const termsGate = allArticlesAgreed && masterAgree && jointGuarantorAgree;

  const paidReferralDiscount =
    referralMeta.verified &&
    referralMeta.discountAgree &&
    !referralMeta.noReferrer &&
    Boolean(referralMeta.codeForApi);

  const paidChargeKrw = useMemo(() => {
    if (isB2b) {
      const n = countGroupBillableLines({ ...groupSignupDraft, enabled: true });
      const hasReferral =
        referralMeta.verified &&
        referralMeta.discountAgree &&
        !referralMeta.noReferrer &&
        Boolean(referralMeta.codeForApi);
      return groupLineTotalKrw(n, paidBillingCycle, { hasReferral });
    }
    return paidAmountKrw(paidBillingCycle, paidReferralDiscount);
  }, [isB2b, groupSignupDraft, paidBillingCycle, paidReferralDiscount, referralMeta]);

  const paidPaymentPreview = useMemo(() => {
    if (!isPaidMembershipKind(membershipKind)) return null;
    return buildPaymentPreview(paidBillingCycle, paidReferralDiscount);
  }, [membershipKind, paidBillingCycle, paidReferralDiscount]);

  const persistGroupDraft = useCallback((draft) => {
    const next = draft?.enabled ? syncDraftToPlannedLineCount(draft) : draft;
    setGroupSignupDraft(next);
    writeGroupSignupDraftToStorage(next);
  }, []);

  const clearGroupSignup = useCallback(() => {
    const empty = emptyGroupSignupDraft();
    persistGroupDraft(empty);
  }, [persistGroupDraft]);

  const selectMembershipKind = useCallback(
    (id) => {
      setMembershipKind(id);
      if (id === "b2b") {
        persistGroupDraft({
          ...groupSignupDraft,
          enabled: true,
          plannedLineCount: groupSignupDraft.plannedLineCount || GROUP_SIGNUP_MIN_LINES
        });
      } else if (groupSignupDraft.enabled) {
        clearGroupSignup();
      }
    },
    [groupSignupDraft, persistGroupDraft, clearGroupSignup]
  );

  const pathSteps = useMemo(
    () => ["tier", "terms", "account", "pass", "direct_detail", "complete"],
    []
  );

  const progress = useMemo(() => {
    const i = pathSteps.indexOf(step);
    const idx = i < 0 ? 0 : i;
    return ((idx + 1) / pathSteps.length) * 100;
  }, [pathSteps, step]);

  const toggleArticle = (id) => {
    setAgreedById((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleMaster = () => {
    const next = !masterAgree;
    setMasterAgree(next);
    setAgreedById(
      TERMS_CHECKLIST_IDS.reduce((acc, id) => {
        acc[id] = next;
        return acc;
      }, {})
    );
  };

  const submitTerms = async () => {
    if (!termsGate) return;
    setBusy(true);
    await logTermsAgreement({ termsVersion: TERMS_VERSION });
    setBusy(false);
    setStep("account");
  };

  const submitAccountNext = () => {
    setVerifyZone(null);
    const slug = normalizeMemberHandleSlug(desiredMemberId);
    if (!isValidMemberHandleSlug(slug)) {
      setVerifyZone({
        ok: false,
        text: "회원 ID는 영문 소문자로 시작하는 3~20자(소문자·숫자·_)이며 숫자를 한 글자 이상 포함해야 합니다."
      });
      return;
    }
    if (idCheck.status !== "ok") {
      setVerifyZone({
        ok: false,
        text: "아이디 사용 가능 여부가 확인되지 않았습니다. 잠시 기다리거나 「아이디 중복확인」을 눌러 주세요."
      });
      return;
    }
    const pw = String(signupPassword || "");
    if (!isValidMemberPassword(pw)) {
      setVerifyZone({ ok: false, text: MEMBER_PASSWORD_INVALID_MESSAGE });
      return;
    }
    if (pw !== String(signupPasswordConfirm || "")) {
      setVerifyZone({ ok: false, text: "비밀번호 확인이 일치하지 않습니다." });
      return;
    }
    setStep("pass");
  };

  const runPortonePass = async ({ devBypass = false } = {}) => {
    setBusy(true);
    setVerifyZone(null);
    try {
      const slug = normalizeMemberHandleSlug(desiredMemberId);
      if (!isValidMemberHandleSlug(slug)) {
        throw new Error("회원 ID는 영문 소문자로 시작하는 3~20자(소문자·숫자·_)이며 숫자를 한 글자 이상 포함해야 합니다.");
      }
      if (idCheck.status !== "ok") {
        throw new Error("아이디 중복 확인이 완료되지 않았습니다. 잠시 기다리거나 「아이디 중복확인」을 눌러 주세요.");
      }
      const pw = String(signupPassword || "");
      if (!isValidMemberPassword(pw)) {
        throw new Error(MEMBER_PASSWORD_INVALID_MESSAGE);
      }
      if (pw !== String(signupPasswordConfirm || "")) {
        throw new Error("비밀번호 확인이 일치하지 않습니다.");
      }
      const adminDeviceKeyPre =
        typeof sessionStorage !== "undefined" && sessionStorage.getItem("vlue-admin-entry") === "1"
          ? localStorage.getItem("vlue-admin-device-key")
          : null;
      if (!adminDeviceKeyPre) {
        const recheckRes = await fetch(
          apiUrl(`/api/auth/check-login-id?loginId=${encodeURIComponent(slug)}`)
        );
        const recheckData = await recheckRes.json().catch(() => ({}));
        if (!recheckData.available) {
          throw new Error(recheckData.reason || "가입 직전 아이디 중복이 확인되었습니다. 아이디를 변경한 뒤 다시 시도해 주세요.");
        }
      }
      if (passBusinessMember) {
        const digits = String(passBusinessRegNo || "").replace(/\D/g, "");
        if (digits.length !== 10) {
          throw new Error("사업자등록번호 10자리를 입력해 주세요.");
        }
        if (!passBusinessNoJobTitle && !String(passBusinessJobTitle || "").trim()) {
          throw new Error("직책을 입력하거나 「직책 없음」을 선택해 주세요.");
        }
      }
      let impUid;
      if (devBypass) {
        if (!import.meta.env.DEV) {
          throw new Error("개발 전용 본인인증 우회는 로컬 개발 빌드에서만 사용할 수 있습니다.");
        }
        impUid = makeDevLocalImpUid(slug);
      } else {
        const userCode = getPortoneUserCode();
        const rsp = await requestIamportCertification(userCode);
        impUid = rsp?.imp_uid;
        if (!impUid) {
          throw new Error("imp_uid가 없습니다. 본인인증 팝업이 완료됐는지 확인해 주세요.");
        }
      }
      const adminDeviceKey =
        typeof sessionStorage !== "undefined" && sessionStorage.getItem("vlue-admin-entry") === "1"
          ? localStorage.getItem("vlue-admin-device-key")
          : null;
      const data = await postPortoneIdentityComplete({
        impUid,
        isBusinessMember: passBusinessMember,
        requestDigitalCard,
        membershipKind,
        billingCycle: paidBillingCycle,
        referralCode: referralMeta.codeForApi || null,
        termsVersion: TERMS_VERSION,
        desiredPublicHandle: slug,
        password: pw,
        groupSignup: isB2b ? serializeGroupSignupForApi(groupSignupDraft) : null,
        ...(passBusinessMember
          ? {
              businessRegistrationNo: String(passBusinessRegNo || "").replace(/\D/g, "").slice(0, 10),
              businessJobTitle: passBusinessNoJobTitle ? "" : String(passBusinessJobTitle || "").trim(),
              businessDeclaresNoJobTitle: passBusinessNoJobTitle
            }
          : {}),
        ...(adminDeviceKey ? { adminDeviceKey } : {})
      });
      try {
        localStorage.setItem("vlue_server_user_id", data.userId);
        if (data.accessToken || data.refreshToken) {
          setVlueSessionTokens({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken
          });
        }
        if (data.publicHandle) {
          localStorage.setItem("vlue_member_handle", `@${String(data.publicHandle)}`);
        } else if (data.userId) {
          const fallbackSlug = String(data.userId).replace(/-/g, "").slice(0, 10);
          localStorage.setItem("vlue_member_handle", `@vlue_${fallbackSlug}`);
        }
        localStorage.setItem("vlue_account_status", data.accountStatus || "");
        if (passBusinessMember) {
          try {
            localStorage.setItem("vlue_business_member", "1");
            if (data.businessJobTitle) {
              localStorage.setItem("myCardJobTitle", String(data.businessJobTitle));
              localStorage.removeItem("vlue_card_no_job_title");
            } else {
              localStorage.removeItem("myCardJobTitle");
              localStorage.setItem("vlue_card_no_job_title", "1");
            }
          } catch {
            /* ignore */
          }
        } else {
          try {
            localStorage.removeItem("vlue_business_member");
            localStorage.removeItem("vlue_card_no_job_title");
          } catch {
            /* ignore */
          }
        }
        if (data.legalName) localStorage.setItem("vlue_legal_name", data.legalName);
        if (data.phoneE164) {
          localStorage.setItem("vlue_phone_e164", String(data.phoneE164));
          localStorage.setItem("myCardPhone", formatPhoneE164ForKoreaDisplay(data.phoneE164));
          if (isB2b) {
            persistGroupDraft({
              ...groupSignupDraft,
              vlueAuthPhoneHint: formatPhoneE164ForKoreaDisplay(data.phoneE164)
            });
          }
        }
        if (data.digitalCard?.issued) {
          localStorage.setItem("vlue_digital_card_active", "1");
          if (data.legalName) localStorage.setItem("myCardDisplayName", String(data.legalName).trim());
          if (data.digitalCard?.cardId) localStorage.setItem("vlue_digital_card_id", data.digitalCard.cardId);
        } else {
          localStorage.setItem("vlue_digital_card_active", "0");
          localStorage.removeItem("vlue_digital_card_id");
        }
      } catch {
        /* ignore */
      }
      setVerifyZone(null);
      setPassOk(true);
      setAuthMode("direct");
      setStep("direct_detail");
    } catch (e) {
      setVerifyZone({ ok: false, text: e?.message || String(e) });
    } finally {
      setBusy(false);
    }
  };

  const openAddressFinder = useCallback(() => {
    setVerifyZone(null);
    openDaumPostcode(({ roadAddress: line }) => {
      setRoadAddress(line);
    }).catch((e) => {
      setVerifyZone({ ok: false, text: e?.message || "주소 찾기를 열 수 없습니다." });
    });
  }, []);

  const runOfficeDemo = () => {
    setCompanyLocked("(주)데모테크 — 수정 불가 · 건강보험 자격득실 매칭");
    setVerifyZone({ ok: true, text: "현재 사업장 명칭이 추출되어 프로필에 고정 저장됩니다. (데모)" });
  };

  const runBizVerify = () => {
    if (!String(bizNumber || "").replace(/\D/g, "").slice(0, 10)) {
      setBizVerified(false);
      setVerifyZone({ ok: false, text: "사업자등록번호 10자리를 입력해 주세요." });
      return;
    }
    setBizVerified(true);
    setVerifyZone({ ok: true, text: "국세청 API 대조: 대표자 실명과 PASS 실명 일치 (데모 · Green)" });
  };

  const runLicenseVerify = () => {
    if (!licenseNumber.trim()) {
      setLicenseVerified(false);
      setVerifyZone({ ok: false, text: "자격·면허번호를 입력해 주세요." });
      return;
    }
    setLicenseVerified(true);
    setVerifyZone({ ok: true, text: "협회/공공 진위 확인 API 일치 (데모)" });
  };

  const issueCreatorCode = () => {
    const code = Math.random().toString(36).slice(2, 10).toUpperCase();
    setIssuedCode(code);
    setVerifyZone({ ok: true, text: `프로필에 게시할 고유 코드: ${code} (실서비스에서는 크롤러로 소유권 확인)` });
  };

  const runVerificationDirect = useCallback(() => {
    if (!roadAddress.trim()) {
      setVerifyZone({ ok: false, text: "등본과 같은 주소를 「우편번호 · 주소 찾기」로 선택해 주세요." });
      return;
    }
    if (!jobType) {
      setVerifyZone({ ok: false, text: "분류(직군)를 선택해 주세요." });
      return;
    }
    if (jobType === "freelancer" && !freelancePurpose.trim()) {
      setVerifyZone({ ok: false, text: "프리랜서 활동 목적을 간단히 입력해 주세요." });
      return;
    }
    setVerifyZone({ ok: true, text: "검증 신청이 접수되었습니다. 최대 24시간 내 심사됩니다." });
    setStep("complete");
  }, [roadAddress, jobType, freelancePurpose]);

  const sendGuarantorRequest = () => {
    if (!guarantorContact.trim() || !guarantorJobReason.trim()) {
      setVerifyZone({ ok: false, text: "보증인 연락처와 직업군(요청 사유)을 입력해 주세요." });
      return;
    }
    setRecPhase(2);
  };

  const verifyGuarantorOtp = () => {
    if (guarantorOtp.trim().length < 4) {
      setVerifyZone({ ok: false, text: "발급된 인증번호를 입력해 주세요." });
      return;
    }
    setRecPhase(3);
  };

  const finishRecommendMinimal = () => {
    if (!recName.trim() || !roadAddress.trim()) {
      setVerifyZone({ ok: false, text: "이름과 등본상 주소를 입력해 주세요." });
      return;
    }
    setStep("complete");
  };

  const persistAndComplete = useCallback(
    (extra) => {
      try {
        localStorage.setItem("vlue_membership_tier", membershipKind);
        localStorage.setItem("vlue_membership_kind", membershipKind);
        if (isBillableMembershipKind(membershipKind)) {
          localStorage.setItem("vlue_paid_billing_cycle", paidBillingCycle);
          if (referralCode.trim()) localStorage.setItem("vlue_referral_code", referralCode.trim());
        }
        localStorage.setItem("vlue_onboarding_address", String(roadAddress || "").trim());
        localStorage.setItem("vlue_onboarding_address_detail", String(addressDetail || "").trim());
        localStorage.setItem("vlue_onboarding_job", jobType);
        localStorage.setItem("vlue_auth_mode", authMode || "direct");
        if (companyLocked) localStorage.setItem("vlue_company_locked", companyLocked);
      } catch {
        /* ignore */
      }
      const needsPostSignupPayment = isBillableMembershipKind(membershipKind);
      const lineCount = isB2b ? countGroupBillableLines({ ...groupSignupDraft, enabled: true }) : 0;
      const postSignupPayment = needsPostSignupPayment
        ? {
            membershipKind,
            billingCycle: paidBillingCycle,
            amountKrw: paidChargeKrw,
            label: isB2b
              ? `기업 단체 · ${lineCount}회선 · ${String(groupSignupDraft.companyName || "").trim() || "기업"}`
              : referralMeta.codeForApi
                ? `유료 · 추천인 ${referralMeta.codeForApi}`
                : "유료 멤버십"
          }
        : null;
      onComplete?.({
        membershipTier: membershipKind,
        membershipKind,
        paidBillingCycle,
        referralCode: referralMeta.codeForApi || null,
        authMode,
        postSignupPayment,
        ...extra
      });
    },
    [
      membershipKind,
      paidBillingCycle,
      paidChargeKrw,
      referralMeta,
      referralCode,
      roadAddress,
      addressDetail,
      jobType,
      authMode,
      companyLocked,
      isB2b,
      groupSignupDraft,
      onComplete
    ]
  );

  const registerBiometric = async () => {
    setBusy(true);
    setBioNote("");
    try {
      if (!isWebAuthnSupported()) {
        setBioNote(
          "이 환경에서는 WebAuthn(생체)을 쓸 수 없습니다. HTTPS 또는 localhost, 그리고 최신 Chrome/Samsung Internet 등으로 열어 주세요."
        );
        setBusy(false);
        return;
      }
      const ok = await webauthnRegisterBiometric();
      if (ok) {
        try {
          localStorage.setItem("vlue_biometric_registered", "1");
          localStorage.removeItem("vlue_biometric_demo");
        } catch {
          /* ignore */
        }
        setBioRegistered(true);
        setBioNote(
          `${bioProfile.methodSummary} 등록이 완료되었습니다. 이후 민감 작업 시 재요청될 수 있습니다.`
        );
      } else {
        setBioNote("등록에 실패했습니다. 저장 공간을 확인하거나 다시 시도해 주세요.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setBioNote(`등록이 완료되지 않았습니다. (${msg}) ${bioProfile.cancelHint}`);
    }
    setBusy(false);
  };

  /** LAN·HTTP 등 비보안 출처에서는 WebAuthn 자체가 막힘 — npm run dev 빌드에서만 플로우 검증용 우회 */
  const registerBiometricDevBypass = () => {
    if (!import.meta.env.DEV) return;
    try {
      localStorage.setItem("vlue_biometric_demo", "1");
      localStorage.removeItem("vlue_biometric_registered");
    } catch {
      /* ignore */
    }
    setBioRegistered(true);
    setBioNote(
      "개발 전용: 실제 생체 등록 없이 통과합니다. 실제 지문·보안키 테스트는 https 또는 localhost에서 하세요."
    );
  };

  const goBack = () => {
    if (step === "tier") {
      onCancel?.();
      return;
    }
    if (step === "terms") {
      setStep("tier");
      return;
    }
    if (step === "pass") {
      setStep("account");
      return;
    }
    if (step === "account") {
      setStep("terms");
      return;
    }
    if (step === "direct_detail") {
      setStep("pass");
      return;
    }
    if (step === "complete") {
      setStep("direct_detail");
    }
  };

  const shell = (
    <div className="fixed inset-0 z-[1000002] flex flex-col bg-[#eef2f7]">
      <div className="shrink-0 border-b border-slate-200 bg-white px-3 pb-3 pt-[max(12px,env(safe-area-inset-top,0px))]">
        <div className="flex items-center gap-1 py-2">
          <BackButton variant="inline" onBack={goBack} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-[13px] font-bold text-slate-800">VLUE 가입 · 검증</p>
              <span className="shrink-0 text-[10px] font-medium text-slate-400">{TERMS_VERSION}</span>
            </div>
          </div>
        </div>
        <div className="mx-auto h-1.5 max-w-md overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <p className="mx-auto mt-1 max-w-md text-[10px] text-slate-500">
          멤버십 선택 → 약관 → 아이디·비밀번호 → PASS 본인확인 → 주소 확인 → 완료
        </p>
        <div className="mx-auto mt-2 max-w-md rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-[10px] leading-relaxed text-indigo-950 [word-break:keep-all]">
          <b>회원가입</b>으로만 계정이 생성됩니다. 카카오·네이버는 가입 완료 후 마이페이지 「소셜 로그인 연동」에서 1:1로 연결하세요.
        </div>
      </div>

      <div className="vlue-scroll-pad-bottom-nav min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-md space-y-3 pb-28">
          {step === "tier" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-[16px] font-black text-slate-900">멤버십 선택</h2>
                  <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
                    일반(무료) · 유료 · 기업 단체(B2B) 중 선택하세요. 유료·기업은 <b>가입 완료 후</b> 결제창에서 첫 요금을 결제합니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBenefitsModalTab("compare");
                    setBenefitsModalOpen(true);
                  }}
                  className="shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[10px] font-black text-blue-700"
                >
                  혜택 비교
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {[
                  {
                    id: "free",
                    title: "일반 회원 (Free)",
                    sub: "통화 신원 확인 · 서류 양식 · VLUE PAGE"
                  },
                  {
                    id: "paid",
                    title: "유료 회원 (Paid)",
                    sub: `${PAID_MEMBERSHIP_SUBLINE} · AI광고 · 가족보호(1:3)`
                  },
                  {
                    id: "b2b",
                    title: "기업 단체 회원 (B2B)",
                    sub: B2B_MEMBERSHIP_SUBLINE
                  }
                ].map((t) => (
                  <div
                    key={t.id}
                    className={`overflow-hidden rounded-xl border transition ${
                      membershipKind === t.id
                        ? t.id === "b2b"
                          ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200"
                          : "border-blue-500 bg-blue-50 ring-1 ring-blue-200"
                        : "border-slate-200 bg-slate-50/80"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => selectMembershipKind(t.id)}
                      className="w-full px-3 py-3 text-left active:bg-blue-100/40"
                    >
                      <p className="text-[14px] font-black text-slate-900">{t.title}</p>
                      <p className="mt-1 text-[11px] leading-snug text-slate-600">{t.sub}</p>
                    </button>
                    <div className="border-t border-slate-200/80 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => {
                          setBenefitsModalTab(t.id);
                          setBenefitsModalOpen(true);
                        }}
                        className="text-[11px] font-bold text-blue-600 underline-offset-2 hover:underline"
                      >
                        혜택·서비스 자세히 보기 →
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <MembershipBenefitsCompare
                open={benefitsModalOpen}
                initialTab={benefitsModalTab}
                onClose={() => setBenefitsModalOpen(false)}
              />

              {isPaidMembershipKind(membershipKind) && (
                <div className="mt-4 space-y-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                  <p className="text-[12px] font-black text-slate-900">유료 회원 · 결제 주기 (가입 후 결제)</p>
                  <div className="flex gap-2">
                    {[
                      { id: "monthly", label: "월결제" },
                      { id: "annual", label: "1년 구독" }
                    ].map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setPaidBillingCycle(b.id)}
                        className={`flex-1 rounded-lg py-2.5 text-[12px] font-black ${
                          paidBillingCycle === b.id ? "bg-blue-600 text-white" : "bg-white text-slate-700 border border-slate-200"
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                  <ReferralCodeVerifyBlock
                    billingCycle={paidBillingCycle}
                    referralCode={referralCode}
                    onReferralCodeChange={setReferralCode}
                    onMetaChange={setReferralMeta}
                    hidePaymentPreview
                  />
                  <p className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-[10px] leading-relaxed text-slate-600">
                    {INDIVIDUAL_TO_GROUP_CONVERSION_NOTICE}
                  </p>
                  {paidPaymentPreview ? (
                    <div className="rounded-lg border border-blue-100 bg-white/90 px-3 py-2">
                      <p className="text-[10px] font-bold text-slate-500">예상 결제 (가입 후)</p>
                      <p className="text-[16px] font-black tabular-nums text-blue-800">
                        {paidPaymentPreview.amountLabel}
                      </p>
                      <p className="text-[10px] text-slate-600">
                        {paidPaymentPreview.detailLine} · {paidBillingCycle === "annual" ? "1년 구독" : "월결제"}
                      </p>
                      {paidPaymentPreview.badges?.length ? (
                        <p className="mt-0.5 text-[10px] font-semibold text-blue-900/85">
                          {paidPaymentPreview.badges.join(" · ")}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  <p className="text-[10px] font-semibold text-blue-900/80">{POST_SIGNUP_PAYMENT_NOTICE}</p>
                </div>
              )}

              {isB2b && (
                <B2bSignupFields
                  draft={groupSignupDraft}
                  onDraftChange={persistGroupDraft}
                  billingCycle={paidBillingCycle}
                  onBillingCycleChange={setPaidBillingCycle}
                  referralCode={referralCode}
                  onReferralCodeChange={setReferralCode}
                  onReferralMetaChange={setReferralMeta}
                />
              )}

              <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-[11px] font-semibold leading-relaxed text-amber-950/90">
                PASS·휴대폰 본인확인 및 {bioProfile.onboardingMandatory}은 필수입니다. 인증된 실명·휴대폰 등은 연동 후{" "}
                <span className="font-black">수정 불가</span>입니다. 특정 거래 시 생체 재인증이 요구될 수 있습니다.
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={registerBiometric}
                className="mt-4 w-full rounded-2xl bg-slate-900 py-3 text-[14px] font-black text-white shadow-md disabled:opacity-50"
              >
                {busy
                  ? "처리 중…"
                  : bioRegistered
                    ? `${bioProfile.methodSummary} 등록 완료 · 다시 등록`
                    : bioProfile.registerButtonLabel}
              </button>
              {bioNote && <p className="mt-2 text-[11px] text-slate-600">{bioNote}</p>}

              {import.meta.env.DEV && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={registerBiometricDevBypass}
                  className="mt-2 w-full rounded-xl border border-dashed border-amber-400/90 bg-amber-50/80 py-2.5 text-[12px] font-bold text-amber-950/90"
                >
                  개발 전용: 생체 없이 다음 단계 허용 (HTTP·LAN 테스트)
                </button>
              )}

              <button
                type="button"
                disabled={!bioRegistered}
                onClick={() => {
                  if (isB2b) {
                    const rv = validateReferralMetaB2b(referralMeta);
                    if (!rv.ok) {
                      setVerifyZone({ ok: false, text: rv.message });
                      return;
                    }
                    const gv = validateGroupSignupDraft(syncDraftToPlannedLineCount({ ...groupSignupDraft, enabled: true }));
                    if (!gv.ok) {
                      setVerifyZone({ ok: false, text: gv.message });
                      return;
                    }
                  } else if (isPaidMembershipKind(membershipKind)) {
                    const v = validateReferralMeta(referralMeta);
                    if (!v.ok) {
                      setVerifyZone({ ok: false, text: v.message });
                      return;
                    }
                  }
                  setVerifyZone(null);
                  setStep("terms");
                }}
                className="mt-3 w-full rounded-2xl bg-blue-600 py-3.5 text-[14px] font-black text-white shadow-md disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                다음 · 서비스 약관
              </button>
            </section>
          )}

          {step === "terms" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-[16px] font-black text-slate-900">서비스 이용 약관 · 통합 동의</h2>
              <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
                <span className="font-bold text-slate-700">약관 동의 및 PASS 본인확인(필수)</span> · 서비스 이용약관 · 개인정보 처리방침 ·{" "}
                <span className="font-bold text-amber-900/95">[중요] {REFERRAL_PRECAUTION_TITLE}</span> · 실명·생체 보안 설정에 동의합니다.
              </p>
              <div className="mt-3 max-h-[min(42vh,360px)] overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-[12px] leading-relaxed text-slate-800">
                {TERMS_ARTICLES.map((art) => (
                  <div key={art.id} className="mb-4 last:mb-0">
                    <h3 className="text-[13px] font-black text-slate-900">{art.title}</h3>
                    {art.paragraphs?.map((p, i) => (
                      <p key={i} className="mt-2 text-[12px] text-slate-700">
                        {p}
                      </p>
                    ))}
                    {art.dangerBlocks?.map((p, i) => (
                      <p key={i} className="mt-2 text-[12px] font-semibold text-amber-900/95">
                        {p}
                      </p>
                    ))}
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                {TERMS_ARTICLES.map((art) => (
                  <label key={art.id} className="flex cursor-pointer items-start gap-2 text-[13px] font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={!!agreedById[art.id]}
                      onChange={() => toggleArticle(art.id)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600"
                    />
                    <span>{art.title} 확인 · 동의</span>
                  </label>
                ))}
                <label className="flex cursor-pointer items-start gap-2 border-t border-slate-100 pt-2 text-[13px] font-black text-blue-900">
                  <input
                    type="checkbox"
                    checked={masterAgree}
                    onChange={toggleMaster}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                  <span>필수 약관 전체 동의</span>
                </label>
                <label className="flex cursor-pointer items-start gap-2 text-[13px] font-bold text-amber-950/95">
                  <input
                    type="checkbox"
                    checked={jointGuarantorAgree}
                    onChange={() => setJointGuarantorAgree((v) => !v)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-700"
                  />
                  <span>{REFERRAL_PRECAUTION_AGREE}</span>
                </label>
              </div>

              <button
                type="button"
                disabled={!termsGate || busy}
                onClick={submitTerms}
                className="mt-5 w-full rounded-2xl bg-blue-600 py-3.5 text-[14px] font-black text-white shadow-md disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {busy ? "기록 중…" : "다음 · 아이디·비밀번호 설정"}
              </button>
            </section>
          )}

          {step === "account" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-[16px] font-black text-slate-900">회원 ID · 비밀번호</h2>
              <p className="mt-2 text-[12px] leading-relaxed text-slate-600">
                로그인에 사용할 <b>ID</b>와 <b>비밀번호</b>를 설정합니다. 세부 규정은 약관 제8조를 확인해 주세요.
              </p>
              <div className="mt-4 space-y-2">
                <FormRow icon={<IconLayers className="h-4 w-4 text-slate-500" />} label="회원 ID">
                  <input
                    type="text"
                    inputMode="text"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={desiredMemberId}
                    onChange={(e) => setDesiredMemberId(e.target.value)}
                    placeholder="예: hong_gildong"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[13px] outline-none focus:border-blue-400"
                  />
                </FormRow>
                <p className="text-[10px] leading-relaxed text-slate-500 pl-0.5">
                  영문 소문자 시작 · 3~20자 · 숫자 1자 이상
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => runCheckLoginId(normalizeMemberHandleSlug(desiredMemberId))}
                    className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-[11px] font-black text-slate-800 active:scale-[0.99] disabled:opacity-50"
                  >
                    아이디 중복확인
                  </button>
                  {idCheck.status === "checking" ? (
                    <span className="text-[11px] text-slate-500">확인 중…</span>
                  ) : idCheck.status === "ok" ? (
                    <span className="text-[11px] font-bold text-emerald-700">{idCheck.message}</span>
                  ) : idCheck.status === "taken" || idCheck.status === "invalid" ? (
                    <span className="text-[11px] font-bold text-red-700">{idCheck.message}</span>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <FormRow icon={<span className="text-slate-500">🔑</span>} label="비밀번호">
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder={MEMBER_PASSWORD_HINT}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[13px] outline-none focus:border-blue-400"
                  />
                </FormRow>
                <FormRow icon={<span className="text-slate-500">🔑</span>} label="비밀번호 확인">
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={signupPasswordConfirm}
                    onChange={(e) => setSignupPasswordConfirm(e.target.value)}
                    placeholder="비밀번호 재입력"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[13px] outline-none focus:border-blue-400"
                  />
                </FormRow>
                <p className="text-[10px] leading-relaxed text-slate-500 pl-0.5">
                  {MEMBER_PASSWORD_HINT}
                </p>
              </div>
              {verifyZone && !verifyZone.ok && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-800">{verifyZone.text}</p>
              )}
              <button
                type="button"
                onClick={submitAccountNext}
                className="mt-4 w-full rounded-2xl bg-blue-600 py-3.5 text-[14px] font-black text-white shadow-md"
              >
                다음 · PASS 본인인증
              </button>
            </section>
          )}

          {step === "pass" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-[16px] font-black text-slate-900">PASS 본인확인</h2>
              <p className="mt-2 text-[12px] leading-relaxed text-slate-600">
                포트원(아임포트) 휴대폰 본인인증입니다. 완료 후 실명·CI 해시가 저장되며 실명은 <b>변경 불가</b>입니다.
              </p>
              <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-xl border border-amber-200/90 bg-amber-50/90 px-3 py-2.5 text-[12px] font-semibold text-amber-950">
                <input
                  type="checkbox"
                  checked={passBusinessMember}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setPassBusinessMember(on);
                    if (!on) {
                      setPassBusinessNoJobTitle(false);
                      setPassBusinessJobTitle("");
                    }
                  }}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-amber-400 text-amber-700"
                />
                <span>
                  사업자(법인·개인사업자)로 VLUE에 가입합니다. (가입 직후 계정 상태: 승인 대기 · 실제 운영 시 승인까지 최대{" "}
                  <b>48시간</b>이 소요될 수 있습니다.)
                </span>
              </label>
              {passBusinessMember ? (
                <div className="mt-3 space-y-2">
                  <FormRow icon={<IconBriefcase className="h-4 w-4 text-slate-500" />} label="사업자등록번호">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={passBusinessRegNo}
                      onChange={(e) => setPassBusinessRegNo(e.target.value)}
                      placeholder="10자리 (하이픈 생략 가능)"
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[13px] outline-none focus:border-blue-400"
                    />
                  </FormRow>
                  <FormRow icon={<IconUsers className="h-4 w-4 text-slate-500" />} label="직책">
                    <input
                      type="text"
                      value={passBusinessJobTitle}
                      onChange={(e) => setPassBusinessJobTitle(e.target.value)}
                      placeholder="예: 대표이사, 총괄 매니저"
                      disabled={passBusinessNoJobTitle}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[13px] outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </FormRow>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/90 px-2.5 py-2 text-[12px] font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={passBusinessNoJobTitle}
                      onChange={(e) => {
                        const c = e.target.checked;
                        setPassBusinessNoJobTitle(c);
                        if (c) setPassBusinessJobTitle("");
                      }}
                      className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600"
                    />
                    <span>직책 없음 (명함에는 성명만 표시)</span>
                  </label>
                  <p className="text-[10px] leading-relaxed text-slate-500">
                    직책이 있으면 입력해 주세요. 없으면 위 체크 후 본인인증을 진행하면 명함에는 이름만 나옵니다.
                  </p>
                </div>
              ) : null}
              <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-xl border border-blue-200/90 bg-blue-50/80 px-3 py-2.5 text-[12px] font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={requestDigitalCard}
                  onChange={(e) => setRequestDigitalCard(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-blue-300 text-blue-600"
                />
                <span>
                  <b>VLUE 명함</b> 발급을 신청합니다. 체크 시 본인인증 완료 직후 서버에 명함 레코드가 생성되며, 앱에서 명함 공유·표시가 활성화됩니다. 미체크 시 명함은 만들어지지 않습니다.
                </span>
              </label>
              {verifyZone && !verifyZone.ok && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-800">{verifyZone.text}</p>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => runPortonePass()}
                className="mt-4 w-full rounded-2xl bg-slate-900 py-3.5 text-[14px] font-black text-white shadow-md disabled:opacity-50"
              >
                {busy ? "본인인증 처리 중…" : "PASS 본인인증 시작"}
              </button>
              {import.meta.env.DEV && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => runPortonePass({ devBypass: true })}
                  className="mt-2 w-full rounded-xl border border-dashed border-amber-400/90 bg-amber-50/80 py-2.5 text-[12px] font-bold text-amber-950/90"
                >
                  개발 전용: PASS 우회 (이니시스 오류 시 E2E·멤버십 DB 검증)
                </button>
              )}
              <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                팝업에 KG이니시스 「서비스 이용에 불편을 드려 죄송합니다」(
                <a
                  href="https://sa.inicis.com/resources/error/error.html"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  sa.inicis.com
                </a>
                )가 뜨면 포트원 콘솔에서 <b>통합본인인증</b> 채널·MID·<code className="text-[9px]">http://localhost:5173</code> 허용을 확인하세요. 루트{" "}
                <code className="text-[9px]">.env</code>에 <code className="text-[9px]">VITE_IAMPORT_CERT_PG=inicis_unified</code>·필요 시{" "}
                <code className="text-[9px]">VITE_IAMPORT_CERT_OMIT_MID=true</code>. 콘솔 `[VLUE 본인인증 요청]`의 <code className="text-[9px]">pg</code> 값을 확인하세요.
              </p>
            </section>
          )}

          {step === "auth_choice" && (
            <section className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-[16px] font-black text-slate-900">직접 인증 / 추천(보증) 인증</h2>
                <p className="mt-2 text-[12px] leading-relaxed text-slate-600">
                  스탠다드·프리미엄은 <b>명함·직군 확인</b>이 필수입니다. 직장인·사업자·전문·크리에이터 등 트랙별로 요구 정보가 다릅니다.
                </p>
                <ul className="mt-3 list-disc space-y-1 pl-4 text-[11px] font-medium text-slate-600">
                  <li>검증·승인 처리 최대 48시간(사업자 가입 등은 운영 정책에 따라 지연될 수 있음)</li>
                  {REFERRAL_PRECAUTION_BULLETS.map((line) => (
                    <li key={line} className={line.includes("부정") ? "text-amber-950/95" : undefined}>
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("direct");
                  setStep("direct_detail");
                }}
                className="w-full rounded-2xl bg-blue-600 py-4 text-[14px] font-black text-white shadow-md"
              >
                직접 인증 — 직군·표준정보 입력
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("recommend");
                  setRecPhase(1);
                  setStep("recommend_detail");
                }}
                className="w-full rounded-2xl border-2 border-indigo-200 bg-indigo-50/80 py-4 text-[14px] font-black text-indigo-950"
              >
                추천(보증) 인증 — 지인·동료 인증
              </button>
            </section>
          )}

          {step === "direct_detail" && (
            <section className="space-y-3">
              <div className="rounded-xl border border-blue-100 bg-blue-50/80 px-3 py-2 text-[11px] font-semibold text-blue-950/90">
                「우편번호 · 주소 찾기」에서 등본과 동일한 도로명(또는 지번)을 검색·선택한 뒤, 상세주소(동·호)를 입력하세요.
              </div>

              <FormRow icon={<IconPin className="h-4 w-4" />} label="주소">
                <div className="space-y-2">
                  <p className="text-[11px] leading-snug text-slate-500">
                    아래 버튼을 누르면 카카오(다음) 우편번호 창이 열리고, 전국 도로명·지번을 검색해 등본과 같은 주소를 고를 수 있습니다.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={openAddressFinder}
                      className="rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-black text-white active:scale-[0.99]"
                    >
                      우편번호 · 주소 찾기
                    </button>
                    {roadAddress ? (
                      <button
                        type="button"
                        onClick={() => {
                          setRoadAddress("");
                          setVerifyZone(null);
                        }}
                        className="rounded-lg border border-slate-200 px-2.5 py-2 text-[11px] font-bold text-slate-600"
                      >
                        주소 초기화
                      </button>
                    ) : null}
                  </div>
                  <input
                    type="text"
                    value={roadAddress}
                    onChange={(e) => setRoadAddress(e.target.value)}
                    placeholder="검색이 안 되면 도로명·지번 주소를 직접 입력"
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[13px] outline-none focus:border-blue-400"
                  />
                  {roadAddress ? (
                    <p className="rounded-lg border border-emerald-100 bg-emerald-50/80 px-2 py-2 text-[12px] font-semibold text-emerald-900">선택됨: {roadAddress}</p>
                  ) : null}
                  {import.meta.env.DEV && (
                    <button
                      type="button"
                      onClick={() => {
                        setRoadAddress(DEV_SAMPLE_ROAD_ADDRESS);
                        setVerifyZone({ ok: true, text: "개발용 샘플 주소가 채워졌습니다." });
                      }}
                      className="rounded-lg border border-dashed border-amber-400/90 bg-amber-50/80 px-2.5 py-2 text-[11px] font-bold text-amber-950/90"
                    >
                      개발 전용: 샘플 주소 채우기
                    </button>
                  )}
                </div>
              </FormRow>

              <FormRow icon={<IconPin className="h-4 w-4" />} label="상세">
                <input
                  value={addressDetail}
                  onChange={(e) => setAddressDetail(e.target.value)}
                  placeholder="동·호수 등 상세주소"
                  className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[13px] outline-none focus:border-blue-400"
                />
              </FormRow>

              <FormRow icon={<IconLayers className="h-4 w-4" />} label="분류">
                <select
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  className="w-full rounded-lg border border-dashed border-slate-300 bg-white px-2 py-2 text-[13px] outline-none focus:border-blue-400"
                >
                  <option value="">--선택--</option>
                  <option value="office">직장인</option>
                  <option value="business">사업자</option>
                  <option value="professional">전문직(면허)</option>
                  <option value="influencer">크리에이터</option>
                  <option value="freelancer">프리랜서(활동목적)</option>
                </select>
              </FormRow>

              <p className="text-[11px] font-medium text-slate-500">
                {isBillableMembershipKind(membershipKind)
                  ? "유료·기업 멤버십은 본인·주소 확인 후 가입이 완료됩니다. 첫 구독 요금은 가입 완료 직후 결제창에서 진행합니다."
                  : "일반 회원은 본인·주소 확인 후 다음 단계로 진행합니다."}
              </p>

              {verifyZone && (
                <div
                  className={`rounded-xl px-3 py-2 text-[12px] font-bold ${
                    verifyZone.ok ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950"
                  }`}
                >
                  {verifyZone.text}
                </div>
              )}

              {isBillableMembershipKind(membershipKind) && (
                <div className="space-y-2 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3">
                  <p className="text-[12px] font-bold text-indigo-950">
                    {isB2b ? "기업 단체 B2B" : "유료 멤버십"} · {paidBillingCycle === "annual" ? "1년 구독" : "월 구독"} ·{" "}
                    <span className="text-indigo-700">{formatKrw(paidChargeKrw)}</span>
                  </p>
                  <p className="text-[10px] leading-relaxed text-indigo-900/80">{POST_SIGNUP_PAYMENT_NOTICE}</p>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  if (!roadAddress.trim()) {
                    setVerifyZone({ ok: false, text: "「우편번호 · 주소 찾기」로 등본 주소를 선택해 주세요." });
                    return;
                  }
                  if (!jobType) {
                    setVerifyZone({ ok: false, text: "분류(직군)를 선택해 주세요." });
                    return;
                  }
                  setVerifyZone({ ok: true, text: "가입 정보가 저장되었습니다." });
                  setStep("complete");
                }}
                className="w-full rounded-2xl bg-blue-600 py-3.5 text-[14px] font-black text-white shadow-md disabled:opacity-50"
              >
                검증 신청 완료로
              </button>
              {isBillableMembershipKind(membershipKind) && (
                <p className="text-[10px] font-semibold text-amber-950/90">
                  구독({paidBillingCycle === "annual" ? "1년" : "월"}) 결제는 가입 완료 후 진행됩니다. 단순 변심 환불은 제한될 수 있습니다.
                </p>
              )}
            </section>
          )}

          {step === "recommend_detail" && (
            <section className="space-y-3">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/80 px-3 py-2 text-[11px] font-semibold text-indigo-950">
                추천인은 요청 사유에 <b>직업군</b>만 기재할 수 있습니다. 그 외는 개인정보 대조 후 승인 여부가 결정됩니다.
              </div>

              {recPhase === 1 && (
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <FormRow icon={<IconUsers className="h-4 w-4" />} label="보증인">
                    <input
                      value={guarantorContact}
                      onChange={(e) => setGuarantorContact(e.target.value)}
                      placeholder="아이디 또는 휴대폰 번호"
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[13px] outline-none"
                    />
                  </FormRow>
                  <FormRow icon={<IconBriefcase className="h-4 w-4" />} label="사유">
                    <textarea
                      value={guarantorJobReason}
                      onChange={(e) => setGuarantorJobReason(e.target.value)}
                      rows={2}
                      placeholder="직업군만 입력 (예: 보험설계사 동료)"
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[13px] outline-none"
                    />
                  </FormRow>
                  <button type="button" onClick={sendGuarantorRequest} className="w-full rounded-2xl bg-indigo-600 py-3 text-[14px] font-black text-white">
                    인증 요청 보내기 (데모)
                  </button>
                </div>
              )}

              {recPhase === 2 && (
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-[12px] text-slate-700">보증인에게 인증번호·요청 사유가 전송되었습니다. (데모: 아무 번호 4자리 이상)</p>
                  <input
                    value={guarantorOtp}
                    onChange={(e) => setGuarantorOtp(e.target.value)}
                    placeholder="발급된 인증번호"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-[15px] outline-none"
                  />
                  <button type="button" onClick={verifyGuarantorOtp} className="w-full rounded-2xl bg-blue-600 py-3 font-black text-white">
                    확인
                  </button>
                </div>
              )}

              {recPhase === 3 && (
                <div className="space-y-3">
                  <FormRow icon={<IconUsers className="h-4 w-4" />} label="이름">
                    <input
                      value={recName}
                      onChange={(e) => setRecName(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[13px] outline-none"
                    />
                  </FormRow>
                  <FormRow icon={<IconPin className="h-4 w-4" />} label="주소">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={openAddressFinder}
                          className="rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-black text-white active:scale-[0.99]"
                        >
                          우편번호 · 주소 찾기
                        </button>
                        {roadAddress ? (
                          <button
                            type="button"
                            onClick={() => setRoadAddress("")}
                            className="rounded-lg border border-slate-200 px-2.5 py-2 text-[11px] font-bold text-slate-600"
                          >
                            주소 초기화
                          </button>
                        ) : null}
                      </div>
                      {roadAddress ? (
                        <p className="rounded-lg border border-emerald-100 bg-emerald-50/80 px-2 py-2 text-[12px] font-semibold text-emerald-900">{roadAddress}</p>
                      ) : null}
                    </div>
                  </FormRow>
                  <FormRow icon={<IconPin className="h-4 w-4" />} label="상세">
                    <input
                      value={addressDetail}
                      onChange={(e) => setAddressDetail(e.target.value)}
                      placeholder="상세주소"
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[13px] outline-none"
                    />
                  </FormRow>
                  <button type="button" onClick={finishRecommendMinimal} className="w-full rounded-2xl bg-blue-600 py-3.5 font-black text-white">
                    가입 완료 · 검증 대기
                  </button>
                </div>
              )}
            </section>
          )}

          {step === "complete" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-[16px] font-black text-slate-900">검증 신청 완료</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
                신청이 접수되었습니다. 최대 <b>24시간</b> 이내에 심사 결과를 알려드립니다. VLUE 추천 안내 및 이용 정책이 적용됩니다.
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-4 text-[11px] text-slate-600">
                <li>
                  멤버십:{" "}
                  {membershipKind === "b2b"
                    ? "기업 단체 회원 (B2B)"
                    : membershipKind === "paid"
                      ? "유료 회원"
                      : "일반 회원 (Free)"}
                </li>
                {isBillableMembershipKind(membershipKind) ? (
                  <li>
                    결제 예정: {paidBillingCycle === "annual" ? "1년 구독" : "월결제"} · {formatKrw(paidChargeKrw)}
                    {isB2b
                      ? ` · ${countGroupBillableLines({ ...groupSignupDraft, enabled: true })}회선 (${groupSignupDraft.companyName || "기업"})`
                      : referralMeta.codeForApi
                        ? ` · 추천인 ${referralMeta.codeForApi}`
                        : ""}
                    {!isB2b && referralMeta.verified && referralMeta.sponsorDisplayName
                      ? ` (${referralMeta.sponsorDisplayName})`
                      : ""}
                    <span className="block text-indigo-800">→ VLUE 시작하기 후 결제창</span>
                  </li>
                ) : null}
                <li>추천: 지인(전화번호 10% 포인트) · 홍보 VLUER(고유 코드 15%/5% 캐시)</li>
                <li>주소: {roadAddress || "—"} {addressDetail}</li>
              </ul>
              <button
                type="button"
                onClick={() => persistAndComplete({ biometric: bioRegistered ? "registered" : "skipped" })}
                className="mt-6 w-full rounded-2xl bg-slate-900 py-3.5 text-[14px] font-black text-white"
              >
                VLUE 시작하기
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined" || !document.body) return shell;
  return createPortal(shell, document.body);
}
