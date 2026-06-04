import ModalCloseButton from "../common/ModalCloseButton";
import { readRoomPrefs, toggleRoomMuted } from "../../lib/chatRoomPrefsStorage.js";

function Row({ icon, title, subtitle, danger, onClick, isDarkMode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left active:scale-[0.99] ${
        danger
          ? isDarkMode
            ? "bg-rose-950/30 text-rose-300"
            : "bg-rose-50 text-rose-700"
          : isDarkMode
            ? "bg-white/5 text-gray-100 hover:bg-white/10"
            : "bg-white text-gray-900 hover:bg-gray-50"
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-bold">{title}</span>
        {subtitle ? <span className="mt-0.5 block text-[11px] opacity-70">{subtitle}</span> : null}
      </span>
    </button>
  );
}

export default function ChatRoomSettingsSheet({
  open,
  onClose,
  roomId,
  roomName,
  isDarkMode = false,
  isFavoriteRoom,
  onToggleFavorite,
  onOpenProfile,
  onOpenDrawer,
  onLeave,
  onToast,
  onMuteChange,
  onOpenGroupCalendar,
  onCreateGroupCalendar,
  canManageGroupCalendar = false,
  onOpenVmingConsent
}) {
  if (!open) return null;
  const prefs = readRoomPrefs(roomId);
  const muted = Boolean(prefs.muted);

  return (
    <div className="fixed inset-0 z-[140] flex flex-col justify-end">
      <button type="button" className="absolute inset-0 bg-black/45" aria-label="닫기" onClick={onClose} />
      <div
        className={`relative max-h-[78dvh] w-full overflow-hidden rounded-t-3xl border-t px-3 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 ${
          isDarkMode ? "border-white/10 bg-[#111827]" : "border-gray-200 bg-[#f8fafc]"
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <ModalCloseButton variant={isDarkMode ? "subtle" : "default"} onClick={onClose} topClassName="top-2" />
        <div className={`mx-auto mb-3 h-1 w-10 rounded-full ${isDarkMode ? "bg-white/20" : "bg-gray-300"}`} />
        <p className={`mb-3 text-center text-[15px] font-black ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
          채팅방 설정
        </p>
        <p className={`mb-3 text-center text-[12px] ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{roomName}</p>
        <div className="space-y-2 overflow-y-auto max-h-[52dvh]">
          <Row icon="👤" title="상대 프로필 보기" onClick={() => { onClose(); onOpenProfile?.(); }} isDarkMode={isDarkMode} />
          {onOpenGroupCalendar ? (
            <Row
              icon="📅"
              title="그룹 일정 보기"
              subtitle="이 채팅방 일정 모아보기"
              onClick={() => {
                onClose();
                onOpenGroupCalendar();
              }}
              isDarkMode={isDarkMode}
            />
          ) : null}
          {canManageGroupCalendar && onCreateGroupCalendar ? (
            <Row
              icon="➕"
              title="일정 등록"
              subtitle="방장·대표 전용"
              onClick={() => {
                onClose();
                onCreateGroupCalendar();
              }}
              isDarkMode={isDarkMode}
            />
          ) : null}
          {onOpenVmingConsent ? (
            <Row
              icon="🤖"
              title="브이밍 AI 초대"
              subtitle="멤버 동의 후 대화 분석"
              onClick={() => {
                onClose();
                onOpenVmingConsent();
              }}
              isDarkMode={isDarkMode}
            />
          ) : null}
          <Row
            icon="🔕"
            title={muted ? "알림 켜기" : "알림 끄기"}
            subtitle={muted ? "현재 알림이 꺼져 있습니다" : "푸시·배지 알림을 끕니다"}
            onClick={() => {
              const next = toggleRoomMuted(roomId);
              onMuteChange?.(next);
              onToast?.(next ? "채팅방 알림을 껐습니다." : "채팅방 알림을 켰습니다.");
              onClose();
            }}
            isDarkMode={isDarkMode}
          />
          <Row
            icon="🖼"
            title="채팅방 배경"
            subtitle="배경 이미지·색상 (준비 중)"
            onClick={() => onToast?.("채팅방 배경은 다음 업데이트에서 설정할 수 있습니다.")}
            isDarkMode={isDarkMode}
          />
          <Row
            icon="⭐"
            title={isFavoriteRoom ? "즐겨찾기 해제" : "즐겨찾기"}
            onClick={() => {
              onToggleFavorite?.();
              onClose();
            }}
            isDarkMode={isDarkMode}
          />
          <Row
            icon="📋"
            title="대화 정보"
            subtitle="파일·초대·인증 정보"
            onClick={() => {
              onClose();
              onOpenDrawer?.();
            }}
            isDarkMode={isDarkMode}
          />
          <Row
            icon="🚩"
            title="신고"
            onClick={() => onToast?.("신고가 접수되었습니다. 운영팀이 확인합니다.")}
            isDarkMode={isDarkMode}
          />
          <Row icon="🚪" title="나가기" danger onClick={() => { onClose(); onLeave?.(); }} isDarkMode={isDarkMode} />
        </div>
      </div>
    </div>
  );
}
