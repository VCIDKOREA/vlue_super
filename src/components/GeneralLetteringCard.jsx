import { VLUE_CARD_CAUTION, digitalCardBadgeText } from "../lib/vlueDigitalCardUi.js";

/** 수신·채팅 공통: VLUE 인증된 번호 + 주의 문구 (이름·전화 없음) */
export default function GeneralLetteringCard({ className = "" }) {
  const badge = digitalCardBadgeText("free");
  return (
    <div className={`mx-auto w-full max-w-[292px] ${className}`.trim()}>
      <div className="rounded-[22px] border border-blue-200 bg-[#eef4ff] px-4 py-3 text-center shadow-sm">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#2563eb" aria-hidden>
            <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
          </svg>
          <span className="text-[13px] font-black tracking-tight text-blue-600">{badge}</span>
        </div>
        <p className="mt-2 text-[10px] leading-snug text-slate-600">{VLUE_CARD_CAUTION}</p>
      </div>
    </div>
  );
}
