import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LetteringSettingsSection from "../LetteringSettingsSection.jsx";
import {
  readAppSettings,
  writeAppSettings,
  applyAppSettingsToDocument
} from "../../lib/vlueAppSettings.js";
import {
  getLegalName,
  getMemberHandle,
  readChatNickname,
  readFeedNickname,
  writeDisplayNicknames,
  VLUE_NICKNAME_MAX
} from "../../lib/memberCardStorage.js";
import { readProfilePhotoAvatar, writeProfilePhoto } from "../../lib/vlueAvatar.js";
import { ImagePlus, Upload } from "lucide-react";
import {
  LETTERING_PHOTO_RULES,
  prepareLetteringPhotoFromFile
} from "../../lib/letteringBizcardStorage.js";

import {
  SettingsSection,
  SettingsDivider,
  SettingsRowButton,
  SettingsToggleRow,
  SettingsSubpageShell,
  FontScalePicker
} from "./VlueSettingsUi.jsx";
import PasswordChangeSection from "./PasswordChangeSection.jsx";
import VlueEmailSettingsSection from "./VlueEmailSettingsSection.jsx";
import { v1AppShell } from "../../lib/v1ReleaseScope.js";
import { APP_LEGAL_LINKS, marketingLegalUrl } from "../../lib/legalPageLinks.js";
import {
  getAppLockStatus,
  hasNativeAppLockBridge,
  requestAppPinSetup,
  setAppLockEnabled,
  APP_LOCK_STATUS
} from "../../lib/appLockBridge.js";
import {
  defaultPortoneV2RedirectUrl,
  requestPortoneV2Payment
} from "../../lib/portoneV2Payment.js";
import { getPortoneV2ChannelKey, getPortoneV2StoreId } from "../../lib/portoneV2Env.js";

const BLOCKED_USER_DIRECTORY = [
  { id: "u-minsu", name: "誘쇱닔", handle: "@minsu" },
  { id: "u-kim", name: "KIM", handle: "@kim_global" },
  { id: "u-jiyeon", name: "吏��뿰", handle: "@jiyeon" },
  { id: "u-aron", name: "ARON", handle: "@aron" },
  { id: "u-hana", name: "�븯�굹", handle: "@hana" }
];


