import { Monitor, Smartphone, Download, CheckCircle, Apple, Chrome, ArrowLeft } from 'lucide-react';
import { VlueBrandMark, VlueBrandLogo } from '../../../components/VlueBrandLogo.jsx';

interface DownloadPageProps {
  onBack: () => void;
}

const PC_FEATURES = [
  '실시간 전화번호·기관 사기 여부 조회',
  '공공데이터 연동 자동 검증',
  'VLUE 인증 기관 데이터베이스 직접 연결',
  '피싱 사이트 URL 자동 탐지 알림',
  '보안 문서 열람 및 서명 기능',
  '대용량 기관 일괄 검증 (기업용)',
];

const MOBILE_FEATURES = [
  '수신 전화 실시간 사기 위험 알림',
  '문자 링크 자동 안전 분석',
  '위치 기반 안심영역 설정',
  '음성 통화 중 즉시 기관 조회',
  '지문·Face ID 간편 인증',
  '오프라인 최근 검색 기록 보기',
];

const PC_SYSTEMS = [
  { icon: Chrome, label: 'Windows', sub: 'Windows 10 이상', badge: '최신' },
  { icon: Monitor, label: 'macOS', sub: 'macOS 12 이상', badge: '' },
];

const MOBILE_SYSTEMS = [
  { icon: Smartphone, label: 'Android', sub: 'Android 9.0 이상', badge: '권장' },
  { icon: Apple, label: 'iOS', sub: 'iOS 15 이상', badge: '' },
];

export default function DownloadPage({ onBack }: DownloadPageProps) {
  return (
    <main className="min-h-screen bg-blue-tint">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">

        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          홈으로 돌아가기
        </button>

        {/* 헤더 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 border border-primary-200 text-primary-600 font-semibold text-xs px-3 py-1.5 mb-4">
            <VlueBrandMark size={14} className="flex-shrink-0" />
            공식 배포 채널
          </div>
          <h1
            className="text-3xl sm:text-4xl font-black text-gray-900 mb-3"
            style={{ letterSpacing: '-0.04em', wordBreak: 'keep-all' }}
          >
            VLUE 앱 다운로드
          </h1>
          <p className="text-gray-500 text-sm sm:text-base max-w-xl mx-auto" style={{ wordBreak: 'keep-all' }}>
            PC와 모바일 모두에서 사기 피해를 예방하세요.<br />
            어떤 환경에서도 실시간으로 기관 신뢰도를 확인할 수 있습니다.
          </p>
        </div>

        {/* 2-컬럼 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">

          {/* PC 버전 */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-card overflow-hidden flex flex-col">
            <div className="bg-gradient-to-br from-primary-600 to-primary-500 px-7 pt-8 pb-6">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                <Monitor className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-black text-white mb-1" style={{ letterSpacing: '-0.03em' }}>PC 버전</h2>
              <p className="text-primary-100 text-sm">Windows / macOS 데스크톱 전용</p>
            </div>

            <div className="px-7 py-6 flex-1 flex flex-col">
              <div className="flex gap-3 mb-6">
                {PC_SYSTEMS.map(({ icon: Ic, label, sub, badge }) => (
                  <div
                    key={label}
                    className="flex-1 rounded-2xl bg-gray-50 border border-gray-100 px-3 py-3 flex flex-col items-center gap-1 text-center"
                  >
                    <Ic className="w-5 h-5 text-gray-500 mb-0.5" />
                    <span className="text-xs font-semibold text-gray-800">{label}</span>
                    <span className="text-[10px] text-gray-400">{sub}</span>
                    {badge && (
                      <span className="text-[9px] font-bold bg-primary-100 text-primary-600 px-1.5 py-0.5 rounded-full">
                        {badge}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <ul className="space-y-2 flex-1 mb-6">
                {PC_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />
                    <span style={{ wordBreak: 'keep-all' }}>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="space-y-2.5">
                <button
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-semibold text-sm transition-all shadow-soft"
                >
                  <Download className="w-4 h-4" />
                  Windows 다운로드
                  <span className="text-primary-200 text-xs font-normal ml-1">v2.4.1</span>
                </button>
                <button
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold text-sm border border-gray-200 transition-all"
                >
                  <Monitor className="w-4 h-4" />
                  macOS 다운로드
                  <span className="text-gray-400 text-xs font-normal ml-1">v2.4.1</span>
                </button>
              </div>

              <p className="text-center text-[11px] text-gray-400 mt-3">
                설치 파일 서명 인증 완료 &middot; 바이러스 검사 통과
              </p>
            </div>
          </div>

          {/* 모바일 버전 */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-card overflow-hidden flex flex-col">
            <div className="bg-gradient-to-br from-sky-500 to-blue-400 px-7 pt-8 pb-6">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-black text-white mb-1" style={{ letterSpacing: '-0.03em' }}>모바일 버전</h2>
              <p className="text-sky-100 text-sm">Android / iOS 스마트폰 전용</p>
            </div>

            <div className="px-7 py-6 flex-1 flex flex-col">
              <div className="flex gap-3 mb-6">
                {MOBILE_SYSTEMS.map(({ icon: Ic, label, sub, badge }) => (
                  <div
                    key={label}
                    className="flex-1 rounded-2xl bg-gray-50 border border-gray-100 px-3 py-3 flex flex-col items-center gap-1 text-center"
                  >
                    <Ic className="w-5 h-5 text-gray-500 mb-0.5" />
                    <span className="text-xs font-semibold text-gray-800">{label}</span>
                    <span className="text-[10px] text-gray-400">{sub}</span>
                    {badge && (
                      <span className="text-[9px] font-bold bg-sky-100 text-sky-600 px-1.5 py-0.5 rounded-full">
                        {badge}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <ul className="space-y-2 flex-1 mb-6">
                {MOBILE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" />
                    <span style={{ wordBreak: 'keep-all' }}>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="space-y-2.5">
                <button
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-900 hover:bg-gray-800 active:bg-black text-white font-semibold text-sm transition-all shadow-soft"
                >
                  <Apple className="w-4 h-4" />
                  App Store
                  <span className="text-gray-400 text-xs font-normal ml-1">iOS</span>
                </button>
                <button
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm transition-all shadow-soft"
                >
                  <Smartphone className="w-4 h-4" />
                  Google Play
                  <span className="text-emerald-200 text-xs font-normal ml-1">Android</span>
                </button>
              </div>

              <p className="text-center text-[11px] text-gray-400 mt-3">
                공식 스토어 배포 &middot; 개인정보 수집 최소화
              </p>
            </div>
          </div>
        </div>

        {/* 하단 배너 */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-card px-7 py-6 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center flex-shrink-0">
            <VlueBrandLogo size={48} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-900 text-sm mb-0.5">모든 버전은 무료입니다</p>
            <p className="text-gray-500 text-xs" style={{ wordBreak: 'keep-all' }}>
              VLUE 기본 검색 및 사기 탐지 기능은 회원가입 없이도 사용 가능합니다. 기업용 일괄 검증, 보안 메일 등 프리미엄 기능은 인증 플랜을 확인하세요.
            </p>
          </div>
          <button className="btn-primary text-sm flex-shrink-0 whitespace-nowrap">
            인증 플랜 보기
          </button>
        </div>
      </div>
    </main>
  );
}
