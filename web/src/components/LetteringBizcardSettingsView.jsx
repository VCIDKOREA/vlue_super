import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { isPaidLetteringTier } from "../lib/letteringMembership.js";
import {
  clampLetteringBizcardEmail,
  clampLetteringBizcardIntroFront,
  clampLetteringBizcardBackNote,
  combineLetteringBizcardAddress,
  prepareLetteringLogoFromFile,
  prepareLetteringPhotoFromFile,
  readLetteringBizcardAddressFields,
  readLetteringBizcardEditable,
  readLetteringFixedIdentity,
  writeLetteringBizcardEditable,
  normalizePhotoFocus
} from "../lib/letteringBizcardStorage.js";
import { normalizeLetteringBizcardTemplate } from "../lib/letteringBizcardTemplates.js";
import {
  buildUserLetteringCard,
  withLetteringBizcardPreviewFallback
} from "../lib/letteringBizcardProfile.js";
import LetteringBizcardQuickBuilder from "./LetteringBizcardQuickBuilder.jsx";
import BackButton from "./common/BackButton";
import { useB2bMembership } from "../context/B2bMembershipContext.jsx";
import {
  syncDigitalCardDesignTemplate,
  syncDigitalCardExportSnapshot,
  fetchDigitalCardMeta,
  needsDigitalCardLocalRestore,
  restoreDigitalCardFromServer
} from "../lib/digitalCardApi.js";
import { fetchTitleDeptStatus, submitTitleDeptReview } from "../lib/titleDeptReviewApi.js";
import {
  TITLE_DEPT_APPROVAL,
  isTitleDeptChangePending,
  isVerifyDocIssuedWithinLimit,
  prepareLetteringVerifyDocFromFile
} from "../lib/letteringBizcardVerification.js";
import { writeAvatar } from "../lib/vlueAvatar.js";
import { readProfilePhotoAvatar } from "../lib/vlueAvatar.js";
import {
  DIGITAL_CARD_ACTIVE_KEY,
  DCC_BROADCAST_CHANGED_EVENT,
  readDccBroadcastOn,
  writeDccBroadcastOn
} from "../lib/bizcardAccountSync.js";
import DccExposureSettingsPanel from "./dcc/DccExposureSettingsPanel.jsx";
import { emptyDccExposureChoice, isDccExposureComplete } from "../lib/dccExposure.js";
import { fetchDccExposure, saveDccExposure } from "../lib/dccExposureApi.js";

