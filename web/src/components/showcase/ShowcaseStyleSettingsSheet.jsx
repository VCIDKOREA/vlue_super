import { Palette } from "lucide-react";
import AppFullScreenView from "../AppFullScreenView.jsx";
import { VLUE_SHOWCASE } from "../../lib/vlueBrandSpaces.js";
import ShowcaseStyleSettingsPanel from "./ShowcaseStyleSettingsPanel.jsx";
import "./showcase-style-settings.css";

/** V1 — 블루 쇼케이스 스타일 설정 (하단 바 유지 전체 화면) */
export default function ShowcaseStyleSettingsSheet({
  open,
  onClose,
  membershipTier = "free",
  isDarkMode = false,
  onOpenUpgrade,
  onToast
}) {
  return (
    <AppFullScreenView
      open={open}
      onClose={onClose}
      title={VLUE_SHOWCASE.nameKo}
      subtitle="스타일 · 사진 · 음악 · 명함 연동"
      icon={Palette}
      isDarkMode={isDarkMode}
      reserveBottomNav
    >
      <ShowcaseStyleSettingsPanel
        fullscreen
        hideHeader
        membershipTier={membershipTier}
        isDarkMode={isDarkMode}
        onBack={onClose}
        onOpenUpgrade={onOpenUpgrade}
        onToast={onToast}
      />
    </AppFullScreenView>
  );
}
