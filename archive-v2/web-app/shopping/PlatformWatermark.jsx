/** 출처 자동 판별 SVG 워터마크 — 텍스트/URL 노출 없음 */

function YoutubeMark() {
  return (
    <svg viewBox="0 0 48 34" className="h-5 w-auto" aria-hidden>
      <rect rx="6" width="48" height="34" fill="#FF0000" />
      <path d="M20 11v12l10-6z" fill="#fff" />
    </svg>
  );
}

function TiktokMark() {
  return (
    <svg viewBox="0 0 32 32" className="h-5 w-5" aria-hidden>
      <rect rx="6" width="32" height="32" fill="#010101" />
      <path
        d="M22 10.5a5.5 5.5 0 0 0 3.5-1.2v4.8a8.8 8.8 0 0 1-3.5-.7v7.2a6.5 6.5 0 1 1-6.5-6.5c.2 0 .5 0 .7.1v4.6a2.2 2.2 0 1 0 1.6 2.1V8h3.2v2.5z"
        fill="#25F4EE"
      />
      <path
        d="M23.5 9.3a5.5 5.5 0 0 0 2-1.8H22v11.5a2.2 2.2 0 0 1-3.8 1.5 2.2 2.2 0 0 1 1.5-3.8V8h3.8v1.3z"
        fill="#FE2C55"
        opacity="0.9"
      />
    </svg>
  );
}

function InstagramMark() {
  return (
    <svg viewBox="0 0 32 32" className="h-5 w-5" aria-hidden>
      <defs>
        <linearGradient id="igGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FEDA75" />
          <stop offset="35%" stopColor="#FA7E1E" />
          <stop offset="65%" stopColor="#D62976" />
          <stop offset="100%" stopColor="#962FBF" />
        </linearGradient>
      </defs>
      <rect rx="8" width="32" height="32" fill="url(#igGrad)" />
      <rect x="8" y="8" width="16" height="16" rx="5" fill="none" stroke="#fff" strokeWidth="2" />
      <circle cx="22" cy="10" r="1.5" fill="#fff" />
      <circle cx="16" cy="16" r="4" fill="none" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

function VimeoMark() {
  return (
    <svg viewBox="0 0 32 32" className="h-5 w-5" aria-hidden>
      <rect rx="6" width="32" height="32" fill="#1AB7EA" />
      <path d="M8 11l4 10h3l5-12h-3l-3 8-3-8H8zm11 0v10h3V11h-3z" fill="#fff" />
    </svg>
  );
}

function LiveMark() {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-red-600/90 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
      Live
    </span>
  );
}

const MARKS = {
  youtube: YoutubeMark,
  tiktok: TiktokMark,
  instagram: InstagramMark,
  vimeo: VimeoMark,
  hls: LiveMark
};

export default function PlatformWatermark({ platform, isLive = false, className = "" }) {
  const key = String(platform || "").toLowerCase();
  const Mark = MARKS[key];
  if (!Mark && !isLive) return null;

  return (
    <div
      className={`pointer-events-none absolute left-2 top-2 z-20 flex items-center gap-1.5 rounded-lg bg-black/45 px-2 py-1 backdrop-blur-sm ${className}`}
      aria-label={key ? `${key} 영상` : "라이브"}
    >
      {Mark ? <Mark /> : null}
      {isLive && key !== "hls" ? <LiveMark /> : null}
    </div>
  );
}
