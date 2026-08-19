import { Smartphone, Monitor, Apple, Star, Table2, Sparkles, ArrowRight } from 'lucide-react';
import { VlueBrandLogo } from '../../../components/VlueBrandLogo.jsx';
import { openVlueDownload } from '../../../lib/vlueDownloadActions.js';
import { isWebAiExcelEnabled, isWebPcDownloadEnabled } from '../../../lib/v1ReleaseScope.js';
import type { View } from '../types';

const FEATURES = [
  '수신 전화 디지털 인증명함·쇼케이스',
  'VLUE 기관·번호 조회',
  '가족 보호',
  '개인케이스',
];

interface DownloadSectionProps {
  onNavigate?: (view: View) => void;
}

export default function DownloadSection({ onNavigate }: DownloadSectionProps) {
  const showAiExcel = isWebAiExcelEnabled();
  const showPc = isWebPcDownloadEnabled();

  return (
    <section className="bg-gradient-to-br from-primary-600 to-primary-800 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-semibold">
              <Smartphone className="w-3.5 h-3.5" />
              앱 다운로드
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">
              언제 어디서나<br />
              <span className="text-primary-200">VLUE와 함께</span>
            </h2>
            <p className="text-white/70 text-base leading-relaxed mb-6">
              {showAiExcel
                ? showPc
                  ? '모바일·PC 앱으로 명함·쇼케이스를 띄우고, 웹에서는 AI엑셀에디터로 업무 장부까지 한곳에서 이어가세요.'
                  : '모바일 앱으로 명함·쇼케이스를 띄우고, 웹에서는 AI엑셀에디터로 업무 장부까지 이어가세요.'
                : showPc
                  ? '모바일·PC 앱으로 수신 전화에 명함·쇼케이스를 띄우고, 웹에서는 기관 검색과 인증 서비스를 이용하세요.'
                  : '모바일 앱으로 수신 전화에 명함·쇼케이스를 띄우고, 웹에서는 기관 검색과 인증 서비스를 이용하세요.'}
            </p>

            <ul className="space-y-2 mb-8">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-white/80 text-sm">
                  <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Star className="w-2.5 h-2.5 text-white" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => openVlueDownload('appStore')}
                className="flex items-center gap-3 px-5 py-3 bg-black hover:bg-gray-900 rounded-xl transition-colors group"
              >
                <Apple className="w-6 h-6 text-white" />
                <div className="text-left">
                  <p className="text-white/60 text-xs">Download on the</p>
                  <p className="text-white font-bold text-sm">App Store</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => openVlueDownload('playStore')}
                className="flex items-center gap-3 px-5 py-3 bg-black hover:bg-gray-900 rounded-xl transition-colors group"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="white" aria-hidden>
                  <path d="M3.18 23.88c.3.17.66.19.98.05l12.34-7.13-2.76-2.76-10.56 9.84zM.54 1.55C.2 1.89 0 2.43 0 3.12v17.76c0 .69.2 1.23.55 1.57l.08.07 9.95-9.95v-.24L.62 1.48l-.08.07zM20.6 10.65l-2.62-1.51-3.1 3.1 3.1 3.1 2.64-1.53c.75-.43.75-1.14.01-1.57l-.03-.59zM3.18.12L15.74 7.24l-2.76 2.76L2.16.16 3.18.12z" />
                </svg>
                <div className="text-left">
                  <p className="text-white/60 text-xs">Get it on</p>
                  <p className="text-white font-bold text-sm">Google Play</p>
                </div>
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            {showPc ? (
            <div className="bg-white/10 border border-white/20 rounded-3xl p-6 w-full max-w-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">PC 버전</h3>
                  <p className="text-white/60 text-xs">Windows / macOS</p>
                </div>
              </div>
              <p className="text-white/70 text-sm mb-4 leading-relaxed">
                PC에서도 VLUE 데스크탑 앱으로 동일한 인증 조회와 보안 서비스를 이용하세요.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openVlueDownload('windows')}
                  className="flex-1 py-2 text-sm font-semibold text-primary-600 bg-white hover:bg-primary-50 rounded-xl transition-colors"
                >
                  Windows 다운로드
                </button>
                <button
                  type="button"
                  onClick={() => openVlueDownload('mac')}
                  className="flex-1 py-2 text-sm font-semibold text-primary-600 bg-white hover:bg-primary-50 rounded-xl transition-colors"
                >
                  macOS 다운로드
                </button>
              </div>
            </div>
            ) : null}

            <div className="bg-white/10 border border-white/20 rounded-2xl p-4 w-full max-w-sm flex items-center gap-3">
              <VlueBrandLogo size={36} className="flex-shrink-0 rounded-xl ring-1 ring-white/20" />
              <div>
                <p className="text-white font-semibold text-sm">앱 신뢰 인증</p>
                <p className="text-white/60 text-xs">구글·애플 공식 스토어에만 배포되는 정품 앱입니다.</p>
              </div>
            </div>

            {showAiExcel ? (
            <div className="w-full max-w-sm rounded-2xl p-4 bg-gradient-to-r from-violet-600/90 to-primary-600/90 border border-white/25 shadow-lg shadow-violet-900/20">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Table2 className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-black text-white/90 uppercase tracking-wide mb-1.5">
                    <Sparkles className="w-3 h-3" />
                    웹 전용
                  </div>
                  <p className="text-white font-bold text-sm mb-1">AI엑셀에디터</p>
                  <p className="text-white/75 text-xs leading-relaxed" style={{ wordBreak: 'keep-all' }}>
                    공구·매출·입금 장부를 AI가 만들고, 웹에서 바로 수정합니다. 앱·PC와 동일 데이터로 연동됩니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate?.('exceleditor')}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white text-violet-700 text-sm font-black hover:bg-violet-50 transition-colors"
              >
                작업실 열기
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
