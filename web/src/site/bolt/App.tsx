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
import DownloadPage from './pages/DownloadPage';
import NewsPage from './pages/NewsPage';
import EventsPage from './pages/EventsPage';
import JobsPage from './pages/JobsPage';
import SupportPage from './pages/SupportPage';
import ExcelEditorPage from './pages/ExcelEditorPage';
import MyPage from './pages/MyPage';
import BusinessCardPage from './pages/BusinessCardPage';
import FamilyProtectionPage, { AFTER_LOGIN_KEY } from './pages/FamilyProtectionPage';
import PremiumHeroSection from './components/PremiumHeroSection';
import type { MarketingAuthUser } from './components/AuthModal';
import {
  restoreMarketingAuthUser,
  vlueMarketingLogout,
  pingAuthSession,
} from '../../lib/vlueAuthApi.js';

const VALID_VIEWS: View[] = [
  'home', 'search', 'shopping', 'auction', 'about', 'resources', 'pricing', 'safezone',
  'mail', 'download', 'news', 'events', 'jobs', 'support', 'exceleditor', 'family', 'mypage', 'bizcard',
];

function readViewFromHash(): View {
  const raw = (typeof window !== 'undefined' ? window.location.hash : '').replace(/^#/, '');
  return (VALID_VIEWS.includes(raw as View) ? raw : 'home') as View;
}

export default function App() {
  const [view, setView] = useState<View>(readViewFromHash);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<MarketingAuthUser | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showLoginRequired, setShowLoginRequired] = useState(false);

  useEffect(() => {
    const onHash = () => setView(readViewFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

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

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setView('search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (nextView: View) => {
    setView(nextView);
    if (typeof window !== 'undefined') {
      window.location.hash = nextView === 'home' ? '' : nextView;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLogout = async () => {
    await vlueMarketingLogout();
    setUser(null);
    setView('home');
  };

  const handleAuthSuccess = (authUser: MarketingAuthUser) => {
    setUser(authUser);
    setShowAuth(false);
    setShowLoginRequired(false);
    try {
      if (sessionStorage.getItem(AFTER_LOGIN_KEY) === 'family') {
        sessionStorage.removeItem(AFTER_LOGIN_KEY);
        setView('family');
        window.location.hash = 'family';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {
      /* ignore */
    }
  };

  const handleLoginRequired = () => { if (!user) setShowLoginRequired(true); };

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
        <Navbar currentView={view} onNavigate={handleNavigate} user={user} onLoginClick={() => setShowAuth(true)} onLogout={handleLogout} />
        {view !== 'exceleditor' && (
          <div className="fixed left-0 right-0 z-40 mkt-download-bar-anchor">
            <AppDownloadBar variant="top" currentView={view} onNavigate={handleNavigate} />
          </div>
        )}

        <div
          className={`mkt-app-shell relative z-10 ${
            view === 'exceleditor'
              ? 'pt-[var(--mkt-nav-h,4.5rem)]'
              : 'pt-[var(--mkt-chrome-total,8.25rem)]'
          }${view === 'home' ? ' mkt-app-shell--home' : ''}`}
        >
        {view === 'home' && <HomePage onSearch={handleSearch} onNavigate={handleNavigate} />}
        {view === 'search' && <SearchPage initialQuery={searchQuery} onBack={() => handleNavigate('home')} />}
        {view === 'shopping' && <ShoppingPage user={user} onLoginClick={handleLoginRequired} />}
        {view === 'auction' && <AuctionPage user={user} onLoginClick={handleLoginRequired} />}
        {view === 'about' && (
          <Suspense fallback={<div className="min-h-[40vh] flex items-center justify-center text-sm font-semibold text-slate-500">서비스소개 불러오는 중…</div>}>
            <AboutPage onSearch={handleSearch} onNavigate={handleNavigate} />
          </Suspense>
        )}
        {view === 'resources' && <ResourcesPage user={user} />}
        
        {view === 'pricing' && (
          <div className="mkt-pricing-shell pt-8 sm:pt-16 lg:pt-32 pb-12 sm:pb-20">
            <PremiumHeroSection onStartFamily={handleStartFamilyProtection} />
            <div id="plans">
              <PricingPage user={user} onLoginClick={handleLoginRequired} />
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
        {view === 'mail' && <SecureMailPage onBack={() => handleNavigate('home')} />}
        {view === 'download' && <DownloadPage onBack={() => handleNavigate('home')} />}
        {view === 'news' && <NewsPage onBack={() => handleNavigate('home')} />}
        {view === 'events' && <EventsPage onBack={() => handleNavigate('home')} />}
        {view === 'jobs' && <JobsPage user={user} onLoginClick={handleLoginRequired} onBack={() => handleNavigate('home')} />}
        {view === 'support' && <SupportPage user={user} onLoginClick={handleLoginRequired} onBack={() => handleNavigate('home')} />}
        {view === 'exceleditor' && (
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

        {view !== 'mypage' && <Footer onNavigate={handleNavigate} />}
        </div>
      </div>
      <MarketingFabDock
        currentView={view}
        isLoggedIn={Boolean(user)}
        onLoginRequired={handleLoginRequired}
      />
      {showLoginRequired && !user && (
        <LoginRequiredModal onClose={() => setShowLoginRequired(false)} onLogin={() => { setShowLoginRequired(false); setShowAuth(true); }} />
      )}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={handleAuthSuccess} />}
    </div>
  );
}