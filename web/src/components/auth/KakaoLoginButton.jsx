import { apiUrl } from "../../lib/apiBase.js";

/**
 * 카카오 공식 가이드 스타일 로그인 버튼.
 * 클릭 시 서버 OAuth 시작: GET /api/v1/auth/kakao
 */
export default function KakaoLoginButton({ className = "", disabled = false, pending = false, onBeforeNavigate }) {
  const startKakaoOAuth = () => {
    if (disabled) return;
    onBeforeNavigate?.();
    window.location.assign(apiUrl("/api/v1/auth/kakao"));
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={startKakaoOAuth}
      aria-label="카카오 간편 로그인"
      className={[
        "flex w-full items-center justify-center gap-2 rounded-md bg-[#FEE500] py-3 text-[15px] font-semibold text-[rgba(0,0,0,0.85)] transition",
        "hover:brightness-[0.98] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50",
        className
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {pending ? (
        <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-[#191919] border-t-transparent" aria-hidden />
      ) : (
        <span
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-[#191919] text-[11px] font-black leading-none text-[#FEE500]"
          aria-hidden
        >
          K
        </span>
      )}
      <span>{pending ? "연결 중" : "카카오 로그인"}</span>
    </button>
  );
}
