/**
 * 카카오톡 스타일 무지(빈) 프로필 — 사용자 사진/로고 미설정 시 사용.
 * VLUE 브랜드 로고와 구분되도록 회색 원 + 사람 실루엣만 표시.
 */
export default function KakaoBlankAvatar({ className = "", title = "프로필 미설정" }) {
  return (
    <span
      className={`inline-flex h-full w-full items-center justify-center bg-[#dee2e6] text-[#adb5bd] ${className}`.trim()}
      role="img"
      aria-label={title}
      title={title}
    >
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-[62%] w-[62%]" aria-hidden>
        <path
          d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z"
          fill="currentColor"
        />
        <path
          d="M4 20.2C4 16.9 7.58 15 12 15C16.42 15 20 16.9 20 20.2"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </span>
  );
}
