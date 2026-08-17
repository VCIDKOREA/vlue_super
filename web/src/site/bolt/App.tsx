import { useState, useEffect, lazy, Suspense } from 'react';
import type { View } from './types';
import AnimatedBackground from './components/AnimatedBackground';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AppDownloadBar from './components/AppDownloadBar';
import AuthModal from './components/AuthModal';
import MarketingFabDock from './components/MarketingFabDock';
import LoginRequiredModal from './components/LoginRequiredModal';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import ShoppingPage from './pages/ShoppingPage';
import AuctionPage from './pages/AuctionPage';
import ResourcesPage from './pages/ResourcesPage';
const AboutPage = lazy(() => import('./pages/AboutPage'));
import PricingPage from './pages/PricingPage';
import SafeZonePage from './pages/SafeZonePage';
import SecureMailPage from './pages/SecureMailPage';
import MarketingEmailSettingsPage from './pages/MarketingEmailSettingsPage';
import DownloadPage from './pages/DownloadPage';
import NewsPage from './pages/NewsPage';
import EventsPage from './pages/EventsPage';
import JobsPage from './pages/JobsPage';
import SupportPage from './pages/SupportPage';
import ExcelEditorPage from './pages/ExcelEditorPage';
import MyPage from './pages/MyPage';
import BusinessCardPage from './pages/BusinessCardPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import RefundPage from './pages/RefundPage';
import FamilyProtectionPage, { AFTER_LOGIN_KEY } from './pages/FamilyProtectionPage';
import PremiumHeroSection from './components/PremiumHeroSection';
import type { MarketingAuthUser } from './components/AuthModal';
import {
  restoreMarketingAuthUser,
  vlueMarketingLogout,
  pingAuthSession,
} from '../../lib/vlueAuthApi.js';
import { coerceWebViewForV1, isWebViewV1Enabled, v1WebShell } from '../../lib/v1ReleaseScope.js';

const VALID_VIEWS: View[] = [
  'home', 'search', 'shopping', 'auction', 'about', 'resources', 'pricing', 'safezone',
  'mail', 'mail-settings', 'download', 'news', 'events', 'jobs', 'support', 'exceleditor', 'family', 'mypage', 'bizcard',
  'showcase', 'biz',
  'terms', 'privacy', 'refund',
];

/** /showcase · /biz 경로 → 해시 라우트로 정규화 (www.vlue.kr/showcase) */
function normalizeShowcaseManagePathname() {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path !== '/showcase' && path !== '/biz') return;
  const view = path.slice(1);
  const search = window.location.search || '';
  window.history.replaceState(null, '', `/${search}#${view}`);
}