export default function LetteringBizcardSettingsView({
  membershipTier = "free",
  isDarkMode = false,
  isFirstApply = false,
  onBack,
  onApplied
}) {
  const [fixed, setFixed] = useState(() => readLetteringFixedIdentity());
  const isPaid = isPaidLetteringTier(membershipTier);
  const [dccBroadcastOn, setDccBroadcastOn] = useState(() => readDccBroadcastOn());

  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [fax, setFax] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [companyIntro, setCompanyIntro] = useState("");
  const [customBackText, setCustomBackText] = useState("");
  const [addressRoad, setAddressRoad] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [logoFileName, setLogoFileName] = useState("");
  const [logoPreview, setLogoPreview] = useState("");
  const [pendingLogo, setPendingLogo] = useState(null);
  const [titlePhotoFileName, setTitlePhotoFileName] = useState("");
  const [titlePhotoPreview, setTitlePhotoPreview] = useState("");
  const [pendingTitlePhoto, setPendingTitlePhoto] = useState(null);
  const [titlePhotoError, setTitlePhotoError] = useState("");
  const [previewTick, setPreviewTick] = useState(0);
  const [toast, setToast] = useState("");
  const [toastKind, setToastKind] = useState("success");
  const [applyBusy, setApplyBusy] = useState(false);
  const [logoError, setLogoError] = useState("");
  const scrollRef = useRef(null);
  const guideClearTimerRef = useRef(0);
  const [noTitlePhoto, setNoTitlePhoto] = useState(false);
  const [photoFocus, setPhotoFocus] = useState("top");
  const [noCompanyLogo, setNoCompanyLogo] = useState(false);
  const [noFax, setNoFax] = useState(false);
  const [noWebsite, setNoWebsite] = useState(false);
  const [approvedTitle, setApprovedTitle] = useState("");
  const [approvedDepartment, setApprovedDepartment] = useState("");
  const [titleDeptApprovalStatus, setTitleDeptApprovalStatus] = useState("");
  const [verifyDocKind, setVerifyDocKind] = useState("");
  const [verifyDocName, setVerifyDocName] = useState("");
  const [verifyDocDataUrl, setVerifyDocDataUrl] = useState("");
  const [verifyDocIssuedAt, setVerifyDocIssuedAt] = useState("");
  const [verifyDocError, setVerifyDocError] = useState("");
  const [designTemplate, setDesignTemplate] = useState("classic-light");
  const [cardId, setCardId] = useState("");
  const [orgChangeApprovalStatus, setOrgChangeApprovalStatus] = useState("");
  const [orgChangePendingName, setOrgChangePendingName] = useState("");
  const [exposureChoice, setExposureChoice] = useState(() => emptyDccExposureChoice());
  const { refresh: refreshMembership } = useB2bMembership();

  const reload = useCallback(async () => {
    const identity = readLetteringFixedIdentity();
    setFixed(identity);
    const handle = String(localStorage.getItem("vlue_member_handle") || "")
      .trim()
      .toLowerCase()
      .replace(/^@/, "");
    const isCeo = handle === "ceo";
    try {
      /* 로컬이 비어 있으면 full snapshot 복원 (재설치·웹뷰 시 유리) */
      if (needsDigitalCardLocalRestore()) {
        await restoreDigitalCardFromServer({ force: true });
      } else {
        await fetchDigitalCardMeta({ lite: true });
      }
    } catch {
      /* ignore */
    }
    try {
      const remote = await fetchTitleDeptStatus();
      if (remote?.reviewStatus && !isCeo) {
        const status =
          remote.reviewStatus === "pending"
            ? TITLE_DEPT_APPROVAL.PENDING
            : remote.reviewStatus === "approved"
              ? TITLE_DEPT_APPROVAL.APPROVED
              : remote.reviewStatus === "rejected"
                ? TITLE_DEPT_APPROVAL.REJECTED
                : "";
        writeLetteringBizcardEditable({
          titleDeptApprovalStatus: status,
          approvedTitle: remote.approvedTitle || "",
          approvedDepartment: remote.approvedDepartment || "",
          titleDeptPendingTitle: remote.pendingTitle || "",
          titleDeptPendingDepartment: remote.pendingDepartment || "",
          ...(status === TITLE_DEPT_APPROVAL.APPROVED
            ? {
                title: remote.approvedTitle || "",
                department: remote.approvedDepartment || ""
              }
            : {})
        });
      }
    } catch {
      /* 비로그인·오프라인 — 로컬만 */
    }

    if (isCeo) readLetteringFixedIdentity();
    const ed = readLetteringBizcardEditable();
    setTitle(
      isCeo
        ? "CEO"
        : ed.titleDeptApprovalStatus === TITLE_DEPT_APPROVAL.PENDING
          ? ed.titleDeptPendingTitle || ed.title
          : ed.title
    );
    setDepartment(
      isCeo
        ? ""
        : ed.titleDeptApprovalStatus === TITLE_DEPT_APPROVAL.PENDING
          ? ed.titleDeptPendingDepartment || ed.department
          : ed.department
    );
    setFax(ed.fax || "");
    setEmail(clampLetteringBizcardEmail(ed.email || ""));
    setWebsite(ed.website);
    setCompanyIntro(clampLetteringBizcardIntroFront(ed.companyIntro || ""));
    setCustomBackText(clampLetteringBizcardBackNote(ed.customBackText || ""));
    const addr = readLetteringBizcardAddressFields(ed);
    setAddressRoad(addr.road);
    setAddressDetail(addr.detail);
    setLogoFileName(ed.logoFileName);
    setLogoPreview(ed.logoDataUrl);
    setTitlePhotoFileName(ed.titlePhotoFileName || "");
    setTitlePhotoPreview(ed.titlePhotoDataUrl || "");
    setNoTitlePhoto(Boolean(ed.noTitlePhoto));
    setPhotoFocus(normalizePhotoFocus(ed.photoFocus));
    setNoCompanyLogo(Boolean(ed.noCompanyLogo));
    setNoFax(Boolean(ed.noFax));
    setNoWebsite(Boolean(ed.noWebsite));
    setApprovedTitle(isCeo ? "CEO" : ed.approvedTitle || "");
    setApprovedDepartment(isCeo ? "" : ed.approvedDepartment || "");
    setTitleDeptApprovalStatus(isCeo ? TITLE_DEPT_APPROVAL.APPROVED : ed.titleDeptApprovalStatus || "");
    setVerifyDocKind(ed.titleDeptVerifyDocKind || "");
    setVerifyDocName(ed.titleDeptVerifyDocName || "");
    setVerifyDocDataUrl(ed.titleDeptVerifyDocDataUrl || "");
    setVerifyDocIssuedAt(ed.titleDeptVerifyDocIssuedAt || "");
    setVerifyDocError("");
    setDesignTemplate(normalizeLetteringBizcardTemplate(ed.designTemplate));
    setOrgChangeApprovalStatus(ed.orgChangeApprovalStatus || "");
    setOrgChangePendingName(ed.orgChangePendingName || "");
    setPendingLogo(null);
    setPreviewTick((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    /* 로그인 시 full hydrate 된 로컬본 사용 — 설정 진입마다 full snapshot GET 금지 */
    fetchDigitalCardMeta({ lite: true }).then((meta) => {
      if (cancelled) return;
      if (meta.cardId) setCardId(meta.cardId);
      reload();
    });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  useEffect(() => {
    refreshMembership();
  }, [refreshMembership]);

  useEffect(() => {
    let cancelled = false;
    fetchDccExposure().then((res) => {
      if (cancelled || !res.ok || !res.exposure) return;
      if (res.exposure.configured) {
        setExposureChoice({
          phoneSearch: Boolean(res.exposure.phoneSearch),
          addressSearch: Boolean(res.exposure.addressSearch),
          phoneFollow: Boolean(res.exposure.phoneFollow),
          addressFollow: Boolean(res.exposure.addressFollow)
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const sync = () => setDccBroadcastOn(readDccBroadcastOn());
    window.addEventListener(DCC_BROADCAST_CHANGED_EVENT, sync);
    window.addEventListener("vlue-digital-card-changed", sync);
    return () => {
      window.removeEventListener(DCC_BROADCAST_CHANGED_EVENT, sync);
      window.removeEventListener("vlue-digital-card-changed", sync);
    };
  }, []);

  const titleDeptNeedsSubmit = useMemo(
    () =>
      isTitleDeptChangePending(
        {
          approvedTitle,
          approvedDepartment,
          titleDeptApprovalStatus,
          titleDeptPendingTitle: title,
          titleDeptPendingDepartment: department
        },
        title,
        department
      ),
    [approvedTitle, approvedDepartment, titleDeptApprovalStatus, title, department]
  );

  const previewCard = useMemo(() => {
    const draft = buildUserLetteringCard({ membershipTier });
    const address = combineLetteringBizcardAddress(addressRoad, addressDetail);
    const photoUrl = readProfilePhotoAvatar() || "";
    const titlePhotoUrl = noTitlePhoto
      ? ""
      : pendingTitlePhoto?.previewUrl || pendingTitlePhoto?.dataUrl || titlePhotoPreview || "";
    const logoUrl = noCompanyLogo
      ? ""
      : pendingLogo?.previewUrl || pendingLogo?.dataUrl || logoPreview || "";
    return withLetteringBizcardPreviewFallback({
      ...draft,
      fax: noFax ? "" : fax,
      email,
      website: noWebsite ? "" : website,
      companyIntro,
      customBackText,
      address,
      noTitlePhoto,
      noCompanyLogo,
      noFax,
      noWebsite,
      logoUrl,
      photoUrl,
      titlePhotoUrl,
      photoFocus
    });
  }, [
    membershipTier,
    fax,
    email,
    website,
    companyIntro,
    customBackText,
    addressRoad,
    addressDetail,
    logoPreview,
    pendingLogo,
    titlePhotoPreview,
    pendingTitlePhoto,
    photoFocus,
    noTitlePhoto,
    noCompanyLogo,
    noFax,
    noWebsite,
    previewTick
  ]);

  const applyLabel = useMemo(() => {
    if (titleDeptNeedsSubmit) return "신청 · 전체적용";
    if (isFirstApply) return "신청 · 전체적용";
    return "전체적용";
  }, [titleDeptNeedsSubmit, isFirstApply]);

  const showToast = (msg, kind = "success") => {
    if (guideClearTimerRef.current) {
      window.clearTimeout(guideClearTimerRef.current);
      guideClearTimerRef.current = 0;
    }
    setToastKind(kind);
    setToast(msg);
    if (kind === "success") {
      guideClearTimerRef.current = window.setTimeout(() => setToast(""), 4200);
    }
  };

  const focusRequiredSection = (sectionId, message) => {
    showToast(message, "guide");
    window.requestAnimationFrame(() => {
      const el = document.getElementById(sectionId);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      try {
        el.classList.add("ring-2", "ring-amber-400", "ring-offset-2");
        window.setTimeout(() => {
          el.classList.remove("ring-2", "ring-amber-400", "ring-offset-2");
        }, 2200);
      } catch {
        /* ignore */
      }
    });
  };


  const handleNoTitlePhotoChange = (checked) => {
    setNoTitlePhoto(checked);
    if (checked) {
      setTitlePhotoError("");
      setPendingTitlePhoto(null);
    }
  };

  const handleNoCompanyLogoChange = (checked) => {
    setNoCompanyLogo(checked);
    if (checked) {
      setLogoError("");
      setPendingLogo(null);
    }
  };

  const handleNoFaxChange = (checked) => {
    setNoFax(checked);
    if (checked) setFax("");
  };

  const handleNoWebsiteChange = (checked) => {
    setNoWebsite(checked);
    if (checked) setWebsite("");
  };

  const handleVerifyDocPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    setVerifyDocError("");
    const result = await prepareLetteringVerifyDocFromFile(file);
    if (!result.ok) {
      setVerifyDocError(result.error);
      return;
    }
    setVerifyDocDataUrl(result.dataUrl);
    setVerifyDocName(result.fileName);
  };

  const handleLogoPick = async (e) => {
    if (noCompanyLogo) return;
    const file = e.target.files?.[0];
    e.target.value = "";
    setLogoError("");
    const result = await prepareLetteringLogoFromFile(file);
    if (!result.ok) {
      setLogoError(result.error);
      return;
    }
    const preview = String(result.dataUrl || "").trim();
    const persist = String(result.persistUrl || result.dataUrl || "").trim();
    if (!preview) {
      setLogoError("로고 이미지를 읽지 못했습니다.");
      return;
    }
    setPendingLogo({ dataUrl: persist || preview, fileName: result.fileName, previewUrl: preview });
    setLogoPreview(preview);
    setLogoFileName(result.fileName);
    setNoCompanyLogo(false);
    if (result.uploadWarning) showToast(result.uploadWarning, "guide");
  };


  const handleTitlePhotoPick = async (e) => {
    if (noTitlePhoto) return;
    const file = e.target.files?.[0];
    e.target.value = "";
    setTitlePhotoError("");
    const result = await prepareLetteringPhotoFromFile(file);
    if (!result.ok) {
      setTitlePhotoError(result.error);
      return;
    }
    const preview = String(result.dataUrl || "").trim();
    const persist = String(result.persistUrl || result.dataUrl || "").trim();
    if (!preview) {
      setTitlePhotoError("사진을 읽지 못했습니다.");
      return;
    }
    setPendingTitlePhoto({ dataUrl: persist || preview, fileName: result.fileName, previewUrl: preview });
    setTitlePhotoPreview(preview);
    setTitlePhotoFileName(result.fileName);
    setNoTitlePhoto(false);
    if (toastKind === "guide") setToast("");
    if (result.uploadWarning) showToast(result.uploadWarning, "guide");
  };

  const handleApply = async () => {
    const tpl = normalizeLetteringBizcardTemplate(designTemplate);
    const road = addressRoad.trim();
    const detail = addressDetail.trim();
    const trimmedTitle = title.trim();
    const trimmedDept = department.trim();
    const trimmedEmail = clampLetteringBizcardEmail(email).trim();

    if (!trimmedEmail) {
      focusRequiredSection("dcc-settings-email", "이메일은 필수입니다. 입력해 주세요.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      focusRequiredSection("dcc-settings-email", "올바른 이메일 형식을 입력해 주세요.");
      return;
    }

    const titlePhotoReady =
      noTitlePhoto ||
      Boolean(
        String(pendingTitlePhoto?.dataUrl || titlePhotoPreview || "").trim()
      );
    if (!titlePhotoReady) {
      const msg = "DCC 타이틀 사진은 필수입니다. 업로드하거나 「DCC 타이틀 사진 없음」을 선택해 주세요.";
      setTitlePhotoError(msg);
      focusRequiredSection("dcc-settings-title-photo", msg);
      return;
    }

    if (!isDccExposureComplete(exposureChoice)) {
      focusRequiredSection(
        "dcc-settings-exposure",
        "검색과 팔로우 설정을 해야 적용이 됩니다."
      );
      return;
    }

    setApplyBusy(true);
    try {
    const exposureSaved = await saveDccExposure(exposureChoice);
    if (!exposureSaved.ok) {
      focusRequiredSection(
        "dcc-settings-exposure",
        exposureSaved.message || "노출 설정을 저장하지 못했습니다."
      );
      return;
    }

    if (titleDeptNeedsSubmit) {
      if (!verifyDocKind) {
        const msg = "서류 종류를 선택해 주세요.";
        setVerifyDocError(msg);
        focusRequiredSection("dcc-settings-verify-doc", msg);
        return;
      }
      if (!verifyDocDataUrl || !verifyDocName) {
        const msg = "직책·부서 확인 서류를 첨부해 주세요. 첨부 없이는 명함 변경이 저장되지 않습니다.";
        setVerifyDocError(msg);
        focusRequiredSection("dcc-settings-verify-doc", msg);
        return;
      }
      if (!verifyDocIssuedAt || !isVerifyDocIssuedWithinLimit(verifyDocIssuedAt)) {
        const msg = "발급일 기준 1개월 이내 서류만 제출할 수 있습니다.";
        setVerifyDocError(msg);
        focusRequiredSection("dcc-settings-verify-doc", msg);
        return;
      }
    }

    const basePatch = {
      designTemplate: tpl,
      title: trimmedTitle,
      department: trimmedDept,
      fax: noFax ? "" : fax.trim(),
      email: trimmedEmail,
      website: noWebsite ? "" : website.trim(),
      companyIntro: clampLetteringBizcardIntroFront(companyIntro.trim()),
      customBackText: clampLetteringBizcardBackNote(customBackText.trim()),
      addressRoad: road,
      addressDetail: detail,
      address: combineLetteringBizcardAddress(road, detail),
      noTitlePhoto,
      noCompanyLogo,
      noFax,
      noWebsite,
      photoFocus: normalizePhotoFocus(photoFocus),
      logoDataUrl: noCompanyLogo ? "" : pendingLogo?.dataUrl || logoPreview || "",
      logoFileName: noCompanyLogo ? "" : pendingLogo?.fileName || logoFileName || "",
      noProfilePhoto: false,
      photoDataUrl: "",
      photoFileName: "",
      titlePhotoDataUrl: noTitlePhoto ? "" : pendingTitlePhoto?.dataUrl || titlePhotoPreview || "",
      titlePhotoFileName: noTitlePhoto ? "" : pendingTitlePhoto?.fileName || titlePhotoFileName || ""
    };

    let writeResult;
    if (titleDeptNeedsSubmit) {
      try {
        await submitTitleDeptReview({
          title: trimmedTitle,
          department: trimmedDept,
          docKind: verifyDocKind,
          docFileName: verifyDocName,
          docIssuedAt: verifyDocIssuedAt,
          docDataUrl: verifyDocDataUrl
        });
      } catch (e) {
        setVerifyDocError(e?.message || "서류 제출에 실패했습니다.");
        return;
      }
      writeResult = writeLetteringBizcardEditable({
        ...basePatch,
        titleDeptApprovalStatus: TITLE_DEPT_APPROVAL.PENDING,
        titleDeptPendingTitle: trimmedTitle,
        titleDeptPendingDepartment: trimmedDept,
        titleDeptVerifyDocKind: verifyDocKind,
        titleDeptVerifyDocName: verifyDocName,
        titleDeptVerifyDocDataUrl: verifyDocDataUrl,
        titleDeptVerifyDocIssuedAt: verifyDocIssuedAt,
        titleDeptSubmittedAt: new Date().toISOString()
      });
      if (!writeResult?.ok) {
        showToast(writeResult?.error || "저장에 실패했습니다. 다시 시도해 주세요.");
        return;
      }
      setTitleDeptApprovalStatus(TITLE_DEPT_APPROVAL.PENDING);
    } else {
      writeResult = writeLetteringBizcardEditable({
        ...basePatch,
        approvedTitle: trimmedTitle,
        approvedDepartment: trimmedDept,
        titleDeptApprovalStatus:
          trimmedTitle || trimmedDept ? TITLE_DEPT_APPROVAL.APPROVED : titleDeptApprovalStatus
      });
      if (!writeResult?.ok) {
        showToast(writeResult?.error || "저장에 실패했습니다. 다시 시도해 주세요.");
        return;
      }
      if (trimmedTitle || trimmedDept) {
        setApprovedTitle(trimmedTitle);
        setApprovedDepartment(trimmedDept);
        setTitleDeptApprovalStatus(TITLE_DEPT_APPROVAL.APPROVED);
      }
    }

    const saved = writeResult.data || readLetteringBizcardEditable();
    setLogoPreview(saved.logoDataUrl || "");
    setLogoFileName(saved.logoFileName || "");
    setTitlePhotoPreview(saved.titlePhotoDataUrl || "");
    setTitlePhotoFileName(saved.titlePhotoFileName || "");
    setPendingLogo(null);
    setPendingTitlePhoto(null);

    try {
      if (saved.logoDataUrl && !saved.noCompanyLogo) {
        writeAvatar("card", saved.logoDataUrl);
      } else if (saved.noCompanyLogo) {
        writeAvatar("card", "");
      }
    } catch {
      /* ignore */
    }

    try {
      localStorage.setItem(DIGITAL_CARD_ACTIVE_KEY, "1");
      window.dispatchEvent(new CustomEvent("vlue-digital-card-changed"));
    } catch {
      /* ignore */
    }

    const appliedCard = buildUserLetteringCard({ membershipTier });
    void syncDigitalCardDesignTemplate(tpl);
    const syncResult = await syncDigitalCardExportSnapshot({
      ...appliedCard,
      designTemplate: tpl,
      logoUrl: saved.noCompanyLogo ? "" : saved.logoDataUrl || appliedCard.logoUrl || "",
      photoUrl: readProfilePhotoAvatar() || appliedCard.photoUrl || "",
      titlePhotoUrl: saved.noTitlePhoto ? "" : saved.titlePhotoDataUrl || appliedCard.titlePhotoUrl || ""
    });
    if (!syncResult?.ok) {
      showToast(
        syncResult?.error
          ? `기기에 저장되었습니다. 서버 동기화 실패: ${syncResult.error}`
          : "기기에 저장되었습니다. 서버 동기화에 실패했습니다. 네트워크 확인 후 다시 전체적용해 주세요."
      );
      setPreviewTick((n) => n + 1);
      onApplied?.();
      return;
    }
    if (syncResult?.mediaError) {
      showToast(`명함은 저장됐지만 사진 클라우드 업로드에 문제가 있었습니다: ${syncResult.mediaError}`);
    }
    /* 업로드된 https 로 미리보기 갱신 */
    if (syncResult?.titlePhotoUrl) {
      setTitlePhotoPreview(syncResult.titlePhotoUrl);
    }
    if (syncResult?.logoUrl) {
      setLogoPreview(syncResult.logoUrl);
    }
    if (isFirstApply) {
      try {
        const identity = readLetteringFixedIdentity();
        if (identity.name) {
          localStorage.setItem("vlue_legal_name", identity.name);
          localStorage.setItem("myCardDisplayName", identity.name);
        }
        if (identity.organization) {
          localStorage.setItem("vlue_company_locked", identity.organization);
          localStorage.setItem("myCardOrganization", identity.organization);
        }
      } catch {
        /* ignore */
      }
    }
    setPreviewTick((n) => n + 1);
    showToast(
      titleDeptNeedsSubmit
        ? "직책·부서 변경 신청이 접수되었습니다. 서류 확인 후 승인됩니다."
        : isFirstApply
          ? "전체적용되었습니다. 디지털인증명함 신청이 완료되었고, 통화 수신 화면에 반영됩니다."
          : "전체적용되었습니다. 입력하신 내용이 디지털인증명함·쇼케이스에 반영되었습니다."
    );
    onApplied?.();
    } finally {
      setApplyBusy(false);
    }
  };

  return (
    <div className={`flex h-full min-h-0 flex-col ${isDarkMode ? "text-gray-100" : ""}`}>
      <div className={`flex shrink-0 items-center gap-1 border-b px-3 py-2.5 ${isDarkMode ? "border-white/10" : "border-gray-100"}`}>
        <BackButton variant="inline" onBack={onBack} isDarkMode={isDarkMode} />
        <div className="min-w-0 flex-1">
          <p className={`text-[17px] font-black ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
            {isFirstApply ? "디지털인증명함 만들기" : "디지털 인증 명함"}
          </p>
          <p className={`text-[11px] ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            한 화면에서 입력하고 수신 UI를 바로 확인하세요.
            {!isPaid ? " · 유료 회원만 통화 중 상대에게 표시됩니다." : ""}
          </p>
        </div>
      </div>

      {isPaid && !isFirstApply ? (
        <label
          className={`flex shrink-0 cursor-pointer items-center justify-between gap-3 border-b px-4 py-3 ${
            isDarkMode ? "border-white/10 bg-white/[0.03]" : "border-gray-100 bg-[#f8fafc]"
          }`}
        >
          <div className="min-w-0">
            <p className={`text-[13px] font-bold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
              디지털인증 명함 송출
            </p>
            <p
              className={`mt-0.5 text-[11px] font-medium ${
                dccBroadcastOn
                  ? "text-[#2b6ff0]"
                  : isDarkMode
                    ? "text-gray-500"
                    : "text-gray-500"
              }`}
            >
              {dccBroadcastOn ? "켜짐" : "꺼짐"}
            </p>
          </div>
          <input
            type="checkbox"
            role="switch"
            className="peer sr-only"
            checked={dccBroadcastOn}
            aria-checked={dccBroadcastOn}
            aria-label="디지털인증명함 쇼케이스 송출"
            onChange={(e) => {
              const next = e.target.checked;
              setDccBroadcastOn(next);
              writeDccBroadcastOn(next);
            }}
          />
          <span
            className={`vlue-broadcast-switch ${
              dccBroadcastOn ? "vlue-broadcast-switch--on vlue-broadcast-switch--on-blue" : ""
            }`}
            aria-hidden
          >
            <span className="vlue-broadcast-switch__knob" />
          </span>
        </label>
      ) : null}

      <div
        ref={scrollRef}
        className="vlue-scroll-pad-profile-panel min-h-0 flex-1 overflow-y-auto px-4 py-4 no-scrollbar"
      >
        <LetteringBizcardQuickBuilder
          fixed={fixed}
          previewCard={previewCard}
          isDarkMode={isDarkMode}
          title={title}
          setTitle={setTitle}
          department={department}
          setDepartment={setDepartment}
          fax={fax}
          setFax={setFax}
          email={email}
          setEmail={setEmail}
          website={website}
          setWebsite={setWebsite}
          companyIntro={companyIntro}
          setCompanyIntro={setCompanyIntro}
          customBackText={customBackText}
          setCustomBackText={setCustomBackText}
          addressRoad={addressRoad}
          setAddressRoad={setAddressRoad}
          addressDetail={addressDetail}
          setAddressDetail={setAddressDetail}
          logoPreview={logoPreview}
          logoFileName={logoFileName}
          pendingLogo={pendingLogo}
          onLogoPick={handleLogoPick}
          logoError={logoError}
          photoFocus={photoFocus}
          setPhotoFocus={setPhotoFocus}
          titlePhotoPreview={titlePhotoPreview}
          titlePhotoFileName={titlePhotoFileName}
          pendingTitlePhoto={pendingTitlePhoto}
          onTitlePhotoPick={handleTitlePhotoPick}
          titlePhotoError={titlePhotoError}
          noTitlePhoto={noTitlePhoto}
          setNoTitlePhoto={handleNoTitlePhotoChange}
          noCompanyLogo={noCompanyLogo}
          setNoCompanyLogo={handleNoCompanyLogoChange}
          noFax={noFax}
          setNoFax={handleNoFaxChange}
          noWebsite={noWebsite}
          setNoWebsite={handleNoWebsiteChange}
          titleDeptApprovalStatus={titleDeptApprovalStatus}
          titleDeptNeedsSubmit={titleDeptNeedsSubmit}
          verifyDocKind={verifyDocKind}
          setVerifyDocKind={setVerifyDocKind}
          verifyDocName={verifyDocName}
          verifyDocIssuedAt={verifyDocIssuedAt}
          setVerifyDocIssuedAt={setVerifyDocIssuedAt}
          onVerifyDocPick={handleVerifyDocPick}
          verifyDocError={verifyDocError}
          orgChangeApprovalStatus={orgChangeApprovalStatus}
          orgChangePendingName={orgChangePendingName}
          onOrgChangeSubmitted={reload}
          onOrgChangeToast={showToast}
          exposureSlot={
            <DccExposureSettingsPanel
              choice={exposureChoice}
              onChange={(next) => {
                setExposureChoice(next);
                if (toastKind === "guide" && isDccExposureComplete(next)) {
                  setToast("");
                }
              }}
              isDarkMode={isDarkMode}
            />
          }
          onApply={handleApply}
          applyLabel={applyLabel}
          hideApplyChrome
        />
        {cardId ? (
          <p className={`mt-3 text-center text-[10px] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
            카드 ID · {cardId}
          </p>
        ) : null}
      </div>

      <div
        className={`shrink-0 border-t px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 ${
          isDarkMode ? "border-white/10 bg-slate-950/95" : "border-slate-200 bg-white/95"
        }`}
      >
        {toast ? (
          <div
            className={`mb-2.5 rounded-2xl border px-3 py-2.5 text-center ${
              toastKind === "guide"
                ? isDarkMode
                  ? "border-amber-400/40 bg-amber-950/55 text-amber-100"
                  : "border-amber-300 bg-amber-50 text-amber-950"
                : isDarkMode
                  ? "border-emerald-400/30 bg-emerald-950/40 text-emerald-200"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
            role="status"
            aria-live="polite"
          >
            <p className="text-[12px] font-black">
              {toastKind === "guide" ? "필수 설정을 완료해 주세요" : "전체적용 완료"}
            </p>
            <p className="mt-1 text-[11px] font-semibold leading-relaxed">{toast}</p>
          </div>
        ) : null}
        <button
          type="button"
          onClick={handleApply}
          disabled={applyBusy}
          aria-busy={applyBusy}
          className={`w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-[14px] font-black text-white shadow-lg active:scale-[0.99] ${
            applyBusy ? "cursor-wait opacity-90" : ""
          }`}
        >
          {applyBusy ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              적용중…
            </span>
          ) : (
            applyLabel
          )}
        </button>
      </div>
    </div>
  );
}
