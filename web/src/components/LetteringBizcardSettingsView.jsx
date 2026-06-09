import { useCallback, useEffect, useMemo, useState } from "react";
import { isPaidLetteringTier } from "../lib/letteringMembership.js";
import { readCardEmail, readCardFax, readCardPromo } from "../lib/memberCardStorage.js";
import {
  LETTERING_BIZCARD_CHANGED_EVENT,
  LETTERING_BIZCARD_EMAIL_MAX,
  LETTERING_BIZCARD_EMAIL_WARN,
  LETTERING_LOGO_RULES,
  clampLetteringBizcardEmail,
  isLetteringBizcardEmailLong,
  prepareLetteringLogoFromFile,
  readLetteringBizcardEditable,
  readLetteringFixedIdentity,
  writeLetteringBizcardEditable
} from "../lib/letteringBizcardStorage.js";
import {
  buildUserLetteringCard,
  withLetteringBizcardPreviewFallback
} from "../lib/letteringBizcardProfile.js";
import LetteringBusinessCardWithMembership from "./LetteringBusinessCardWithMembership.jsx";
import LetteringBizcardSecureFrame from "./LetteringBizcardSecureFrame.jsx";
import LetteringBizcardScaledPreview from "./LetteringBizcardScaledPreview.jsx";
import LetteringBizcardTemplatePicker from "./LetteringBizcardTemplatePicker.jsx";
import BackButton from "./common/BackButton";
import { useB2bMembership } from "../context/B2bMembershipContext.jsx";
import {
  syncDigitalCardDesignTemplate,
  syncDigitalCardExportSnapshot,
  fetchDigitalCardMeta
} from "../lib/digitalCardApi.js";
import { normalizeLetteringBizcardTemplate } from "../lib/letteringBizcardTemplates.js";

