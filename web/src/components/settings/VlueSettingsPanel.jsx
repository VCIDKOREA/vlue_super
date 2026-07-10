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
import { fileToDataUrl, writeAvatar } from "../../lib/vlueAvatar.js";
import {
  SettingsSection,
  SettingsDivider,
  SettingsRowButton,
  SettingsToggleRow,
  SettingsSubpageShell,
  FontScalePicker
} from "./VlueSettingsUi.jsx";
import VlueEmailSettingsSection from "./VlueEmailSettingsSection.jsx";
import KakaoAlimtalkConsentModal from "../showcase/KakaoAlimtalkConsentModal.jsx";
import {
  readKakaoAlimtalkAgreed,
  writeKakaoAlimtalkAgreed,
  KAKAO_ALIMTALK_CONSENT_CHANGED_EVENT
} from "../../lib/showcase/kakaoAlimtalkConsent.js";
import "../../styles/kakao-alimtalk-consent.css";

const BLOCKED_USER_DIRECTORY = [
  { id: "u-minsu", name: "민수", handle: "@minsu" },
  { id: "u-kim", name: "KIM", handle: "@kim_global" },
  { id: "u-jiyeon", name: "지연", handle: "@jiyeon" },
  { id: "u-aron", name: "ARON", handle: "@aron" },
  { id: "u-hana", name: "하나", handle: "@hana" }
];

