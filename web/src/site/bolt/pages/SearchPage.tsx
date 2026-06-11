import { useState, FormEvent, useEffect } from 'react';
import { Search, AlertCircle, Shield, ArrowLeft, Loader2 } from 'lucide-react';
import { verifySearchKeyword } from '../../../lib/searchVerifyApi.js';
import SearchVerifyCrossTabs, { type CrossVerifyData } from '../components/SearchVerifyCrossTabs';
import { SearchVerifySourceList } from '../components/SearchVerifySourceLogos';

interface SearchPageProps {
  initialQuery: string;
  onBack: () => void;
}

export default function SearchPage({ initialQuery, onBack }: SearchPageProps) {
  const [query, setQuery] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);
  const [verifyData, setVerifyData] = useState<CrossVerifyData | null>(null);
  const [pubLoading, setPubLoading] = useState(false);
  const [pubError, setPubError] = useState<string | null>(null);

  useEffect(() => {
    const q = activeQuery.trim();
    if (!q) {
      setVerifyData(null);
      setPubError(null);
      return;
    }

    let cancelled = false;
    setPubLoading(true);
    setPubError(null);

    verifySearchKeyword(q)
      .then((res) => {
        if (cancelled) return;
        if (res.status === 'success' && res.data) {
          setVerifyData(res.data as CrossVerifyData);
          setPubError(null);
        } else {
          setVerifyData(null);
          setPubError(res.message || '검색 결과를 찾을 수 없습니다.');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVerifyData(null);
          setPubError('검증 API 연결에 실패했습니다.');
        }
      })
      .finally(() => {
        if (!cancelled) setPubLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeQuery]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) setActiveQuery(query.trim());
  };

  return (
    <main className="min-h-screen bg-blue-tint">
      <div className="bg-white border-b border-gray-100 sticky z-40 shadow-sm" style={{ top: 'var(--mkt-chrome-total)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-xl transition-all flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-10 pr-20 py-2.5 text-sm border border-gray-200 rounded-2xl focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 bg-gray-50 focus:bg-white transition-all"
                  style={{ letterSpacing: '-0.01em' }}
                />
                <button type="submit" className="absolute right-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-xl transition-colors">
                  검색
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-3 mb-5 px-1">
          <div className="w-8 h-8 rounded-2xl bg-primary-100 flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-gray-900 font-bold text-sm" style={{ letterSpacing: '-0.02em' }}>VLUE 통합 교차검증</h2>
            <SearchVerifySourceList compact />
          </div>
          {verifyData ? (
            <span className={`sv-header-pill${verifyData.is_registered ? ' sv-header-pill--premium' : ''}`}>
              {verifyData.is_registered ? 'PREMIUM' : '요약본'}
            </span>
          ) : null}
        </div>

        {pubLoading ? (
          <div className="mkt-search-loading">
            <Loader2 className="w-8 h-8 text-primary-400 mx-auto mb-3 animate-spin" />
            <p className="text-gray-500 text-sm font-medium">통합 교차검증 데이터를 조회 중…</p>
            <div className="mt-2 flex justify-center">
              <SearchVerifySourceList compact />
            </div>
          </div>
        ) : verifyData ? (
          <SearchVerifyCrossTabs key={`${activeQuery}-${verifyData.is_registered}`} data={verifyData} />
        ) : (
          <div className="mkt-search-empty">
            <AlertCircle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">{pubError || '검색 결과를 찾을 수 없습니다.'}</p>
          </div>
        )}
      </div>
    </main>
  );
}
