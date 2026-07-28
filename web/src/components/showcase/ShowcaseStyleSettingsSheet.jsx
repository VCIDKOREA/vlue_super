import { useCallback, useRef } from "react";
import { Palette } from "lucide-react";
import AppFullScreenView from "../AppFullScreenView.jsx";
import { VLUE_SHOWCASE } from "../../lib/vlueBrandSpaces.js";
import ShowcaseStyleSettingsPanel from "./ShowcaseStyleSettingsPanel.jsx";
import "./showcase-style-settings.css";

/** V1 — 블루 쇼케이스 스타일 설정 (하단 바 유지) */
export default function ShowcaseStyleSettingsSheet({
  open,
  onClose,
  membershipTier = "free",
  isDarkMode = false,
  onOpenUpgrade,
  onToast
}) {
  const closeGuardRef = useRef(null);
  const guardedClose = useCallback(() => {
    if (typeof closeGuardRef.current === "function") {
      closeGuardRef.current();
      return;
    }
    onClose?.();
  }, [onClose]);

  return (
    <AppFullScreenView
      open={open}
      onClose={guardedClose}
      title={VLUE_SHOWCASE.nameKo}
      subtitle="사진 추가 · 스타일 선택"
      icon={Palette}
      isDarkMode={isDarkMode}
      reserveBottomNav
      showFloatingClose
    >
      <ShowcaseStyleSettingsPanel
        fullscreen
        hideHeader
        membershipTier={membershipTier}
        isDarkMode={isDarkMode}
        onBack={onClose}
        onBindCloseGuard={(fn) => {
          closeGuardRef.current = fn;
        }}
        onOpenUpgrade={onOpenUpgrade}
        onToast={onToast}
      />
    </AppFullScreenView>
  );
}
