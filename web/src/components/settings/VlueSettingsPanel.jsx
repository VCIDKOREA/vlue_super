import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LetteringSettingsSection from "../LetteringSettingsSection.jsx";
import CallDetectionStatusBanner from "../CallDetectionStatusBanner.jsx";
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
import { openNativeAppSettings } from "../../lib/letteringSettings.js";
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
      showSettingNotice?.("앱 잠금은 VLUÉ Android 앱에서 사용할 수 있습니다.");
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
      showSettingNotice?.("PIN 변경은 VLUÉ Android 앱에서 가능합니다.");
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
          이 화면은 브라우저입니다. Android VLUÉ 앱에서 앱 잠금을 설정하세요.
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

import PolicyModal from "../modals/PolicyModal.jsx";

const LEGAL_TERMS_CONTENT = {
  termsOfService: "VLUÉ 서비스 이용에 대한 기본 약관 및 권리/의무 규정입니다.\n\n[제 1조] 목적\n본 약관은 (주)브이씨아이디코리아 (이하 '회사'라 함)에서 제공하는 VLUÉ 서비스의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.\n\n[제 2조] 용어의 정의\n1. '서비스'라 함은 구현되는 단말기(PC, 휴대용 단말기 등의 각종 유무선 장치를 포함)와 상관없이 회원이 이용할 수 있는 VLUÉ 관련 제반 서비스를 의미합니다.\n2. '회원'이라 함은 회사의 서비스에 접속하여 본 약관에 따라 회사와 이용계약을 체결하고 회사가 제공하는 서비스를 이용하는 고객을 말합니다.\n3. '콘텐츠'라 함은 회사가 서비스 제공과 관련하여 회원에게 제공하는 일체의 정보(부호, 문자, 음성, 음향, 이미지, 영상 등으로 표현되는 자료 또는 정보)를 의미합니다.\n4. '아이디(ID)'라 함은 회원의 식별과 서비스 이용을 위하여 회원이 정하고 회사가 승인하는 문자와 숫자의 조합을 의미합니다.\n5. '비밀번호'라 함은 회원이 부여받은 아이디와 일치되는 회원임을 확인하고 비밀보호를 위해 회원 자신이 정한 문자와 숫자의 조합을 의미합니다.\n\n[제 3조] 약관의 효력 및 변경\n1. 본 약관은 서비스를 이용하고자 하는 모든 회원에 대하여 그 효력을 발생합니다.\n2. 본 약관의 내용은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공시하고, 이에 동의한 회원이 서비스에 가입함으로써 효력이 발생합니다.\n3. 회사는 필요한 경우 관련 법령을 위배하지 않는 범위 내에서 본 약관을 변경할 수 있습니다.\n4. 약관이 변경되는 경우 회사는 변경된 약관의 적용일자 및 변경사유를 명시하여 그 적용일자 7일 전부터 서비스 내에 공지합니다. 다만, 회원에게 불리하게 변경되는 경우 최소한 30일 전부터 공지하며, 이메일, SMS 등으로 개별 통지합니다. (회원의 연락처 미기재, 변경 등으로 개별 통지가 어려운 경우 서비스 내 공지로 갈음할 수 있습니다.)\n5. 회원이 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다. 변경된 약관의 효력 발생일 이후에도 서비스를 계속 이용하는 경우 약관의 변경사항에 동의한 것으로 간주됩니다.\n\n[제 4조] 서비스의 제공\n1. 회사는 회원에게 아래와 같은 서비스를 제공합니다.\n   - 디지털 명함 및 쇼케이스 서비스\n   - 가족 위치 보호 및 안심 케어 서비스\n   - 보이스피싱 방지 서비스\n   - 기타 부가 서비스\n2. 서비스는 연중무휴, 1일 24시간 제공함을 원칙으로 합니다.\n3. 회사는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신두절 또는 운영상 상당한 이유가 있는 경우 서비스의 제공을 일시적으로 중단할 수 있습니다. 이 경우 회사는 제 3조 4항에 정한 방법으로 회원에게 통지합니다. 다만, 회사가 사전에 통지할 수 없는 부득이한 사유가 있는 경우 사후에 통지할 수 있습니다.\n\n[제 5조] 서비스의 변경\n1. 회사는 안정적인 서비스 제공을 위해 서비스의 내용을 변경할 수 있습니다. 이 경우 변경 사항은 서비스 내 공지사항을 통해 회원에게 공지하며, 회원은 변경에 동의하지 않을 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.\n2. 회사는 무료로 제공되는 서비스의 일부 또는 전부를 회사의 정책 및 운영상 필요한 경우 수정, 중단, 변경할 수 있으며, 이에 대하여 회원에게 별도의 보상을 하지 않습니다.\n\n[제 6조] 회사의 의무\n1. 회사는 관련 법령과 본 약관이 금지하거나 미풍양속에 반하는 행위를 하지 않으며, 계속적이고 안정적으로 서비스를 제공하기 위하여 노력합니다.\n2. 회사는 서비스 제공과 관련하여 알고 있는 회원의 개인정보를 본인의 승낙 없이 제3자에게 누설, 배포하지 않습니다. 다만, 관계 법령에 의한 수사상의 목적 등으로 관계 기관으로부터 요구받은 경우나 방송통신심의위원회의 요청이 있는 경우 등 법률의 규정에 의한 경우에는 그러하지 않습니다.\n3. 회사는 서비스 이용과 관련하여 회원으로부터 제기된 의견이나 불만이 정당하다고 인정할 경우에는 이를 처리하여야 합니다. 회원이 제기한 의견이나 불만사항에 대해서는 게시판을 활용하거나 이메일 등을 통하여 회원에게 처리과정 및 결과를 전달합니다.\n\n[제 7조] 회원의 의무\n1. 회원은 서비스 이용과 관련하여 다음 각 호의 행위를 하여서는 안 됩니다.\n   - 타인의 정보 도용\n   - 서비스의 안정적인 운영을 방해하거나 지연시키는 행위\n   - 회사 및 타인의 명예를 손상시키거나 업무를 방해하는 행위\n   - 기타 불법적이거나 부당한 행위\n2. 회원은 본 약관 및 관계 법령을 준수해야 합니다.\n\n[제 8조] 게시물의 관리\n1. 회원의 게시물이 정보통신망법 및 저작권법 등 관계 법령에 위반되는 내용을 포함하는 경우, 권리자는 관계 법령이 정한 절차에 따라 해당 게시물의 게시 중단 및 삭제 등을 요청할 수 있으며, 회사는 관계 법령에 따라 조치를 취하여야 합니다.\n2. 회사는 권리자의 요청이 없는 경우라도 권리침해가 인정될 만한 사유가 있거나 기타 회사의 정책 및 관련 법령에 위반되는 경우에는 해당 게시물에 대해 임시조치 등을 취할 수 있습니다.\n\n[제 9조] 책임 제한\n1. 회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.\n2. 회사는 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.\n3. 회사는 회원이 서비스와 관련하여 게재한 정보, 자료, 사실의 신뢰도, 정확성 등에 관하여는 보증하지 않습니다.\n4. 회사는 무료로 제공되는 서비스 이용과 관련하여 관련 법령에 특별한 규정이 없는 한 책임을 지지 않습니다.\n\n[제 10조] 준거법 및 재판관할\n1. 본 약관의 해석 및 회사와 회원 간의 분쟁에 대하여는 대한민국의 법률을 적용합니다.\n2. 서비스 이용 중 발생한 회원과 회사 간의 소송은 제소 당시의 회원의 주소에 의하고, 주소가 없는 경우에는 거소를 관할하는 지방법원의 전속관할로 합니다. 다만, 제소 당시 회원의 주소 또는 거소가 분명하지 아니한 경우에는 민사소송법에 따라 관할법원을 정합니다.\n3. 해외에 주소나 거소가 있는 회원의 경우 회사와 회원 간의 분쟁에 관한 소송은 대한민국 서울중앙지방법원을 전속관할법원으로 합니다.\n\n[부칙] 본 약관은 2024년 1월 1일부터 적용됩니다.",
  privacyPolicy: "VLUÉ 서비스는 이용자의 개인정보를 중요시하며, '정보통신망 이용촉진 및 정보보호 등에 관한 법률', '개인정보보호법' 등 관련 법규를 준수하고 있습니다.\n\n[제 1조] 개인정보의 수집 및 이용 목적\n회사는 다음의 목적을 위하여 개인정보를 수집 및 이용합니다.\n1. 서비스 제공에 관한 계약 이행 및 서비스 제공에 따른 요금정산: 콘텐츠 제공, 물품배송 또는 청구서 발송, 본인인증, 구매 및 요금 결제, 요금 추심 등\n2. 회원 관리: 회원제 서비스 이용에 따른 본인확인, 개인 식별, 불량회원의 부정 이용 방지와 비인가 사용 방지, 가입 의사 확인, 연령 확인, 만14세 미만 아동 개인정보 수집 시 법정대리인 동의 여부 확인, 불만처리 등 민원처리, 고지사항 전달 등\n3. 마케팅 및 광고에 활용: 신규 서비스(제품) 개발 및 특화, 이벤트 등 광고성 정보 전달, 접속 빈도 파악 또는 회원의 서비스 이용에 대한 통계\n\n[제 2조] 수집하는 개인정보 항목\n회사는 서비스 제공을 위해 다음 항목의 개인정보를 수집합니다.\n1. 필수 정보: 이름, 생년월일, 성별, 휴대폰 번호, 이메일 주소, 비밀번호\n2. 선택 정보: 프로필 사진, 상태 메시지, 추천인 코드, 주소\n3. 자동 수집 정보: 서비스 이용 기록, 접속 로그, 쿠키, IP 주소, 결제 기록, 기기 정보, 위치 정보\n\n[제 3조] 개인정보의 보유 및 이용 기간\n이용자의 개인정보는 원칙적으로 개인정보의 수집 및 이용 목적이 달성되면 지체 없이 파기합니다. 단, 관계 법령의 규정에 의하여 보존할 필요가 있는 경우 회사는 아래와 같이 관계 법령에서 정한 일정한 기간 동안 회원 정보를 보관합니다.\n1. 계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)\n2. 대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)\n3. 소비자의 불만 또는 분쟁 처리에 관한 기록: 3년 (전자상거래 등에서의 소비자보호에 관한 법률)\n4. 접속에 관한 기록: 3개월 (통신비밀보호법)\n\n[제 4조] 개인정보의 파기 절차 및 방법\n회사는 개인정보 수집 및 이용 목적이 달성된 후에는 지체 없이 해당 정보를 파기합니다.\n1. 파기 절차: 회원이 서비스 가입 등을 위해 입력한 정보는 목적이 달성된 후 별도의 DB로 옮겨져(종이의 경우 별도의 서류함) 관계 법령에 따라 일정 기간 저장된 후 또는 즉시 파기됩니다. 이 개인정보는 법률에 의한 경우가 아니고서는 보존되는 이외의 다른 목적으로 이용되지 않습니다.\n2. 파기 방법: 전자적 파일 형태로 저장된 개인정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제하며, 종이 문서에 저장된 개인정보는 분쇄기로 분쇄하거나 소각하여 파기합니다.\n\n[제 5조] 개인정보 제공 및 위탁\n회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 아래의 경우에는 예외로 합니다.\n1. 이용자들이 사전에 동의한 경우\n2. 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요청이 있는 경우\n\n회사는 서비스 향상을 위해 아래와 같이 개인정보 처리 업무를 위탁하고 있으며, 관계 법령에 따라 위탁계약 시 개인정보가 안전하게 관리될 수 있도록 필요한 사항을 규정하고 있습니다.\n- 수탁업체: (주)포트원 (결제 처리), (주)NHN KCP (결제 처리), (주)카카오 (소셜 로그인), (주)구글 (소셜 로그인), (주)네이버 (소셜 로그인)\n- 위탁업무 내용: 결제 처리, 소셜 로그인 연동, 푸시 알림 발송 등\n\n[제 6조] 이용자의 권리 및 의무\n1. 이용자는 언제든지 등록되어 있는 자신의 개인정보를 열람하거나 수정할 수 있으며, 가입 해지를 요청할 수 있습니다.\n2. 이용자는 개인정보의 정확성에 대해 책임이 있으며, 이를 위반하여 발생하는 모든 위험을 부담합니다.\n3. 이용자는 관련 법령을 위반하는 개인정보를 침해해서는 안 됩니다.\n\n[제 7조] 개인정보 보호 책임자\n회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 이용자의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호 책임자를 지정하고 있습니다.\n- 성명: 이종근\n- 직책: 대표이사\n- 연락처: support@vlue.kr\n\n[부칙] 본 개인정보 처리방침은 2024년 1월 1일부터 적용됩니다.",
  refundPolicy: "VLUÉ 서비스의 유료 상품 구매 후 환불 및 청약철회는 다음 규정에 따릅니다.\n\n[제 1조] 청약철회 및 환불\n1. 회사는 '전자상거래 등에서의 소비자보호에 관한 법률'에 따라 소비자의 청약철회 권리를 보장합니다.\n2. 디지털 콘텐츠의 경우, 구매일로부터 7일 이내에 콘텐츠를 사용하지 않은 경우 청약철회가 가능합니다. 단, 다음 각 호의 경우에는 청약철회가 제한됩니다.\n   - 콘텐츠를 사용 또는 일부 소비한 경우\n   - 시간이 지나 다시 판매하기 곤란할 정도로 콘텐츠의 가치가 현저히 감소한 경우\n   - 기타 '전자상거래 등에서의 소비자보호에 관한 법률'에 따라 청약철회가 제한되는 경우\n3. 회사는 청약철회 및 환불 신청 시, 회원이 유료로 구매한 상품에 대해 구매 내역을 확인한 후 관련 법령에 따라 환불을 처리합니다.\n4. 환불은 결제 방식에 따라 영업일 기준 3~7일 소요될 수 있습니다.\n\n[제 2조] 결제 취소\n1. 결제 완료 후, 서비스 이용 내역이 없는 경우에 한하여 결제 취소가 가능합니다.\n2. 결제 취소는 고객센터를 통해 신청할 수 있으며, 신청 접수 후 회사의 확인을 거쳐 처리됩니다.\n3. 결제 취소 시 발생하는 수수료는 원칙적으로 회원이 부담합니다. (단, 회사의 귀책사유로 인한 결제 취소는 제외)\n\n[제 3조] 과오납금 환불\n1. 회사는 과오납금이 발생한 경우, 확인 즉시 과오납금을 환불합니다.\n2. 다만, 회원의 고의 또는 과실로 인하여 과오납금이 발생한 경우에는 회원이 환불에 소요되는 실제 비용을 부담합니다.\n\n[제 4조] 환불 문의\n환불 관련 문의는 VLUÉ 고객센터(support@vlue.kr)로 문의해 주세요.\n\n[부칙] 본 환불·청약철회 규정은 2024년 1월 1일부터 적용됩니다.",
  membershipInfo: `VLUÉ 프리미엄 멤버십 요금제는 다음과 같습니다.\n\n**[VLUÉ 유료 플랜]**\n- 월간 결제: 14,100원/월\n- 연간 결제: 141,000원/년 (월 11,750원 상당)\n- 혜택: 가족보호 시스템, 무제한 블루 쇼케이스, BGM 독립 & 프리미엄 사운드, 보이스피싱 안심 차단 & 공식 인증 마크\n\n**[VLUÉ 비즈니스 플랜]**\n- 월간 결제: 28,300원/월\n- 연간 결제: 283,000원/년 (월 23,583원 상당)\n- 혜택: 유료 플랜의 모든 혜택 + 비즈니스용 디지털 명함 생성 및 관리, 팀원 초대, 통계 분석 리포트 제공\n\n**[추천인 할인 혜택]**\n- 추천인 코드 입력 시, 유료 플랜 또는 비즈니스 플랜의 첫 달/첫 해 결제 금액에서 4,200원 할인 (월간 9,900원 / 연간 99,000원) 적용\n\n**[부가 서비스]**\n- 내선·대표번호 추가 회선: 5,200원/월 (기존 플랜 가입 후 추가 가능)\n- 멀티 프로필+ 추가 슬롯: 4,200원/월 (기존 플랜 가입 후 추가 가능)\n\n결제 관련 문의는 VLUÉ 고객센터(support@vlue.kr)로 문의해 주세요.\n\n[부칙] 본 요금제는 2024년 1월 1일부터 적용됩니다.`
};

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
  onOpenWithdraw,
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
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [policyModalTitle, setPolicyModalTitle] = useState("");
  const [policyModalContent, setPolicyModalContent] = useState("");

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
      showSettingNotice?.("VLUÉ ID가 복사되었습니다.");
    });
  };

  const openPolicyModal = (title, content) => {
    setPolicyModalTitle(title);
    setPolicyModalContent(content);
    setPolicyModalOpen(true);
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
                title="VLUÉ 콘텐츠 활동에 사용되는 명칭입니다."
                aria-label="활동 닉네임 도움말"
                onClick={() =>
                  window.alert("VLUÉ 콘텐츠 활동에 사용되는 명칭입니다.")
                }
              >
                ?
              </button>
            </div>
            <p className={`mt-1 text-[10px] font-medium leading-snug ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
              VLUÉ 콘텐츠 활동에 사용되는 명칭입니다.
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
      <SettingsSubpageShell title="VLUÉ ID" onBack={() => onSubView(null)} isDarkMode={isDarkMode}>
        <div className={`rounded-2xl border p-4 text-center ${boxClass}`}>
          <p className={`text-[12px] ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>내 VLUÉ ID</p>
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
            label="VLUÉ ID 검색 허용"
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
          <SettingsRowButton label="VLUÉ ID 확인" value={getMemberHandle()} onClick={() => onSubView("vlueId")} isDarkMode={isDarkMode} />
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsRowButton label="전화번호" sublabel="PASS 본인인증으로 변경" onClick={() => onSubView("contactInfo")} isDarkMode={isDarkMode} />
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsRowButton
            label="멤버십 플랜 및 변경"
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
          <div className="px-1 pb-2 pt-2">
            <CallDetectionStatusBanner
              isDarkMode={isDarkMode}
              broadcastOn={Boolean(isVCIDOn || dccBroadcastOn)}
              onNotice={showSettingNotice}
            />
          </div>
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsRowButton
            label="앱 권한 허용"
            sublabel="카메라 · 사진 · 위치 등 남은 권한을 설정에서 허용"
            onClick={() => {
              const r = openNativeAppSettings();
              if (r?.ok) {
                showSettingNotice?.(
                  "VLUÉ 앱 정보 화면입니다. 「권한」에서 허용으로 바꿔 주세요."
                );
              } else {
                showSettingNotice?.(
                  "앱 설정을 열 수 없습니다. 기기 설정 → 앱 → VLUÉ → 권한으로 이동해 주세요."
                );
              }
            }}
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
                    : "이름 숨김 · VLUÉ 인증회원으로만 표시"
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
                onClick={() => openPolicyModal(item.label, LEGAL_TERMS_CONTENT[item.kind])}
                isDarkMode={isDarkMode}
              />
            </div>
          ))}
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsRowButton
            label="요금·멤버십 안내"
            sublabel="가격표 · Premium"
            onClick={() => openPolicyModal("요금·멤버십 안내", LEGAL_TERMS_CONTENT.membershipInfo)}
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
            onClick={() => showSettingNotice?.("VLUÉ 공식 알림 채널에서 공지를 확인할 수 있습니다.")}
            isDarkMode={isDarkMode}
          />
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsRowButton label="고객센터 / 1:1 문의" onClick={() => onOpenCustomerCenter?.()} isDarkMode={isDarkMode} />
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsRowButton label="앱 버전 정보" value={`v${APP_VERSION}`} onClick={() => showSettingNotice?.(`VLUÉ v${APP_VERSION}`)} isDarkMode={isDarkMode} />
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsRowButton label="로그아웃" onClick={() => onLogout?.()} isDarkMode={isDarkMode} destructive />
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsRowButton label="회원 탈퇴" onClick={() => onOpenWithdraw?.()} isDarkMode={isDarkMode} destructive />
        </SettingsSection>
      </div>

      <PolicyModal
        open={policyModalOpen}
        onClose={() => setPolicyModalOpen(false)}
        title={policyModalTitle}
        content={policyModalContent}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}
