import { useCallback, useEffect, useMemo, useState } from "react";
import { isPaidLetteringTier } from "../lib/letteringMembership.js";
import { readCardEmail, readCardFax, readCardPromo } from "../lib/memberCardStorage.js";
import {
  LETTERING_BIZCARD_CHANGED_EVENT,
  clampLetteringBizcardEmail,
  prepareLetteringLogoFromFile,
  prepareLetteringPhotoFromFile,
  readLetteringBizcardEditable,
  readLetteringFixedIdentity,
  writeLetteringBizcardEditable
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

export default function LetteringBizcardSettingsView({
  membershipTier = "free",
  isDarkMode = false,
  isFirstApply = false,
  onBack,
  onApplied
}) {
  const fixed = useMemo(() => readLetteringFixedIdentity(), []);
  const isPaid = isPaidLetteringTier(membershipTier);

  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [fax, setFax] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [companyIntro, setCompanyIntro] = useState("");
  const [customBackText, setCustomBackText] = useState("");
  const [address, setAddress] = useState("");
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
  const [designTemplate, setDesignTemplate] = useState("classic-light");
  const [cardId, setCardId] = useState("");
  const { refresh: refreshMembership } = useB2bMembership();

  const reload = useCallback(() => {
    const ed = readLetteringBizcardEditable();
    const cardFax = readCardFax();
    const cardEmail = readCardEmail();
    const cardPromo = readCardPromo();
    setTitle(ed.title);
    setDepartment(ed.department);
    setFax(ed.fax || cardFax || "");
    setEmail(clampLetteringBizcardEmail(ed.email || cardEmail || ""));
    setWebsite(ed.website);
    setCompanyIntro(ed.companyIntro || cardPromo || "");
    setCustomBackText(ed.customBackText || "");
    setAddress(ed.address);
    setLogoFileName(ed.logoFileName);
    setLogoPreview(ed.logoDataUrl);
    setPhotoFileName(ed.photoFileName || "");
    setPhotoPreview(ed.photoDataUrl || "");
    setDesignTemplate(normalizeLetteringBizcardTemplate(ed.designTemplate));
    setPendingLogo(null);
    setPendingPhoto(null);
    setPreviewTick((n) => n + 1);
  }, []);

  useEffect(() => {
    fetchDigitalCardMeta().then((meta) => {
      if (meta.cardId) setCardId(meta.cardId);
    });
  }, [previewTick]);

  useEffect(() => {
    refreshMembership();
  }, [refreshMembership]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const onChange = () => reload();
    window.addEventListener(LETTERING_BIZCARD_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(LETTERING_BIZCARD_CHANGED_EVENT, onChange);
  }, [reload]);

  const previewCard = useMemo(() => {
    const draft = buildUserLetteringCard({ membershipTier });
    return withLetteringBizcardPreviewFallback({
      ...draft,
      title,
      department,
      fax,
      email,
      website,
      companyIntro,
      customBackText,
      address,
      logoUrl: pendingLogo?.dataUrl || logoPreview || draft.logoUrl,
      photoUrl: pendingPhoto?.dataUrl || photoPreview || draft.photoUrl
    });
  }, [
    membershipTier,
    title,
    department,
    fax,
    email,
    website,
    companyIntro,
    customBackText,
    address,
    logoPreview,
    pendingLogo,
    photoPreview,
    pendingPhoto,
    previewTick
  ]);

  const showToast = (msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2400);
  };

  const handleLogoPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    setLogoError("");
    const result = await prepareLetteringLogoFromFile(file);
    if (!result.ok) {
      setLogoError(result.error);
      return;
    }
    setPendingLogo({ dataUrl: result.dataUrl, fileName: result.fileName });
    setLogoPreview(result.dataUrl);
    setLogoFileName(result.fileName);
  };

  const handlePhotoPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    setPhotoError("");
    const result = await prepareLetteringPhotoFromFile(file);
    if (!result.ok) {
      setPhotoError(result.error);
      return;
    }
    setPendingPhoto({ dataUrl: result.dataUrl, fileName: result.fileName });
    setPhotoPreview(result.dataUrl);
    setPhotoFileName(result.fileName);
  };

  const handleApply = async () => {
    const tpl = normalizeLetteringBizcardTemplate(designTemplate);
    writeLetteringBizcardEditable({
      designTemplate: tpl,
      title: title.trim(),
      department: department.trim(),
      fax: fax.trim(),
      email: clampLetteringBizcardEmail(email).trim(),
      website: website.trim(),
      companyIntro: companyIntro.trim(),
      customBackText: customBackText.trim(),
      address: address.trim(),
      logoDataUrl: pendingLogo?.dataUrl || logoPreview || "",
      logoFileName: pendingLogo?.fileName || logoFileName || "",
      photoDataUrl: pendingPhoto?.dataUrl || photoPreview || "",
      photoFileName: pendingPhoto?.fileName || photoFileName || ""
    });
    void syncDigitalCardDesignTemplate(tpl);
    void syncDigitalCardExportSnapshot({ ...previewCard, designTemplate: tpl });
    if (isFirstApply) {
      try {
        localStorage.setItem("vlue_digital_card_active", "1");
        window.dispatchEvent(new CustomEvent("vlue-digital-card-changed"));
      } catch {
        /* ignore */
      }
    }
    setPendingLogo(null);
    setPendingPhoto(null);
    setPreviewTick((n) => n + 1);
    showToast(
      isFirstApply
        ? "디지털인증명함 신청이 완료되었습니다. 통화 중 수신 화면에 반영됩니다."
        : "디지털 인증 명함에 적용되었습니다."
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
          address={address}
          setAddress={setAddress}
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
          onApply={handleApply}
          applyLabel={isFirstApply ? "신청 · 적용" : "적용"}
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
