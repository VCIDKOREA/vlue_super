import PushNotificationInbox from "./PushNotificationInbox.jsx";
import AppFullScreenView from "./AppFullScreenView.jsx";
import { Bell } from "lucide-react";

/** 하단 바 앱 알림 — 전체 화면 */
export default function AppNotificationSheet({
  open,
  onClose,
  isDarkMode = false,
  onOpenFamilyProtection
}) {
  return (
    <AppFullScreenView
      open={open}
      onClose={onClose}
      title="앱 알림"
      subtitle="가족보호 · 서비스 알림"
      icon={Bell}
      isDarkMode={isDarkMode}
      reserveBottomNav
    >
      <div className="flex min-h-0 flex-1 flex-col px-3 py-3">
        <PushNotificationInbox onOpenFamilyProtection={onOpenFamilyProtection} isDarkMode={isDarkMode} />
      </div>
    </AppFullScreenView>
  );
}
