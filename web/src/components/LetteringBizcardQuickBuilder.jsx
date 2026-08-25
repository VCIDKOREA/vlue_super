import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Upload } from "lucide-react";
import LetteringDigitalReception from "./LetteringDigitalReception.jsx";
import LetteringBizcardScaledPreview from "./LetteringBizcardScaledPreview.jsx";
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
  prepareLetteringPhotoFromFile,
  PHOTO_FOCUS_OPTIONS,
  normalizePhotoFocus,
  photoFocusToCss
} from "../lib/letteringBizcardStorage.js";
import { useShowcaseBgm } from "../context/ShowcaseBgmContext.jsx";

function Field({ label, hint, children, isDarkMode }) {
  const labelCls = isDarkMode ? "text-[11px] font-black text-gray-100" : "text-[11px] font-black text-gray-900";
  const hintCls = isDarkMode ? "mt-0.5 text-[10px] text-gray-400" : "mt-0.5 text-[10px] text-gray-500";
  /* div ��� �궡遺� 泥댄겕諛뺤뒪 label 怨� 以묒꺽�릺硫� �겢由��씠 癒뱁넻�씠 �맖 */
  return (
    <div className="block">
      <span className={labelCls}>{label}</span>
      {hint ? <p className={hintCls}>{hint}</p> : null}
      {children}
    </div>
  );
}

