import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { TERMS_ARTICLES, TERMS_CHECKLIST_IDS, TERMS_VERSION } from "../legal/vlueTermsArticles.js";
import { REFERRAL_PRECAUTION_AGREE, REFERRAL_PRECAUTION_BULLETS, REFERRAL_PRECAUTION_TITLE } from "../legal/vlueReferralNotice.js";
import { setVlueSessionTokens } from "../lib/vlueAuthHeaders.js";
import { logTermsAgreement } from "../lib/termsLog.js";
import { apiUrl, getApiBase } from "../lib/apiBase.js";
import { makeDevLocalImpUid, postPortoneIdentityComplete } from "../lib/identityCompleteApi.js";
import { approveParentalConsentWithPass, requestParentalConsentToGuardian } from "../lib/parentalConsentApi.js";
import { requestIamportCertification, consumeIamportCertRedirectResult, shouldUseIamportCertRedirect } from "../lib/iamportClient.js";
import { getPortoneUserCode } from "../lib/portoneEnv.js";
import { DEV_SAMPLE_ROAD_ADDRESS, openDaumPostcode } from "../lib/daumPostcode.js";
import { formatPhoneE164ForKoreaDisplay } from "../lib/phoneDisplay.js";
import { isValidMemberHandleSlug, normalizeMemberHandleSlug } from "../lib/memberHandleRules.js";
import { isValidMemberPassword, MEMBER_PASSWORD_HINT, MEMBER_PASSWORD_INVALID_MESSAGE } from "../lib/memberPasswordRules.js";
import { marketingLegalUrl, marketingMinorPolicyUrl } from "../lib/legalPageLinks.js";
import { hasNativeAppLockBridge, requestAppPinSetup, getAppLockStatus } from "../lib/appLockBridge.js";
import { formatKrw, isBillableMembershipKind, isB2bMembershipKind, isPaidMembershipKind, paidAmountKrw, buildPaymentPreview, PAID_MEMBERSHIP_SUBLINE, B2B_MEMBERSHIP_SUBLINE, POST_SIGNUP_PAYMENT_NOTICE, PAID_LIST_PRICE_MONTHLY_KRW, PAID_EVENT_MONTHLY_KRW, PAID_LAUNCH_DISCOUNT_NOTE, PAID_ANNUAL_BENEFIT_NOTE } from "../lib/membershipBm.js";
import { v1AppShell } from "../lib/v1ReleaseScope.js";
import {
  LETTERING_SIGNUP_DOC_KINDS,
  LETTERING_VERIFY_DOC_ACCEPT,
  LETTERING_VERIFY_DOC_ACCEPT_LABEL,
  isVerifyDocIssuedWithinLimit,
  prepareLetteringVerifyDocFromFile
} from "../lib/letteringBizcardVerification.js";
import ReferralCodeVerifyBlock, { validateReferralMeta } from "./ReferralCodeVerifyBlock.jsx";
import TwoTrackSignupFields from "./TwoTrackSignupFields.jsx";
import B2bSignupFields, { validateReferralMetaB2b } from "./B2bSignupFields.jsx";
import MembershipBenefitsCompare from "./MembershipBenefitsCompare.jsx";
import BackButton from "./common/BackButton";
import { VlueEyeMark } from "./VlueEyeMark.jsx";
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

const PASS_CERT_DRAFT_KEY = "vlue_pass_cert_draft_v1";

function savePassCertDraft(draft) {
  try {
    sessionStorage.setItem(PASS_CERT_DRAFT_KEY, JSON.stringify({ ...draft, at: Date.now() }));
  } catch {
    /* ignore */
  }
}

