import { useCallback, useEffect, useMemo, useState } from "react";
import { isPaidLetteringTier } from "../lib/letteringMembership.js";
import {
  clampLetteringBizcardEmail,
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
  fetchDigitalCardMeta
} from "../lib/digitalCardApi.js";
import { fetchTitleDeptStatus, submitTitleDeptReview } from "../lib/titleDeptReviewApi.js";
import {
  TITLE_DEPT_APPROVAL,
  isTitleDeptChangePending,
  isVerifyDocIssuedWithinLimit,
  prepareLetteringVerifyDocFromFile
} from "../lib/letteringBizcardVerification.js";
import { writeAvatar, writeProfilePhoto } from "../lib/vlueAvatar.js";
import { DIGITAL_CARD_ACTIVE_KEY } from "../lib/bizcardAccountSync.js";

export default function LetteringBizcardSettingsView({
  membershipTier = "free",
  isDarkMode = false,
  isFirstApply = false,
  onBack,
  onApplied
}) {
  const [fixed, setFixed] = useState(() => readLetteringFixedIdentity());
  const isPaid = isPaidLetteringTier(membershipTier);

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
  const [photoFileName, setPhotoFileName] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [previewTick, setPreviewTick] = useState(0);
  const [toast, setToast] = useState("");
  const [logoError, setLogoError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [noProfilePhoto, setNoProfilePhoto] = useState(false);
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
      /* 로그인 hydrate 캐시 우선 — 설정 진입마다 full snapshot GET 금지 */
      await fetchDigitalCardMeta({ lite: true });
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
    setCompanyIntro(ed.companyIntro || "");
    setCustomBackText(ed.customBackText || "");
    const addr = readLetteringBizcardAddressFields(ed);
    setAddressRoad(addr.road);
    setAddressDetail(addr.detail);
    setLogoFileName(ed.logoFileName);
    setLogoPreview(ed.logoDataUrl);
    setPhotoFileName(ed.photoFileName || "");
    setPhotoPreview(ed.photoDataUrl || "");
    setNoProfilePhoto(Boolean(ed.noProfilePhoto));
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
    setPendingPhoto(null);
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
    reload();
  }, [reload]);

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
    const photoUrl = noProfilePhoto
      ? ""
      : pendingPhoto?.previewUrl || pendingPhoto?.dataUrl || photoPreview || "";
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
      noProfilePhoto,
      noCompanyLogo,
      noFax,
      noWebsite,
      logoUrl,
      photoUrl,
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
    photoPreview,
    pendingPhoto,
    photoFocus,
    noProfilePhoto,
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

  const showToast = (msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 4200);
  };

  const handleNoProfilePhotoChange = (checked) => {
    setNoProfilePhoto(checked);
    if (checked) {
      setPhotoError("");
      setPendingPhoto(null);
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
    if (result.uploadWarning) setToast(result.uploadWarning);
  };

  const handlePhotoPick = async (e) => {
    if (noProfilePhoto) return;
    const file = e.target.files?.[0];
    e.target.value = "";
    setPhotoError("");
    const result = await prepareLetteringPhotoFromFile(file);
    if (!result.ok) {
      setPhotoError(result.error);
      return;
    }
    const preview = String(result.dataUrl || "").trim();
    const persist = String(result.persistUrl || result.dataUrl || "").trim();
    if (!preview) {
      setPhotoError("사진을 읽지 못했습니다.");
      return;
    }
    setPendingPhoto({ dataUrl: persist || preview, fileName: result.fileName, previewUrl: preview });
    setPhotoPreview(preview);
    setPhotoFileName(result.fileName);
    setNoProfilePhoto(false);
    if (result.uploadWarning) setToast(result.uploadWarning);
  };

  const handleApply = async () => {
    const tpl = normalizeLetteringBizcardTemplate(designTemplate);
    const road = addressRoad.trim();
    const detail = addressDetail.trim();
    const trimmedTitle = title.trim();
    const trimmedDept = department.trim();
    const trimmedEmail = clampLetteringBizcardEmail(email).trim();

    if (!trimmedEmail) {
      showToast("이메일은 필수입니다. 입력해 주세요.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      showToast("올바른 이메일 형식을 입력해 주세요.");
      return;
    }

    if (titleDeptNeedsSubmit) {
      if (!verifyDocKind) {
        const msg = "서류 종류를 선택해 주세요.";
        setVerifyDocError(msg);
        showToast(msg);
        return;
      }
      if (!verifyDocDataUrl || !verifyDocName) {
        const msg = "직책·부서 확인 서류를 첨부해 주세요. 첨부 없이는 명함 변경이 저장되지 않습니다.";
        setVerifyDocError(msg);
        showToast(msg);
        return;
      }
      if (!verifyDocIssuedAt || !isVerifyDocIssuedWithinLimit(verifyDocIssuedAt)) {
        const msg = "발급일 기준 1개월 이내 서류만 제출할 수 있습니다.";
        setVerifyDocError(msg);
        showToast(msg);
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
      companyIntro: companyIntro.trim(),
      customBackText: customBackText.trim(),
      addressRoad: road,
      addressDetail: detail,
      address: combineLetteringBizcardAddress(road, detail),
      noProfilePhoto,
      noCompanyLogo,
      noFax,
      noWebsite,
      photoFocus: normalizePhotoFocus(photoFocus),
      logoDataUrl: noCompanyLogo ? "" : pendingLogo?.dataUrl || logoPreview || "",
      logoFileName: noCompanyLogo ? "" : pendingLogo?.fileName || logoFileName || "",
      photoDataUrl: noProfilePhoto ? "" : pendingPhoto?.dataUrl || photoPreview || "",
      photoFileName: noProfilePhoto ? "" : pendingPhoto?.fileName || photoFileName || ""
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
    setPhotoPreview(saved.photoDataUrl || "");
    setPhotoFileName(saved.photoFileName || "");
    setPendingLogo(null);
    setPendingPhoto(null);

    try {
      /* primary/feed/chat = 프로필 사진, card = 회사 로고 — 슬롯 혼용 금지 */
      if (saved.photoDataUrl && !saved.noProfilePhoto) {
        writeProfilePhoto(saved.photoDataUrl);
      } else if (saved.noProfilePhoto) {
        writeProfilePhoto("");
      }
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
      photoUrl: saved.noProfilePhoto ? "" : saved.photoDataUrl || appliedCard.photoUrl || ""
    });
    if (!syncResult?.ok) {
      showToast("기기에 저장되었습니다. 서버 동기화에 실패했습니다. 네트워크 확인 후 다시 전체적용해 주세요.");
      setPreviewTick((n) => n + 1);
      onApplied?.();
      return;
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

      <div className="vlue-scroll-pad-bottom-nav min-h-0 flex-1 overflow-y-auto px-4 py-4 no-scrollbar">
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
          photoPreview={photoPreview}
          photoFileName={photoFileName}
          pendingPhoto={pendingPhoto}
          onPhotoPick={handlePhotoPick}
          photoError={photoError}
          noProfilePhoto={noProfilePhoto}
          setNoProfilePhoto={handleNoProfilePhotoChange}
          photoFocus={photoFocus}
          setPhotoFocus={setPhotoFocus}
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
          onApply={handleApply}
          applyLabel={applyLabel}
          toast={toast}
        />
        {cardId ? (
          <p className={`mt-3 text-center text-[10px] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
            카드 ID · {cardId}
          </p>
        ) : null}
      </div>
    </div>
  );
}
