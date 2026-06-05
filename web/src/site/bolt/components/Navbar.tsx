import { useState } from 'react';
import { Menu, X, User, ChevronDown, LogOut, MapPin, Lock, CreditCard, LayoutDashboard, Award, Sparkles } from 'lucide-react';
import { VlueNavLogoMark, useVlueLogoBlink } from '../../../components/VlueNavLogoMark.jsx';
import type { View } from '../types';

interface NavbarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  user: { email: string } | null;
  onLoginClick: () => void;
  onLogout: () => void;
}

type NavItem = {
  label: string;
  view: View;
  /** VLUE 스토어 등 강조 링크 */
  highlight?: boolean;
  /** VLUE메일 — 보조 pill */
  mailPill?: boolean;
  /** AI엑셀에디터 — 웹 전용 눈에 띄는 CTA */
  featured?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: '서비스소개', view: 'about' },
  { label: '인증신청', view: 'pricing' },
  { label: 'VLUE 스토어', view: 'shopping', highlight: true },
  { label: '지역 이벤트', view: 'events' },
  { label: '개인자료실', view: 'resources' },
  { label: '공식 채용', view: 'jobs' },
  { label: 'VLUE메일', view: 'mail', mailPill: true },
  { label: 'AI엑셀에디터', view: 'exceleditor', featured: true },
  { label: '고객지원', view: 'support' },
];

export default function Navbar({ currentView, onNavigate, user, onLoginClick, onLogout }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { blinkSeq: logoBlinkSeq, triggerBlink: triggerLogoBlink } = useVlueLogoBlink();

  const handleNav = (view?: View) => {
    if (view) onNavigate(view);
    setMobileOpen(false);
    setUserMenuOpen(false);
  };

  return (
    <header className="mkt-site-header fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-blue-100/80 shadow-sm">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10">
        <div className="flex items-center mkt-nav-shell">
          <button
            type="button"
            onClick={() => {
              triggerLogoBlink();
              handleNav('home');
            }}
            className="mkt-nav-logo-btn mr-6 flex-shrink-0 focus:outline-none group"
            aria-label="VLUE 홈"
          >
            <VlueNavLogoMark
              blinkSeq={logoBlinkSeq}
              size={36}
              className="mkt-nav-logo-mark transition-opacity group-hover:opacity-90 group-active:scale-90"
            />
            <span
              className="mkt-nav-logo-text font-bold tracking-tight"
              style={{ color: '#3182F6', fontFamily: "'Pretendard Variable', Pretendard, Inter, sans-serif", letterSpacing: '-0.04em' }}
            >
              VLUE
            </span>
          </button>

          <nav className="hidden lg:flex mkt-nav-items">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.label}
                onClick={() => handleNav(item.view)}
                className={
                  item.featured
                    ? `mkt-nav-featured-cta mkt-nav-link whitespace-nowrap flex items-center gap-1.5${
                        item.view === currentView ? ' mkt-nav-featured-cta--active' : ''
                      }`
                    : item.mailPill
                      ? `mkt-nav-mail-pill mkt-nav-link px-3 py-1.5 font-medium rounded-full whitespace-nowrap flex items-center gap-1.5 border transition-all ${
                          item.view === currentView
                            ? 'text-primary-700 bg-primary-50 border-primary-200'
                            : 'text-primary-600 bg-primary-50/80 border-primary-100 hover:bg-primary-50'
                        }`
                      : `mkt-nav-link px-2.5 py-1.5 font-medium rounded-lg transition-all duration-150 whitespace-nowrap flex items-center gap-1 ${
                          item.view === currentView
                            ? 'text-primary-600 bg-primary-50 font-semibold'
                            : 'text-gray-600 hover:text-primary-600 hover:bg-primary-50'
                        } ${item.highlight ? 'text-primary-600 font-semibold' : ''}`
                }
                style={{ letterSpacing: '-0.01em' }}
              >
                {item.mailPill && <Lock className="w-3 h-3" />}
                {item.featured && <Sparkles className="w-3.5 h-3.5" />}
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mkt-nav-actions hidden lg:flex items-center gap-2.5 ml-4 flex-shrink-0">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="max-w-28 truncate">{user.email.split('@')[0]}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-100 rounded-2xl shadow-card py-1 z-50">
                    <div className="px-4 py-2.5 border-b border-gray-100">
                      <p className="text-xs text-gray-500">로그인 계정</p>
                      <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => { handleNav('mypage'); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      마이페이지
                    </button>
                    <button
                      onClick={() => { handleNav('bizcard'); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                    >
                      <CreditCard className="w-4 h-4" />
                      디지털 명함
                    </button>
                    <button
                      onClick={() => { handleNav('pricing'); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                    >
                      <Award className="w-4 h-4" />
                      신뢰인증 신청
                    </button>
                    <button
                      onClick={() => { handleNav('safezone'); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                    >
                      <MapPin className="w-4 h-4" />
                      안심영역 설정
                    </button>
                    <button
                      onClick={() => { onLogout(); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={onLoginClick}
                  className="mkt-nav-login whitespace-nowrap"
                >
                  로그인
                </button>
                <button
                  onClick={onLoginClick}
                  className="mkt-nav-signup whitespace-nowrap"
                >
                  회원가입
                </button>
              </>
            )}
          </div>

          <button
            className="lg:hidden ml-auto p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="mkt-nav-mobile-menu lg:hidden bg-white border-t border-gray-100 px-4 py-3 space-y-0.5 animate-fade-in">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => handleNav(item.view)}
              className={
                item.featured
                  ? 'mkt-nav-featured-cta mkt-nav-link w-full text-left flex items-center gap-2'
                  : 'w-full text-left px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all'
              }
            >
              {item.featured && <Sparkles className="w-4 h-4" />}
              {item.label}
            </button>
          ))}
          <div className="pt-3 border-t border-gray-100 flex gap-2.5">
            {user ? (
              <button
                onClick={() => { onLogout(); setMobileOpen(false); }}
                className="flex-1 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                로그아웃
              </button>
            ) : (
              <>
                <button
                  onClick={() => { onLoginClick(); setMobileOpen(false); }}
                  className="mkt-nav-login flex-1"
                >
                  로그인
                </button>
                <button
                  onClick={() => { onLoginClick(); setMobileOpen(false); }}
                  className="mkt-nav-signup flex-1"
                >
                  회원가입
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