function RowReadonly({ label, value, isDarkMode }) {
  const box = isDarkMode
    ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
    : "rounded-xl border border-gray-200/80 bg-gray-50/90 px-3 py-2.5";
  const labelCls = isDarkMode
    ? "text-[10px] font-bold uppercase tracking-wide text-gray-400"
    : "text-[10px] font-bold uppercase tracking-wide text-gray-500";
  const valueCls = isDarkMode
    ? "mt-0.5 text-[13px] font-semibold text-gray-100"
    : "mt-0.5 text-[13px] font-semibold text-[#0f172a]";
  const hintCls = isDarkMode ? "mt-1 text-[10px] text-gray-400" : "mt-1 text-[10px] text-gray-500";
  return (
    <div className={box}>
      <p className={labelCls}>{label}</p>
      <p className={valueCls}>{value || "\u2014"}</p>
      <p className={hintCls}>{"\uAC00\uC785 \uC815\uBCF4 \u00B7 \uC218\uC815 \uBD88\uAC00"}</p>
    </div>
  );
}

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
  const [address, setAddress] = useState("");
  const [logoFileName, setLogoFileName] = useState("");
  const [logoPreview, setLogoPreview] = useState("");
  const [pendingLogo, setPendingLogo] = useState(null);
  const [previewTick, setPreviewTick] = useState(0);
  const [toast, setToast] = useState("");
  const [logoError, setLogoError] = useState("");
  const [designTemplate, setDesignTemplate] = useState("classic-light");
  const [cardId, setCardId] = useState("");
  const [cardIssuedAt, setCardIssuedAt] = useState(null);
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
    setAddress(ed.address);
    setLogoFileName(ed.logoFileName);
    setLogoPreview(ed.logoDataUrl);
    setDesignTemplate(normalizeLetteringBizcardTemplate(ed.designTemplate));
    setPendingLogo(null);
    setPreviewTick((n) => n + 1);
  }, []);

  useEffect(() => {
    fetchDigitalCardMeta().then((meta) => {
      if (meta.cardId) setCardId(meta.cardId);
      setCardIssuedAt(meta.issuedAt || null);
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
      address,
      logoUrl: pendingLogo?.dataUrl || logoPreview || draft.logoUrl
    });
  }, [
    membershipTier,
    title,
    department,
    fax,
    email,
    website,
    companyIntro,
    address,
    logoPreview,
    pendingLogo,
    previewTick,
    cardIssuedAt
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
      address: address.trim(),
      logoDataUrl: pendingLogo?.dataUrl || logoPreview || "",
      logoFileName: pendingLogo?.fileName || logoFileName || ""
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
    setPreviewTick((n) => n + 1);
    showToast(
      isFirstApply
        ? "디지털인증명함 신청이 완료되었습니다. 통화 중 명함에 반영됩니다."
        : "레터링 명함에 적용되었습니다."
    );
    onApplied?.();
  };

  const fieldLabel = isDarkMode ? "text-[12px] font-black text-gray-100" : "text-[12px] font-black text-gray-900";
  const inputBase = isDarkMode
    ? "mt-1 w-full rounded-xl border border-white/15 bg-slate-900/90 px-3 py-2.5 text-[13px] text-gray-100 outline-none focus:border-blue-400"
    : "mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[13px] text-[#0f172a] outline-none focus:border-blue-400";
  const hintSm = isDarkMode ? "mt-1 text-[10px] text-gray-400" : "mt-1 text-[10px] text-gray-500";
  const section = isDarkMode
    ? "rounded-2xl border border-white/10 bg-white/5 p-3"
    : "rounded-2xl border border-gray-200/90 bg-white p-3";

  return (
    <div className={`flex h-full min-h-0 flex-col ${isDarkMode ? "text-gray-100" : ""}`}>
      <div className={`flex shrink-0 items-center gap-1 border-b px-3 py-2.5 ${isDarkMode ? "border-white/10" : "border-gray-100"}`}>
        <BackButton variant="inline" onBack={onBack} isDarkMode={isDarkMode} />
        <div className="min-w-0 flex-1">
          <p className={`text-[17px] font-black ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
            {isFirstApply ? "디지털인증명함 신청" : "레터링 명함 설정"}
          </p>
          <p className={`text-[11px] ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            {isFirstApply
              ? "입력 후 적용하면 명함이 활성화됩니다. 이 화면에서만 수정·신청할 수 있습니다."
              : "통화 중 빅푸시·명함에 표시됩니다. 이 화면에서만 수정할 수 있습니다."}
          </p>
        </div>
      </div>

      <div className="vlue-scroll-pad-bottom-nav min-h-0 flex-1 overflow-y-auto px-5 py-4 no-scrollbar">
        <div className="space-y-3">
          <p className={`text-[11px] font-bold ${isDarkMode ? "text-blue-300" : "text-blue-700"}`}>
            {"\uAC00\uC785 \uC2DC \uD655\uC815 (\uC218\uC815 \uBD88\uAC00)"}
          </p>
          <RowReadonly label={"\uD68C\uC0AC\uBA85 (\uC0C1\uD638)"} value={fixed.organization} isDarkMode={isDarkMode} />
          <RowReadonly label={"\uC131\uBA85"} value={fixed.name} isDarkMode={isDarkMode} />
          <RowReadonly label={"\uC804\uD654\uBC88\uD638"} value={fixed.phone} isDarkMode={isDarkMode} />

          <p className={`pt-2 text-[11px] font-bold ${isDarkMode ? "text-blue-300" : "text-blue-700"}`}>
            {"\uC9C1\uC811 \uC785\uB825"}
          </p>

          <div className={section}>
            <LetteringBizcardTemplatePicker
              value={designTemplate}
              onChange={setDesignTemplate}
              isDarkMode={isDarkMode}
            />
          </div>

          <label className={`block ${fieldLabel}`}>
            {"\uC9C1\uCC45"}
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputBase} />
          </label>
          <label className={`block ${fieldLabel}`}>
            {"\uBD80\uC11C\uBA85"}
            <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} className={inputBase} />
          </label>
          <label className={`block ${fieldLabel}`}>
            {"\uD329\uC2A4 (F)"}
            <input type="tel" value={fax} onChange={(e) => setFax(e.target.value)} className={inputBase} />
          </label>
          <label className={`block ${fieldLabel}`}>
            {"\uC774\uBA54\uC77C (E)"}
            <input
              type="email"
              value={email}
              maxLength={LETTERING_BIZCARD_EMAIL_MAX}
              onChange={(e) => setEmail(clampLetteringBizcardEmail(e.target.value))}
              className={inputBase}
              autoComplete="email"
            />
            <p className={hintSm}>
              {`\uBA85\uD568 \uBBF8\uB9AC\uBCF4\uAE30\uB294 \uD55C \uC904\uB85C\uB9CC \uD45C\uC2DC\uB429\uB2C8\uB2E4. \uCD5C\uB300 ${LETTERING_BIZCARD_EMAIL_MAX}\uC790 \u00B7 \uC785\uB825 \uD6C4 \uC544\uB798 \uBBF8\uB9AC\uBCF4\uAE30\uB85C \uC904\uBC14\uAFC8\u00B7\uBC00\uB9BC \uC5EC\uBD80\uB97C \uD655\uC778\uD558\uC138\uC694.`}
            </p>
            {isLetteringBizcardEmailLong(email) ? (
              <p
                className={`mt-1.5 rounded-lg border px-2.5 py-2 text-[10px] font-bold leading-snug ${
                  isDarkMode
                    ? "border-amber-500/40 bg-amber-950/40 text-amber-100"
                    : "border-amber-200 bg-amber-50 text-amber-900"
                }`}
                role="status"
              >
                {email.length >= LETTERING_BIZCARD_EMAIL_MAX
                  ? `\uCD5C\uB300 ${LETTERING_BIZCARD_EMAIL_MAX}\uC790\uC785\uB2C8\uB2E4. \uBBF8\uB9AC\uBCF4\uAE30\uC5D0\uC11C \uC774\uBA54\uC77C\uC774 \uC544\uB798\uB85C \uBC00\uB9AC\uC9C0 \uC54A\uC740\uC9C0 \uBC18\uB4DC\uC2DC \uD655\uC778\uD558\uC138\uC694.`
                  : `\uC774\uBA54\uC77C\uC774 \uAE41\uB2C8\uB2E4(${email.length}/${LETTERING_BIZCARD_EMAIL_MAX}\uC790). \uB108\uBBF8 \uAE38\uBA74 \uBA85\uD568 \uC624\uB978 \uC815\uBCF4\uAC00 \uC544\uB798\uB85C \uBC00\uB824 \uB098\uC62C \uC218 \uC788\uC73C\uB2C8 \uBBF8\uB9AC\uBCF4\uAE30\uB97C \uD655\uC778\uD558\uC138\uC694.`}
              </p>
            ) : email.length > 0 && email.length >= LETTERING_BIZCARD_EMAIL_WARN - 2 ? (
              <p className={`mt-1 text-[10px] font-semibold ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                {`${email.length}/${LETTERING_BIZCARD_EMAIL_MAX}\uC790 \u00B7 \uC785\uB825 \uC911\uC5D0\uB3C4 \uBBF8\uB9AC\uBCF4\uAE30\uB97C \uBCF4\uC138\uC694.`}
              </p>
            ) : null}
          </label>
          <label className={`block ${fieldLabel}`}>
            {"\uD648\uD398\uC774\uC9C0 (H)"}
            <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} className={inputBase} />
          </label>
          <label className={`block ${fieldLabel}`}>
            {"\uD68C\uC0AC \uC18C\uAC1C (\uBA85\uD568 \uB4B7\uBA74)"}
            <textarea value={companyIntro} onChange={(e) => setCompanyIntro(e.target.value)} rows={3} className={inputBase} />
          </label>
          <label className={`block ${fieldLabel}`}>
            {"\uC0AC\uC5C5\uC7A5 \uC8FC\uC18C (\uBA85\uD568 \uB4B7\uBA74 \uD558\uB2E8)"}
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={inputBase} />
          </label>

          <div className={section}>
            <p className={fieldLabel}>{"\uD68C\uC0AC \uB85C\uACE0"}</p>
            <p className={hintSm}>
              {"\uD30C\uC77C\uBA85: "}
              <b>{`${LETTERING_LOGO_RULES.fileNamePrefix}.png`}</b>
              {` \u00B7 ${LETTERING_LOGO_RULES.acceptLabel} \u00B7 \uCD5C\uB300 512KB \u00B7 ${LETTERING_LOGO_RULES.maxWidth}\u00D7${LETTERING_LOGO_RULES.maxHeight}px`}
            </p>
            <div className="mt-2 flex items-center gap-3">
              <span
                className={`inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 ${
                  isDarkMode ? "border-white/15 bg-white/10" : "border-gray-200 bg-gray-50"
                }`}
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="" className="h-full w-full object-contain p-1" />
                ) : (
                  <span className={`text-[10px] font-bold ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>LOGO</span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <input
                  type="file"
                  accept={LETTERING_LOGO_RULES.accept}
                  onChange={handleLogoPick}
                  className="block w-full text-[11px] file:mr-2 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-[11px] file:font-bold file:text-white"
                />
                {logoFileName ? (
                  <p className={`mt-1 truncate text-[10px] font-semibold ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                    {logoFileName}
                    {pendingLogo ? " (\uBBF8\uC801\uC6A9)" : " (\uC801\uC6A9\uB428)"}
                  </p>
                ) : null}
                {logoError ? <p className="mt-1 text-[10px] font-bold text-red-500">{logoError}</p> : null}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleApply}
            className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-[14px] font-black text-white shadow-lg active:scale-[0.99]"
          >
            {isFirstApply ? "신청 · 적용" : "적용"}
          </button>
          {toast ? (
            <p className={`text-center text-[11px] font-bold ${isDarkMode ? "text-cyan-300" : "text-blue-600"}`}>
              {toast}
            </p>
          ) : null}

          <div className={section}>
            <p className={`mb-2 text-[13px] font-black ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
              {"\uC801\uC6A9 \uBA85\uD568 \uBBF8\uB9AC\uBCF4\uAE30"}
            </p>
            {!isPaid ? (
              <p className={`text-[11px] leading-relaxed ${isDarkMode ? "text-amber-200" : "text-amber-800"}`}>
                {"\uC720\uB8CC \uD68C\uC6D0\uB9CC \uD1B5\uD654 \uC911 \uBA85\uD568\uC774 \uC0C1\uB300\uC5D0\uAC8C \uD45C\uC2DC\uB429\uB2C8\uB2E4."}
              </p>
            ) : null}
            {isLetteringBizcardEmailLong(email) ? (
              <p
                className={`mb-2 rounded-xl border px-3 py-2 text-[10px] font-bold leading-snug ${
                  isDarkMode
                    ? "border-amber-500/35 bg-amber-950/30 text-amber-100"
                    : "border-amber-300 bg-amber-50 text-amber-950"
                }`}
              >
                {"\u25B6 \uBBF8\uB9AC\uBCF4\uAE30: \uC774\uBA54\uC77C\uC774 \uAE41\uC73C\uBA74 \uC624\uB978 \uD56D\uBAA9\uC774 \uC544\uB798\uB85C \uBC00\uB824 \uBCF4\uC77C \uC218 \uC788\uC2B5\uB2C8\uB2E4. \uC904\uC774\uB098 \uAE38\uC774\uB97C \uC904\uC778 \uB4A4 \uB2E4\uC2DC \uD655\uC778\uD558\uC138\uC694."}
              </p>
            ) : null}
            <div
              className={`mt-3 rounded-2xl border p-3 ${
                isDarkMode
                  ? "border-white/15 bg-slate-900/70"
                  : "border-blue-100/80 bg-gradient-to-br from-slate-50 to-blue-50/40"
              }`}
            >
              <LetteringBizcardScaledPreview isDarkMode={isDarkMode}>
                <LetteringBizcardSecureFrame designTemplate={designTemplate} card={previewCard} cardId={cardId}>
                  <LetteringBusinessCardWithMembership card={previewCard} />
                </LetteringBizcardSecureFrame>
              </LetteringBizcardScaledPreview>
            </div>
            <p className={`mt-2 text-center text-[10px] font-semibold ${isDarkMode ? "text-gray-400" : "text-slate-500"}`}>
              {"\uC0AC\uC6A9\uC720\uD6A8\uAE30\uAC04\uC740 \u300C\uBA85\uD568 \uB4B7\uBA74\u300D \uBC84\uD2BC\uC73C\uB85C \uB4A4\uC9D1\uC5B4 \uD655\uC778\uD558\uC138\uC694."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
