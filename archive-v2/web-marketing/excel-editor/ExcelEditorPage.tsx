import { Sparkles, Table2, Monitor, Zap, Cloud, ShieldCheck } from 'lucide-react';
import type { MarketingAuthUser } from '../components/AuthModal';
import OfficeExcelWorkshop from '../components/OfficeExcelWorkshop';

interface ExcelEditorPageProps {
  onLoginClick?: () => void;
  user?: MarketingAuthUser | null;
  onNavigate?: (view: import('../types').View) => void;
}

export default function ExcelEditorPage({ onLoginClick, user, onNavigate }: ExcelEditorPageProps) {
  return (
    <div className="pt-28 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-6">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 text-violet-800 text-xs font-black mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            www.vlue.kr 전용
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2 mb-2">
            <Table2 className="w-8 h-8 text-violet-600" />
            AI엑셀에디터
          </h1>
          <p className="text-sm text-slate-600 max-w-3xl leading-relaxed" style={{ wordBreak: 'keep-all' }}>
            엑셀 장부·보고서는 <strong>이 웹 페이지</strong>에서 AI로 만들고 바로 수정·저장합니다.
            VLUE는 브라우저 앱(/app)을 제공하지 않으며, PC·모바일은 <strong>설치형 프로그램</strong>만 제공합니다.
            저장한 데이터는 설치형 앱의 쇼핑·메일·자료실과 동일 계정으로 연동됩니다.
          </p>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-3xl">
            {[
              { icon: Zap, label: 'AI 12종 템플릿', sub: '공구·정산·재고' },
              { icon: Cloud, label: '버전·동기화', sub: 'PC·앱 동일 데이터' },
              { icon: ShieldCheck, label: '충돌 감지', sub: 'rev 잠금 저장' },
              { icon: Table2, label: '수식·합계', sub: '자동 열 구성' },
            ].map(({ icon: Icon, label, sub }) => (
              <div
                key={label}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
              >
                <Icon className="w-4 h-4 text-violet-600 mb-1" />
                <p className="text-[11px] font-black text-slate-800">{label}</p>
                <p className="text-[10px] text-slate-500">{sub}</p>
              </div>
            ))}
          </div>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('download')}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:underline"
            >
              <Monitor className="w-3.5 h-3.5" />
              PC·모바일 설치 프로그램 안내
            </button>
          )}
        </div>

        <OfficeExcelWorkshop
          user={user ?? null}
          onLoginClick={onLoginClick ?? (() => {})}
        />
      </div>
    </div>
  );
}
