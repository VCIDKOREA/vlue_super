import { useCallback, useRef, useState } from "react";
import { ImagePlus, Upload } from "lucide-react";
import LetteringDigitalReception from "./LetteringDigitalReception.jsx";
import LetteringBizcardAddressField from "./LetteringBizcardAddressField.jsx";
import LetteringBizcardTitleDeptVerifySection from "./LetteringBizcardTitleDeptVerifySection.jsx";
import LetteringBizcardOrgChangeSection from "./LetteringBizcardOrgChangeSection.jsx";
import {
  LETTERING_BIZCARD_EMAIL_MAX,
  LETTERING_BIZCARD_EMAIL_WARN,
  LETTERING_LOGO_RULES,
  LETTERING_PHOTO_RULES,
  clampLetteringBizcardEmail,
  isLetteringBizcardEmailLong,
  prepareLetteringLogoFromFile,
  prepareLetteringPhotoFromFile
} from "../lib/letteringBizcardStorage.js";

function Field({ label, hint, children, isDarkMode }) {
  const labelCls = isDarkMode ? "text-[11px] font-black text-gray-100" : "text-[11px] font-black text-gray-900";
  const hintCls = isDarkMode ? "mt-0.5 text-[10px] text-gray-400" : "mt-0.5 text-[10px] text-gray-500";
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {hint ? <p className={hintCls}>{hint}</p> : null}
      {children}
    </label>
  );
}

function OmitCheckbox({ checked, onChange, label, isDarkMode }) {
  const checkCls = isDarkMode
    ? "mt-2 flex cursor-pointer items-center gap-2 text-[11px] font-semibold text-gray-300"
    : "mt-2 flex cursor-pointer items-center gap-2 text-[11px] font-semibold text-slate-600";
  return (
    <label className={checkCls}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      {label}
    </label>
  );
}

