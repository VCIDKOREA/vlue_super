/**
 * VLUÉ 파트너 안내 섹션
 * - 추천인 코드는 본사/관리자가 지정한 공식 파트너에게만 발급 및 운영됩니다.
 * - 일반 앱 내 누구나 추천 및 적립 대시보드를 개설하는 목록은 정책상 삭제되었습니다.
 */
export default function VluerPartnerSection({ isDarkMode = false }) {
  const subText = isDarkMode ? "text-slate-400 font-normal" : "text-slate-500 font-normal";
  const headText = isDarkMode ? "text-slate-100 font-semibold" : "text-slate-900 font-semibold";
  const boxCls = isDarkMode
    ? "border-white/10 bg-white/5"
    : "border-slate-100 bg-white";

  return (
    <div className={`mt-6 rounded-2xl border p-4 shadow-sm ${boxCls}`} style={{ letterSpacing: "-0.02em" }}>
      <p className={`text-[11px] font-medium uppercase tracking-tight text-blue-500`}>VLUÉ 파트너십</p>
      <p className={`mt-1 text-[13px] ${headText}`}>공식 파트너십 안내</p>
      <div className="mt-2.5 rounded-xl bg-slate-50 dark:bg-white/5 p-3 border border-slate-100 dark:border-white/5">
        <p className={`text-[11px] leading-relaxed ${subText}`}>
          VLUÉ 추천인 코드는 본사 관리자 승인을 통해 사전에 지정된 공식 파트너에게만 권한이 부여되며 운영됩니다. 일반 계정에서는 추천인 코드 발급 및 적립 대시보드가 노출되지 않습니다.
        </p>
      </div>
    </div>
  );
}
