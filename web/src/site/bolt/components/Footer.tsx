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
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-10">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <VlueBrandLogo size={32} />
              <span className="text-lg font-black text-white tracking-tight">VLUE</span>
            </div>
            <p className="text-gray-400 text-xs leading-relaxed mb-5">
              보이스피싱 피해 예방을 위한<br />
              통합 인증 및 검증 플랫폼
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Phone className="w-3.5 h-3.5 text-primary-400" />
                <span>1588-0000 (평일 09~18시)</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Mail className="w-3.5 h-3.5 text-primary-400" />
                <span>support@vlue.kr</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <MapPin className="w-3.5 h-3.5 text-primary-400" />
                <span>서울특별시 강남구 테헤란로 427</span>
              </div>
            </div>
          </div>

          {FOOTER_SECTIONS.map(({ label, links }) => (
            <div key={label}>
              <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-3">{label}</h4>
              <ul className="space-y-2">
                {links.map(({ text, view }) => (
                  <li key={text}>
                    <button
                      onClick={() => onNavigate(view)}
                      className="text-gray-400 text-xs hover:text-white transition-colors"
                    >
                      {text}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-500 text-xs">
            © 2026 VLUE Inc. All rights reserved. | Powered by VCID KOREA
          </p>
          <div className="flex items-center gap-4">
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
