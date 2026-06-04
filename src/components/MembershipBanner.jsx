function MembershipBanner({ membershipTier }) {
  const label = (membershipTier || "free").toUpperCase();
  return (
    <div className="px-3 py-2 rounded-xl border border-gray-100 bg-white">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400">VLUE 등급 레터링</span>
        <span className="text-[11px] px-2 py-1 rounded-full font-bold text-blue-700 bg-blue-100">{label}</span>
      </div>
    </div>
  );
}

export default MembershipBanner;