function ProfilePhotoManageBlock({ isDarkMode, showSettingNotice }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(() => readProfilePhotoAvatar());
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [noPhoto, setNoPhoto] = useState(() => !readProfilePhotoAvatar());

  useEffect(() => {
    const refresh = () => {
      const url = readProfilePhotoAvatar();
      setPreview(url);
      setNoPhoto(!url);
    };
    window.addEventListener("vlue-avatar-changed", refresh);
    return () => window.removeEventListener("vlue-avatar-changed", refresh);
  }, []);

  const tile = isDarkMode
    ? "flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/5"
    : "flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50";
  const btnCls = noPhoto
    ? "inline-flex cursor-not-allowed items-center gap-1.5 rounded-xl bg-slate-400 px-3 py-2 text-[11px] font-bold text-white opacity-60"
    : "inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-[11px] font-bold text-white active:scale-[0.99]";
  const checkCls = isDarkMode
    ? "mt-2 flex w-full cursor-pointer items-center gap-2 text-left text-[11px] font-semibold text-gray-300"
    : "mt-2 flex w-full cursor-pointer items-center gap-2 text-left text-[11px] font-semibold text-slate-600";

  const onPick = async (e) => {
    if (noPhoto) return;
    const file = e.target.files?.[0];
    e.target.value = "";
    setError("");
    const result = await prepareLetteringPhotoFromFile(file);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const previewUrl = String(result.dataUrl || "").trim();
    const persist = String(result.persistUrl || result.dataUrl || "").trim();
    if (!previewUrl) {
      setError("사진을 불러오지 못했습니다.");
      return;
    }
    writeProfilePhoto(persist || previewUrl);
    setPreview(previewUrl);
    setFileName(result.fileName);
    setNoPhoto(false);
    showSettingNotice?.("프로필 사진이 변경되었습니다.");
  };

  return (
    <div className="mb-4">
      <p className={`text-[11px] font-black ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>프로필 사진</p>
      <p className={`mt-0.5 text-[10px] ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
        {LETTERING_PHOTO_RULES.acceptLabel} · 최대 1MB · 초과 시 자동 맞춤 · DCC 미사용 회원도 등록 가능
      </p>
      <div className={`mt-2 flex items-center gap-3${noPhoto ? " opacity-40" : ""}`}>
        <span className={tile}>
          {preview && !noPhoto ? (
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className={`h-6 w-6 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <button type="button" disabled={noPhoto} onClick={() => inputRef.current?.click()} className={btnCls}>
            <Upload className="h-3.5 w-3.5" />
            {preview && !noPhoto ? "사진 변경" : "사진 업로드"}
          </button>
          <input ref={inputRef} type="file" accept={LETTERING_PHOTO_RULES.accept} onChange={onPick} className="hidden" disabled={noPhoto} />
        </div>
      </div>
      {fileName && !noPhoto ? (
        <p className={`mt-1 text-[10px] font-semibold ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{fileName}</p>
      ) : null}
      {error ? <p className="mt-1 text-[10px] font-bold text-red-500">{error}</p> : null}
      <button
        type="button"
        role="checkbox"
        aria-checked={noPhoto}
        className={checkCls}
        onClick={() => {
          const next = !noPhoto;
          setNoPhoto(next);
          if (next) {
            writeProfilePhoto("");
            setPreview("");
            setFileName("");
            setError("");
            showSettingNotice?.("프로필 사진을 사용하지 않습니다.");
          }
        }}
      >
        <span
          className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
            noPhoto ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white"
          }`}
        >
          {noPhoto ? "✓" : ""}
        </span>
        사진 업로드 없음
      </button>
    </div>
  );
}

const APP_VERSION = "1.0.0";

function AppLockSettingsBlock({ isDarkMode, boxClass, showSettingNotice }) {
  const [status, setStatus] = useState(() => getAppLockStatus());
  const [busy, setBusy] = useState(false);
  const native = hasNativeAppLockBridge();

  useEffect(() => {
    const refresh = () => setStatus(getAppLockStatus());
    window.addEventListener(APP_LOCK_STATUS, refresh);
    window.addEventListener("vlue-app-lock-setup-result", refresh);
    refresh();
    return () => {
      window.removeEventListener(APP_LOCK_STATUS, refresh);
      window.removeEventListener("vlue-app-lock-setup-result", refresh);
    };
  }, []);

  const onToggleLock = async (on) => {
    if (!native) {
      showSettingNotice?.("�빋 �옞湲덉�� VLUE Android �빋�뿉�꽌 �궗�슜�븷 �닔 �엳�뒿�땲�떎.");
      return;
    }
    setBusy(true);
    try {
      if (on && !status.hasPin) {
        const setup = await requestAppPinSetup();
        if (!setup.ok) {
          showSettingNotice?.(
            setup.cancelled ? "PIN �벑濡앹쓣 痍⑥냼�뻽�뒿�땲�떎." : "PIN �벑濡� �썑 �빋 �옞湲덉쓣 耳� �닔 �엳�뒿�땲�떎."
          );
          setBusy(false);
          return;
        }
      }
      setAppLockEnabled(on);
      setStatus(getAppLockStatus());
      showSettingNotice?.(on ? "�빋 �옞湲덉씠 耳쒖죱�뒿�땲�떎. �떎�뻾 �떆留덈떎 PIN�쓣 臾살뒿�땲�떎." : "�빋 �옞湲덉씠 爰쇱죱�뒿�땲�떎. 以묒슂 湲곕뒫�뿉�꽌留� PIN�쓣 臾살뒿�땲�떎.");
    } finally {
      setBusy(false);
    }
  };

  const onChangePin = async () => {
    if (!native) {
      showSettingNotice?.("PIN 蹂�寃쎌�� VLUE Android �빋�뿉�꽌 媛��뒫�빀�땲�떎.");
      return;
    }
    setBusy(true);
    try {
      const setup = await requestAppPinSetup();
      setStatus(getAppLockStatus());
      showSettingNotice?.(setup.ok ? "PIN�씠 媛깆떊�릺�뿀�뒿�땲�떎." : "PIN 蹂�寃쎌씠 痍⑥냼�릺�뿀�뒿�땲�떎.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className={`rounded-2xl border p-4 ${boxClass}`}>
        <p className={`text-[13px] leading-relaxed ${isDarkMode ? "text-gray-300" : "text-gray-700"}`} style={{ wordBreak: "keep-all" }}>
          吏�臾�/�뼹援� �씤�떇��� 異뷀썑 �뾽�뜲�씠�듃�뿉 異붽���맆 �삁�젙�씠硫�, �쁽�옱�뒗 6�옄由� PIN�쑝濡� �븞�쟾�븯寃� 蹂댄샇�맗�땲�떎.
        </p>
        <p className={`mt-2 text-[12px] leading-relaxed ${isDarkMode ? "text-gray-500" : "text-gray-500"}`} style={{ wordBreak: "keep-all" }}>
          �옞湲� ON: �빋 �떎�뻾留덈떎 PIN. �옞湲� OFF: 寃곗젣쨌蹂몄씤�젙蹂� �닔�젙쨌�뜲�씠�꽣 �궡蹂대궡湲걔룹썝寃� 濡쒓렇�씤 �벑 以묒슂 湲곕뒫�뿉�꽌留� PIN.
        </p>
      </div>
      <div className={`overflow-hidden rounded-2xl border ${boxClass}`}>
        <SettingsToggleRow
          label="�빋 �옞湲�"
          sublabel={status.hasPin ? "6�옄由� PIN �벑濡앸맖" : "PIN 誘몃벑濡�"}
          checked={Boolean(status.appLockEnabled)}
          onChange={(v) => onToggleLock(v)}
          isDarkMode={isDarkMode}
        />
      </div>
      <button
        type="button"
        disabled={busy || !native}
        onClick={onChangePin}
        className={`w-full rounded-2xl border py-3 text-[13px] font-bold disabled:opacity-40 ${
          isDarkMode ? "border-white/15 text-gray-200" : "border-gray-200 text-gray-800"
        }`}
      >
        {status.hasPin ? "PIN 蹂�寃승룹옱�벑濡�" : "6�옄由� PIN �벑濡�"}
      </button>
      {!native ? (
        <p className={`px-1 text-[11px] ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
          �씠 �솕硫댁�� 釉뚮씪�슦����엯�땲�떎. Android VLUE �빋�뿉�꽌 �빋 �옞湲덉쓣 �꽕�젙�븯�꽭�슂.
        </p>
      ) : null}
    </div>
  );
}

