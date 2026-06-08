/**
 * 비로그인 둘러보기(쿠팡·네이버형) 모드에서 보호된 기능 접근 시 회원가입 화면을 띄우는 게이트.
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
