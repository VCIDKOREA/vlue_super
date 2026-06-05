import { FormEvent, useMemo, useState } from 'react';
import { Search, Building2, ListFilter, ChevronRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { VlueBrandMark } from '../../../components/VlueBrandLogo.jsx';
import {
  INSTITUTION_QUICK_SEARCH,
  FEATURE_KEYWORD_QUICK,
  PLATFORM_STATS,
  buildFeatureCatalog,
  matchFeatureQuery,
  type AboutCategoryId,
  type CatalogFeature,
} from '../data/serviceIntroContent';

type Props = {
  onInstitutionSearch: (query: string) => void;
  activeCategory?: AboutCategoryId;
  onFeatureSelect?: (feature: CatalogFeature) => void;
};

export default function AboutSearchHub({
  onInstitutionSearch,
  activeCategory = 'all',
  onFeatureSelect,
}: Props) {
  const [mode, setMode] = useState<'institution' | 'feature'>('institution');
  const [instQuery, setInstQuery] = useState('');
  const [featureQuery, setFeatureQuery] = useState('');

  const catalog = useMemo(() => buildFeatureCatalog(), []);

  const filteredFeatures = useMemo(() => {
    return catalog.filter((item) => {
      if (activeCategory !== 'all' && item.category !== activeCategory) return false;
      return matchFeatureQuery(item, featureQuery);
    });
  }, [catalog, activeCategory, featureQuery]);

  const submitInstitution = (e?: FormEvent) => {
    e?.preventDefault();
    const q = instQuery.trim();
    if (q) onInstitutionSearch(q);
  };

  return (
    <div className="about-search-hub rounded-3xl border border-slate-200/90 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)] overflow-hidden">
      <div className="flex border-b border-slate-100 bg-slate-50/80">
        <button
          type="button"
          onClick={() => setMode('institution')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold transition-colors ${
            mode === 'institution'
              ? 'bg-white text-primary-700 border-b-2 border-primary-500 -mb-px'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          기관·번호 조회
        </button>
        <button
          type="button"
          onClick={() => setMode('feature')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold transition-colors ${
            mode === 'feature'
              ? 'bg-white text-primary-700 border-b-2 border-primary-500 -mb-px'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ListFilter className="w-4 h-4" />
          기능·서비스 찾기
        </button>
      </div>

      <div className="p-4 sm:p-6">
        {mode === 'institution' ? (
          <>
            <form onSubmit={submitInstitution}>
              <div className="flex items-stretch gap-2 rounded-2xl border-2 border-primary-100 bg-slate-50/50 p-1.5 focus-within:border-primary-400 focus-within:bg-white transition-colors">
                <div className="relative flex-1 flex items-center min-w-0 pl-3">
                  <Search className="w-5 h-5 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={instQuery}
                    onChange={(e) => setInstQuery(e.target.value)}
                    placeholder="기관명, 전화번호, 사업자번호..."
                    className="w-full py-3 pl-2 pr-2 text-base font-medium text-slate-900 bg-transparent focus:outline-none placeholder:text-slate-400"
                  />
                </div>
                <button
                  type="submit"
                  className="shrink-0 rounded-xl bg-primary-600 hover:bg-primary-700 px-5 sm:px-8 py-3 text-sm font-bold text-white shadow-md transition-colors"
                >
                  검색
                </button>
              </div>
            </form>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">빠른 조회</span>
              {INSTITUTION_QUICK_SEARCH.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => {
                    setInstQuery(term);
                    onInstitutionSearch(term);
                  }}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-stretch gap-2 rounded-2xl border-2 border-indigo-100 bg-indigo-50/30 p-1.5 focus-within:border-indigo-400 focus-within:bg-white transition-colors">
              <div className="relative flex-1 flex items-center min-w-0 pl-3">
                <Search className="w-5 h-5 text-indigo-400 shrink-0" />
                <input
                  type="text"
                  value={featureQuery}
                  onChange={(e) => setFeatureQuery(e.target.value)}
                  placeholder="기능명·키워드 (예: 가족보호, 레터링, 요금제)..."
                  className="w-full py-3 pl-2 pr-2 text-base font-medium text-slate-900 bg-transparent focus:outline-none placeholder:text-slate-400"
                />
              </div>
              <span className="shrink-0 self-center rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white">
                {filteredFeatures.length}건
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {FEATURE_KEYWORD_QUICK.map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => setFeatureQuery(kw)}
                  className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 transition-colors"
                >
                  {kw}
                </button>
              ))}
            </div>
            {featureQuery.trim() && filteredFeatures.length > 0 ? (
              <ul className="mt-4 max-h-52 overflow-y-auto rounded-2xl border border-slate-100 divide-y divide-slate-50">
                {filteredFeatures.slice(0, 12).map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onFeatureSelect?.(item)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-primary-50/60 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="mkt-card-title truncate">{item.title}</p>
                        <p className="mkt-desc text-slate-600 truncate">{item.summary}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}

        <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-3 gap-3 sm:gap-6">
          {PLATFORM_STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              {stat.brand ? (
                <VlueBrandMark size={18} className="mx-auto mb-1 text-primary-600" />
              ) : stat.label === '검증 완료' ? (
                <CheckCircle className="w-[18px] h-[18px] mx-auto mb-1 text-primary-600" />
              ) : (
                <AlertTriangle className="w-[18px] h-[18px] mx-auto mb-1 text-amber-500" />
              )}
              <p className="text-lg sm:text-xl font-black text-slate-900 font-inter leading-tight">
                {stat.value}
                <span className="text-xs font-semibold text-slate-500">{stat.unit}</span>
              </p>
              <p className="text-sm text-slate-600 font-semibold mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
