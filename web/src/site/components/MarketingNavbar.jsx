import { useState } from "react";
import { Download, Lock, Menu, X } from "lucide-react";
import { VlueNavLogoMark, useVlueLogoBlink } from "../../components/VlueNavLogoMark.jsx";
import { MARKETING_NAV } from "../siteViews.js";
import { appEntryUrl } from "../../lib/siteMode.js";

export default function MarketingNavbar({ currentView, onNavigate }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { blinkSeq: logoBlinkSeq, triggerBlink: triggerLogoBlink } = useVlueLogoBlink();

  const handleNav = (view) => {
    onNavigate(view);
    setMobileOpen(false);
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-gray-100 bg-white/95 shadow-sm backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-center" style={{ height: "60px" }}>
          <button
            type="button"
            onClick={() => {
              triggerLogoBlink();
              handleNav("home");
            }}
            className="group mr-6 flex shrink-0 items-center gap-1.5 focus:outline-none"
            aria-label="VLUE 홈"
          >
            <VlueNavLogoMark
              blinkSeq={logoBlinkSeq}
              size={32}
              className="transition-opacity group-hover:opacity-90 group-active:scale-90"
            />
            <span
              className="text-xl font-black tracking-tight"
              style={{
                color: "#3182F6",
                fontFamily: "'Pretendard Variable', Pretendard, Inter, sans-serif",
                letterSpacing: "-0.04em",
              }}
            >
              VLUE
            </span>
          </button>

          <nav className="hidden flex-1 items-center gap-0.5 overflow-x-auto lg:flex">
            {MARKETING_NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150 ${
                  currentView === item.id && item.id !== "home"
                    ? "bg-primary-50 font-semibold text-primary-600"
                    : "text-gray-600 hover:bg-primary-50 hover:text-primary-600"
                } ${item.highlight ? "font-semibold text-primary-600" : ""}`}
                style={{ letterSpacing: "-0.01em" }}
              >
                {item.id === "mail" && <Lock className="h-3 w-3" />}
                {item.label}
              </button>
            ))}
          </nav>

          <div className="ml-3 hidden shrink-0 items-center gap-1.5 lg:flex">
            <a
              href={appEntryUrl("download")}
              className={`flex items-center gap-1 whitespace-nowrap rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                currentView === "download"
                  ? "border-primary-300 bg-primary-100 text-primary-700"
                  : "border-primary-200 bg-primary-50 text-primary-600 hover:border-primary-300 hover:bg-primary-100"
              }`}
            >
              <Download className="h-3 w-3 shrink-0" />
              APP 다운로드
            </a>
            <a
              href={appEntryUrl()}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-all hover:bg-primary-50 hover:text-primary-600"
            >
              로그인
            </a>
            <a
              href={appEntryUrl()}
              className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-bold text-white shadow-soft transition-all hover:bg-primary-700"
            >
              회원가입
            </a>
          </div>

          <button
            type="button"
            className="ml-auto rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-gray-100 bg-white px-4 py-3 lg:hidden">
          <div className="flex flex-col gap-1">
            {MARKETING_NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`rounded-xl px-3 py-2.5 text-left text-sm font-medium ${
                  currentView === item.id
                    ? "bg-primary-50 text-primary-600"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {item.label}
              </button>
            ))}
            <a
              href={appEntryUrl()}
              className="mt-2 rounded-xl bg-primary-600 px-3 py-2.5 text-center text-sm font-bold text-white"
            >
              앱·PC 설치 안내
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
