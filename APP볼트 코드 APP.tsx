import { useState, useEffect } from 'react';
import { View } from './types';
import AnimatedBackground from './components/AnimatedBackground';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ChatBot from './components/ChatBot';
import AuthModal from './components/AuthModal';
import EmergencyButton from './components/EmergencyButton';
import LoginRequiredModal from './components/LoginRequiredModal';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import ShoppingPage from './pages/ShoppingPage';
import ResourcesPage from './pages/ResourcesPage';
import AboutPage from './pages/AboutPage';
import PricingPage from './pages/PricingPage';
import SafeZonePage from './pages/SafeZonePage';
import SecureMailPage from './pages/SecureMailPage';
import DownloadPage from './pages/DownloadPage';
import NewsPage from './pages/NewsPage';
import EventsPage from './pages/EventsPage';
import JobsPage from './pages/JobsPage';
import SupportPage from './pages/SupportPage';
import MyPage from './pages/MyPage';
import BusinessCardPage from './pages/BusinessCardPage';
import { supabase, isSupabaseAvailable } from './lib/supabase';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<{ email: string; grade?: 'basic' | 'certified' } | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showLoginRequired, setShowLoginRequired] = useState(false);

  useEffect(() => {
    if (!isSupabaseAvailable) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser({ email: session.user.email ?? '', grade: 'basic' });
    }).catch(() => {});

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ email: session.user.email ?? '', grade: 'basic' });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setView('search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (nextView: View) => {
    setView(nextView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    try {
      if (isSupabaseAvailable) await supabase.auth.signOut();
    } catch {}
    setUser(null);
    setView('home');
  };

  const handleAuthSuccess = (authUser: { email: string; grade?: 'basic' | 'certified' }) => {
    setUser(authUser);
    setShowAuth(false);
    setShowLoginRequired(false);
  };

import { useState, useEffect } from 'react';
import { View } from './types';
import AnimatedBackground from './components/AnimatedBackground';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ChatBot from './components/ChatBot';
import AuthModal from './components/AuthModal';
import EmergencyButton from './components/EmergencyButton';
import LoginRequiredModal from './components/LoginRequiredModal';
import HomePage from './pages/HomePage';
import PricingPage from './pages/PricingPage';

// [대표님 주문] SecurityGrid 전면 재구축 - 화려하고 역동적인 프리미엄 데이터 시각화
// 이미지 없이도 AI 분석팀의 상시 가동과 보호 시스템을 완벽히 인식시키는 하이엔드 UI
const SecurityMonitorGrid = () => (
  <div className="relative w-full h-full bg-slate-950 overflow-hidden flex items-center justify-center border-r border-slate-800 font-mono text-xs">
    {/* 배경: 정교한 테크니컬 스캔 라인 */}
    <div className="absolute inset-0 opacity-10">
      <div className="w-full h-full" style={{
        backgroundImage: 'linear-gradient(0deg, #1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}></div>
    </div>
    
    <div className="z-10 p-10 w-full flex flex-col items-center">
      {/* 1. 상단: LIVE 분석 상태 (움직이는 파동) */}
      <div className="absolute top-8 left-8 flex gap-2 items-center">
        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.6)]"></div>
        <span className="text-blue-400 font-bold uppercase tracking-[0.2em] text-[10px]">Neural Net Scan Active</span>
      </div>

      {/* 2. 메인: 움직이는 데이터 스캔 애니메이션 (프리미엄 데이터 매트릭스) */}
      <div className="relative w-72 h-44 bg-slate-900 border border-slate-800 rounded-2xl mb-8 flex flex-col p-4 shadow-inner">
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-t from-transparent to-blue-950/20 blur-xl"></div>
        
        {/* 역동적인 스캔 데이터 그리드 (움직이는 숫자) */}
        <div className="grid grid-cols-6 gap-x-2 gap-y-1 mb-3 text-slate-700 opacity-60">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}>
              {Math.random().toString(36).substring(2, 5).toUpperCase()}
            </div>
          ))}
        </div>
        
        {/* 핵심: 움직이는 위협 탐지 스캐너 라인 */}
        <div className="relative w-full h-1 bg-slate-800 rounded-full overflow-hidden mb-5">
          <div className="absolute inset-0 w-1/3 h-full bg-gradient-to-r from-blue-600 to-transparent animate-infinite-scan"></div>
        </div>

        {/* 하단: 보호 대상 및 상태 (텍스트 로그) */}
        <div className="flex justify-between items-end border-t border-slate-800 pt-3">
          <div className="space-y-1">
            <p className="text-slate-500">Target Device</p>
            <p className="text-blue-400 font-bold text-sm tracking-tight">Parent Phone_VLUE</p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-slate-500">Security Status</p>
            <p className="text-emerald-400 font-black">SECURE [100%]</p>
          </div>
        </div>
      </div>

      {/* 3. 대표님 주문 핵심: 자녀의 감정을 울리는 문구 배치 (최적 위치) */}
      <div className="text-center w-full max-w-sm px-4">
        <h4 className="text-white text-2xl font-black mb-4 leading-tight tracking-tighter">
          세상 모든 곳이 보호받을 때,<br/>
          방치된 <span className="text-blue-600 underline decoration-blue-100 underline-offset-4 decoration-4">부모님의 폰</span>은 안전한가요?
        </h4>
        <p className="text-slate-500 text-sm leading-relaxed font-medium">
          기업은 세스코로 지키면서, 보이스피싱 목표가 된 부모님 폰은 항시 피해에 노출되어 있습니다. 이제는 보호받으셔야 안전합니다.
        </p>
      </div>
    </div>
  </div>
);

