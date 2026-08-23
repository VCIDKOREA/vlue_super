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
  const [logoError, setLogoError] = useState("");
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
      /* 濡쒖뺄�씠 鍮꾩뼱 �엳�쑝硫� full snapshot 蹂듭썝 (�옱�꽕移샕룹틦�떆 �쑀�떎) */
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
      /* 鍮꾨줈洹몄씤쨌�삤�봽�씪�씤 ��� 濡쒖뺄留� */
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
    /* 濡쒓렇�씤 �떆 full hydrate �맂 濡쒖뺄蹂� �궗�슜 ��� �꽕�젙 吏꾩엯留덈떎 full snapshot GET 湲덉�� */
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
    if (titleDeptNeedsSubmit) return "�떊泥� 쨌 �쟾泥댁쟻�슜";
    if (isFirstApply) return "�떊泥� 쨌 �쟾泥댁쟻�슜";
    return "�쟾泥댁쟻�슜";
  }, [titleDeptNeedsSubmit, isFirstApply]);

  const showToast = (msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 4200);
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
      setLogoError("濡쒓퀬 �씠誘몄��瑜� �씫吏� 紐삵뻽�뒿�땲�떎.");
      return;
    }
    setPendingLogo({ dataUrl: persist || preview, fileName: result.fileName, previewUrl: preview });
    setLogoPreview(preview);
    setLogoFileName(result.fileName);
    setNoCompanyLogo(false);
    if (result.uploadWarning) setToast(result.uploadWarning);
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
      setTitlePhotoError("�궗吏꾩쓣 �씫吏� 紐삵뻽�뒿�땲�떎.");
      return;
    }
    setPendingTitlePhoto({ dataUrl: persist || preview, fileName: result.fileName, previewUrl: preview });
    setTitlePhotoPreview(preview);
    setTitlePhotoFileName(result.fileName);
    setNoTitlePhoto(false);
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
      showToast("�씠硫붿씪��� �븘�닔�엯�땲�떎. �엯�젰�빐 二쇱꽭�슂.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      showToast("�삱諛붾Ⅸ �씠硫붿씪 �삎�떇�쓣 �엯�젰�빐 二쇱꽭�슂.");
      return;
    }

    if (!isDccExposureComplete(exposureChoice)) {
      showToast("寃��깋쨌�뙏濡쒖슦 �끂異� �꽕�젙�쓣 紐⑤몢 吏��젙�빐�빞 ����옣�맗�땲�떎.");
      return;
    }

    const exposureSaved = await saveDccExposure(exposureChoice);
    if (!exposureSaved.ok) {
      showToast(exposureSaved.message || "�끂異� �꽕�젙�쓣 ����옣�븯吏� 紐삵뻽�뒿�땲�떎.");
      return;
    }

    if (titleDeptNeedsSubmit) {
      if (!verifyDocKind) {
        const msg = "�꽌瑜� 醫낅쪟瑜� �꽑�깮�빐 二쇱꽭�슂.";
        setVerifyDocError(msg);
        showToast(msg);
        return;
      }
      if (!verifyDocDataUrl || !verifyDocName) {
        const msg = "吏곸콉쨌遺��꽌 �솗�씤 �꽌瑜섎�� 泥⑤���빐 二쇱꽭�슂. 泥⑤�� �뾾�씠�뒗 紐낇븿 蹂�寃쎌씠 ����옣�릺吏� �븡�뒿�땲�떎.";
        setVerifyDocError(msg);
        showToast(msg);
        return;
      }
      if (!verifyDocIssuedAt || !isVerifyDocIssuedWithinLimit(verifyDocIssuedAt)) {
        const msg = "諛쒓툒�씪 湲곗�� 1媛쒖썡 �씠�궡 �꽌瑜섎쭔 �젣異쒗븷 �닔 �엳�뒿�땲�떎.";
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
        setVerifyDocError(e?.message || "�꽌瑜� �젣異쒖뿉 �떎�뙣�뻽�뒿�땲�떎.");
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
        showToast(writeResult?.error || "����옣�뿉 �떎�뙣�뻽�뒿�땲�떎. �떎�떆 �떆�룄�빐 二쇱꽭�슂.");
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
        showToast(writeResult?.error || "����옣�뿉 �떎�뙣�뻽�뒿�땲�떎. �떎�떆 �떆�룄�빐 二쇱꽭�슂.");
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
          ? `湲곌린�뿉 ����옣�릺�뿀�뒿�땲�떎. �꽌踰� �룞湲고솕 �떎�뙣: ${syncResult.error}`
          : "湲곌린�뿉 ����옣�릺�뿀�뒿�땲�떎. �꽌踰� �룞湲고솕�뿉 �떎�뙣�뻽�뒿�땲�떎. �꽕�듃�썙�겕 �솗�씤 �썑 �떎�떆 �쟾泥댁쟻�슜�빐 二쇱꽭�슂."
      );
      setPreviewTick((n) => n + 1);
      onApplied?.();
      return;
    }
    if (syncResult?.mediaError) {
      showToast(`紐낇븿��� ����옣�릱吏�留� �궗吏� �겢�씪�슦�뱶 �뾽濡쒕뱶�뿉 臾몄젣媛� �엳�뿀�뒿�땲�떎: ${syncResult.mediaError}`);
    }
    /* �뾽濡쒕뱶�맂 https 濡� 誘몃━蹂닿린 媛깆떊 */
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
        ? "吏곸콉쨌遺��꽌 蹂�寃� �떊泥��씠 �젒�닔�릺�뿀�뒿�땲�떎. �꽌瑜� �솗�씤 �썑 �듅�씤�맗�땲�떎."
        : isFirstApply
          ? "�쟾泥댁쟻�슜�릺�뿀�뒿�땲�떎. �뵒吏��꽭�씤利앸챸�븿 �떊泥��씠 �셿猷뚮릺�뿀怨�, �넻�솕 �닔�떊 �솕硫댁뿉 諛섏쁺�맗�땲�떎."
          : "�쟾泥댁쟻�슜�릺�뿀�뒿�땲�떎. �엯�젰�븯�떊 �궡�슜�씠 �뵒吏��꽭�씤利앸챸�븿쨌�눥耳��씠�뒪�뿉 諛섏쁺�릺�뿀�뒿�땲�떎."
    );
    onApplied?.();
  };

  return (
    <div className={`flex h-full min-h-0 flex-col ${isDarkMode ? "text-gray-100" : ""}`}>
      <div className={`flex shrink-0 items-center gap-1 border-b px-3 py-2.5 ${isDarkMode ? "border-white/10" : "border-gray-100"}`}>
        <BackButton variant="inline" onBack={onBack} isDarkMode={isDarkMode} />
        <div className="min-w-0 flex-1">
          <p className={`text-[17px] font-black ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
            {isFirstApply ? "�뵒吏��꽭�씤利앸챸�븿 留뚮뱾湲�" : "�뵒吏��꽭 �씤利� 紐낇븿"}
          </p>
          <p className={`text-[11px] ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            �븳 �솕硫댁뿉�꽌 �엯�젰�븯怨� �닔�떊 UI瑜� 諛붾줈 �솗�씤�븯�꽭�슂.
            {!isPaid ? " 쨌 �쑀猷� �쉶�썝留� �넻�솕 以� �긽����뿉寃� �몴�떆�맗�땲�떎." : ""}
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
              �뵒吏��꽭�씤利� 紐낇븿 �넚異�
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
              {dccBroadcastOn ? "耳쒖쭚" : "爰쇱쭚"}
            </p>
          </div>
          <input
            type="checkbox"
            role="switch"
            className="peer sr-only"
            checked={dccBroadcastOn}
            aria-checked={dccBroadcastOn}
            aria-label="�뵒吏��꽭�씤利앸챸�븿 �눥耳��씠�뒪 �넚異�"
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

      <div className="vlue-scroll-pad-profile-panel min-h-0 flex-1 overflow-y-auto px-4 py-4 no-scrollbar">
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
              onChange={setExposureChoice}
              isDarkMode={isDarkMode}
            />
          }
          onApply={handleApply}
          applyLabel={applyLabel}
          toast={toast}
        />
        {cardId ? (
          <p className={`mt-3 text-center text-[10px] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
            移대뱶 ID 쨌 {cardId}
          </p>
        ) : null}
      </div>
    </div>
  );
}