function useAppSettingsState() {
  const [settings, setSettings] = useState(() => readAppSettings());

  useEffect(() => {
    applyAppSettingsToDocument(settings);
    const onChange = () => setSettings(readAppSettings());
    window.addEventListener("vlue-app-settings-changed", onChange);
    return () => window.removeEventListener("vlue-app-settings-changed", onChange);
  }, []);

  const patch = useCallback((nextPatch) => {
    setSettings(writeAppSettings(nextPatch));
  }, []);

  return [settings, patch];
}

export default function VlueSettingsPanel({
  isDarkMode,
  onToggleDarkMode,
  subView,
  onSubView,
  onBackToMain,
  showSettingNotice,
  membershipTierLabel,
  onOpenUpgrade,
  isVCIDOn,
  hasDigitalCertCard,
  onToggleVCID,
  onMarkAllChatsRead,
  hasUnreadChats,
  onLogout,
  onOpenWithdrawConsult,
  withdrawUnlocked = false,
  onOpenWithdrawTerms,
  onOpenPartnerInquiry,
  onOpenCustomerCenter,
  onOpenFamilyProtection,
  blockedUserIds = [],
  onUnblockUser,
  myPhone = "",
  myEmail = "user@vlue.kr",
  membershipTier = "free",
  companyName = "",
  openLetteringBizcardHub
}) {
  const [settings, patchSettings] = useAppSettingsState();
  const [chatNickInput, setChatNickInput] = useState("");
  const [feedNickInput, setFeedNickInput] = useState("");
  const [statusInput, setStatusInput] = useState("");
  const [showIdCopied, setShowIdCopied] = useState(false);

  useEffect(() => {
    if (subView === "profileManage") {
      setChatNickInput(readChatNickname());
      setFeedNickInput(readFeedNickname());
      setStatusInput(settings.statusMessage || "");
    }
  }, [subView, settings.statusMessage]);

  const headText = isDarkMode ? "text-gray-100" : "text-gray-900";
  const boxClass = isDarkMode ? "border-white/10 bg-white/[0.04]" : "border-gray-100 bg-white";

  const blockedUsers = useMemo(
    () => BLOCKED_USER_DIRECTORY.filter((u) => blockedUserIds.includes(u.id)),
    [blockedUserIds]
  );

  const copyMemberId = () => {
    navigator.clipboard.writeText(getMemberHandle()).then(() => {
      setShowIdCopied(true);
      setTimeout(() => setShowIdCopied(false), 2000);
      showSettingNotice?.("VLUE ID媛� 蹂듭궗�릺�뿀�뒿�땲�떎.");
    });
  };

  if (subView === "profileManage") {
    return (
      <SettingsSubpageShell
        title="�봽濡쒗븘 愿�由�"
        subtitle="�븘諛뷀�� 쨌 �땳�꽕�엫 쨌 �긽�깭硫붿떆吏�"
        onBack={() => onSubView(null)}
        isDarkMode={isDarkMode}
      >
        <div className={`rounded-2xl border p-4 ${boxClass}`}>
          <ProfilePhotoManageBlock isDarkMode={isDarkMode} showSettingNotice={showSettingNotice} />
