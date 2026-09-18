import { useEffect } from "react";

/**
 * 커스텀 스폰서 1차 탭 → VLUE 쇼케이스 오버레이 (9:16).
 * CTA(방문하기)만 광고주 랜딩으로 이동.
 *
 * @param {{
 *   open: boolean,
 *   sponsor: null | {
 *     id?: string,
 *     advertiser?: string,
 *     headline?: string,
 *     body?: string,
 *     mediaUrl?: string,
 *     ctaLabel?: string,
 *     landingUrl?: string
 *   },
 *   onClose: () => void
 * }} props
 */
export default function SponsorShowcaseOverlay({ open, sponsor, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !sponsor) return null;

  const cta = sponsor.ctaLabel || "방문하기";
  const landing = String(sponsor.landingUrl || "").trim();

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/80 p-3"
      role="dialog"
      aria-modal="true"
      aria-label="스폰서 쇼케이스"
      onClick={onClose}
    >
      <div
        className="relative flex h-full max-h-[92vh] w-full max-w-[420px] flex-col overflow-hidden rounded-2xl bg-black shadow-2xl"
        style={{ aspectRatio: "9 / 16" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0">
          {sponsor.mediaUrl ? (
            <img
              src={sponsor.mediaUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-900 text-slate-500">
              No media
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
        </div>

        <div className="relative z-[1] flex items-center justify-between px-3 pb-2 pt-3">
          <span className="rounded bg-black/50 px-2 py-1 text-[11px] font-black tracking-wide text-white">
            [광고] AD
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-lg font-bold text-white"
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <div className="relative z-[1] mt-auto space-y-2 px-4 pb-6 pt-8">
          {sponsor.advertiser ? (
            <p className="text-[12px] font-bold text-sky-300">{sponsor.advertiser}</p>
          ) : null}
          <h2 className="text-[20px] font-black leading-snug text-white">{sponsor.headline || ""}</h2>
          {sponsor.body ? (
            <p className="text-[13px] leading-snug text-slate-200">{sponsor.body}</p>
          ) : null}
          {landing ? (
            <a
              href={landing}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3.5 text-[15px] font-black text-white active:opacity-90"
            >
              {cta}
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="mt-2 flex w-full items-center justify-center rounded-xl bg-slate-600 px-4 py-3.5 text-[15px] font-black text-white opacity-60"
            >
              {cta}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
