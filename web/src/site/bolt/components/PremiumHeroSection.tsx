import { useState } from 'react';

const BENEFITS = [
  '유료 멤버십 1대3 — 본인 포함 최대 4명 가족 보호 (인원 확장 가능)',
  '노부모님의 보이스피싱으로부터 자산 보호',
  '자녀들의 불법사이트·위험상황 경고 시스템',
] as const;

type Props = {
  onStartFamily: () => void;
};

export default function PremiumHeroSection({ onStartFamily }: Props) {
  const [showToast, setShowToast] = useState(false);

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}#family`;
    const shareText = `[VLUE] 가족 보호 시스템\n가족구성원 등록: ${shareUrl}`;
    try {
      await navigator.clipboard.writeText(shareText);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch {
      alert('복사에 실패했습니다.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 mb-12">
      <div className="bg-white rounded-[48px] overflow-hidden flex flex-col lg:flex-row border border-slate-100 shadow-2xl relative">
        <div className="lg:w-5/12 min-h-[500px] bg-[#020617] relative flex flex-col items-center justify-center p-10 overflow-hidden">
          <div className="absolute inset-0 opacity-30">
            <div
              className="w-[200%] h-[200%] absolute top-[-50%] left-[-50%]"
              style={{
                backgroundImage: 'conic-gradient(from 0deg at 50% 50%, #3b82f6 0deg, transparent 90deg)',
                animation: 'spin 3s linear infinite',
              }}
            />
          </div>
          <div className="z-10 w-full bg-slate-900/90 backdrop-blur-xl border border-blue-500/30 rounded-3xl p-5 sm:p-8 font-mono shadow-[0_0_50px_rgba(59,130,246,0.15)]">
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between mb-6 border-b border-white/10 pb-3 text-[10px]">
              <span className="text-blue-400 font-black animate-pulse shrink-0">● VLUE_AI_MONITOR_ON</span>
              <span className="text-slate-500 text-[10px] sm:text-right shrink-0">REAL-TIME SCAN</span>
            </div>
            <div className="space-y-3 text-[11px] sm:text-[12px]">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-emerald-400 font-bold">
                <span className="shrink-0">VOICE SCANNER</span>
                <span className="shrink-0">ACTIVE</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-slate-400">
                <span className="shrink-0">PHISHING_ATTACK</span>
                <span className="shrink-0">DETECTING</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-slate-400">
                <span className="shrink-0">REMOTE_ACCESS</span>
                <span className="shrink-0">FILTERING</span>
              </div>
              <div className="h-[2px] bg-blue-500/10 my-4 overflow-hidden rounded-full">
                <div className="h-full bg-blue-500 w-1/3" style={{ animation: 'scan 2s ease-in-out infinite' }} />
              </div>
              <p
                className="text-blue-300/80 text-center text-[10px] leading-relaxed not-italic"
                style={{ wordBreak: 'keep-all' }}
              >
                &quot;가족 폰 보안, AI 분석팀이 24시간 실시간 보호 중&quot;
              </p>
            </div>
          </div>
          <div className="z-10 mt-12 text-center px-4">
            <h4 className="text-white text-2xl font-black leading-tight mb-5 tracking-tighter" style={{ wordBreak: 'keep-all' }}>
              식당도, 회사도 보안경비업체가 지키는데
              <br />
              <span className="text-blue-500 underline underline-offset-8 decoration-4">
                왜 가족 폰은 방치하시나요?
              </span>
            </h4>
            <p className="text-slate-400 text-sm font-medium leading-relaxed" style={{ wordBreak: 'keep-all' }}>
              ADT캡스가 건물을 지키듯, VLUE AI 분석팀은
              <br />
              가장 취약한 가족의 휴대폰을 24시간 실시간 보안합니다.
            </p>
          </div>
        </div>

        <div className="lg:w-7/12 p-12 lg:p-20 flex flex-col bg-white relative">
          <div className="flex-1 flex flex-col justify-center">
            <div className="relative group mb-6 w-fit h-fit overflow-hidden rounded-full p-[2px]">
              <div
                className="absolute inset-0 transition-opacity duration-300 opacity-30 group-hover:opacity-100"
                style={{
                  backgroundImage:
                    'linear-gradient(110deg, #ff00ea, #ffdd00 20%, #00ffaa 40%, #00aaff 60%, #ff00ea 80%, #ffdd00)',
                  backgroundSize: '300% 300%',
                  animation: 'hologram 4s linear infinite',
                }}
              />
              <div className="relative inline-flex items-center gap-2 px-6 py-2 bg-blue-50 group-hover:bg-blue-50/70 backdrop-blur-sm rounded-full w-fit">
                <span className="text-blue-700 font-black text-xs uppercase tracking-widest relative z-10 transition-colors group-hover:text-blue-900">
                  Family Care Event
                </span>
              </div>
            </div>

            <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-8 relative" style={{ wordBreak: 'keep-all' }}>
              가족의 안전과 소중한 정보
              <br />
              <span className="text-blue-600 underline decoration-blue-100 decoration-8 underline-offset-8">
                이제 VLUE로 지켜주세요
              </span>
            </h2>

            <div className="space-y-4 mb-12 text-base sm:text-lg text-slate-600 font-bold">
              {BENEFITS.map((line) => (
                <p key={line}>✓ {line}</p>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full relative mb-12">
              <button
                type="button"
                onClick={onStartFamily}
                className="px-8 py-6 bg-blue-600 text-white rounded-2xl font-black text-lg sm:text-xl shadow-xl hover:bg-blue-700 active:scale-95 transition-all w-full h-full"
              >
                가족보호시스템 시작하기
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="px-8 py-6 bg-slate-50 text-slate-900 border border-slate-200 rounded-2xl font-black text-lg sm:text-xl shadow-md hover:bg-slate-100 active:scale-95 transition-all w-full h-full flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                <span>가족에게 공유하기</span>
              </button>

              {showToast ? (
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-2xl animate-bounce">
                  클립보드가 복사되었습니다
                </div>
              ) : null}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-8 mt-auto flex flex-col sm:flex-row items-center gap-6 bg-slate-50/50 rounded-3xl p-6">
            <div className="w-28 h-28 bg-white p-3 rounded-2xl shadow-inner border border-slate-100 flex items-center justify-center shrink-0">
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://vlue.co.kr/install"
                alt="VLUE App Install QR"
                className="w-full h-full"
              />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="text-slate-500 text-sm font-medium mb-1">가족이 함께 계시다면?</p>
              <h5 className="text-slate-900 text-lg font-black leading-snug" style={{ wordBreak: 'keep-all' }}>
                가족 휴대폰으로
                <br />
                <span className="text-blue-600">QR 코드를 스캔</span>하여 바로 설치하세요
              </h5>
              <p className="text-slate-400 text-xs mt-2 font-medium">스캔 시 앱스토어/플레이스토어로 자동 연결됩니다.</p>
            </div>
          </div>

          <div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity cursor-pointer z-10"
            onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' });
            }}
            role="button"
            tabIndex={0}
          >
            <svg className="w-5 h-5 text-blue-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes scan { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
        @keyframes hologram {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}
