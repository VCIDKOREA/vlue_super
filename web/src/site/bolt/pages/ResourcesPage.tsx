import { useState, useEffect } from 'react';
import { FileText, Search, Home, Building2, FileCheck, Briefcase, ClipboardList, Shield, ChevronRight, CreditCard as Edit3, Printer, Tag, AlertCircle, Download, User } from 'lucide-react';
import { supabase, isSupabaseAvailable } from '../lib/supabase';
import DocumentEditor from '../components/DocumentEditor';
import SensitiveRightClickGuard from '../components/SensitiveRightClickGuard';

interface TemplateField {
  key: string;
  label: string;
  type: 'text' | 'date' | 'textarea' | 'select';
  placeholder?: string;
  options?: string[];
  required: boolean;
  autoFill?: 'name';
}

interface Document {
  id: string;
  category: string;
  title: string;
  description: string;
  template_fields: TemplateField[];
  tag: string;
  sort_order: number;
}

interface ResourcesPageProps {
  user?: { email: string } | null;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  '부동산 계약서': Home,
  '거래확인서': FileCheck,
  '발주·거래 서류': ClipboardList,
  '각종 계약서': Briefcase,
  '업무 서식': FileText,
  '보이스피싱 예방': Shield,
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
  '부동산 계약서':  { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-100',   iconBg: 'bg-blue-100'   },
  '거래확인서':    { bg: 'bg-teal-50',    text: 'text-teal-700',   border: 'border-teal-100',   iconBg: 'bg-teal-100'   },
  '발주·거래 서류': { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-100',  iconBg: 'bg-amber-100'  },
  '각종 계약서':   { bg: 'bg-rose-50',    text: 'text-rose-700',   border: 'border-rose-100',   iconBg: 'bg-rose-100'   },
  '업무 서식':     { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', iconBg: 'bg-emerald-100'},
  '보이스피싱 예방': { bg: 'bg-red-50',   text: 'text-red-700',    border: 'border-red-100',    iconBg: 'bg-red-100'    },
};

const DEFAULT_COLOR = { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', iconBg: 'bg-gray-100' };

function getUserDisplayName(email: string): string {
  const local = email.split('@')[0];
  return local.length > 2 ? local.slice(0, local.length - 1) + '*' : local;
}

export default function ResourcesPage({ user }: ResourcesPageProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [query, setQuery] = useState('');
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    setLoading(true);
    if (!isSupabaseAvailable) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    if (!error && data) {
      setDocuments(data as Document[]);
    }
    setLoading(false);
  }

  const categories = ['전체', ...Array.from(new Set(documents.map((d) => d.category)))];

  const filtered = documents.filter((d) => {
    const matchCat = selectedCategory === '전체' || d.category === selectedCategory;
    const matchQ = query === '' || d.title.toLowerCase().includes(query.toLowerCase()) || d.description.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQ;
  });

  const grouped = filtered.reduce<Record<string, Document[]>>((acc, doc) => {
    if (!acc[doc.category]) acc[doc.category] = [];
    acc[doc.category].push(doc);
    return acc;
  }, {});

  const displayName = user ? getUserDisplayName(user.email) : null;

  return (
    <main className="min-h-screen bg-blue-tint pt-16">
      <div className="bg-primary-600 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-white/80 text-sm font-semibold">VLUE 개인자료실</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-1">개인자료실</h1>
          <p className="text-white/70 text-sm mb-5">
            각종 계약서 및 업무 서식을 열어 작성·수정하고 바로 인쇄하세요.
            {displayName && (
              <span className="ml-2 text-white/90 font-semibold">({displayName}님 이름 자동입력)</span>
            )}
          </p>
          <div className="relative max-w-xl">
            <div className="flex items-center bg-white/15 backdrop-blur-sm border border-white/30 rounded-3xl overflow-hidden focus-within:bg-white/25 focus-within:border-white/50 transition-all duration-200">
              <Search className="absolute left-4 w-4 h-4 text-white/70 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="서류명 검색..."
                className="flex-1 pl-11 pr-4 py-3 bg-transparent text-white text-sm placeholder-white/60 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      <SensitiveRightClickGuard className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-3">
        {!user && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-800 font-semibold text-sm">로그인이 필요한 서비스입니다.</p>
              <p className="text-amber-600 text-xs mt-0.5">모든 서비스는 회원가입 및 로그인 후 이용 가능합니다.</p>
            </div>
          </div>
        )}
        <div className="bg-white border border-gray-100 rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-card">
          <div className="w-10 h-10 rounded-2xl bg-primary-50 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-primary-600" />
          </div>
          <div className="flex-1">
            <p className="text-gray-900 font-bold text-sm">VLUE 표준 이력서 다운로드</p>
            <p className="text-gray-500 text-xs mt-0.5" style={{ wordBreak: 'keep-all' }}>
              VLUE 인증 기관 취업에 최적화된 공식 표준 이력서 양식입니다. 공식 채용 메뉴에서 'VLUE 이력서 즉시 지원' 기능과 연동됩니다.
            </p>
          </div>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap flex-shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            이력서 다운로드
          </a>
        </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mkt-pill-row--wrap flex items-center gap-2 mb-6 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat];
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-full whitespace-nowrap transition-all border ${
                  selectedCategory === cat
                    ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                    : 'bg-white text-gray-500 hover:text-primary-600 hover:bg-primary-50 border-gray-200'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {cat}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-3" />
            <p className="text-gray-400 text-sm">서류 목록을 불러오는 중...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Search className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-gray-500 font-semibold text-sm mb-1">검색 결과가 없습니다</p>
            <p className="text-gray-400 text-xs">다른 키워드로 검색해보세요.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {Object.entries(grouped).map(([cat, docs]) => {
              const Icon = CATEGORY_ICONS[cat] || Building2;
              const color = CATEGORY_COLORS[cat] || DEFAULT_COLOR;
              return (
                <section key={cat}>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className={`w-8 h-8 rounded-xl ${color.iconBg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${color.text}`} />
                    </div>
                    <h2 className="text-gray-900 font-bold text-base" style={{ letterSpacing: '-0.01em' }}>{cat}</h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${color.bg} ${color.text} ${color.border}`}>
                      {docs.length}건
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {docs.map((doc) => {
                      const c = CATEGORY_COLORS[doc.category] || DEFAULT_COLOR;
                      return (
                        <div
                          key={doc.id}
                          className="card p-5 flex flex-col gap-3 hover:border-primary-200 hover:shadow-md transition-all group cursor-pointer"
                          onClick={() => setEditingDoc(doc)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className={`w-9 h-9 rounded-2xl ${c.iconBg} flex items-center justify-center flex-shrink-0`}>
                              <FileText className={`w-4.5 h-4.5 ${c.text}`} style={{ width: '18px', height: '18px' }} />
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border flex-shrink-0 ${c.bg} ${c.text} ${c.border}`}>
                              <Tag className="w-2.5 h-2.5 inline mr-0.5" />
                              {doc.tag}
                            </span>
                          </div>

                          <div className="flex-1">
                            <h3 className="text-gray-900 font-bold text-sm leading-snug mb-1 group-hover:text-primary-600 transition-colors" style={{ letterSpacing: '-0.01em' }}>
                              {doc.title}
                            </h3>
                            <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">
                              {doc.description}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                            <span className="text-xs text-gray-400">{doc.template_fields.length}개 항목</span>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                <Edit3 className="w-3 h-3" /> 작성
                              </div>
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                <Printer className="w-3 h-3" /> 인쇄
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary-400 transition-colors" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
      </SensitiveRightClickGuard>

      {editingDoc && (
        <DocumentEditor
          title={editingDoc.title}
          category={editingDoc.category}
          fields={editingDoc.template_fields}
          userName={displayName ?? undefined}
          onClose={() => setEditingDoc(null)}
        />
      )}
    </main>
  );
}
