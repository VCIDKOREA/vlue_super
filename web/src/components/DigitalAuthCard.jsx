import { useMemo, useState } from "react";
import GeneralLetteringCard from "./GeneralLetteringCard.jsx";
import { VLUE_CARD_CAUTION, digitalCardBadgeText, digitalCardRoleLine } from "../lib/vlueDigitalCardUi.js";
import { VlueBrandMark } from "./VlueBrandLogo.jsx";

const BackIcon = ({ type }) => {
  const cls = "h-3.5 w-3.5 shrink-0 text-violet-200/90";
  if (type === "email") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.9">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M4 7l8 6 8-6" />
      </svg>
    );
  }
  if (type === "address") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11z" />
        <circle cx="12" cy="10" r="2.4" />
      </svg>
    );
  }
  if (type === "fax") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M7 8V4h10v4" />
        <rect x="5" y="8" width="14" height="10" rx="2" />
        <path d="M8 13h8M8 16h5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 11.2 19a19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.2 4.3 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2.1z" />
    </svg>
  );
};

/**
 * VLUE 디지털 인증 명함 — 일반(인증 번호) / 스탠다드(라이트 카드) / 프리미엄(다크·뒤집기·버튼)
 */
export default function DigitalAuthCard({ membershipTier = "free", myCard = {}, digitalCardIssued = true }) {
  const [flipped, setFlipped] = useState(false);

  /* 미발급 UI는 ProfilePanel 점선 박스 + 신청 버튼에서 처리 */
  if (digitalCardIssued === false) return null;

  const isPremium = membershipTier === "premium";
  const isStandard = membershipTier === "standard";
  const tier = isPremium ? "premium" : isStandard ? "standard" : "free";

  const org = String(myCard?.organization || "VLUE").trim();
  const name = String(myCard?.name || "").trim();
  const titleRaw = String(myCard?.title || "").trim();
  /** 조직명과 동일하면 앞면 직책 줄 생략(스탠다드와 동일 규칙) */
  const title = titleRaw && titleRaw !== org ? titleRaw : "";
  const phone = String(myCard?.phone || "").trim();
  const logoUrl = myCard?.logoUrl || "";
  const backText = String(myCard?.introBack || "프리미엄 인증 명함입니다.").trim();
  const backLines = [
    { icon: "✉", label: "e-mail", value: myCard?.email || "" },
    { icon: "📍", label: "주소", value: myCard?.address || "" },
    { icon: "☎", label: "대표번호", value: myCard?.landline || "" },
    { icon: "📠", label: "팩스번호", value: myCard?.fax || "" }
  ].filter((line) => line.value);
  const backNote = String(myCard?.backNote || backText).trim();

  const stdRoleLine = useMemo(
    () => digitalCardRoleLine({ title, name, organization: org }),
    [title, name, org]
  );

  const badgeText = digitalCardBadgeText(tier);

  const cardWrap =
    "vcid-card relative mx-auto w-full max-w-[292px] overflow-hidden rounded-3xl border-2 text-center shadow-[0_12px_28px_rgba(37,99,235,0.14)]";

  /* ---------- 일반: VLUE 인증된 번호 + 주의 문구만 (이름·전화 없음) ---------- */
  if (tier === "free") {
    return (
      <div className="relative mx-auto w-full max-w-[292px]">
        <GeneralLetteringCard />
      </div>
    );
  }

  /* ---------- 스탠다드: 라이트 블루 명함 (예: 김친구) ---------- */
  if (tier === "standard") {
    return (
      <div className={`${cardWrap} min-h-[176px] border-blue-200/90 bg-gradient-to-b from-[#e0efff] via-[#eaf4ff] to-[#d2e8fc] p-0`}>
        <div
          className="pointer-events-none absolute inset-0 z-[1] rounded-3xl bg-gradient-to-r from-blue-100/30 via-sky-400/75 via-blue-500/72 via-blue-600/68 via-sky-300/70 to-blue-100/30 shimmer-bg"
          aria-hidden
        />
        <div className="absolute inset-0 z-10 flex flex-col justify-center p-3 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <VlueBrandMark size={14} className="shrink-0" />
            <p className="text-[12px] font-bold text-blue-600">{badgeText}</p>
          </div>
          <div className="mt-3 flex items-center justify-center gap-2.5">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-blue-200/90 bg-white text-[9px] font-black text-blue-700 shadow-sm">
              {logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-cover" /> : "LOGO"}
            </span>
            <h2 className="text-left text-[18px] font-black leading-snug tracking-tight text-[#0f172a]">{org}</h2>
          </div>
          {stdRoleLine ? (
            <p className="mt-2 text-[13px] font-bold text-[#0f172a]">{stdRoleLine}</p>
          ) : (
            <p className="mt-2 text-[12px] font-semibold text-amber-800/90">표시 이름이 없습니다. 프로필에서 등록해 주세요.</p>
          )}
          {phone ? <p className="mt-1.5 text-[12px] font-medium text-[#4b5563]">{phone}</p> : null}
          <p className="mt-2.5 text-[10px] leading-snug text-[#6b7280]">{VLUE_CARD_CAUTION}</p>
        </div>
      </div>
    );
  }

  /* ---------- 프리미엄: 다크 + 상세보기·인증서보기 + 뒤집기 (예: 박블루) ---------- */
  const cardBgPremium = "from-[#0b1020] via-[#1e1b4b] via-[#312e81] to-[#1a1033]";
  const cardBorder = "border-violet-900/70";
  const shimmerColor = "via-violet-300/35 via-cyan-300/25 via-fuchsia-300/25";

  return (
    <button
      type="button"
      onClick={() => setFlipped((v) => !v)}
      className={`${cardWrap} min-h-[188px] ${cardBorder} p-3`}
    >
      <div className={`absolute inset-0 z-0 bg-gradient-to-b ${cardBgPremium}`} />
      <div className="relative z-10 min-h-[142px] card-flip-wrap pt-0.5">
        <div className={`card-flip-inner ${flipped ? "is-flipped" : ""}`}>
          <div className="card-face front flex flex-col justify-start text-center">
            <div className="mb-1 flex items-center justify-center gap-1.5">
              <VlueBrandMark size={14} className="shrink-0" />
              <span className="text-[9px] font-black tracking-widest text-violet-200">{badgeText}</span>
            </div>
            <div className="mb-1 flex items-center justify-center gap-2 px-1">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-violet-300/60 bg-violet-950/35 text-[8px] font-black text-violet-100">
                {logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-cover" /> : "LOGO"}
              </span>
              <h2 className="text-left text-[17px] font-black leading-tight tracking-tight text-white">{org}</h2>
            </div>
            {title || name ? (
              <p className="mt-1 line-clamp-2 text-[14px] font-bold leading-snug text-violet-100">
                {[title, name].filter(Boolean).join(" ")}
              </p>
            ) : null}
            {phone ? <p className="mt-1 text-[12px] font-semibold text-slate-300">{phone}</p> : null}
            <div className="mt-1.5 flex justify-center gap-2">
              <span className="rounded-md border border-violet-300/80 bg-violet-950/25 px-2.5 py-0.5 text-[10px] font-bold text-violet-100">
                상세보기
              </span>
              <span className="rounded-md border border-violet-300/80 bg-violet-950/25 px-2.5 py-0.5 text-[10px] font-bold text-violet-100">
                인증서보기
              </span>
            </div>
            <p className="mt-1 text-[10px] leading-tight text-slate-400">{VLUE_CARD_CAUTION}</p>
          </div>
          <div className="card-face back flex flex-col justify-start pt-0.5 text-center">
            <div className="mx-auto w-full max-w-[232px] text-left">
              {backLines.map((line) => (
                <div key={line.label} className="flex items-start gap-1.5 text-[10px] leading-snug text-slate-300">
                  <BackIcon type={line.label === "e-mail" ? "email" : line.label === "주소" ? "address" : line.label === "팩스번호" ? "fax" : "phone"} />
                  <p>
                    {line.label} : {line.value}
                  </p>
                </div>
              ))}
              {backNote && <p className="mt-1 text-[10px] leading-snug text-slate-300">{backNote}</p>}
            </div>
            <p className="mt-1 text-[10px] leading-tight text-slate-400">탭하면 앞면으로 돌아갑니다.</p>
          </div>
        </div>
      </div>
      <div
        className={`pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-transparent ${shimmerColor} to-transparent shimmer-bg opacity-80`}
        aria-hidden
      />
    </button>
  );
}
