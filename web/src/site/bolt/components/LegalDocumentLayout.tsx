import { ArrowLeft } from 'lucide-react';

export interface LegalArticle {
  id: number;
  title: string;
  paragraphs?: string[];
  dangerBlocks?: string[];
}

interface LegalDocumentLayoutProps {
  title: string;
  version: string;
  articles: LegalArticle[];
  onBack: () => void;
}

export default function LegalDocumentLayout({
  title,
  version,
  articles,
  onBack,
}: LegalDocumentLayoutProps) {
  return (
    <main className="min-h-screen bg-blue-tint pt-[60px] pb-16">
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            돌아가기
          </button>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">시행 버전: {version}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <article className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-8 shadow-sm text-slate-800 leading-relaxed">
          {articles.map((art) => (
            <section key={art.id} className="mb-8 last:mb-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900">{art.title}</h2>
              {art.paragraphs?.map((p, i) => (
                <p key={i} className="mt-3 text-sm sm:text-[15px] text-slate-700">
                  {p}
                </p>
              ))}
              {art.dangerBlocks?.map((p, i) => (
                <p key={i} className="mt-3 text-sm font-semibold text-amber-900/90">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </article>
      </div>
    </main>
  );
}