function readPassCertDraft() {
  try {
    const raw = sessionStorage.getItem(PASS_CERT_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    /* 30분 초과 초안 폐기 */
    if (parsed.at && Date.now() - Number(parsed.at) > 30 * 60 * 1000) {
      sessionStorage.removeItem(PASS_CERT_DRAFT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function clearPassCertDraft() {
  try {
    sessionStorage.removeItem(PASS_CERT_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

/** 좌측 라벨 + 우측 필드 — 모바일은 세로 스택 */
function FormRow({ icon, label, children, className = "" }) {
  return (
    <div
      className={`vlue-onb-form-row flex w-full flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white text-[13px] shadow-sm sm:flex-row ${className}`}
    >
      <div className="vlue-onb-form-row__label flex shrink-0 items-center gap-1.5 border-b border-slate-100 bg-[#eef3f9] px-3 py-2 sm:w-[7.5rem] sm:border-b-0 sm:border-r sm:px-2.5 sm:py-2">
        <span className="shrink-0 text-slate-500 [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
        <span className="text-[11px] font-medium leading-snug text-slate-700 sm:text-[12px]">{label}</span>
      </div>
      <div className="vlue-onb-form-row__field min-w-0 flex-1 bg-white px-3 py-2 sm:px-2 sm:py-1.5">{children}</div>
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

export default function VlueOnboarding({ onComplete, onCancel, signupIntent = "general", layout = "app" }) {
  const isWeb = layout === "marketing";
  const contentWrap = isWeb ? "vlue-onb-content-max mx-auto w-full space-y-4 pb-10" : "mx-auto max-w-md space-y-3 pb-28";
  const progressWrap = isWeb ? "vlue-onb-content-max mx-auto w-full" : "mx-auto max-w-md";
  const sectionCls = isWeb ? "vlue-onb-section rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" : "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm";
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
  const [digitalCardDocKind, setDigitalCardDocKind] = useState("");
  const [digitalCardDocName, setDigitalCardDocName] = useState("");
  const [digitalCardDocDataUrl, setDigitalCardDocDataUrl] = useState("");
  const [digitalCardDocIssuedAt, setDigitalCardDocIssuedAt] = useState("");

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
  const [requiresParentalConsent, setRequiresParentalConsent] = useState(false);
  const [parentalConsentDone, setParentalConsentDone] = useState(false);
  const [guardianHandle, setGuardianHandle] = useState("");
  const [parentRequestSent, setParentRequestSent] = useState(false);

  const [signupPassword, setSignupPassword] = useState("");
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState("");
  const [signupPwVisible, setSignupPwVisible] = useState(false);
  const [signupPwConfirmVisible, setSignupPwConfirmVisible] = useState(false);
  const [signupPwEyeBlink, setSignupPwEyeBlink] = useState(0);
  const [signupPwConfirmEyeBlink, setSignupPwConfirmEyeBlink] = useState(0);
  /** idle | checking | ok | taken | invalid */
  const [idCheck, setIdCheck] = useState({ status: "idle", message: "" });
  /** business_email | vlue_id_only — QA·일반은 아이디만(이메일 OTP 불필요) */
  const [signupTrack, setSignupTrack] = useState("vlue_id_only");
  const [businessEmail, setBusinessEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailVerify, setEmailVerify] = useState({ status: "idle", message: "", token: "" });
  const [businessVirtualId, setBusinessVirtualId] = useState("");
  const [needsCustomVirtualId, setNeedsCustomVirtualId] = useState(false);
  const [virtualIdCheck, setVirtualIdCheck] = useState({
    status: "idle",
    message: "",
    normalized: "",
    fullVirtualEmail: ""
  });

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
      } else if (data.code === "RESERVED") {
        setIdCheck({ status: "invalid", message: data.reason || "사칭 방지 및 회원 보호를 위해 사용할 수 없는 아이디입니다." });
      } else if (data.normalized == null) {
        setIdCheck({ status: "invalid", message: data.reason || "아이디 형식이 올바르지 않습니다." });
      } else {
        setIdCheck({ status: "taken", message: data.reason || "이미 사용 중인 아이디입니다." });
      }
    } catch {
      setIdCheck({ status: "invalid", message: "중복 확인 요청에 실패했습니다." });
    }
  }, []);

  const runCheckVirtualId = useCallback(async (slug) => {
    const s = String(slug || "").trim();
    if (!s) {
      setVirtualIdCheck({
        status: "invalid",
        message: "비즈니스 메일 ID를 입력해 주세요.",
        normalized: "",
        fullVirtualEmail: ""
      });
      return;
    }
    setVirtualIdCheck({ status: "checking", message: "", normalized: "", fullVirtualEmail: "" });
    try {
      const res = await fetch(
        apiUrl(`/api/auth/check-virtual-email-id?virtualId=${encodeURIComponent(s)}`)
      );
      const data = await res.json().catch(() => ({}));
      if (data.available && data.normalized) {
        setBusinessVirtualId(data.normalized);
        setVirtualIdCheck({
          status: "ok",
          message: `사용 가능: ${data.fullVirtualEmail || `${data.normalized}@vlue.kr`}`,
          normalized: data.normalized,
          fullVirtualEmail: data.fullVirtualEmail || ""
        });
      } else {
        setVirtualIdCheck({
          status: data.code === "RESERVED" ? "error" : "conflict",
          message: data.reason || "사용할 수 없는 ID입니다.",
          normalized: data.normalized || "",
          fullVirtualEmail: data.fullVirtualEmail || ""
        });
      }
    } catch {
      setVirtualIdCheck({
        status: "error",
        message: "중복 확인 요청에 실패했습니다.",
        normalized: "",
        fullVirtualEmail: ""
      });
    }
  }, []);

  useEffect(() => {
    /** PASS redirect 복귀 — WebView에서 popup 대신 m_redirect_url 로 돌아옴 */
    const redirect = consumeIamportCertRedirectResult();
    if (!redirect) return undefined;
    const draft = readPassCertDraft();
    if (!redirect.success || !redirect.imp_uid) {
      setStep("pass");
      setVerifyZone({
        ok: false,
        text: redirect.error_msg || "본인인증이 완료되지 않았습니다. 다시 시도해 주세요."
      });
      return undefined;
    }
    if (!draft?.password) {
      setStep("pass");
      setVerifyZone({
        ok: false,
        text: "본인인증은 완료됐으나 가입 정보가 유실되었습니다. 계정 단계에서 다시 진행해 주세요."
      });
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setBusy(true);
      setStep("pass");
      setVerifyZone({ ok: true, text: "본인인증 확인 중…" });
      try {
        const trackA = Boolean(draft.trackA);
        const allowBizCardOpts = Boolean(draft.allowBizCardOpts);
        const data = await postPortoneIdentityComplete({
          impUid: redirect.imp_uid,
          isBusinessMember: allowBizCardOpts && draft.passBusinessMember,
          requestDigitalCard: allowBizCardOpts && draft.requestDigitalCard,
          digitalCardDoc:
            allowBizCardOpts && draft.requestDigitalCard && draft.digitalCardDocDataUrl
              ? {
                  kind: draft.digitalCardDocKind,
                  fileName: draft.digitalCardDocName,
                  issuedAt: draft.digitalCardDocIssuedAt,
                  dataUrl: draft.digitalCardDocDataUrl
                }
              : null,
          membershipKind: draft.membershipKind,
          billingCycle: draft.paidBillingCycle,
          referralCode: draft.referralCodeForApi || null,
          termsVersion: TERMS_VERSION,
          desiredPublicHandle: trackA ? null : draft.slug,
          signupTrack: draft.signupTrack,
          businessEmail: trackA ? draft.businessEmail : null,
          emailVerificationToken: trackA ? draft.emailVerificationToken : null,
          virtualEmailPrefix: trackA ? draft.virtualEmailPrefix : null,
          password: draft.password,
          groupSignup: draft.isB2b ? draft.groupSignup : null,
          ...(allowBizCardOpts && draft.passBusinessMember
            ? {
                businessRegistrationNo: draft.passBusinessRegNo,
                businessJobTitle: draft.passBusinessNoJobTitle ? "" : draft.passBusinessJobTitle,
                businessDeclaresNoJobTitle: Boolean(draft.passBusinessNoJobTitle)
              }
            : {}),
          ...(draft.adminDeviceKey ? { adminDeviceKey: draft.adminDeviceKey } : {})
        });
        if (cancelled) return;
        clearPassCertDraft();
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
          }
          if (data.legalName) localStorage.setItem("vlue_legal_name", data.legalName);
          if (data.phoneE164) {
            localStorage.setItem("vlue_phone_e164", String(data.phoneE164));
            localStorage.setItem("myCardPhone", formatPhoneE164ForKoreaDisplay(data.phoneE164));
          }
          localStorage.setItem(
            "vlue_digital_card_active",
            data.digitalCard?.issued ? "1" : "0"
          );
        } catch {
          /* ignore */
        }
        setPassOk(true);
        setVerifyZone(null);
        /* 미성년도 본인 휴대폰이면 즉시 이용 — 부모승인 단계 생략 */
        setRequiresParentalConsent(false);
        setParentalConsentDone(true);
        if (draft.signupIntent === "trust") {
          setAuthMode("recommend");
          setRecPhase(1);
          setStep("recommend_detail");
        } else if (
          !isBillableMembershipKind(draft.membershipKind) &&
          draft.signupTrack === "vlue_id_only"
        ) {
          setAuthMode("direct");
          setStep("complete");
        } else {
          setAuthMode("direct");
          setStep("direct_detail");
        }
      } catch (e) {
        if (!cancelled) {
          setVerifyZone({ ok: false, text: e?.message || String(e) });
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    /** PASS 이후 단계에서는 재조회로 상태를 깨뜨리지 않음 (이미 계정 단계에서 통과함) */
    if (step !== "account" || signupTrack !== "vlue_id_only") return undefined;
    const slug = normalizeMemberHandleSlug(desiredMemberId);
    if (!slug) {
      setIdCheck({ status: "idle", message: "" });
      return undefined;
    }
    if (!isValidMemberHandleSlug(slug)) {
      setIdCheck({ status: "invalid", message: "형식을 확인해 주세요. (숫자 포함)" });
      return undefined;
    }
    const t = setTimeout(() => {
      runCheckLoginId(slug);
    }, 450);
    return () => clearTimeout(t);
  }, [desiredMemberId, runCheckLoginId, step, signupTrack]);

  const allArticlesAgreed = useMemo(() => TERMS_CHECKLIST_IDS.every((id) => agreedById[id]), [agreedById]);
  /** V1: 추천·리워드 동의는 미운영 — 체크 불필요 */
  const termsGate =
    allArticlesAgreed && masterAgree && (v1AppShell.referralProgram ? jointGuarantorAgree : true);

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
      if (id === "free") {
        setPassBusinessMember(false);
        setPassBusinessRegNo("");
        setPassBusinessJobTitle("");
        setPassBusinessNoJobTitle(false);
        setRequestDigitalCard(false);
        setDigitalCardDocKind("");
        setDigitalCardDocName("");
        setDigitalCardDocDataUrl("");
        setDigitalCardDocIssuedAt("");
      }
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
    const pw = String(signupPassword || "");
    if (!isValidMemberPassword(pw)) {
      setVerifyZone({ ok: false, text: MEMBER_PASSWORD_INVALID_MESSAGE });
      return;
    }
    if (pw !== String(signupPasswordConfirm || "")) {
      setVerifyZone({ ok: false, text: "비밀번호 확인이 일치하지 않습니다." });
      return;
    }

    if (signupTrack === "business_email") {
      const email = String(businessEmail || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setVerifyZone({ ok: false, text: "비즈니스 메일 주소를 올바르게 입력해 주세요." });
        return;
      }
      if (emailVerify.status !== "ok" || !emailVerify.token) {
        setVerifyZone({ ok: false, text: "이메일 인증을 완료해 주세요." });
        return;
      }
      if (virtualIdCheck.status !== "ok" || !virtualIdCheck.normalized) {
        setVerifyZone({
          ok: false,
          text: needsCustomVirtualId
            ? "나만의 비즈니스 메일 ID 중복확인을 완료해 주세요."
            : "@vlue.kr 주소 확인을 기다려 주세요."
        });
        return;
      }
      setStep("pass");
      return;
    }

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
        text: "아이디 사용 가능 여부가 확인되지 않았습니다. 「중복확인」을 눌러 주세요."
      });
      return;
    }
    setStep("pass");
  };

  const runPortonePass = async ({ devBypass = false } = {}) => {
    setBusy(true);
    setVerifyZone(null);
    try {
      const trackA = signupTrack === "business_email";
      const slug = trackA ? "auto" : normalizeMemberHandleSlug(desiredMemberId);
      if (!trackA) {
        if (!isValidMemberHandleSlug(slug)) {
          throw new Error("회원 ID는 영문 소문자로 시작하는 3~20자(소문자·숫자·_)이며 숫자를 한 글자 이상 포함해야 합니다.");
        }
        /**
         * 계정 단계에서 이미 통과해도, 백그라운드 재조회가 idCheck를 idle/checking으로 바꿀 수 있음.
         * PASS 직전 API로 최종 확인 (아래 recheck와 동일).
         */
        if (idCheck.status === "taken" || idCheck.status === "invalid") {
          throw new Error(idCheck.message || "아이디를 다시 확인해 주세요. 이전 단계로 돌아가 「중복확인」을 눌러 주세요.");
        }
      } else if (emailVerify.status !== "ok" || !emailVerify.token) {
        throw new Error("이메일 인증을 완료해 주세요.");
      } else if (!virtualIdCheck.normalized || virtualIdCheck.status !== "ok") {
        throw new Error("비즈니스 메일 @vlue.kr ID 확인을 완료해 주세요.");
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
      if (!adminDeviceKeyPre && !trackA) {
        const recheckRes = await fetch(
          apiUrl(`/api/auth/check-login-id?loginId=${encodeURIComponent(slug)}`)
        );
        const recheckData = await recheckRes.json().catch(() => ({}));
        if (!recheckData.available) {
          throw new Error(
            recheckData.reason ||
              "가입 직전 아이디 중복이 확인되었습니다. 이전 단계에서 아이디를 바꾼 뒤 다시 시도해 주세요."
          );
        }
        setIdCheck({ status: "ok", message: "사용 가능한 아이디입니다." });
      }
      if (isBillableMembershipKind(membershipKind) && passBusinessMember) {
        const digits = String(passBusinessRegNo || "").replace(/\D/g, "");
        if (digits.length !== 10) {
          throw new Error("사업자등록번호 10자리를 입력해 주세요.");
        }
        if (!passBusinessNoJobTitle && !String(passBusinessJobTitle || "").trim()) {
          throw new Error("직책을 입력하거나 「직책 없음」을 선택해 주세요.");
        }
      }
      if (isBillableMembershipKind(membershipKind) && requestDigitalCard) {
        if (!digitalCardDocKind) {
          throw new Error("디지털 인증명함 발급을 위해 증빙 서류 종류를 선택해 주세요.");
        }
        if (!digitalCardDocDataUrl || !digitalCardDocName) {
          throw new Error("재직증명서 사본 또는 사업자등록증 사본을 첨부해 주세요.");
        }
        if (!digitalCardDocIssuedAt || !isVerifyDocIssuedWithinLimit(digitalCardDocIssuedAt)) {
          throw new Error("증빙 서류는 발급일 기준 1개월 이내 서류만 제출할 수 있습니다.");
        }
      }
      let impUid;
      if (devBypass) {
        if (!import.meta.env.DEV) {
          throw new Error("개발 전용 본인인증 우회는 로컬 개발 빌드에서만 사용할 수 있습니다.");
        }
        const apiBase = String(import.meta.env.VITE_API_URL || getApiBase() || "").toLowerCase();
        const hitsProdApi =
          apiBase.includes("api.vlue.kr") ||
          apiBase.includes("vlueapi") ||
          (apiBase.includes("railway.app") && apiBase.includes("api"));
        if (hitsProdApi) {
          throw new Error(
            "PASS 우회는 로컬 API에서만 됩니다. 지금 프론트가 운영 API(api.vlue.kr)에 연결되어 있어 거부됩니다. 「PASS 본인인증 시작」으로 실연동하거나, VITE_API_URL을 로컬 API로 바꾼 뒤 다시 시도하세요."
          );
        }
        const devSlug =
          trackA && businessEmail
            ? String(businessEmail).split("@")[0].replace(/[^a-z0-9_]/gi, "").slice(0, 20) || "biz"
            : slug;
        impUid = makeDevLocalImpUid(devSlug);
      } else {
        const allowBizCardOptsPre = isBillableMembershipKind(membershipKind);
        const adminDeviceKeyPreSave =
          typeof sessionStorage !== "undefined" && sessionStorage.getItem("vlue-admin-entry") === "1"
            ? localStorage.getItem("vlue-admin-device-key")
            : null;
        if (shouldUseIamportCertRedirect()) {
          savePassCertDraft({
            trackA,
            slug,
            password: pw,
            passBusinessMember,
            requestDigitalCard,
            digitalCardDocKind,
            digitalCardDocName,
            digitalCardDocDataUrl,
            digitalCardDocIssuedAt,
            membershipKind,
            paidBillingCycle,
            referralCodeForApi: referralMeta.codeForApi || null,
            signupTrack,
            businessEmail: trackA ? String(businessEmail || "").trim() : null,
            emailVerificationToken: trackA ? emailVerify.token : null,
            virtualEmailPrefix: trackA ? virtualIdCheck.normalized : null,
            isB2b,
            groupSignup: isB2b ? serializeGroupSignupForApi(groupSignupDraft) : null,
            passBusinessRegNo: String(passBusinessRegNo || "").replace(/\D/g, "").slice(0, 10),
            passBusinessJobTitle: passBusinessNoJobTitle ? "" : String(passBusinessJobTitle || "").trim(),
            passBusinessNoJobTitle,
            allowBizCardOpts: allowBizCardOptsPre,
            adminDeviceKey: adminDeviceKeyPreSave,
            signupIntent
          });
        }
        const userCode = getPortoneUserCode();
        const rsp = await requestIamportCertification(userCode);
        impUid = rsp?.imp_uid;
        if (!impUid) {
          throw new Error("imp_uid가 없습니다. 본인인증이 완료됐는지 확인해 주세요.");
        }
      }
      const adminDeviceKey =
        typeof sessionStorage !== "undefined" && sessionStorage.getItem("vlue-admin-entry") === "1"
          ? localStorage.getItem("vlue-admin-device-key")
          : null;
      const allowBizCardOpts = isBillableMembershipKind(membershipKind);
      const data = await postPortoneIdentityComplete({
        impUid,
        isBusinessMember: allowBizCardOpts && passBusinessMember,
        requestDigitalCard: allowBizCardOpts && requestDigitalCard,
        digitalCardDoc:
          allowBizCardOpts && requestDigitalCard && digitalCardDocDataUrl
            ? {
                kind: digitalCardDocKind,
                fileName: digitalCardDocName,
                issuedAt: digitalCardDocIssuedAt,
                dataUrl: digitalCardDocDataUrl
              }
            : null,
        membershipKind,
        billingCycle: paidBillingCycle,
        referralCode: referralMeta.codeForApi || null,
        termsVersion: TERMS_VERSION,
        desiredPublicHandle: trackA ? null : slug,
        signupTrack,
        businessEmail: trackA ? String(businessEmail || "").trim() : null,
        emailVerificationToken: trackA ? emailVerify.token : null,
        virtualEmailPrefix: trackA ? virtualIdCheck.normalized : null,
        password: pw,
        groupSignup: isB2b ? serializeGroupSignupForApi(groupSignupDraft) : null,
        ...(allowBizCardOpts && passBusinessMember
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
          if (requestDigitalCard && digitalCardDocDataUrl) {
            localStorage.setItem("vlue_onboarding_digital_card_doc_kind", digitalCardDocKind);
            localStorage.setItem("vlue_onboarding_digital_card_doc_name", digitalCardDocName);
            localStorage.setItem("vlue_onboarding_digital_card_doc_issued_at", digitalCardDocIssuedAt);
            try {
              localStorage.setItem("vlue_onboarding_digital_card_doc_data", digitalCardDocDataUrl);
            } catch {
              /* data URL too large — server should collect on API later */
            }
          }
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
      clearPassCertDraft();
      /* 미성년도 본인 휴대폰이면 즉시 이용 — 부모승인 단계 생략 */
      setRequiresParentalConsent(false);
      setParentalConsentDone(true);
      if (signupIntent === "trust") {
        setAuthMode("recommend");
        setRecPhase(1);
        setStep("recommend_detail");
        return;
      }
      /* 무료 + 아이디만 가입: 주소/직군 단계 생략 → 바로 완료 (이메일·Daum 주소 없이 QA 가능) */
      if (!isBillableMembershipKind(membershipKind) && signupTrack === "vlue_id_only") {
        setAuthMode("direct");
        setVerifyZone({ ok: true, text: "본인인증이 완료되었습니다. 가입을 마무리해 주세요." });
        setStep("complete");
        return;
      }
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

  const runSendParentRequest = async () => {
    const handle = guardianHandle.trim().replace(/^@+/, "");
    if (!handle) {
      setVerifyZone({ ok: false, text: "부모 VLUE 아이디를 입력해 주세요." });
      return;
    }
    setBusy(true);
    setVerifyZone(null);
    try {
      await requestParentalConsentToGuardian(handle);
      setParentRequestSent(true);
      setVerifyZone({
        ok: true,
        text: "부모님 폰으로 승인 요청을 보냈습니다. PASS 승인이 완료되면 자동으로 다음 단계로 이동합니다."
      });
    } catch (e) {
      setVerifyZone({ ok: false, text: e?.message || String(e) });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!requiresParentalConsent || parentalConsentDone) return undefined;
    const onRemoteApproved = () => {
      setParentalConsentDone(true);
      setRequiresParentalConsent(false);
      try {
        localStorage.setItem("vlue_account_status", "active");
      } catch {
        /* ignore */
      }
      setVerifyZone({
        ok: true,
        text: "부모님 폰에서 승인이 완료되었습니다. 가족보호(자녀) 연동이 시작됩니다."
      });
      if (signupIntent === "trust") {
        setAuthMode("recommend");
        setRecPhase(1);
        setStep("recommend_detail");
      } else {
        setAuthMode("direct");
        setStep("direct_detail");
      }
    };
    window.addEventListener("vlue-parental-consent-approved", onRemoteApproved);
    return () => window.removeEventListener("vlue-parental-consent-approved", onRemoteApproved);
  }, [requiresParentalConsent, parentalConsentDone, signupIntent]);

  const runGuardianPass = async ({ devBypass = false } = {}) => {
    setBusy(true);
    setVerifyZone(null);
    try {
      await approveParentalConsentWithPass({ devBypass });
      setParentalConsentDone(true);
      setRequiresParentalConsent(false);
      try {
        localStorage.setItem("vlue_account_status", "active");
      } catch {
        /* ignore */
      }
      setVerifyZone({
        ok: true,
        text: "부모 승인이 완료되었습니다. 가족보호(자녀) 연동이 시작됩니다."
      });
      if (signupIntent === "trust") {
        setAuthMode("recommend");
        setRecPhase(1);
        setStep("recommend_detail");
      } else {
        setAuthMode("direct");
        setStep("direct_detail");
      }
    } catch (e) {
      setVerifyZone({ ok: false, text: e?.message || String(e) });
    } finally {
      setBusy(false);
    }
  };

  const persistAndComplete = useCallback(
    (extra) => {
      try {
        localStorage.setItem("vlue_membership_tier", membershipKind);
        localStorage.setItem("vlue_membership_kind", membershipKind);
        if (isBillableMembershipKind(membershipKind)) {
          localStorage.setItem("vlue_paid_billing_cycle", paidBillingCycle);
          if (!localStorage.getItem("vlue_subscription_paid_at")) {
            localStorage.setItem("vlue_subscription_paid_at", new Date().toISOString());
          }
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
      if (!hasNativeAppLockBridge()) {
        // 브라우저·PC: 앱에서 PIN 등록 — 가입 플로우는 통과
        setBioRegistered(true);
        setBioNote("모바일 VLUE 앱에서 6자리 PIN을 등록해 주세요. 지금은 가입을 계속할 수 있습니다.");
        setBusy(false);
        return;
      }
      const st = getAppLockStatus();
      if (st.hasPin) {
        setBioRegistered(true);
        setBioNote("앱 PIN이 이미 등록되어 있습니다.");
        setBusy(false);
        return;
      }
      const result = await requestAppPinSetup();
      if (result.ok) {
        setBioRegistered(true);
        setBioNote("6자리 앱 PIN 등록이 완료되었습니다.");
      } else {
        setBioNote("PIN 등록이 완료되지 않았습니다. 다시 시도해 주세요.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setBioNote(`PIN 등록 중 오류: ${msg}`);
    }
    setBusy(false);
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
    if (step === "parent_consent") {
      setStep("pass");
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
    <div
      data-vlue-onboarding={isWeb ? "marketing" : "app"}
      className={
        isWeb
          ? "fixed inset-0 z-[1000002] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm sm:p-6"
          : "fixed inset-0 z-[1000002] flex flex-col bg-[#eef2f7]"
      }
      onClick={isWeb ? (e) => { if (e.target === e.currentTarget) onCancel?.(); } : undefined}
      onKeyDown={undefined}
      role={isWeb ? "dialog" : undefined}
      aria-modal={isWeb ? true : undefined}
    >
      <div
        className={
          isWeb
            ? "flex max-h-[min(92vh,980px)] w-full max-w-[min(1280px,96vw)] flex-col overflow-hidden rounded-3xl bg-[#eef2f7] shadow-2xl"
            : "flex min-h-0 flex-1 flex-col"
        }
        onClick={isWeb ? (e) => e.stopPropagation() : undefined}
      >
      {isWeb ? (
        <div className="shrink-0 bg-gradient-to-br from-primary-600 to-blue-700 px-5 pb-5 pt-5 text-white sm:px-8">
          <div className={`${progressWrap} flex items-start justify-between gap-4`}>
            <div className="min-w-0">
              <p className="text-lg font-black tracking-tight sm:text-xl">회원가입</p>
              <p className="mt-1 text-sm text-white/75 sm:text-base">모바일 앱과 동일한 본인인증·약관 절차</p>
            </div>
            <button
              type="button"
              onClick={() => onCancel?.()}
              className="shrink-0 rounded-xl p-2 text-white/80 transition hover:bg-white/15 hover:text-white"
              aria-label="가입 닫기"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className={`${progressWrap} mt-4 h-2 overflow-hidden rounded-full bg-white/25`}>
            <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <p className={`${progressWrap} mt-2 text-sm text-white/70`}>
            멤버십 선택 → 약관 → 아이디·비밀번호 → PASS 본인확인 → 주소 확인 → 완료
          </p>
          <div className={`${progressWrap} mt-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm leading-relaxed text-white/90 [word-break:keep-all]`}>
            <b>회원가입</b>으로만 계정이 생성됩니다. 카카오·네이버는 가입 완료 후 마이페이지 「소셜 로그인 연동」에서 1:1로 연결하세요.
          </div>
        </div>
      ) : (
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
          <div className={`${progressWrap} h-1.5 overflow-hidden rounded-full bg-slate-100`}>
            <div className="h-full rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <p className={`${progressWrap} mt-1 text-[10px] text-slate-500`}>
            멤버십 선택 → 약관 → 아이디·비밀번호 → PASS 본인확인 → 주소 확인 → 완료
          </p>
          <div className={`${progressWrap} mt-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-[10px] leading-relaxed text-indigo-950 [word-break:keep-all]`}>
            <b>회원가입</b>으로만 계정이 생성됩니다. 카카오·네이버는 가입 완료 후 마이페이지 「소셜 로그인 연동」에서 1:1로 연결하세요.
          </div>
        </div>
      )}

      <div className={`vlue-onb-scroll vlue-scroll-pad-bottom-nav min-h-0 flex-1 overflow-y-auto ${isWeb ? "" : "px-4 py-4"}`}>
        <div className={contentWrap}>
          {isWeb && step !== "tier" ? (
            <div className="mb-1">
              <BackButton variant="inline" onBack={goBack} />
            </div>
          ) : null}
          {step === "tier" && (
            <section className={sectionCls}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-[16px] font-black text-slate-900 sm:text-xl">멤버십 선택</h2>
                  <p className="mt-1 text-[12px] leading-relaxed text-slate-500 sm:text-base">
                    일반(무료) · 유료 · 기업 단체(B2B) 중 선택하세요. 유료·기업은 <b>가입 완료 후</b> 결제창에서 첫 요금을 결제합니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBenefitsModalTab("compare");
                    setBenefitsModalOpen(true);
                  }}
                  className="shrink-0 self-start rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] font-black text-blue-700 sm:text-sm"
                >
                  혜택 비교
                </button>
              </div>

              <div className={isWeb ? "vlue-onb-tier-grid mt-6" : "mt-4 space-y-2"}>
                {[
                  {
                    id: "free",
                    title: "일반 회원 (Free)",
                    sub: "통화 신원 확인 · 기본 블루 쇼케이스"
                  },
                  {
                    id: "paid",
                    title: "유료 회원 (Paid)",
                    sub: `${PAID_MEMBERSHIP_SUBLINE} · 풀 쇼케이스 · 가족보호(1:3)`
                  },
                  {
                    id: "b2b",
                    title: "비즈니스 / B2B 풀 패키지",
                    sub: B2B_MEMBERSHIP_SUBLINE
                  }
                ].map((t) => (
                  <div
                    key={t.id}
                    className={`vlue-onb-tier-card overflow-hidden rounded-xl border transition ${
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
                <div className="vlue-onb-paid-panel mt-4 space-y-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3 sm:p-4">
                  <p className="text-[12px] font-black text-slate-900">유료 회원 · 결제 주기 (가입 후 결제)</p>
                  <div className="flex gap-2">
                    {[
                      { id: "monthly", label: `월 ${PAID_EVENT_MONTHLY_KRW.toLocaleString("ko-KR")}원` },
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
                  <p className="rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2 text-[10px] leading-relaxed text-amber-950">
                    <span className="mr-1 line-through opacity-60">
                      {PAID_LIST_PRICE_MONTHLY_KRW.toLocaleString("ko-KR")}원
                    </span>
                    → {PAID_LAUNCH_DISCOUNT_NOTE}
                    <span className="mt-1 block text-slate-600">{PAID_ANNUAL_BENEFIT_NOTE}</span>
                  </p>
                  {v1AppShell.referralProgram ? (
                    <ReferralCodeVerifyBlock
                      billingCycle={paidBillingCycle}
                      referralCode={referralCode}
                      onReferralCodeChange={setReferralCode}
                      onMetaChange={setReferralMeta}
                      hidePaymentPreview
                    />
                  ) : null}
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
                PASS·휴대폰 본인확인 및 6자리 앱 PIN 등록은 필수입니다. 인증된 실명·휴대폰 등은 연동 후{" "}
                <span className="font-black">수정 불가</span>입니다. 지문/얼굴 인식은 추후 업데이트에 추가될 예정이며,
                현재는 6자리 PIN으로 안전하게 보호됩니다.
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={registerBiometric}
                className={`vlue-onb-primary-btn mt-4 w-full rounded-2xl py-3 text-[14px] font-black text-white shadow-md transition-colors disabled:opacity-50 ${
                  bioRegistered
                    ? "border border-emerald-600/30 bg-emerald-600 ring-2 ring-emerald-200 hover:bg-emerald-700"
                    : "bg-slate-900 hover:bg-slate-800"
                }`}
                aria-pressed={bioRegistered}
              >
                {busy
                  ? "처리 중…"
                  : bioRegistered
                    ? "✓ 앱 PIN 등록 완료 · 다시 등록"
                    : "6자리 앱 PIN 등록하기"}
              </button>
              {bioRegistered ? (
                <p className="mt-2 text-[11px] font-semibold text-emerald-700">앱 PIN이 등록되었습니다. 아래에서 다음 단계로 진행하세요.</p>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setBioRegistered(true);
                    setBioNote("PIN은 가입 후 앱 설정에서 등록할 수 있습니다. 지금은 가입을 계속합니다.");
                  }}
                  className="mt-2 w-full rounded-2xl py-2.5 text-[12px] font-bold text-blue-700 underline-offset-2 hover:underline"
                >
                  PIN 나중에 · 가입 계속하기
                </button>
              )}
              {bioNote && <p className="mt-2 text-[11px] text-slate-600">{bioNote}</p>}

              <button
                type="button"
                disabled={!bioRegistered}
                onClick={() => {
                  if (isB2b) {
                    if (v1AppShell.referralProgram) {
                      const rv = validateReferralMetaB2b(referralMeta);
                      if (!rv.ok) {
                        setVerifyZone({ ok: false, text: rv.message });
                        return;
                      }
                    }
                    const gv = validateGroupSignupDraft(syncDraftToPlannedLineCount({ ...groupSignupDraft, enabled: true }));
                    if (!gv.ok) {
                      setVerifyZone({ ok: false, text: gv.message });
                      return;
                    }
                  } else if (isPaidMembershipKind(membershipKind) && v1AppShell.referralProgram) {
                    const v = validateReferralMeta(referralMeta);
                    if (!v.ok) {
                      setVerifyZone({ ok: false, text: v.message });
                      return;
                    }
                  }
                  setVerifyZone(null);
                  setStep("terms");
                }}
                className="vlue-onb-primary-btn mt-3 w-full rounded-2xl bg-blue-600 py-3.5 text-[14px] font-black text-white shadow-md disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                다음 · 서비스 약관
              </button>
            </section>
          )}

          {step === "terms" && (
            <section className={sectionCls}>
              <h2 className="text-[16px] font-black text-slate-900 sm:text-xl">서비스 이용 약관 · 통합 동의</h2>
              <p className="mt-1 text-[12px] leading-relaxed text-slate-500 sm:text-base">
                <span className="font-bold text-slate-700">약관 동의 및 PASS 본인확인(필수)</span> · 서비스 이용약관 · 개인정보 처리방침
                {v1AppShell.referralProgram ? (
                  <>
                    {" · "}
                    <span className="font-bold text-amber-900/95">[중요] {REFERRAL_PRECAUTION_TITLE}</span>
                  </>
                ) : null}{" "}
                · 실명·생체 보안 설정에 동의합니다.
              </p>
              <p className="mt-2 text-[11px] text-slate-500">
                <a href={marketingLegalUrl("terms")} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 underline">
                  이용약관 전문
                </a>
                {" · "}
                <a href={marketingLegalUrl("privacy")} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 underline">
                  개인정보처리방침 전문
                </a>
                {" · "}
                <a href={marketingLegalUrl("refund")} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 underline">
                  환불·청약철회 규정
                </a>
              </p>
              <div className="vlue-onb-terms-scroll mt-3 max-h-[min(42vh,360px)] overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-[12px] leading-relaxed text-slate-800">
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
                {v1AppShell.referralProgram ? (
                  <label className="flex cursor-pointer items-start gap-2 text-[13px] font-bold text-amber-950/95">
                    <input
                      type="checkbox"
                      checked={jointGuarantorAgree}
                      onChange={() => setJointGuarantorAgree((v) => !v)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-700"
                    />
                    <span>{REFERRAL_PRECAUTION_AGREE}</span>
                  </label>
                ) : null}
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
            <section className={sectionCls}>
              <h2 className="text-[15px] font-bold text-slate-900 sm:text-[16px]">가입 방식 · 비밀번호</h2>
              <p className="mt-2 text-[11px] font-normal leading-relaxed text-slate-600 sm:text-[12px]">
                상황에 맞는 경로를 선택하세요. 비즈니스 메일 경로는 휴대폰·이메일 인증 후 가상 메일이 자동 생성됩니다.
              </p>
              <TwoTrackSignupFields
                signupTrack={signupTrack}
                onSignupTrackChange={(t) => {
                  setSignupTrack(t);
                  setVerifyZone(null);
                  setEmailVerify({ status: "idle", message: "", token: "" });
                  setBusinessVirtualId("");
                  setNeedsCustomVirtualId(false);
                  setVirtualIdCheck({ status: "idle", message: "", normalized: "", fullVirtualEmail: "" });
                }}
                businessEmail={businessEmail}
                onBusinessEmailChange={setBusinessEmail}
                emailOtp={emailOtp}
                onEmailOtpChange={setEmailOtp}
                emailVerify={emailVerify}
                onEmailVerifyChange={setEmailVerify}
                businessVirtualId={businessVirtualId}
                onBusinessVirtualIdChange={setBusinessVirtualId}
                virtualIdCheck={virtualIdCheck}
                onVirtualIdCheckChange={setVirtualIdCheck}
                onRunCheckVirtualId={runCheckVirtualId}
                needsCustomVirtualId={needsCustomVirtualId}
                onNeedsCustomVirtualIdChange={setNeedsCustomVirtualId}
                desiredMemberId={desiredMemberId}
                onDesiredMemberIdChange={setDesiredMemberId}
                idCheck={idCheck}
                onRunCheckLoginId={runCheckLoginId}
                busy={busy}
              />
              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-slate-600">비밀번호</span>
                  <div className="relative flex items-center">
                    <input
                      type={signupPwVisible ? "text" : "password"}
                      autoComplete="new-password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder={MEMBER_PASSWORD_HINT}
                      className="vlue-onb-plain-input w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-11 text-[14px] font-normal outline-none focus:border-blue-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSignupPwEyeBlink((n) => n + 1);
                        setSignupPwVisible((v) => !v);
                      }}
                      className="absolute right-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 active:scale-95"
                      aria-label={signupPwVisible ? "비밀번호 숨기기" : "비밀번호 표시"}
                      title={signupPwVisible ? "비밀번호 숨기기" : "비밀번호 표시"}
                    >
                      <VlueEyeMark
                        key={signupPwEyeBlink}
                        variant="header"
                        tone="muted"
                        svgWidth={22}
                        svgHeight={20}
                        wrapClassName={`vlue-header-eye-wrap vlue-login-pw-eye ${signupPwEyeBlink > 0 ? "vlue-header-eye-wrap--nav-loading" : ""}`}
                      />
                    </button>
                  </div>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-slate-600">비밀번호 확인</span>
                  <div className="relative flex items-center">
                    <input
                      type={signupPwConfirmVisible ? "text" : "password"}
                      autoComplete="new-password"
                      value={signupPasswordConfirm}
                      onChange={(e) => setSignupPasswordConfirm(e.target.value)}
                      placeholder="비밀번호 재입력"
                      className="vlue-onb-plain-input w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-11 text-[14px] font-normal outline-none focus:border-blue-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSignupPwConfirmEyeBlink((n) => n + 1);
                        setSignupPwConfirmVisible((v) => !v);
                      }}
                      className="absolute right-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 active:scale-95"
                      aria-label={signupPwConfirmVisible ? "비밀번호 확인 숨기기" : "비밀번호 확인 표시"}
                      title={signupPwConfirmVisible ? "비밀번호 확인 숨기기" : "비밀번호 확인 표시"}
                    >
                      <VlueEyeMark
                        key={signupPwConfirmEyeBlink}
                        variant="header"
                        tone="muted"
                        svgWidth={22}
                        svgHeight={20}
                        wrapClassName={`vlue-header-eye-wrap vlue-login-pw-eye ${signupPwConfirmEyeBlink > 0 ? "vlue-header-eye-wrap--nav-loading" : ""}`}
                      />
                    </button>
                  </div>
                </label>
                <p className="text-[10px] font-normal leading-relaxed text-slate-500">
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
            <section className={sectionCls}>
              <h2 className="text-[16px] font-black text-slate-900">PASS 본인확인</h2>
              <p className="mt-2 text-[12px] leading-relaxed text-slate-600">
                포트원(아임포트) 휴대폰 본인인증입니다. 완료 후 실명·CI 해시가 저장되며 실명은 <b>변경 불가</b>입니다.
              </p>
              {isBillableMembershipKind(membershipKind) ? (
                <>
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
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setRequestDigitalCard(checked);
                    if (!checked) {
                      setDigitalCardDocKind("");
                      setDigitalCardDocName("");
                      setDigitalCardDocDataUrl("");
                      setDigitalCardDocIssuedAt("");
                    }
                  }}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-blue-300 text-blue-600"
                />
                <span>
                  <b>디지털 인증명함</b> 발급을 신청합니다. 재직증명서 또는 사업자등록증 사본(발급 1개월 이내) 첨부 후
                  본인인증을 완료해야 발급됩니다.
                </span>
              </label>
              {requestDigitalCard ? (
                <div className="mt-2 space-y-2 rounded-xl border border-blue-100 bg-white p-3">
                  <p className="text-[11px] font-black text-slate-900">디지털 인증명함 증빙 서류 (필수)</p>
                  <label className="block text-[10px] font-bold text-slate-600">
                    서류 종류
                    <select
                      value={digitalCardDocKind}
                      onChange={(e) => setDigitalCardDocKind(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-[13px]"
                    >
                      <option value="">선택</option>
                      {LETTERING_SIGNUP_DOC_KINDS.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-[10px] font-bold text-slate-600">
                    발급일 (1개월 이내)
                    <input
                      type="date"
                      value={digitalCardDocIssuedAt}
                      onChange={(e) => setDigitalCardDocIssuedAt(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-[13px]"
                    />
                  </label>
                  <label className="block text-[10px] font-bold text-slate-600">
                    서류 사본 ({LETTERING_VERIFY_DOC_ACCEPT_LABEL})
                    <input
                      type="file"
                      accept={LETTERING_VERIFY_DOC_ACCEPT}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        const result = await prepareLetteringVerifyDocFromFile(file);
                        if (!result.ok) {
                          setVerifyZone({ ok: false, text: result.error });
                          return;
                        }
                        setDigitalCardDocDataUrl(result.dataUrl);
                        setDigitalCardDocName(result.fileName);
                      }}
                      className="mt-1 block w-full text-[11px] file:mr-2 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-[11px] file:font-bold file:text-white"
                    />
                  </label>
                  {digitalCardDocName ? (
                    <p className="text-[10px] font-semibold text-emerald-800">첨부됨: {digitalCardDocName}</p>
                  ) : null}
                </div>
              ) : null}
                </>
              ) : null}
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
              {import.meta.env.DEV ? (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => runPortonePass({ devBypass: true })}
                    className="mt-2 w-full rounded-xl border border-dashed border-amber-400/90 bg-amber-50/80 py-2.5 text-[12px] font-bold text-amber-950/90"
                  >
                    개발 전용: PASS 우회 (로컬 API 전용)
                  </button>
                  <p className="mt-1.5 text-[10px] leading-relaxed text-amber-900/80">
                    우회는 <b>로컬 API</b>에서만 됩니다. 프론트가 <code className="text-[9px]">api.vlue.kr</code> 등
                    운영 API에 붙어 있으면 「운영 환경에서 사용할 수 없습니다」가 납니다. 그때는 위{" "}
                    <b>PASS 본인인증 시작</b>만 사용하세요.
                  </p>
                  <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                    [개발자] 이니시스 「서비스 이용에 불편…」 → 포트원 콘솔 통합본인인증·MID·사이트 URL(
                    <code className="text-[9px]">https://www.vlue.kr</code> ·{" "}
                    <code className="text-[9px]">http://localhost:5173</code>) ·{" "}
                    <code className="text-[9px]">VITE_IAMPORT_CERT_PG=inicis_unified</code> · 필요 시{" "}
                    <code className="text-[9px]">VITE_IAMPORT_CERT_OMIT_MID=true</code>
                  </p>
                </>
              ) : null}
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
                  {v1AppShell.referralProgram
                    ? REFERRAL_PRECAUTION_BULLETS.map((line) => (
                        <li key={line} className={line.includes("부정") ? "text-amber-950/95" : undefined}>
                          {line}
                        </li>
                      ))
                    : null}
                </ul>
              </div>
              <div className={isWeb ? "vlue-onb-actions-row vlue-onb-actions-row--split" : "space-y-3"}>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("direct");
                  setStep("direct_detail");
                }}
                className="vlue-onb-primary-btn w-full rounded-2xl bg-blue-600 py-4 text-[14px] font-black text-white shadow-md"
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
                className="vlue-onb-primary-btn w-full rounded-2xl border-2 border-indigo-200 bg-indigo-50/80 py-4 text-[14px] font-black text-indigo-950"
              >
                추천(보증) 인증 — 지인·동료 인증
              </button>
              </div>
            </section>
          )}

          {step === "parent_consent" && (
            <section className="space-y-4">
              <h2 className="text-[16px] font-black text-slate-900 sm:text-xl">가족보호 연동 (선택)</h2>
              <p className="text-[12px] leading-relaxed text-slate-600 sm:text-sm">
                만 14세 미만도 <strong>본인 휴대폰 본인인증</strong>으로 가입·이용할 수 있습니다 (쇼케이스 등).
                사업자·디지털인증명함은 이용할 수 없습니다. 부모님과 <strong>가족보호</strong>를 쓰려면 아래에서 연동할 수 있습니다.{" "}
                <a href={marketingMinorPolicyUrl()} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 underline">
                  만 14세 미만 정책 보기
                </a>
              </p>
              <ul className="list-disc space-y-1 pl-4 text-[11px] text-slate-600 sm:text-xs">
                <li>부모님이 이미 VLUE 회원이어야 합니다 (만 14세 이상).</li>
                <li>부모 VLUE 아이디로 <strong>승인 요청 푸시</strong>를 보내거나, 이 기기에서 부모님 PASS로 연동할 수 있습니다.</li>
                <li>연동은 선택이며, 하지 않아도 가입·로그인이 가능합니다.</li>
              </ul>
              <label className="mt-2 block text-[11px] font-bold text-slate-700">부모 VLUE 아이디</label>
              <input
                type="text"
                value={guardianHandle}
                onChange={(e) => setGuardianHandle(e.target.value)}
                placeholder="예: mom, dad"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-[13px] font-bold outline-none"
              />
              <button
                type="button"
                disabled={busy || parentRequestSent}
                onClick={runSendParentRequest}
                className="w-full rounded-2xl border-2 border-violet-200 bg-violet-50 py-3.5 text-[13px] font-black text-violet-900 disabled:opacity-50"
              >
                {parentRequestSent ? "부모 폰으로 승인 요청 전송됨" : "부모 폰으로 승인 요청 보내기"}
              </button>
              <p className="text-center text-[10px] font-bold text-slate-400">또는 같은 기기에서</p>
              {verifyZone && (
                <div
                  className={`rounded-xl px-3 py-2 text-[12px] font-bold ${
                    verifyZone.ok ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-950"
                  }`}
                >
                  {verifyZone.text}
                </div>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => runGuardianPass({ devBypass: false })}
                className="vlue-onb-primary-btn w-full rounded-2xl bg-indigo-600 py-4 text-[14px] font-black text-white shadow-md disabled:opacity-50"
              >
                부모님 PASS 본인인증으로 승인
              </button>
              {import.meta.env.DEV && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => runGuardianPass({ devBypass: true })}
                  className="w-full rounded-2xl border border-dashed border-slate-300 py-3 text-[12px] font-bold text-slate-500"
                >
                  [DEV] 부모 인증 우회 (부모 VLUE 계정·CI 필요)
                </button>
              )}
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
                  <option value="unemployed">무직</option>
                  <option value="student">학생</option>
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
              {!isBillableMembershipKind(membershipKind) ? (
                <button
                  type="button"
                  onClick={() => {
                    setVerifyZone({ ok: true, text: "주소는 나중에 입력할 수 있습니다." });
                    setStep("complete");
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-[13px] font-bold text-slate-700"
                >
                  주소 나중에 · 가입 완료
                </button>
              ) : null}
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
            <section className={sectionCls}>
              <h2 className="text-[16px] font-black text-slate-900">검증 신청 완료</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
                신청이 접수되었습니다. 최대 <b>24시간</b> 이내에 심사 결과를 알려드립니다.
                {v1AppShell.referralProgram
                  ? " VLUE 추천 안내 및 이용 정책이 적용됩니다."
                  : " 서비스 이용약관·개인정보 처리방침이 적용됩니다."}
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
                      : v1AppShell.referralProgram && referralMeta.codeForApi
                        ? ` · 추천인 ${referralMeta.codeForApi}`
                        : ""}
                    {v1AppShell.referralProgram && !isB2b && referralMeta.verified && referralMeta.sponsorDisplayName
                      ? ` (${referralMeta.sponsorDisplayName})`
                      : ""}
                    <span className="block text-indigo-800">→ VLUE 시작하기 후 결제창</span>
                  </li>
                ) : null}
                {v1AppShell.referralProgram ? (
                  <li>추천: 지인(전화번호 10% 포인트) · 홍보 VLUER(고유 코드 15%/5% 캐시)</li>
                ) : (
                  <li>V1: 블루 쇼케이스 · 디지털 인증명함 · 가족보호</li>
                )}
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
    </div>
  );

  if (typeof document === "undefined" || !document.body) return shell;
  return createPortal(shell, document.body);
}
