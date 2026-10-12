import { apiUrl } from "../../lib/apiBase.js";

/** 네이버 로그인 버튼 — 서버 OAuth: GET /api/v1/auth/naver */
export default function NaverLoginButton({ className = "", disabled = false, pending = false, onBeforeNavigate }) {
  const startNaverOAuth = () => {
    if (disabled) return;
    onBeforeNavigate?.();
    window.location.assign(apiUrl("/api/v1/auth/naver"));
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={startNaverOAuth}
      aria-label="네이버 간편 로그인"
      className={[
        "flex w-full items-center justify-center gap-2 rounded-md bg-[#03C75A] py-3 text-[15px] font-semibold text-white transition",
        "hover:brightness-[0.98] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50",
        className
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {pending ? (
        <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
      ) : (
        <span
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-[17px] font-black"
          aria-hidden
        >
          N
        </span>
      )}
      <span>{pending ? "연결 중" : "네이버 로그인"}</span>
    </button>
  );
}
