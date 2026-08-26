/**
 * 카카오 아웃링크 글리프
 * - 프로필/톡: 단일 말풍선 (카카오톡)
 * - 오픈채팅: 겹친 이중 말풍선 (오픈채팅 식별 마크 — 사용자 예시 PNG 복제 아님)
 */

export function KakaoTalkGlyph({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      <path d="M12 4C7.03 4 3 7.13 3 10.98c0 2.45 1.62 4.6 4.06 5.84-.13.48-.47 1.73-.54 2-.09.32.12.32.25.23.11-.07 1.72-1.17 2.41-1.64.6.09 1.21.13 1.82.13 4.97 0 9-3.13 9-6.98C21 7.13 16.97 4 12 4z" />
    </svg>
  );
}

/** 카카오 오픈채팅 — 앞·뒤 말풍선 + 배경색 갭으로 구분 */
export function KakaoOpenChatGlyph({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      {/* 뒤(큰) 말풍선 — 우상단 */}
      <path d="M14.35 3.6c-3.55 0-6.45 2.2-6.45 4.95 0 1.72 1.1 3.22 2.78 4.1l-.42 1.58c-.08.3.12.33.27.2l1.72-1.18c.58.09 1.18.14 1.8.14 3.55 0 6.45-2.2 6.45-4.95S17.9 3.6 14.35 3.6z" />
      {/* 앞(작은) 말풍선 — 좌하단, stroke로 뒤 말풍선과 분리 */}
      <path
        d="M8.55 9.35c-3.2 0-5.8 1.95-5.8 4.4 0 1.52.96 2.86 2.42 3.62l-.38 1.35c-.07.26.1.28.22.17l1.48-1.02c.5.08 1.02.12 1.56.12 3.2 0 5.8-1.95 5.8-4.4s-2.6-4.24-5.3-4.24z"
        stroke="var(--kakao-openchat-gap, #fee500)"
        strokeWidth="1.35"
        paintOrder="stroke fill"
      />
    </svg>
  );
}