function ImageUploadTile({
  preview,
  placeholder,
  onPick,
  acceptLabel,
  isDarkMode,
  disabled = false,
  omitChecked = false,
  onOmitChange,
  omitLabel
}) {
  const inputRef = useRef(null);
  const scrollSnapshot = useRef({ top: 0, el: null });

  const captureScroll = useCallback(() => {
    const scrollEl =
      inputRef.current?.closest(".overflow-y-auto, .vlue-scroll-pad-bottom-nav") ||
      document.scrollingElement;
    scrollSnapshot.current = {
      top: scrollEl?.scrollTop ?? window.scrollY ?? 0,
      el: scrollEl
    };
  }, []);

  const restoreScroll = useCallback(() => {
    const { top, el } = scrollSnapshot.current;
    requestAnimationFrame(() => {
      if (el && el !== document.documentElement && el !== document.body) {
        el.scrollTop = top;
      } else {
        window.scrollTo(0, top);
      }
    });
  }, []);

  const openPicker = useCallback(
    (e) => {
      e.preventDefault();
      if (disabled || omitChecked) return;
      captureScroll();
      const onWindowFocus = () => {
        restoreScroll();
        window.removeEventListener("focus", onWindowFocus);
      };
      window.addEventListener("focus", onWindowFocus);
      inputRef.current?.click();
    },
    [captureScroll, disabled, omitChecked, restoreScroll]
  );

  const handleChange = useCallback(
    (e) => {
      onPick(e);
      restoreScroll();
    },
    [onPick, restoreScroll]
  );

  const tile = isDarkMode
    ? `flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/5${
        disabled || omitChecked ? " opacity-40" : ""
      }`
    : `flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50${
        disabled || omitChecked ? " opacity-40" : ""
      }`;
  const btnCls = disabled || omitChecked
    ? "inline-flex cursor-not-allowed items-center gap-1.5 rounded-xl bg-slate-400 px-3 py-2 text-[11px] font-bold text-white opacity-60"
    : `inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold ${
        isDarkMode ? "bg-blue-600 text-white" : "bg-blue-600 text-white"
      } active:scale-[0.99]`;
  const checkCls = isDarkMode
    ? "mt-2 flex cursor-pointer items-center gap-2 text-[11px] font-semibold text-gray-300"
    : "mt-2 flex cursor-pointer items-center gap-2 text-[11px] font-semibold text-slate-600";

  return (
    <div>
      <div className={`flex items-center gap-3${disabled || omitChecked ? " pointer-events-none" : ""}`}>
        <span className={tile}>
          {preview && !omitChecked ? (
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className={`h-6 w-6 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={openPicker} disabled={disabled || omitChecked} className={btnCls}>
            <Upload className="h-3.5 w-3.5" />
            {placeholder}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={acceptLabel}
            onChange={handleChange}
            className="lbq-hidden-file-input"
            tabIndex={-1}
            aria-hidden
            disabled={disabled || omitChecked}
          />
        </div>
      </div>
      {onOmitChange ? (
        <label className={checkCls}>
          <input
            type="checkbox"
            checked={omitChecked}
            onChange={(e) => onOmitChange(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          {omitLabel}
        </label>
      ) : null}
    </div>
  );
}

/**
 * 디지털 인증명함 — 한 화면 입력 + 실시간 수신 UI 미리보기
 */
export default function LetteringBizcardQuickBuilder({
  fixed = {},
  previewCard,
  isDarkMode = false,
  title,
  setTitle,
  department,
  setDepartment,
  fax,
  setFax,
  email,
  setEmail,
  website,
  setWebsite,
  companyIntro,
  setCompanyIntro,
  customBackText,
  setCustomBackText,
  addressRoad,
  setAddressRoad,
  addressDetail,
  setAddressDetail,
  logoPreview,
  logoFileName,
  pendingLogo,
  onLogoPick,
  logoError,
  photoPreview,
  photoFileName,
  pendingPhoto,
  onPhotoPick,
  photoError,
  noProfilePhoto,
  setNoProfilePhoto,
  noCompanyLogo,
  setNoCompanyLogo,
  noFax,
  setNoFax,
  noWebsite,
  setNoWebsite,
  titleDeptApprovalStatus,
  titleDeptNeedsSubmit,
  verifyDocKind,
  setVerifyDocKind,
  verifyDocName,
  verifyDocIssuedAt,
  setVerifyDocIssuedAt,
  onVerifyDocPick,
  verifyDocError,
  orgChangeApprovalStatus = "",
  orgChangePendingName = "",
  onOrgChangeSubmitted,
  onOrgChangeToast,
  onApply,
  applyLabel = "적용",
  toast = ""
}) {
  const [previewFace, setPreviewFace] = useState("front");
  const inputBase = isDarkMode
    ? "mt-1.5 w-full rounded-xl border border-white/15 bg-slate-900/90 px-3 py-2.5 text-[13px] text-gray-100 outline-none focus:border-blue-400"
    : "mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[13px] text-[#0f172a] outline-none focus:border-blue-400";
  const panel = isDarkMode
    ? "rounded-2xl border border-white/10 bg-white/5 p-3.5"
    : "rounded-2xl border border-gray-200/90 bg-white p-3.5";
  const identityChip = isDarkMode
    ? "rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2"
    : "rounded-xl border border-gray-100 bg-gray-50 px-3 py-2";

  return (
    <div className="lbq-builder space-y-4">
      <div className={panel}>
        <p className={`mb-2 text-[12px] font-black ${isDarkMode ? "text-blue-300" : "text-blue-700"}`}>
          수신 화면 미리보기
        </p>
        <div className="lbq-preview-phone mx-auto max-w-[320px] rounded-[22px] border border-slate-200/80 bg-slate-950 shadow-lg">
          <LetteringDigitalReception
            card={previewCard}
            verified
            embeddedInPush
            previewMode
            face={previewFace}
            onFaceChange={setPreviewFace}
          />
        </div>
        <p className={`mt-2 text-center text-[10px] font-semibold ${isDarkMode ? "text-gray-400" : "text-slate-500"}`}>
          통화 중 상대방에게 이렇게 표시됩니다 · 앞면/뒷면 탭으로 확인
        </p>
      </div>

      <div className={`grid gap-2 sm:grid-cols-3 ${identityChip}`}>
        <div>
          <p className={`text-[9px] font-bold uppercase ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>상호</p>
          <p className={`truncate text-[12px] font-bold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
            {fixed.organization || "—"}
          </p>
        </div>
        <div>
          <p className={`text-[9px] font-bold uppercase ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>성함</p>
          <p className={`truncate text-[12px] font-bold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
            {fixed.name || "—"}
          </p>
          <p className={`mt-0.5 text-[9px] font-medium ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>수정 불가</p>
        </div>
        <div>
          <p className={`text-[9px] font-bold uppercase ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>전화</p>
          <p className={`truncate text-[12px] font-bold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
            {fixed.phone || "—"}
          </p>
        </div>
      </div>

      {onOrgChangeSubmitted ? (
        <LetteringBizcardOrgChangeSection
          isDarkMode={isDarkMode}
          inputBase={inputBase}
          currentOrganization={fixed.organization || ""}
          approvalStatus={orgChangeApprovalStatus}
          pendingName={orgChangePendingName}
          onSubmitted={onOrgChangeSubmitted}
          onToast={onOrgChangeToast}
        />
      ) : null}

      <div className={`${panel} space-y-4`}>
        <p className={`text-[12px] font-black ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>프로필 · 이미지</p>
        <Field label="프로필 사진" hint={`${LETTERING_PHOTO_RULES.acceptLabel} · 최대 1MB`} isDarkMode={isDarkMode}>
          <ImageUploadTile
            preview={pendingPhoto?.dataUrl || photoPreview}
            placeholder="사진 업로드"
            onPick={onPhotoPick}
            acceptLabel={LETTERING_PHOTO_RULES.accept}
            isDarkMode={isDarkMode}
            omitChecked={noProfilePhoto}
            onOmitChange={setNoProfilePhoto}
            omitLabel="사진 업로드 없음"
          />
          {photoFileName && !noProfilePhoto ? (
            <p className={`mt-1 text-[10px] font-semibold ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              {photoFileName}
              {pendingPhoto ? " (미적용)" : ""}
            </p>
          ) : null}
          {photoError ? <p className="mt-1 text-[10px] font-bold text-red-500">{photoError}</p> : null}
        </Field>
        <Field label="회사 로고" hint={`${LETTERING_LOGO_RULES.acceptLabel} · 512KB 이하`} isDarkMode={isDarkMode}>
          <ImageUploadTile
            preview={pendingLogo?.dataUrl || logoPreview}
            placeholder="로고 업로드"
            onPick={onLogoPick}
            acceptLabel={LETTERING_LOGO_RULES.accept}
            isDarkMode={isDarkMode}
            omitChecked={noCompanyLogo}
            onOmitChange={setNoCompanyLogo}
            omitLabel="회사 로고 없음"
          />
          {logoFileName && !noCompanyLogo ? (
            <p className={`mt-1 text-[10px] font-semibold ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              {logoFileName}
              {pendingLogo ? " (미적용)" : ""}
            </p>
          ) : null}
          {logoError ? <p className="mt-1 text-[10px] font-bold text-red-500">{logoError}</p> : null}
        </Field>
      </div>

      <div className={`${panel} grid gap-3 sm:grid-cols-2`}>
        <Field label="직책" isDarkMode={isDarkMode}>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputBase} />
        </Field>
        <Field label="부서" isDarkMode={isDarkMode}>
          <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} className={inputBase} />
        </Field>
        <LetteringBizcardTitleDeptVerifySection
          isDarkMode={isDarkMode}
          inputBase={inputBase}
          approvalStatus={titleDeptApprovalStatus}
          verifyDocKind={verifyDocKind}
          setVerifyDocKind={setVerifyDocKind}
          verifyDocName={verifyDocName}
          verifyDocIssuedAt={verifyDocIssuedAt}
          setVerifyDocIssuedAt={setVerifyDocIssuedAt}
          onDocPick={onVerifyDocPick}
          docError={verifyDocError}
          needsSubmit={titleDeptNeedsSubmit}
        />
        <Field label="이메일 (필수)" hint="명함에 반드시 표시됩니다" isDarkMode={isDarkMode}>
          <input
            type="email"
            value={email}
            maxLength={LETTERING_BIZCARD_EMAIL_MAX}
            onChange={(e) => setEmail(clampLetteringBizcardEmail(e.target.value))}
            className={inputBase}
            autoComplete="email"
            required
            placeholder="이메일을 입력할 수 있습니다."
          />
          {isLetteringBizcardEmailLong(email) ? (
            <p className="mt-1 text-[10px] font-bold text-amber-600">
              이메일이 깁니다({email.length}/{LETTERING_BIZCARD_EMAIL_MAX}자). 미리보기를 확인하세요.
            </p>
          ) : email.length >= LETTERING_BIZCARD_EMAIL_WARN ? (
            <p className={`mt-1 text-[10px] ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              {email.length}/{LETTERING_BIZCARD_EMAIL_MAX}자
            </p>
          ) : null}
        </Field>
        <Field label="웹사이트 (선택)" hint="입력하지 않으면 명함에 표시되지 않습니다" isDarkMode={isDarkMode}>
          <input
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            disabled={noWebsite}
            className={`${inputBase}${noWebsite ? " cursor-not-allowed opacity-50" : ""}`}
            placeholder="웹사이트를 입력할 수 있습니다."
          />
          <OmitCheckbox checked={noWebsite} onChange={setNoWebsite} label="웹사이트 없음" isDarkMode={isDarkMode} />
        </Field>
        <Field label="팩스 (선택)" hint="입력하지 않으면 명함에 표시되지 않습니다" isDarkMode={isDarkMode}>
          <input
            type="tel"
            value={fax}
            onChange={(e) => setFax(e.target.value)}
            disabled={noFax}
            className={`${inputBase}${noFax ? " cursor-not-allowed opacity-50" : ""}`}
            placeholder="팩스를 입력할 수 있습니다."
          />
          <OmitCheckbox checked={noFax} onChange={setNoFax} label="팩스 없음" isDarkMode={isDarkMode} />
        </Field>
        <LetteringBizcardAddressField
          addressRoad={addressRoad}
          setAddressRoad={setAddressRoad}
          addressDetail={addressDetail}
          setAddressDetail={setAddressDetail}
          isDarkMode={isDarkMode}
          inputBase={inputBase}
        />
        <div className="sm:col-span-2">
          <Field label="소개 (앞면 프로필)" hint="통화 수신 시 앞면 탭에 표시됩니다" isDarkMode={isDarkMode}>
            <textarea
              value={companyIntro}
              onChange={(e) => setCompanyIntro(e.target.value)}
              rows={3}
              className={inputBase}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="추가 설명 (뒷면)" hint="통화 수신 시 뒷면 연락처 하단에 표시됩니다" isDarkMode={isDarkMode}>
            <textarea
              value={customBackText}
              onChange={(e) => setCustomBackText(e.target.value)}
              rows={3}
              className={inputBase}
              placeholder="예: 상담 가능 시간, 방문 안내, 프로모션 문구 등"
            />
          </Field>
        </div>
      </div>

      <button
        type="button"
        onClick={onApply}
        className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-[14px] font-black text-white shadow-lg active:scale-[0.99]"
      >
        {applyLabel}
      </button>
      {toast ? (
        <p className={`text-center text-[11px] font-bold ${isDarkMode ? "text-cyan-300" : "text-blue-600"}`}>
          {toast}
        </p>
      ) : null}
    </div>
  );
}
