import { VlueBrandLogo } from "../../components/VlueBrandLogo.jsx";

const FOOTER_LINKS = [
  { label: "서비스소개", id: "about" },
  { label: "고객지원", id: "support" },
  { label: "인증신청", id: "pricing" },
  { label: "개인케이스", id: "resources" },
];

export default function MarketingFooter({ onNavigate }) {
  return (
    <footer className="relative z-10 border-t border-gray-100 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <VlueBrandLogo size={32} />
              <span className="text-lg font-black text-primary-600" style={{ letterSpacing: "-0.04em" }}>
                VLUE
              </span>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-gray-500">
              보이스피싱 예방을 위한 공공데이터 및 VLUE 인증 통합 검증 플랫폼
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-8 gap-y-2">
            {FOOTER_LINKS.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => onNavigate(link.id)}
                className="text-sm font-medium text-gray-600 transition-colors hover:text-primary-600"
              >
                {link.label}
              </button>
            ))}
          </nav>
        </div>
        <p className="mt-8 border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} VLUE. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
