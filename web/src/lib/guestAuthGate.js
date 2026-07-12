/**
 * 비로그인 둘러보기 모드(V2·플래그 guestBrowse)에서 보호 기능 접근 시 회원가입 유도.
 * V1은 guestBrowse=false → 로그인 전면만 사용.
 */
export function runWithGuestAuthGate({
  isLoggedIn,
  isBrowseGuest,
  onPromptSignup,
  onDesktopDenied,
  action
}) {
  if (isLoggedIn) {
    action?.();
    return true;
  }

  if (isBrowseGuest) {
    onPromptSignup?.(action);
    return false;
  }

  onDesktopDenied?.();
  return false;
}

/** 스토어 내 계정·결제 연동 탭 */
export const GUEST_PROTECTED_SUBHUB_TABS = new Set(["gifts", "chat", "cart"]);