export default function App() {
  const [view, setView] = useState<View>('home');
  const [user, setUser] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showLoginRequired, setShowLoginRequired] = useState(false);
  const [showPremiumPopup, setShowPremiumPopup] = useState(false);

  useEffect(() => {
    const hidden = localStorage.getItem('hideVluePopup') === new Date().toISOString().slice(0, 10);
    if (!hidden) setTimeout(() => setShowPremiumPopup(true), 1000);
  }, []);

  const handleNavigate = (nextView: View) => {
    setView(nextView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white relative font-sans text-slate-900 overflow-x-hidden">
      <AnimatedBackground />
      
      <div className="relative z-10">
        <Navbar currentView={view} onNavigate={handleNavigate} user={user} onLoginClick={() => setShowAuth(true)} onLogout={() => setUser(null)} />

        {view === 'home' && <HomePage onSearch={() => setView('search')} onNavigate={handleNavigate} />}

        {/* [인증신청/요금제] 통합 브랜딩 섹션 - 위치 및 순서 전면 재배치 */}
        {view === 'pricing' && (
          <div className="max-w-7xl mx-auto px-6 pt-32 pb-20">
            
            {/* 1. 핵심 가치 제안 카드 (Hero Section) */}
            <div className="bg-white rounded-[48px] overflow-hidden flex flex-col lg:flex-row mb-12 border border-slate-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)]">
              {/* [수정] 대표님 주문 완벽 반영한 역동적인 데이터 시각화 모니터 */}
              <div className="lg:w-5/12 min-h-[500px]">
                <SecurityMonitorGrid />
              </div>
              
              <div className="lg:w-7/12 p-12 lg:p-20 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 bg-blue-50 rounded-full">
                  <span className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></span>
                  <span className="text-blue-700 font-black text-xs uppercase tracking-widest">Premium Care</span>
                </div>
                <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-8">
                  부모님 폰 보안,<br/>
                  <span className="text-blue-600 decoration-blue-100 underline decoration-8 underline-offset-8">자녀가 직접 챙겨주세요</span>
                </h2>
                <div className="space-y-4 mb-12 text-lg text-slate-600 font-medium">
                  <p>✓ 자녀 대리 결제로 간편 가입 완료</p>
                  <p>✓ 안심 설치 링크 전송 & 자녀 직접 설치 지원</p>
                  <p>✓ 스탠다드 요금제 가입 시 1개월 이용료 무료</p>
                </div>
                <button 
                  onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}
                  className="w-full lg:w-fit px-12 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xl shadow-xl shadow-blue-100 transition-all hover:-translate-y-1"
                >
                  무료 혜택 확인하고 가입하기
                </button>
              </div>
            </div>

            {/* 2. 상세 로직 및 실제 요금제 테이블 (원본 유지) */}
            <div id="plans" className="pt-10 mb-20">
              <PricingPage user={user} onLoginClick={() => setShowLoginRequired(true)} />
            </div>

            {/* 3. AI 분석팀 실시간 알림 섹션 (원본 유지) */}
            <div className="bg-slate-900 rounded-[48px] p-12 lg:p-20 text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10 lg:w-2/3">
                <div className="flex items-center gap-3 mb-6">
                  <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]"></span>
                  <span className="text-red-400 font-bold tracking-widest text-sm uppercase">AI Real-time Monitoring</span>
                </div>
                <h3 className="text-3xl lg:text-4xl font-black mb-8 leading-snug tracking-tight">
                  예측을 벗어난 이상징후,<br/>
                  AI 분석팀에서 즉시 전송합니다
                  </h3>
                <p className="text-slate-300 text-lg leading-relaxed mb-6 font-medium">
                  부모님 스마트폰의 비정상적인 패턴을 VLUE AI 분석팀이 24시간 감시합니다. 보이스피싱 의심 앱 설치나 출처 불명의 원격 제어 시도 시, 즉시 자녀에게 골든타임 알림을 전송하여 피해를 원천 차단합니다.
                </p>
                <p className="text-blue-400 font-black text-xl italic mb-10">"스탠다드 요금제 가입 시 첫 달 0원 이벤트 진행 중"</p>
              </div>
              <div className="absolute right-[-10%] bottom-[-10%] opacity-20 hidden lg:block">
                 <div className="w-[600px] h-[600px] bg-blue-600 rounded-full blur-[120px]"></div>
              </div>
            </div>
          </div>
        )}

        {/* 나머지 페이지 라우팅 생략 (원본 동일 유지) */}
        <Footer onNavigate={handleNavigate} />
      </div>

      {/* 왼쪽 하단 팝업 (챗봇 간섭 방지) */}
      {showPremiumPopup && (
        <div className="fixed bottom-10 left-10 z-[100] max-w-lg w-full animate-in slide-in-from-left-10 duration-700">
          <div className="bg-white rounded-[40px] shadow-[0_30px_100px_rgba(0,0,0,0.18)] border border-slate-100 overflow-hidden relative">
            <button onClick={() => setShowPremiumPopup(false)} className="absolute top-5 right-5 w-8 h-8 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-200">✕</button>
            <div className="flex flex-col sm:flex-row">
              <div className="sm:w-1/2 h-64 sm:h-auto bg-slate-100 relative">
                <img src="https://images.unsplash.com/photo-1544717297-fa95b3ee51f8?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover" alt="Korean Mother" onError={(e) => (e.target as HTMLImageElement).style.opacity = '0'} />
              </div>
              <div className="sm:w-1/2 p-10 flex flex-col justify-center">
                <div className="text-blue-600 font-bold text-xs mb-3 tracking-widest uppercase tracking-tighter">Family Proxy Care</div>
                <h3 className="text-2xl font-black text-slate-900 mb-4 leading-tight">스탠다드 요금제<br/>첫 달 이용료 무료!</h3>
                <p className="text-slate-500 text-sm mb-8 leading-relaxed font-medium">자녀가 신청하고 부모님은 인증만 하세요. AI 분석팀이 24시간 부모님을 보호합니다.</p>
                <button onClick={() => { setView('pricing'); setShowPremiumPopup(false); }} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg mb-3 shadow-md active:scale-95 transition-transform">무료 혜택 확인</button>
                <button onClick={() => { localStorage.setItem('hideVluePopup', new Date().toISOString().slice(0, 10)); setShowPremiumPopup(false); }} className="w-full text-slate-400 text-xs font-bold">오늘 하루 보지 않기</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLoginRequired && <LoginRequiredModal onClose={() => setShowLoginRequired(false)} onLogin={() => setShowAuth(true)} />}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={(u:any) => { setUser(u); setShowAuth(false); }} />}
      <ChatBot />
      <EmergencyButton />
    </div>
  );
}