const APP_VERSION = "1.0.0";

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
  const [kakaoAgreed, setKakaoAgreed] = useState(() => readKakaoAlimtalkAgreed());
  const [kakaoConsentOpen, setKakaoConsentOpen] = useState(false);
  const [chatNickInput, setChatNickInput] = useState("");
  const [feedNickInput, setFeedNickInput] = useState("");
  const [statusInput, setStatusInput] = useState("");

  useEffect(() => {
    const onConsent = () => setKakaoAgreed(readKakaoAlimtalkAgreed());
    window.addEventListener(KAKAO_ALIMTALK_CONSENT_CHANGED_EVENT, onConsent);
    return () => window.removeEventListener(KAKAO_ALIMTALK_CONSENT_CHANGED_EVENT, onConsent);
  }, []);

  const onToggleKakaoAlimtalk = (nextOn) => {
    if (nextOn) {
      /* 켤 때 동의 팝업 재노출 */
      setKakaoConsentOpen(true);
      return;
    }
    writeKakaoAlimtalkAgreed(false);
    setKakaoAgreed(false);
    showSettingNotice?.("카카오 알림톡 발송이 꺼졌습니다.");
  };
  const [showIdCopied, setShowIdCopied] = useState(false);
  const avatarInputRef = useRef(null);

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
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                writeAvatar("primary", await fileToDataUrl(f));
                showSettingNotice?.("프로필 사진이 변경되었습니다.");
              } catch {
                showSettingNotice?.("사진을 불러오지 못했습니다.");
              }
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            className={`w-full rounded-xl border py-2.5 text-[13px] font-bold ${
              isDarkMode ? "border-white/15 bg-white/10 text-gray-200" : "border-gray-200 bg-gray-50 text-gray-800"
            }`}
          >
            프로필 사진 변경
          </button>
          <label className={`mt-3 block text-[11px] font-bold ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
            상태메시지
            <input
              type="text"
              maxLength={80}
              value={statusInput}
              onChange={(e) => setStatusInput(e.target.value)}
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-[13px] outline-none ${
                isDarkMode ? "border-white/15 bg-[#1f2937] text-gray-100" : "border-gray-200 bg-white text-gray-900"
              }`}
            />
          </label>
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
          <label className={`mt-3 block text-[11px] font-bold ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
            활동 닉네임
            <input
              type="text"
              maxLength={VLUE_NICKNAME_MAX}
              value={feedNickInput}
              onChange={(e) => setFeedNickInput(e.target.value)}
              className={`mt-1 w-full rounded-lg border px-3 py-2 text-[13px] outline-none ${
                isDarkMode ? "border-white/15 bg-[#1f2937] text-gray-100" : "border-gray-200 bg-white text-gray-900"
              }`}
            />
          </label>
          <button
            type="button"
            onClick={() => {
              writeDisplayNicknames({ chat: chatNickInput, feed: feedNickInput });
              patchSettings({ statusMessage: statusInput.trim() || readAppSettings().statusMessage });
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

  if (subView === "contactInfo") {
    return (
      <SettingsSubpageShell title="전화번호 및 이메일" onBack={() => onSubView(null)} isDarkMode={isDarkMode}>
        <div className={`rounded-2xl border p-4 space-y-3 ${boxClass}`}>
          <div>
            <p className={`text-[11px] font-bold ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>휴대전화</p>
            <p className={`mt-1 text-[15px] font-bold ${headText}`}>{myPhone || "(등록된 번호 없음)"}</p>
          </div>
          <SettingsDivider isDarkMode={isDarkMode} />
          <div>
            <p className={`text-[11px] font-bold ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>VLUE 가상 메일</p>
            <p className={`mt-1 text-[15px] font-bold ${headText}`}>{myEmail}</p>
          </div>
          <button
            type="button"
            onClick={() => onSubView("vlueEmailSettings")}
            className="mt-2 w-full rounded-xl bg-blue-600 py-2.5 text-[13px] font-black text-white"
          >
            VLUE 메일 설정
          </button>
          <p className={`text-[11px] leading-relaxed ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
            가상 메일은 외부 메일로 즉시 포워딩됩니다. 휴대전화 번호 변경은 본인인증 후 고객센터를 통해 지원됩니다.
          </p>
        </div>
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

  if (subView === "biometrics") {
    return (
      <SettingsSubpageShell title="생체인증" onBack={() => onSubView(null)} isDarkMode={isDarkMode}>
        <div className={`rounded-2xl border p-4 ${boxClass}`}>
          <p className={`text-[13px] leading-relaxed ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
            VLUE는 앱 실행·민감 기능 접근 시 기기 생체인증(지문·Face ID) 또는 PIN으로 잠금 해제를 요청합니다.
          </p>
          <p className={`mt-3 text-[12px] leading-relaxed ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
            기기 「설정」에서 VLUE 앱의 생체인증 권한을 허용해 주세요. 24시간 유예 후 다시 인증이 필요할 수 있습니다.
          </p>
        </div>
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
          <SettingsRowButton label="전화번호 및 이메일" sublabel="VLUE 가상 메일 · 마스터 메일 연동" onClick={() => onSubView("contactInfo")} isDarkMode={isDarkMode} />
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsRowButton
            label="멤버십 등급 및 업그레이드"
            value={membershipTierLabel}
            onClick={() => onOpenUpgrade?.()}
            isDarkMode={isDarkMode}
          />
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsToggleRow
            label="통화 중 인증명함 송출"
            sublabel={hasDigitalCertCard ? "VLUE 디지털인증명함" : "명함 신청 후 사용 가능"}
            checked={isVCIDOn}
            disabled={!hasDigitalCertCard}
            onChange={onToggleVCID}
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
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsRowButton label="생체인증 설정" onClick={() => onSubView("biometrics")} isDarkMode={isDarkMode} />
        </SettingsSection>

        <SettingsSection title="알림" isDarkMode={isDarkMode}>
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
          <SettingsToggleRow
            label="통화 종료 카카오 알림톡"
            subtitle="상대방에게 쇼케이스 인증 알림톡 발송"
            checked={kakaoAgreed}
            onChange={onToggleKakaoAlimtalk}
            isDarkMode={isDarkMode}
          />
          <SettingsDivider isDarkMode={isDarkMode} />
          <SettingsRowButton label="가족보호 등록·상세 설정" onClick={() => onOpenFamilyProtection?.()} isDarkMode={isDarkMode} />
          {onMarkAllChatsRead ? (
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

      <KakaoAlimtalkConsentModal
        open={kakaoConsentOpen}
        isDarkMode={isDarkMode}
        onAgree={() => {
          writeKakaoAlimtalkAgreed(true);
          setKakaoAgreed(true);
          setKakaoConsentOpen(false);
          showSettingNotice?.("카카오 알림톡 발송에 동의했습니다.");
        }}
        onDisagree={() => {
          writeKakaoAlimtalkAgreed(false);
          setKakaoAgreed(false);
          setKakaoConsentOpen(false);
          showSettingNotice?.("알림톡 발송에 동의하지 않았습니다.");
        }}
      />
    </div>
  );
}