function OmitCheckbox({ checked, onChange, label, isDarkMode }) {
  const checkCls = isDarkMode
    ? "mt-2 flex w-full cursor-pointer items-center gap-2 text-left text-[11px] font-semibold text-gray-300"
    : "mt-2 flex w-full cursor-pointer items-center gap-2 text-left text-[11px] font-semibold text-slate-600";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      className={checkCls}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onChange(!checked);
      }}
    >
      <span
        aria-hidden
        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
          checked
            ? "border-blue-600 bg-blue-600 text-white"
            : isDarkMode
              ? "border-gray-500 bg-transparent"
              : "border-gray-300 bg-white"
        }`}
      >
        {checked ? (
          <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2.5 6.2 4.8 8.5 9.5 3.5" />
          </svg>
        ) : null}
      </span>
      {label}
    </button>
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
  omitLabel,
  objectPosition,
  objectFit = "cover"
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
      e.stopPropagation();
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

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className={tile}>
          {preview && !omitChecked ? (
            <img
              src={preview}
              alt=""
              className={`h-full w-full ${objectFit === "contain" ? "object-contain" : "object-cover"}`}
              style={objectPosition ? { objectPosition } : undefined}
            />
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
        <OmitCheckbox checked={omitChecked} onChange={onOmitChange} label={omitLabel} isDarkMode={isDarkMode} />
      ) : null}
    </div>
  );
}

function PhotoFocusBar({ photoFocus, setPhotoFocus, isDarkMode }) {
  return (
    <div className="mt-2" role="tablist" aria-label="諛곌꼍 �궗吏� �쐞移�">
      <p className={`mb-1.5 text-[10px] font-semibold ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
        諛곌꼍 �궗吏� �쐞移� 쨌 �뼹援댁씠 �옒由щ㈃ �긽�떒/�븯�떒�쑝濡� 留욎떠 二쇱꽭�슂
      </p>
      <div
        className={`grid grid-cols-3 gap-1 rounded-xl p-1 ${
          isDarkMode ? "bg-slate-900/80" : "bg-gray-100"
        }`}
      >
        {PHOTO_FOCUS_OPTIONS.map((opt) => {
          const active = normalizePhotoFocus(photoFocus) === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`rounded-lg px-2 py-2 text-[11px] font-bold transition ${
                active
                  ? "bg-blue-600 text-white shadow-sm"
                  : isDarkMode
                    ? "text-gray-300 active:bg-white/10"
                    : "text-slate-600 active:bg-white"
              }`}
              onClick={() => setPhotoFocus?.(opt.id)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * �뵒吏��꽭 �씤利앸챸�븿 ��� �븳 �솕硫� �엯�젰 + �떎�떆媛� �닔�떊 UI 誘몃━蹂닿린
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

  photoFocus = "top",
  setPhotoFocus,
  titlePhotoPreview,
  titlePhotoFileName,
  pendingTitlePhoto,
  onTitlePhotoPick,
  titlePhotoError,
  noTitlePhoto,
  setNoTitlePhoto,
  noCompanyLogo,
  setNoCompanyLogo,
  noFax,
  setNoFax,
  noWebsite,
  setNoWebsite,
  pendingPhoto = null,
  photoPreview = "",
  photoFileName = "",
  photoError = "",
  onPhotoPick = null,
  noProfilePhoto = false,
  setNoProfilePhoto = () => {},
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
  exposureSlot = null,
  onApply,
  applyLabel = "�쟾泥댁쟻�슜",
  toast = ""
}) {
  const [previewFace, setPreviewFace] = useState("front");
  const { setPlaybackPhase } = useShowcaseBgm();

  /* 紐낇븿 �꽕�젙��� �닔�떊 UI 誘몃━蹂닿린留� ��� �눥耳��씠�뒪 BGM��� �옱�깮�븯吏� �븡�쓬 */
  useEffect(() => {
    setPlaybackPhase("idle", { owner: "settings", steal: true });
    return () => {
      setPlaybackPhase("idle", { steal: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount/unmount only
  }, []);

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
          �닔�떊 �솕硫� 誘몃━蹂닿린
        </p>
        <div className="lbq-preview-scale mx-auto w-full max-w-[240px]">
          <LetteringBizcardScaledPreview isDarkMode={isDarkMode} designWidth={300}>
            <div className="lbq-preview-phone lbq-preview-phone--compact rounded-[22px] border border-slate-200/80 bg-slate-950 shadow-lg">
              <LetteringDigitalReception
                card={previewCard}
                verified
                embeddedInPush
                previewMode
                face={previewFace}
                onFaceChange={setPreviewFace}
              />
            </div>
          </LetteringBizcardScaledPreview>
        </div>
        <p className={`mt-2 text-center text-[10px] font-semibold ${isDarkMode ? "text-gray-400" : "text-slate-500"}`}>
          �넻�솕 以� �긽��� �몴�떆 쨌 �븵硫�/�뮮硫� �꺆
        </p>
      </div>

      <div className={`grid gap-2 sm:grid-cols-3 ${identityChip}`}>
        <div>
          <p className={`text-[9px] font-bold uppercase ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>�긽�샇</p>
          <p className={`truncate text-[12px] font-bold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
            {fixed.organization || "���"}
          </p>
        </div>
        <div>
          <p className={`text-[9px] font-bold uppercase ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>�꽦�븿</p>
          <p className={`truncate text-[12px] font-bold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
            {fixed.name || "���"}
          </p>
          <p className={`mt-0.5 text-[9px] font-medium ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>�닔�젙 遺덇��</p>
        </div>
        <div>
          <p className={`text-[9px] font-bold uppercase ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>�쟾�솕</p>
          <p className={`truncate text-[12px] font-bold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
            {fixed.phone || "���"}
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

      {exposureSlot}

      <div className={`${panel} space-y-4`}>
        <p className={`text-[12px] font-black ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>�봽濡쒗븘 쨌 �씠誘몄��</p>
        <Field
          label="프로필 사진"
          hint={`${LETTERING_PHOTO_RULES.acceptLabel} · 최대 1MB · 초과 시 자동 맞춤 · 번호 앞에 표시`}
          isDarkMode={isDarkMode}
        >
          {typeof onPhotoPick === "function" ? (
            <ImageUploadTile
              preview={pendingPhoto?.previewUrl || pendingPhoto?.dataUrl || photoPreview}
              placeholder="사진 업로드"
              onPick={onPhotoPick}
              acceptLabel={LETTERING_PHOTO_RULES.accept}
              isDarkMode={isDarkMode}
              omitChecked={noProfilePhoto}
              onOmitChange={setNoProfilePhoto}
              omitLabel="사진 업로드 없음"
            />
          ) : (
            <p className={`text-[11px] font-semibold ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              프로필 사진은 설정 → 프로필 관리에서 변경합니다.
            </p>
          )}
          {photoFileName && !noProfilePhoto && typeof onPhotoPick === "function" ? (
            <p className={`mt-1 text-[10px] font-semibold ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              {photoFileName}
              {pendingPhoto ? " (미적용)" : ""}
            </p>
          ) : null}
          {photoError ? <p className="mt-1 text-[10px] font-bold text-red-500">{photoError}</p> : null}
        </Field>
        <Field
          label="DCC ����씠��� �궗吏�"
          hint={`${LETTERING_PHOTO_RULES.acceptLabel} 쨌 理쒕�� 1MB 쨌 珥덇낵 �떆 �옄�룞 留욎땄 쨌 踰덊샇 �븵 �궗吏꾧낵 �뵲濡� �꽕�젙`}
          isDarkMode={isDarkMode}
        >
          <ImageUploadTile
            preview={pendingTitlePhoto?.previewUrl || pendingTitlePhoto?.dataUrl || titlePhotoPreview}
            placeholder="����씠��� �뾽濡쒕뱶"
            onPick={onTitlePhotoPick}
            acceptLabel={LETTERING_PHOTO_RULES.accept}
            isDarkMode={isDarkMode}
            omitChecked={noTitlePhoto}
            onOmitChange={setNoTitlePhoto}
            omitLabel="DCC ����씠��� �궗吏� �뾾�쓬"
            objectPosition={photoFocusToCss(photoFocus)}
          />
          {!noTitlePhoto ? (
            <PhotoFocusBar photoFocus={photoFocus} setPhotoFocus={setPhotoFocus} isDarkMode={isDarkMode} />
          ) : null}
          {!noTitlePhoto &&
          !(pendingTitlePhoto?.previewUrl || pendingTitlePhoto?.dataUrl || titlePhotoPreview) ? (
            <p className={`mt-1 text-[10px] font-semibold ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
              鍮꾩썙 �몢硫� �봽濡쒗븘 �궗吏꾩씠 ����씠����뿉 �궗�슜�맗�땲�떎
            </p>
          ) : null}
          {titlePhotoFileName && !noTitlePhoto ? (
            <p className={`mt-1 text-[10px] font-semibold ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              {titlePhotoFileName}
              {pendingTitlePhoto ? " (誘몄쟻�슜)" : ""}
            </p>
          ) : null}
          {titlePhotoError ? <p className="mt-1 text-[10px] font-bold text-red-500">{titlePhotoError}</p> : null}
        </Field>
        <Field
          label="�쉶�궗 濡쒓퀬"
          hint={`${LETTERING_LOGO_RULES.acceptLabel} 쨌 512KB �씠�븯 쨌 珥덇낵 �떆 �옄�룞 留욎땄`}
          isDarkMode={isDarkMode}
        >
          <ImageUploadTile
            preview={pendingLogo?.previewUrl || pendingLogo?.dataUrl || logoPreview}
            placeholder="濡쒓퀬 �뾽濡쒕뱶"
            onPick={onLogoPick}
            acceptLabel={LETTERING_LOGO_RULES.accept}
            isDarkMode={isDarkMode}
            omitChecked={noCompanyLogo}
            onOmitChange={setNoCompanyLogo}
            omitLabel="�쉶�궗 濡쒓퀬 �뾾�쓬"
            objectFit="contain"
          />
          {logoFileName && !noCompanyLogo ? (
            <p className={`mt-1 text-[10px] font-semibold ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              {logoFileName}
              {pendingLogo ? " (誘몄쟻�슜)" : ""}
            </p>
          ) : null}
          {logoError ? <p className="mt-1 text-[10px] font-bold text-red-500">{logoError}</p> : null}
        </Field>
      </div>

      <div className={`${panel} grid gap-3 sm:grid-cols-2`}>
        <Field label="吏곸콉" isDarkMode={isDarkMode}>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputBase} />
        </Field>
        <Field label="遺��꽌" isDarkMode={isDarkMode}>
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
        <Field label="�씠硫붿씪 (�븘�닔)" hint="紐낇븿�뿉 諛섎뱶�떆 �몴�떆�맗�땲�떎" isDarkMode={isDarkMode}>
          <input
            type="email"
            value={email}
            maxLength={LETTERING_BIZCARD_EMAIL_MAX}
            onChange={(e) => setEmail(clampLetteringBizcardEmail(e.target.value))}
            className={inputBase}
            autoComplete="email"
            required
            placeholder="�씠硫붿씪�쓣 �엯�젰�븷 �닔 �엳�뒿�땲�떎."
          />
          {isLetteringBizcardEmailLong(email) ? (
            <p className="mt-1 text-[10px] font-bold text-amber-600">
              �씠硫붿씪�씠 源곷땲�떎({email.length}/{LETTERING_BIZCARD_EMAIL_MAX}�옄). 誘몃━蹂닿린瑜� �솗�씤�븯�꽭�슂.
            </p>
          ) : email.length >= LETTERING_BIZCARD_EMAIL_WARN ? (
            <p className={`mt-1 text-[10px] ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              {email.length}/{LETTERING_BIZCARD_EMAIL_MAX}�옄
            </p>
          ) : null}
        </Field>
        <Field label="�쎒�궗�씠�듃 (�꽑�깮)" hint="�엯�젰�븯吏� �븡�쑝硫� 紐낇븿�뿉 �몴�떆�릺吏� �븡�뒿�땲�떎" isDarkMode={isDarkMode}>
          <input
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            disabled={noWebsite}
            className={`${inputBase}${noWebsite ? " cursor-not-allowed opacity-50" : ""}`}
            placeholder="�쎒�궗�씠�듃瑜� �엯�젰�븷 �닔 �엳�뒿�땲�떎."
          />
          <OmitCheckbox checked={noWebsite} onChange={setNoWebsite} label="�쎒�궗�씠�듃 �뾾�쓬" isDarkMode={isDarkMode} />
        </Field>
        <Field label="�뙥�뒪 (�꽑�깮)" hint="�엯�젰�븯吏� �븡�쑝硫� 紐낇븿�뿉 �몴�떆�릺吏� �븡�뒿�땲�떎" isDarkMode={isDarkMode}>
          <input
            type="tel"
            value={fax}
            onChange={(e) => setFax(e.target.value)}
            disabled={noFax}
            className={`${inputBase}${noFax ? " cursor-not-allowed opacity-50" : ""}`}
            placeholder="�뙥�뒪瑜� �엯�젰�븷 �닔 �엳�뒿�땲�떎."
          />
          <OmitCheckbox checked={noFax} onChange={setNoFax} label="�뙥�뒪 �뾾�쓬" isDarkMode={isDarkMode} />
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
          <Field label="�냼媛� (�븵硫� �봽濡쒗븘)" hint="�넻�솕 �닔�떊 �떆 �븵硫� �꺆�뿉 �몴�떆�맗�땲�떎" isDarkMode={isDarkMode}>
            <textarea
              value={companyIntro}
              onChange={(e) => setCompanyIntro(e.target.value)}
              rows={3}
              className={inputBase}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="異붽�� �꽕紐� (�뮮硫�)" hint="�넻�솕 �닔�떊 �떆 �뮮硫� �뿰�씫泥� �븯�떒�뿉 �몴�떆�맗�땲�떎" isDarkMode={isDarkMode}>
            <textarea
              value={customBackText}
              onChange={(e) => setCustomBackText(e.target.value)}
              rows={3}
              className={inputBase}
              placeholder="�삁: �긽�떞 媛��뒫 �떆媛�, 諛⑸Ц �븞�궡, �봽濡쒕え�뀡 臾멸뎄 �벑"
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
        <div
          className={`rounded-2xl border px-3 py-3 text-center ${
            isDarkMode
              ? "border-emerald-400/30 bg-emerald-950/40 text-emerald-200"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
          role="status"
          aria-live="polite"
        >
          <p className="text-[12px] font-black">�쟾泥댁쟻�슜 �셿猷�</p>
          <p className="mt-1 text-[11px] font-semibold leading-relaxed">{toast}</p>
        </div>
      ) : null}
    </div>
  );
}
