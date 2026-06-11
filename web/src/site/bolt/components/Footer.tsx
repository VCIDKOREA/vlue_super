import { Mail, Phone, MapPin } from 'lucide-react';
import { VlueBrandLogo } from '../../../components/VlueBrandLogo.jsx';
import type { View } from '../types';

interface FooterProps {
  onNavigate: (view: View) => void;
}

const FOOTER_SECTIONS = [
  {
    label: '서비스',
    links: [
      { text: '기관 검색', view: 'home' as View },
      { text: '인증신청', view: 'pricing' as View },
      { text: 'VLUE 스토어', view: 'shopping' as View },
      { text: '개인자료실', view: 'resources' as View },
      { text: 'AI엑셀에디터', view: 'exceleditor' as View },
      { text: '마이페이지', view: 'mypage' as View },
    ],
  },
  {
    label: '정보',
    links: [
      { text: '서비스소개', view: 'about' as View },
      { text: '지역 이벤트', view: 'events' as View },
      { text: 'VLUE메일', view: 'mail' as View },
      { text: '인증절차안내', view: 'pricing' as View },
    ],
  },
  {
    label: '지원',
    links: [
      { text: '고객지원', view: 'support' as View },
      { text: '공식 채용', view: 'jobs' as View },
      { text: '피해신고', view: 'home' as View },
      { text: 'API 문서', view: 'home' as View },
    ],
  },
  {
    label: '법적 고지',
    links: [
      { text: '이용약관', view: 'home' as View },
      { text: '개인정보처리방침', view: 'home' as View },
      { text: '저작권 정책', view: 'home' as View },
      { text: '쿠키 정책', view: 'home' as View },
    ],
  },
];

export default function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="mkt-footer bg-gray-900 text-gray-300">
      <div className="mkt-footer-inner max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-12">
        <div className="mkt-footer-grid grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-5 sm:gap-x-6 sm:gap-y-6 md:gap-8 mb-6 sm:mb-10">
          <div className="mkt-footer-brand col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-2 sm:mb-4">
              <VlueBrandLogo size={28} className="sm:hidden" />
              <VlueBrandLogo size={32} className="hidden sm:block" />
              <span className="text-base sm:text-lg font-black text-white tracking-tight">VLUE</span>
            </div>
            <p className="mkt-footer-tagline text-gray-400 text-xs leading-snug mb-3 sm:mb-5">
              보이스피싱 피해 예방을 위한 통합 인증 및 검증 플랫폼
            </p>
            <div className="mkt-footer-contact flex flex-wrap gap-x-3 gap-y-1.5 sm:flex-col sm:gap-2">
              <div className="flex items-center gap-1.5 text-[0.6875rem] sm:text-xs text-gray-400">
                <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary-400 flex-shrink-0" />
                <span>1588-0000</span>
              </div>
              <div className="flex items-center gap-1.5 text-[0.6875rem] sm:text-xs text-gray-400">
                <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary-400 flex-shrink-0" />
                <span>support@vlue.kr</span>
              </div>
              <div className="mkt-footer-address flex items-start gap-1.5 text-[0.6875rem] sm:text-xs text-gray-400 w-full sm:w-auto">
                <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary-400 flex-shrink-0 mt-0.5" />
                <span>서울 강남구 테헤란로 427</span>
              </div>
            </div>
          </div>

          {FOOTER_SECTIONS.map(({ label, links }) => (
            <div key={label} className="mkt-footer-section min-w-0">
              <h4 className="text-white text-[0.6875rem] sm:text-xs font-bold uppercase tracking-wider mb-1.5 sm:mb-3">{label}</h4>
              <ul className="mkt-footer-links space-y-1 sm:space-y-2">
                {links.map(({ text, view }) => (
                  <li key={text}>
                    <button
                      type="button"
                      onClick={() => onNavigate(view)}
                      className="text-gray-400 text-[0.6875rem] sm:text-xs hover:text-white transition-colors text-left"
                    >
                      {text}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mkt-footer-bottom pt-4 sm:pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
          <p className="text-gray-500 text-[0.625rem] sm:text-xs leading-snug">
            © 2026 VLUE Inc. · VCID KOREA
          </p>
          <div className="mkt-footer-status flex flex-wrap items-center gap-x-3 gap-y-1">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-gray-500 text-xs">시스템 정상 운영 중</span>
            </div>
            <div className="flex items-center gap-1 text-gray-500 text-xs">
              <span>피해 신고:</span>
              <span className="text-primary-400 font-semibold">1332</span>
              <span>/</span>
              <span className="text-primary-400 font-semibold">112</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
