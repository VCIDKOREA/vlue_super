/** 미디어커머스 피드 — 라이트/다크 테마 토큰 */
export function feedTheme(isDarkMode) {
  if (isDarkMode) {
    return {
      shell: "bg-[#0f0f0f] text-gray-100",
      bar: "border-white/10 bg-[#151821]/95",
      chipActive: "border border-blue-500 bg-blue-600 text-white shadow-sm",
      chipIdle: "border border-white/15 bg-white/10 text-gray-300 hover:bg-white/15",
      card: "bg-[#151821] border border-white/10",
      title: "text-gray-100",
      sub: "text-gray-300",
      meta: "text-gray-400",
      divide: "divide-y divide-white/10",
      thumbBg: "bg-white/10",
      sectionTitle: "text-gray-200",
      searchWrap: "border-blue-500/60 bg-[#1a2332] shadow-[0_2px_10px_rgba(37,99,235,0.15)]",
      searchCatBtn: "border-r border-white/10 text-gray-100",
      searchInput: "text-gray-100 placeholder:text-gray-500",
      searchIcon: "text-gray-400 hover:bg-white/10",
      searchIconAccent: "text-blue-400 hover:bg-blue-500/20",
      catDropdown: "border-white/10 bg-[#151821]",
      catDropdownItem: "text-gray-200 hover:bg-white/10",
      catChipActive: "border-blue-400/50 bg-blue-500/20 text-blue-200 shadow-sm",
      catChipIdle: "border-white/10 bg-white/5 text-gray-300 hover:border-white/20 hover:bg-white/10",
      catChipIconActive: "bg-blue-500/30",
      catChipIconIdle: "bg-white/10",
      adCard: "border-amber-500/30 bg-[#151821]",
      adBtn: "border-amber-400/40 bg-amber-500/15 text-amber-200"
    };
  }
  return {
    shell: "bg-[#f8fafc] text-slate-900",
    bar: "border-slate-200/90 bg-white/95",
    chipActive: "border border-blue-500 bg-blue-600 text-white shadow-sm",
    chipIdle: "border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200",
    card: "bg-white",
    title: "text-slate-900",
    sub: "text-slate-600",
    meta: "text-slate-500",
    divide: "divide-y divide-slate-200",
    thumbBg: "bg-slate-200",
    sectionTitle: "text-slate-700",
    searchWrap: "border-blue-500 bg-white shadow-[0_2px_10px_rgba(37,99,235,0.12)]",
    searchCatBtn: "border-r border-slate-200 text-slate-900",
    searchInput: "text-slate-900",
    searchIcon: "text-slate-500 hover:bg-slate-100",
    searchIconAccent: "text-blue-600 hover:bg-blue-50",
    catDropdown: "border-slate-200 bg-white",
    catDropdownItem: "text-slate-800 hover:bg-slate-50",
    catChipActive: "border-blue-300 bg-blue-50 text-blue-700 shadow-sm",
    catChipIdle: "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
    catChipIconActive: "bg-blue-100",
    catChipIconIdle: "bg-slate-100",
    adCard: "border-amber-200 bg-white",
    adBtn: "border-amber-300 bg-amber-50 text-amber-700"
  };
}
