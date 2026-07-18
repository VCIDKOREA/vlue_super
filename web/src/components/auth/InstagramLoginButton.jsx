import { apiUrl } from "../../lib/apiBase.js";

/** Instagram 로그인 버튼 — 서버 OAuth: GET /api/v1/auth/instagram */
export default function InstagramLoginButton({ className = "", disabled = false, onBeforeNavigate }) {
  const startInstagramOAuth = () => {
    if (disabled) return;
    onBeforeNavigate?.();
    window.location.assign(apiUrl("/api/v1/auth/instagram"));
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={startInstagramOAuth}
      aria-label="Instagram 로그인 및 회원가입"
      className={[
        "flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] py-3 text-[15px] font-semibold text-white transition",
        "hover:brightness-[0.98] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50",
        className
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
        </svg>
      </span>
      <span>Instagram 로그인 · 회원가입</span>
    </button>
  );
}