function readViewFromHash(): { view: View; legalScrollId?: string } {
  normalizeShowcaseManagePathname();
  const raw = (typeof window !== 'undefined' ? window.location.hash : '').replace(/^#/, '');
  const [viewPart, anchor] = raw.split('/');
  if (viewPart === 'email-settings' || viewPart === 'email') {
    return { view: 'mail-settings', legalScrollId: anchor || undefined };
  }
  const view = (VALID_VIEWS.includes(viewPart as View) ? viewPart : 'home') as View;
  return { view: coerceWebViewForV1(view) as View, legalScrollId: anchor || undefined };
}

export default function App() {
  const [{ view, legalScrollId }, setRoute] = useState(readViewFromHash);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<MarketingAuthUser | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup' | 'signup_certified'>('login');
  const [authAutoStartSignup, setAuthAutoStartSignup] = useState(false);
  const [showLoginRequired, setShowLoginRequired] = useState(false);

  useEffect(() => {
    const onHash = () => setRoute(readViewFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const [idleNotice, setIdleNotice] = useState(false);

  useEffect(() => {
    const restored = restoreMarketingAuthUser();
    if (restored) setUser(restored);
    pingAuthSession().then((ok) => {
      if (!ok) {
        setUser(null);
        void vlueMarketingLogout();
      }
    });
  }, []);

  useEffect(() => {
    if (!user?.userId) return;
    void import('../../lib/digitalCardApi.js')
      .then((m) => m.fetchDigitalCardMeta({ lite: false }))
      .catch(() => null);
  }, [user?.userId]);

  /** PC 앱 등에서 ?auth=signup&start=1 로 회원가입 딥링크 */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const auth = params.get('auth');
    if (auth !== 'signup' && auth !== 'signup_certified') return;

    setAuthInitialMode(auth);
    setAuthAutoStartSignup(params.get('start') === '1');
    setShowAuth(true);

    params.delete('auth');
    params.delete('start');
    const q = params.toString();
    const next = `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', next);
  }, []);

  /**
   * PASS 본인인증 redirect 복귀 — www 마케팅에서 온보딩이 닫힌 채면
   * 계정이 절대 생성되지 않음. AuthModal+온보딩을 강제로 다시 연다.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const hasDraft = Boolean(sessionStorage.getItem('vlue_pass_cert_draft_v1'));
      const params = new URLSearchParams(window.location.search || '');
      const hasCertReturn = Boolean(
        params.get('imp_uid') || params.get('impUid') || params.get('success')
      );
      if (!hasDraft && !hasCertReturn) return;
      setAuthInitialMode('signup');
      setAuthAutoStartSignup(true);
      setShowAuth(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const q = (params.get('vlue_verify') || params.get('q') || '').trim();
    if (!q) return;
    setSearchQuery(q);
    setRoute({ view: 'search' });
    window.location.hash = 'search';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setRoute({ view: 'search' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (nextView: View, legalAnchor?: string) => {
    const safeView = coerceWebViewForV1(nextView) as View;
    setRoute({ view: safeView, legalScrollId: legalAnchor });
    if (typeof window !== 'undefined') {
      if (safeView === 'home' && !legalAnchor) {
        window.location.hash = '';
      } else if (legalAnchor) {
        window.location.hash = `${safeView}/${legalAnchor}`;
      } else {
        window.location.hash = safeView;
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLogout = async () => {
    await vlueMarketingLogout();
    setUser(null);
    setRoute({ view: 'home' });
  };

  const handleIdleLogout = async () => {
    await handleLogout();
    setIdleNotice(true);
    window.setTimeout(() => setIdleNotice(false), 4500);
  };

  const handleAuthSuccess = (authUser: MarketingAuthUser) => {
    setUser(authUser);
    setShowAuth(false);
    setShowLoginRequired(false);
    try {
      const after = sessionStorage.getItem(AFTER_LOGIN_KEY);
      if (after === 'family') {
        sessionStorage.removeItem(AFTER_LOGIN_KEY);
        setRoute({ view: 'family' });
        window.location.hash = 'family';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (after === 'showcase' || after === 'biz') {
        sessionStorage.removeItem(AFTER_LOGIN_KEY);
        setRoute({ view: after as View });
        window.location.hash = after;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    } catch {
      /* ignore */
    }
    /* 로그인 요청이 쇼케이스/비즈 화면에서 열렸다면 그 화면 유지 */
    const current = readViewFromHash().view;
    if (current === 'showcase' || current === 'biz') {
      setRoute({ view: current });
    }
  };

  const handleLoginRequired = () => {
    if (!user) {
      try {
        const current = readViewFromHash().view;
        if (current === 'showcase' || current === 'biz' || current === 'family') {
          sessionStorage.setItem(AFTER_LOGIN_KEY, current);
        }
      } catch {
        /* ignore */
      }
      setShowLoginRequired(true);
    }
  };

  const handleStartFamilyProtection = () => {
    if (!user) {
      try {
        sessionStorage.setItem(AFTER_LOGIN_KEY, 'family');
      } catch {
        /* ignore */
      }
      setShowLoginRequired(true);
      return;
    }
    handleNavigate('family');
  };

  return (
    <div className="min-h-screen bg-blue-tint relative font-sans">
      <AnimatedBackground />
      <div className="relative z-10">
        <Navbar currentView={view} onNavigate={handleNavigate} user={user} onLoginClick={() => { setAuthInitialMode('login'); setAuthAutoStartSignup(false); setShowAuth(true); }} onLogout={handleLogout} onIdleLogout={handleIdleLogout} />
        {idleNotice ? (
          <div className="mkt-site-toast" role="status">
            30분 동안 사용이 없어 로그아웃되었습니다.
          </div>
        ) : null}
        {view === 'home' && (
          <div className="fixed left-0 right-0 z-40 mkt-download-bar-anchor">
            <AppDownloadBar variant="top" currentView={view} onNavigate={handleNavigate} />
          </div>
        )}

        <div
          className={`mkt-app-shell relative z-10 ${
            view === 'home'
              ? 'pt-[var(--mkt-chrome-total,8.25rem)] mkt-app-shell--home'
              : 'pt-[var(--mkt-nav-h,3.75rem)]'
          }`}
        >
        {view === 'home' && <HomePage onSearch={handleSearch} onNavigate={handleNavigate} />}
        {view === 'search' && <SearchPage initialQuery={searchQuery} onBack={() => handleNavigate('home')} />}
        {view === 'shopping' && isWebViewV1Enabled('shopping') && <ShoppingPage user={user} onLoginClick={handleLoginRequired} />}
        {view === 'auction' && isWebViewV1Enabled('auction') && <AuctionPage user={user} onLoginClick={handleLoginRequired} />}
        {view === 'about' && (
          <Suspense fallback={<div className="min-h-[40vh] flex items-center justify-center text-sm font-semibold text-slate-500">서비스소개 불러오는 중…</div>}>
            <AboutPage onSearch={handleSearch} onNavigate={handleNavigate} />
          </Suspense>
        )}
        {view === 'resources' && isWebViewV1Enabled('resources') && <ResourcesPage user={user} />}
        
        {view === 'pricing' && (
          <div className="mkt-pricing-shell pt-8 sm:pt-16 lg:pt-32 pb-12 sm:pb-20">
            <PremiumHeroSection onStartFamily={handleStartFamilyProtection} />
            <div id="plans">
              <PricingPage
                user={user}
                onLoginClick={handleLoginRequired}
                onDownloadClick={() => handleNavigate('download')}
              />
            </div>
          </div>
        )}

        {view === 'family' && (
          <FamilyProtectionPage
            user={user}
            onLoginClick={() => {
              try {
                sessionStorage.setItem(AFTER_LOGIN_KEY, 'family');
              } catch {
                /* ignore */
              }
              setShowLoginRequired(true);
            }}
            onNavigate={handleNavigate}
          />
        )}

        {view === 'safezone' && <SafeZonePage onBack={() => handleNavigate('home')} />}
        {view === 'mail-settings' && isWebViewV1Enabled('mail-settings') && (
          <MarketingEmailSettingsPage
            user={user}
            onLoginClick={handleLoginRequired}
            onBack={() => handleNavigate('home')}
            onNavigate={handleNavigate}
          />
        )}
        {view === 'mail' && isWebViewV1Enabled('mail') && <SecureMailPage onBack={() => handleNavigate('home')} />}
        {view === 'download' && <DownloadPage onBack={() => handleNavigate('home')} />}
        {view === 'news' && <NewsPage onBack={() => handleNavigate('home')} />}
        {view === 'events' && isWebViewV1Enabled('events') && <EventsPage onBack={() => handleNavigate('home')} />}
        {view === 'jobs' && isWebViewV1Enabled('jobs') && <JobsPage user={user} onLoginClick={handleLoginRequired} onBack={() => handleNavigate('home')} />}
        {view === 'support' && <SupportPage user={user} onLoginClick={handleLoginRequired} onBack={() => handleNavigate('home')} />}
        {view === 'exceleditor' && isWebViewV1Enabled('exceleditor') && (
          <ExcelEditorPage user={user} onLoginClick={handleLoginRequired} onNavigate={handleNavigate} />
        )}
        {view === 'mypage' && user && <MyPage user={user} onNavigate={(v) => handleNavigate(v as View)} onLogout={handleLogout} />}
        {view === 'bizcard' && (
          <BusinessCardPage
            user={user}
            onLoginClick={handleLoginRequired}
            onBack={() => handleNavigate('home')}
          />
        )}
        {(view === 'showcase' || view === 'biz') && (
          <BusinessCardPage
            user={user}
            mode="showcase"
            onLoginClick={handleLoginRequired}
            onBack={() => handleNavigate('home')}
          />
        )}
        {view === 'terms' && <TermsPage onBack={() => handleNavigate('home')} />}
        {view === 'privacy' && (
          <PrivacyPage onBack={() => handleNavigate('home')} scrollToId={legalScrollId} />
        )}
        {view === 'refund' && (
          <RefundPage onBack={() => handleNavigate('home')} scrollToId={legalScrollId} />
        )}

        {view !== 'mypage' && view !== 'terms' && view !== 'privacy' && view !== 'refund' && (
          <Footer onNavigate={handleNavigate} />
        )}
        </div>
      </div>
      {v1WebShell.marketingFabChat ? (
        <MarketingFabDock
          currentView={view}
          isLoggedIn={Boolean(user)}
          onLoginRequired={handleLoginRequired}
        />
      ) : null}
      {showLoginRequired && !user && (
        <LoginRequiredModal onClose={() => setShowLoginRequired(false)} onLogin={() => { setShowLoginRequired(false); setAuthInitialMode('login'); setAuthAutoStartSignup(false); setShowAuth(true); }} />
      )}
      {showAuth && (
        <AuthModal
          initialMode={authInitialMode}
          autoStartSignup={authAutoStartSignup}
          onClose={() => { setShowAuth(false); setAuthAutoStartSignup(false); }}
          onSuccess={handleAuthSuccess}
        />
      )}
    </div>
  );
}