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
import { DCC_PROFILE_PHOTO_IMAGE_GUIDE } from "../../lib/fitImageFile.js";

import {
  SettingsSection,
  SettingsDivider,
  SettingsRowButton,
  SettingsToggleRow,
  SettingsSubpageShell,
  FontScalePicker
} from "./VlueSettingsUi.jsx";
import PasswordChangeSection from "./PasswordChangeSection.jsx";
import PhoneChangeSection from "./PhoneChangeSection.jsx";
import { requestV1PaidPackageGate } from "../../lib/v1PaidPackageGate.js";
import { canUseV1PaidDccFeatures } from "../../lib/v1PaidPackageGate.js";
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
  { id: "u-minsu", name: "민수", handle: "@minsu" },
  { id: "u-kim", name: "KIM", handle: "@kim_global" },
  { id: "u-jiyeon", name: "지연", handle: "@jiyeon" },
  { id: "u-aron", name: "ARON", handle: "@aron" },
  { id: "u-hana", name: "하나", handle: "@hana" }
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
        {DCC_PROFILE_PHOTO_IMAGE_GUIDE.uploadHint} · DCC 미사용 회원도 등록 가능
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
      showSettingNotice?.("앱 잠금은 VLUE Android 앱에서 사용할 수 있습니다.");
      return;
    }
    setBusy(true);
    try {
      if (on && !status.hasPin) {
        const setup = await requestAppPinSetup();
        if (!setup.ok) {
          showSettingNotice?.(
            setup.cancelled ? "PIN 등록을 취소했습니다." : "PIN 등록 후 앱 잠금을 켤 수 있습니다."
          );
          setBusy(false);
          return;
        }
      }
      setAppLockEnabled(on);
      setStatus(getAppLockStatus());
      showSettingNotice?.(on ? "앱 잠금이 켜졌습니다. 실행 시마다 PIN을 묻습니다." : "앱 잠금이 꺼졌습니다. 중요 기능에서만 PIN을 묻습니다.");
    } finally {
      setBusy(false);
    }
  };

  const onChangePin = async () => {
    if (!native) {
      showSettingNotice?.("PIN 변경은 VLUE Android 앱에서 가능합니다.");
      return;
    }
    setBusy(true);
    try {
      const setup = await requestAppPinSetup();
      setStatus(getAppLockStatus());
      showSettingNotice?.(setup.ok ? "PIN이 갱신되었습니다." : "PIN 변경이 취소되었습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className={`rounded-2xl border p-4 ${boxClass}`}>
        <p className={`text-[13px] leading-relaxed ${isDarkMode ? "text-gray-300" : "text-gray-700"}`} style={{ wordBreak: "keep-all" }}>
          지문/얼굴 인식은 추후 업데이트에 추가될 예정이며, 현재는 6자리 PIN으로 안전하게 보호됩니다.
        </p>
        <p className={`mt-2 text-[12px] leading-relaxed ${isDarkMode ? "text-gray-500" : "text-gray-500"}`} style={{ wordBreak: "keep-all" }}>
          잠금 ON: 앱 실행마다 PIN. 잠금 OFF: 결제·본인정보 수정·데이터 내보내기·원격 로그인 등 중요 기능에서만 PIN.
        </p>
      </div>
      <div className={`overflow-hidden rounded-2xl border ${boxClass}`}>
        <SettingsToggleRow
          label="앱 잠금"
          sublabel={status.hasPin ? "6자리 PIN 등록됨" : "PIN 미등록"}
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
        {status.hasPin ? "PIN 변경·재등록" : "6자리 PIN 등록"}
      </button>
      {!native ? (
        <p className={`px-1 text-[11px] ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
          이 화면은 브라우저입니다. Android VLUE 앱에서 앱 잠금을 설정하세요.
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
  dccBroadcastOn = false,
  onToggleVCID,
  onToggleDccBroadcast,
  showBroadcastName = true,
  onToggleBroadcastName,
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
  onPhoneUpdated,
  membershipTier = "free",
  companyName = "",
  openLetteringBizcardHub
}) {
  const [settings, patchSettings] = useAppSettingsState();
  const [chatNickInput, setChatNickInput] = useState("");
  const [feedNickInput, setFeedNickInput] = useState("");
  const [statusInput, setStatusInput] = useState("");
  const [showIdCopied, setShowIdCopied] = useState(false);
  const [phoneDisplay, setPhoneDisplay] = useState(myPhone);

  useEffect(() => {
    setPhoneDisplay(myPhone);
  }, [myPhone]);

  useEffect(() => {
    if (subView === "profileManage") {
      setChatNickInput(readChatNickname());
      setFeedNickInput(readFeedNickname());
      setStatusInput(settings.statusMessage || "");
    }
  }, [subView, settings.statusMessage]);

  const headText = isDarkMode ? "text-gray-100" : "text-gray-900";
  const boxClass = isDarkMode ? "border-white/10 bg-white/[0.04]" : "border-gray-100 bg-white";
  const isPaidDcc = canUseV1PaidDccFeatures(membershipTier);

  const blockedUsers = useMemo(
    () => BLOCKED_USER_DIRECTORY.filter((u) => blockedUserIds.includes(u.id)),
    [blockedUserIds]
  );

  const copyMemberId = () => {
    navigator.clipboard.writeText(getMemberHandle()).then(() => {
      setShowIdCopied(true);
      setTimeout(() => setShowIdCopied(false), 2000);
      showSettingNotice?.("VLUE ID가 복사되었습니다.");
    });
  };

  if (subView === "profileManage") {
    return (
      <SettingsSubpageShell
        title="프로필 관리"
        subtitle="아바타 · 닉네임 · 상태메시지"
        onBack={() => onSubView(null)}
        isDarkMode={isDarkMode}
      >
        <div className={`rounded-2xl border p-4 ${boxClass}`}>
          <ProfilePhotoManageBlock isDarkMode={isDarkMode} showSettingNotice={showSettingNotice} />
          <label className={`mt-3 block text-[11px] font-bold ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
            상태메시지
            <input
              type="text"
              maxLength={80}
              value={statusInput}
              onChange={(e) => setStatusInput(e.target.value)}
              placeholder="마이케이스 이름 아래에 표시됩니다"
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-[13px] outline-none ${
                isDarkMode ? "border-white/15 bg-[#1f2937] text-gray-100" : "border-gray-200 bg-white text-gray-900"
              }`}
            />
            <p className={`mt-1 text-[10px] font-medium ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
              마이케이스에만 표시됩니다. 쇼케이스·DCC에는 나가지 않습니다.
            </p>
          </label>
          {v1AppShell.chat ? (
            <label className={`mt-3 block text-[11px] font-bold ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
              채팅 닉네임
              <input
                type="text"
                maxLength={VLUE_NICKNAME_MAX}
                value={chatNickInput}
                onChange={(e) => setChatNickInput(e.target.value)}
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-[13px] outline-none ${
                  isDarkMode ? "border-white/15 bg-[#1f2937] text-gray-100" : "border-gray-200 bg-white text-gray-900"
                }`}
              />
            </label>
          ) : null}
          <div className={`mt-3 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
            <div className="flex items-center gap-1.5 text-[11px] font-bold">
              <span>활동 닉네임</span>
              <button
                type="button"
                className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-black ${
                  isDarkMode ? "bg-white/15 text-gray-200" : "bg-gray-200 text-gray-700"
                }`}
                title="VLUE 콘텐츠 활동에 사용되는 명칭입니다."
                aria-label="활동 닉네임 도움말"
                onClick={() =>
                  window.alert("VLUE 콘텐츠 활동에 사용되는 명칭입니다.")
                }
              >
                ?
              </button>
            </div>
            <p className={`mt-1 text-[10px] font-medium leading-snug ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
              VLUE 콘텐츠 활동에 사용되는 명칭입니다.
            </p>
            <input
              type="text"
              maxLength={VLUE_NICKNAME_MAX}
              value={feedNickInput}
              onChange={(e) => setFeedNickInput(e.target.value)}
              className={`mt-1.5 w-full rounded-lg border px-3 py-2 text-[13px] font-bold outline-none ${
                isDarkMode ? "border-white/15 bg-[#1f2937] text-gray-100" : "border-gray-200 bg-white text-gray-900"
              }`}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              writeDisplayNicknames({
                chat: v1AppShell.chat ? chatNickInput : readChatNickname(),
                feed: feedNickInput
              });
              patchSettings({ statusMessage: statusInput.trim() });
              showSettingNotice?.("프로필이 저장되었습니다.");
            }}
            className="mt-4 w-full rounded-xl bg-blue-600 py-2.5 text-[13px] font-black text-white"
          >
            저장
          </button>
        </div>
        <div className="mt-4 pb-2">
          <LetteringSettingsSection
            isDarkMode={isDarkMode}
            onNotice={showSettingNotice}
            onOpenBizcardHub={openLetteringBizcardHub}
          />
        </div>
      </SettingsSubpageShell>
    );
  }

  if (subView === "vlueId") {
    return (
      <SettingsSubpageShell title="VLUE ID" onBack={() => onSubView(null)} isDarkMode={isDarkMode}>
        <div className={`rounded-2xl border p-4 text-center ${boxClass}`}>
          <p className={`text-[12px] ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>내 VLUE ID</p>
          <p className={`mt-2 text-[20px] font-black tracking-tight ${headText}`}>{getMemberHandle()}</p>
          <button
            type="button"
            onClick={copyMemberId}
            className="mt-4 w-full rounded-xl bg-blue-600 py-2.5 text-[13px] font-black text-white"
          >
            ID 복사
          </button>
          {showIdCopied ? <p className="mt-2 text-[11px] font-bold text-blue-500">복사되었습니다</p> : null}
        </div>
        <p className={`mt-3 px-1 text-[11px] leading-relaxed ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
          친구가 ID 검색으로 나를 찾을 수 있도록 「개인정보 보호」에서 검색 허용을 켜 주세요.
        </p>
      </SettingsSubpageShell>
    );
  }

  if (subView === "vlueEmailSettings") {
    return (
      <VlueEmailSettingsSection
        isDarkMode={isDarkMode}
        onBack={() => onSubView(null)}
        membershipTier={membershipTier}
        companyName={companyName}
        onOpenUpgrade={onOpenUpgrade}
        showSettingNotice={showSettingNotice}
      />
    );
  }

  if (subView === "passwordChange") {
    return (
      <PasswordChangeSection
        isDarkMode={isDarkMode}
        loggedIn
        handle={getMemberHandle()}
        legalName={getLegalName()}
        phone={myPhone}
        onBack={() => onSubView(null)}
        onSuccess={(msg) => {
          showSettingNotice?.(msg || "비밀번호가 변경되었습니다.");
          onSubView(null);
        }}
      />
    );
  }

  if (subView === "contactInfo") {
    return (
      <SettingsSubpageShell title="전화번호" onBack={() => onSubView(null)} isDarkMode={isDarkMode}>
        <PhoneChangeSection
          currentPhone={phoneDisplay}
          isDarkMode={isDarkMode}
          onSuccess={(nextPhone) => {
            const updated = String(nextPhone || "").trim();
            if (updated) setPhoneDisplay(updated);
            showSettingNotice?.("전화번호가 변경되었습니다.");
            onPhoneUpdated?.(updated);
          }}
          onError={(msg) => showSettingNotice?.(msg)}
        />
      </SettingsSubpageShell>
    );
  }

  if (subView === "friendPrivacy") {
    return (
      <SettingsSubpageShell title="친구 추가 허용" onBack={() => onSubView(null)} isDarkMode={isDarkMode}>
        <div className={`overflow-hidden rounded-2xl border ${boxClass}`}>
          <SettingsToggleRow
            label="전화번호로 찾기 허용"
            checked={settings.allowSearchByPhone}
            onChange={(v) => patchSettings({ allowSearchByPhone: v })}
            isDarkMode={isDarkMode}
          />
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsToggleRow
            label="QR 코드로 추가 허용"
            checked={settings.allowSearchByQr}
            onChange={(v) => patchSettings({ allowSearchByQr: v })}
            isDarkMode={isDarkMode}
          />
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsToggleRow
            label="VLUE ID 검색 허용"
            checked={settings.allowSearchById}
            onChange={(v) => patchSettings({ allowSearchById: v })}
            isDarkMode={isDarkMode}
          />
        </div>
      </SettingsSubpageShell>
    );
  }

  if (subView === "blockList") {
    return (
      <SettingsSubpageShell title="차단 목록" onBack={() => onSubView(null)} isDarkMode={isDarkMode}>
        {blockedUsers.length === 0 ? (
          <p className={`rounded-2xl border px-4 py-8 text-center text-[13px] ${isDarkMode ? "border-white/10 text-gray-500" : "border-gray-100 text-gray-500"}`}>
            차단한 사용자가 없습니다.
          </p>
        ) : (
          <div className={`overflow-hidden rounded-2xl border ${boxClass}`}>
            {blockedUsers.map((u, i) => (
              <div key={u.id}>
                {i > 0 ? <SettingsDivider isDarkMode={isDarkMode} /> : null}
                <div className="flex items-center justify-between gap-2 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className={`text-[14px] font-semibold ${headText}`}>{u.name}</p>
                    <p className={`text-[11px] ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>{u.handle}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onUnblockUser?.(u.id);
                      showSettingNotice?.("차단이 해제되었습니다.");
                    }}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold ${
                      isDarkMode ? "bg-white/10 text-gray-200" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    해제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className={`mt-3 px-1 text-[11px] ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
          친구검색 화면에서 사용자를 차단할 수도 있습니다.
        </p>
      </SettingsSubpageShell>
    );
  }

  if (subView === "appLock") {
    return (
      <SettingsSubpageShell title="앱 잠금" onBack={() => onSubView(null)} isDarkMode={isDarkMode}>
        <AppLockSettingsBlock isDarkMode={isDarkMode} boxClass={boxClass} showSettingNotice={showSettingNotice} />
      </SettingsSubpageShell>
    );
  }

  if (subView === "quietHours") {
    return (
      <SettingsSubpageShell title="방해 금지 시간" onBack={() => onSubView(null)} isDarkMode={isDarkMode}>
        <div className={`overflow-hidden rounded-2xl border ${boxClass}`}>
          <SettingsToggleRow
            label="방해 금지 모드"
            sublabel="지정 시간대에 알림을 줄입니다"
            checked={settings.quietMode}
            onChange={(v) => patchSettings({ quietMode: v })}
            isDarkMode={isDarkMode}
          />
        </div>
        <div className={`mt-4 rounded-2xl border p-4 space-y-3 ${boxClass} ${!settings.quietMode ? "opacity-50" : ""}`}>
          <label className={`block text-[11px] font-bold ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
            시작
            <input
              type="time"
              value={settings.quietHoursStart}
              disabled={!settings.quietMode}
              onChange={(e) => patchSettings({ quietHoursStart: e.target.value })}
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-[13px] ${
                isDarkMode ? "border-white/15 bg-[#1f2937] text-gray-100" : "border-gray-200 bg-white"
              }`}
            />
          </label>
          <label className={`block text-[11px] font-bold ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
            종료
            <input
              type="time"
              value={settings.quietHoursEnd}
              disabled={!settings.quietMode}
              onChange={(e) => patchSettings({ quietHoursEnd: e.target.value })}
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-[13px] ${
                isDarkMode ? "border-white/15 bg-[#1f2937] text-gray-100" : "border-gray-200 bg-white"
              }`}
            />
          </label>
        </div>
      </SettingsSubpageShell>
    );
  }

  if (subView === "chatFont") {
    if (!v1AppShell.chat) {
      onSubView?.(null);
      return null;
    }
    return (
      <SettingsSubpageShell title="채팅 글자 크기" onBack={() => onSubView(null)} isDarkMode={isDarkMode}>
        <FontScalePicker
          value={settings.chatFontScale}
          onChange={(v) => {
            patchSettings({ chatFontScale: v });
            showSettingNotice?.("채팅 글자 크기가 적용되었습니다.");
          }}
          isDarkMode={isDarkMode}
        />
      </SettingsSubpageShell>
    );
  }

  if (subView === "uiFont") {
    return (
      <SettingsSubpageShell title="화면 글자 크기" onBack={() => onSubView(null)} isDarkMode={isDarkMode}>
        <FontScalePicker
          value={settings.uiFontScale}
          onChange={(v) => {
            patchSettings({ uiFontScale: v });
            showSettingNotice?.("화면 글자 크기가 적용되었습니다.");
          }}
          isDarkMode={isDarkMode}
        />
      </SettingsSubpageShell>
    );
  }

  if (subView === "backup") {
    if (!v1AppShell.chat) {
      onSubView?.(null);
      return null;
    }
    return (
      <SettingsSubpageShell title="대화 백업 및 복원" onBack={() => onSubView(null)} isDarkMode={isDarkMode}>
        <div className={`rounded-2xl border p-4 space-y-3 ${boxClass}`}>
          <button
            type="button"
            onClick={() => showSettingNotice?.("대화 백업은 다음 업데이트에서 제공됩니다.")}
            className="w-full rounded-xl bg-blue-600 py-2.5 text-[13px] font-black text-white"
          >
            대화 백업하기
          </button>
          <button
            type="button"
            onClick={() => showSettingNotice?.("백업 파일에서 복원은 준비 중입니다.")}
            className={`w-full rounded-xl border py-2.5 text-[13px] font-bold ${
              isDarkMode ? "border-white/15 text-gray-200" : "border-gray-200 text-gray-800"
            }`}
          >
            백업에서 복원
          </button>
        </div>
      </SettingsSubpageShell>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className={`flex shrink-0 items-center gap-2 border-b px-4 py-2.5 ${isDarkMode ? "border-white/10" : "border-gray-100"}`}>
        <button
          type="button"
          onClick={onBackToMain}
          className={`rounded-lg p-2 text-lg leading-none ${isDarkMode ? "text-gray-400 hover:bg-white/10" : "text-gray-500 hover:bg-gray-100"}`}
          aria-label="프로필 메뉴로"
        >
          ‹
        </button>
        <p className={`text-[17px] font-black ${headText}`}>설정</p>
      </div>

      <div className="vlue-scroll-pad-profile-panel flex-1 overflow-y-auto px-4 py-4 no-scrollbar">
        <SettingsSection title="내 계정" isDarkMode={isDarkMode}>
          <SettingsRowButton label="프로필 관리" sublabel="아바타 · 닉네임 · 상태메시지" onClick={() => onSubView("profileManage")} isDarkMode={isDarkMode} />
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsRowButton label="VLUE ID 확인" value={getMemberHandle()} onClick={() => onSubView("vlueId")} isDarkMode={isDarkMode} />
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsRowButton label="전화번호" sublabel="PASS 본인인증으로 변경" onClick={() => onSubView("contactInfo")} isDarkMode={isDarkMode} />
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsRowButton
            label="멤버십 등급 및 업그레이드"
            value={membershipTierLabel}
            onClick={() => onOpenUpgrade?.()}
            isDarkMode={isDarkMode}
          />
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsToggleRow
            label="통화 중 쇼케이스 송출"
            subtitle={isPaidDcc ? "디지털인증명함 · 쇼케이스" : "쇼케이스 · 프로필 사진 · 번호"}
            checked={isVCIDOn}
            onChange={onToggleVCID}
            isDarkMode={isDarkMode}
          />
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsToggleRow
            label="디지털인증명함 송출"
            subtitle={isPaidDcc ? "통화 수신 화면에 명함 표시" : "V1 유료 패키지 전용"}
            checked={Boolean(dccBroadcastOn)}
            disabled={!isPaidDcc}
            onDisabledAttempt={requestV1PaidPackageGate}
            onChange={(next) => onToggleDccBroadcast?.(next)}
            isDarkMode={isDarkMode}
          />
          {!isVCIDOn ? (
            <>
              <SettingsDivider isDarkMode={isDarkMode} />
              <SettingsToggleRow
                label="이름 송출"
                subtitle={
                  showBroadcastName
                    ? "빅푸시에 이름 표시 · 쇼케이스는 꺼진 상태"
                    : "이름 숨김 · VLUE 인증회원으로만 표시"
                }
                checked={Boolean(showBroadcastName)}
                onChange={(v) => onToggleBroadcastName?.(Boolean(v))}
                isDarkMode={isDarkMode}
              />
            </>
          ) : null}
        </SettingsSection>

        <SettingsSection title="보안" isDarkMode={isDarkMode}>
          <SettingsRowButton
            label="비밀번호 변경"
            sublabel="기존 비밀번호 · PASS · 이메일 인증"
            onClick={() => onSubView("passwordChange")}
            isDarkMode={isDarkMode}
          />
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsRowButton
            label="앱 잠금 (PIN)"
            sublabel="6자리 PIN 등록 · 앱 실행/중요 기능 보호"
            onClick={() => onSubView("appLock")}
            isDarkMode={isDarkMode}
          />
        </SettingsSection>

        <SettingsSection title="개인정보 보호" isDarkMode={isDarkMode}>
          <SettingsRowButton label="친구 추가 허용 설정" sublabel="전화번호 · QR · ID 검색" onClick={() => onSubView("friendPrivacy")} isDarkMode={isDarkMode} />
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsToggleRow
            label="읽음 확인 표시"
            checked={settings.showReadStatus}
            onChange={(v) => patchSettings({ showReadStatus: v })}
            isDarkMode={isDarkMode}
          />
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsToggleRow
            label="온라인 상태 표시"
            checked={settings.showOnlineStatus}
            onChange={(v) => patchSettings({ showOnlineStatus: v })}
            isDarkMode={isDarkMode}
          />
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsRowButton label="차단 목록 관리" onClick={() => onSubView("blockList")} isDarkMode={isDarkMode} />
        </SettingsSection>

        <SettingsSection title="알림" isDarkMode={isDarkMode}>
          {v1AppShell.chat ? (
            <>
              <SettingsToggleRow
                label="채팅 알림"
                checked={settings.chatNotifications}
                onChange={(v) => patchSettings({ chatNotifications: v })}
                isDarkMode={isDarkMode}
              />
              <SettingsDivider isDarkMode={isDarkMode} />
              <SettingsToggleRow
                label="메시지 미리보기"
                checked={settings.messagePreview}
                onChange={(v) => patchSettings({ messagePreview: v })}
                isDarkMode={isDarkMode}
              />
              <SettingsDivider isDarkMode={isDarkMode} />
            </>
          ) : null}
          <SettingsRowButton
            label="방해 금지 시간 설정"
            value={settings.quietMode ? `${settings.quietHoursStart}–${settings.quietHoursEnd}` : "꺼짐"}
            onClick={() => onSubView("quietHours")}
            isDarkMode={isDarkMode}
          />
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsToggleRow
            label="가족보호 알림"
            checked={settings.familyProtectionAlerts}
            onChange={(v) => patchSettings({ familyProtectionAlerts: v })}
            isDarkMode={isDarkMode}
          />
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsRowButton label="가족보호 등록·상세 설정" onClick={() => onOpenFamilyProtection?.()} isDarkMode={isDarkMode} />
          {v1AppShell.chat && onMarkAllChatsRead ? (
            <>
              <SettingsDivider isDarkMode={isDarkMode} />
              <button
                type="button"
                disabled={!hasUnreadChats}
                onClick={() => {
                  onMarkAllChatsRead();
                  showSettingNotice?.("모든 채팅을 읽음 처리했습니다.");
                }}
                className={`w-full px-4 py-3.5 text-left text-[14px] font-semibold disabled:opacity-40 ${
                  isDarkMode ? "text-blue-300" : "text-blue-600"
                }`}
              >
                전체 읽음 확인
              </button>
            </>
          ) : null}
        </SettingsSection>

        {v1AppShell.chat ? (
        <SettingsSection title="채팅" isDarkMode={isDarkMode}>
          <SettingsRowButton
            label="채팅방 배경화면"
            onClick={() => showSettingNotice?.("채팅방 배경은 다음 업데이트에서 설정할 수 있습니다.")}
            isDarkMode={isDarkMode}
          />
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsRowButton
            label="글자 크기 설정"
            value={settings.chatFontScale === "large" ? "크게" : settings.chatFontScale === "small" ? "작게" : "보통"}
            onClick={() => onSubView("chatFont")}
            isDarkMode={isDarkMode}
          />
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsToggleRow
            label="받은 사진 자동 저장"
            checked={settings.autoSaveMedia}
            onChange={(v) => patchSettings({ autoSaveMedia: v })}
            isDarkMode={isDarkMode}
          />
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsRowButton label="대화 백업 및 복원" onClick={() => onSubView("backup")} isDarkMode={isDarkMode} />
        </SettingsSection>
        ) : null}

        <SettingsSection title="화면" isDarkMode={isDarkMode}>
          <SettingsToggleRow
            label="다크 모드"
            checked={isDarkMode}
            onChange={(v) => {
              onToggleDarkMode?.(v);
              showSettingNotice?.(v ? "다크모드로 설정되었습니다." : "다크모드가 해제되었습니다.");
            }}
            isDarkMode={isDarkMode}
          />
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsRowButton
            label="글자 크기"
            value={settings.uiFontScale === "large" ? "크게" : settings.uiFontScale === "small" ? "작게" : "보통"}
            onClick={() => onSubView("uiFont")}
            isDarkMode={isDarkMode}
          />
        </SettingsSection>

        <SettingsSection title="약관 및 정책" isDarkMode={isDarkMode}>
          {APP_LEGAL_LINKS.map((item, index) => (
            <div key={item.id}>
              {index > 0 ? <SettingsDivider isDarkMode={isDarkMode} /> : null}
              <SettingsRowButton
                label={item.label}
                sublabel="공식 홈페이지에서 확인"
                onClick={() => {
                  const url = marketingLegalUrl(item.kind);
                  try {
                    const native = typeof window !== "undefined" ? window.VlueNative : null;
                    if (native?.openExternalUrl) {
                      native.openExternalUrl(url);
                      return;
                    }
                  } catch {
                    /* fall through */
                  }
                  window.open(url, "_blank", "noopener,noreferrer");
                }}
                isDarkMode={isDarkMode}
              />
            </div>
          ))}
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsRowButton
            label="요금·멤버십 안내"
            sublabel="가격표 · Premium"
            onClick={() => {
              const url =
                typeof window !== "undefined" &&
                ["www.vlue.kr", "vlue.kr", "localhost", "127.0.0.1"].includes(
                  window.location.hostname.toLowerCase()
                )
                  ? `${window.location.origin}/#pricing`
                  : "https://www.vlue.kr/#pricing";
              try {
                const native = typeof window !== "undefined" ? window.VlueNative : null;
                if (native?.openExternalUrl) {
                  native.openExternalUrl(url);
                  return;
                }
              } catch {
                /* fall through */
              }
              window.open(url, "_blank", "noopener,noreferrer");
            }}
            isDarkMode={isDarkMode}
          />
        </SettingsSection>

        <SettingsSection title="결제 테스트" isDarkMode={isDarkMode}>
          <SettingsRowButton
            label="KPN 테스트 결제 (1,000원)"
            sublabel="포트원 V2 · 테스트 채널"
            onClick={async () => {
              if (!getPortoneV2StoreId() || !getPortoneV2ChannelKey()) {
                showSettingNotice?.(
                  "결제 설정(Store/Channel)이 없습니다. 웹 배포 환경변수를 확인해 주세요."
                );
                return;
              }
              showSettingNotice?.("결제창을 여는 중…");
              try {
                sessionStorage.setItem("vlue_v2_pay_amount", "1000");
                sessionStorage.setItem("vlue_v2_pay_order_name", "VLUE V2 테스트");
                const result = await requestPortoneV2Payment({
                  orderName: "VLUE V2 테스트",
                  totalAmount: 1000,
                  payMethod: "CARD",
                  redirectUrl: defaultPortoneV2RedirectUrl(),
                  customData: { source: "settings_pay_test" }
                });
                if (result.redirected) return;
                try {
                  const { addPushNotification, buildPaymentReceiptBody } = await import(
                    "../../lib/pushNotificationInbox.js"
                  );
                  const amount = Number(result.complete?.amountTotal || 1000);
                  const paymentId = String(result.complete?.paymentId || result.paymentId || "");
                  const productName = "VLUE V2 테스트";
                  const productDetail =
                    "포트원 V2(KPN) 결제 연동 테스트 상품입니다. 실제 서비스 이용 금액이 아니며, 결제 승인·알림·구매확인 흐름 검증용으로 제공됩니다.";
                  addPushNotification({
                    category: "결제",
                    kind: "payment",
                    title: "결제 완료 · 구매확인 안내",
                    body: buildPaymentReceiptBody({
                      productName,
                      productDetail,
                      amountKrw: amount,
                      paymentId
                    }),
                    productName,
                    productDetail,
                    amountKrw: amount,
                    paymentId,
                    needsPurchaseConfirm: true
                  });
                } catch {
                  /* ignore */
                }
                showSettingNotice?.(
                  result.complete?.status === "PAID"
                    ? "결제 승인 완료 · 알림함에서 구매확인해 주세요"
                    : `결제 처리됨 (${result.complete?.status || result.paymentId})`
                );
              } catch (e) {
                const msg = e?.message || "결제에 실패했습니다.";
                if (/취소|9000|FAILURE/i.test(msg)) {
                  showSettingNotice?.("결제를 취소했습니다.");
                } else {
                  showSettingNotice?.(msg);
                }
              }
            }}
            isDarkMode={isDarkMode}
          />
        </SettingsSection>

        <SettingsSection title="기타" isDarkMode={isDarkMode}>
          <SettingsRowButton
            label="공지사항"
            onClick={() => showSettingNotice?.("VLUE 공식 알림 채널에서 공지를 확인할 수 있습니다.")}
            isDarkMode={isDarkMode}
          />
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsRowButton label="고객센터 / 1:1 문의" onClick={() => onOpenCustomerCenter?.()} isDarkMode={isDarkMode} />
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsRowButton label="앱 버전 정보" value={`v${APP_VERSION}`} onClick={() => showSettingNotice?.(`VLUE v${APP_VERSION}`)} isDarkMode={isDarkMode} />
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsRowButton label="로그아웃" onClick={() => onLogout?.()} isDarkMode={isDarkMode} destructive />
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsRowButton label="회원 탈퇴" onClick={() => onOpenWithdrawConsult?.()} isDarkMode={isDarkMode} destructive />
          {withdrawUnlocked ? (
            <>
              <SettingsDivider isDarkMode={isDarkMode} />
              <SettingsRowButton label="회원탈퇴 진행" onClick={() => onOpenWithdrawTerms?.()} isDarkMode={isDarkMode} destructive />
            </>
          ) : null}
        </SettingsSection>
      </div>
    </div>
  );
}
