import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ServiceAccordionItem } from '../data/serviceIntroContent';

type Props = {
  items: ServiceAccordionItem[];
  /** 동시에 여러 항목 펼침 허용 */
  allowMultiple?: boolean;
  className?: string;
  /** 외부에서 특정 항목 펼침 (기능 찾기 연동) */
  forceOpenId?: string | null;
};

function DetailBody({ detail }: { detail: string | string[] }) {
  if (typeof detail === 'string') {
    return <p className="mkt-desc text-slate-700">{detail}</p>;
  }
  return (
    <ul className="space-y-2">
      {detail.map((line) => (
        <li key={line} className="flex gap-2 mkt-desc text-slate-700">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" aria-hidden />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}

export default function ServiceAccordion({ items, allowMultiple = true, className = '', forceOpenId }: Props) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!forceOpenId) return;
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.add(forceOpenId);
      return next;
    });
  }, [forceOpenId]);

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      if (!allowMultiple) return new Set([id]);
      next.add(id);
      return next;
    });
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {items.map((item) => {
        const open = openIds.has(item.id);
        return (
          <div
            key={item.id}
            className={`rounded-2xl border bg-white transition-colors ${
              open ? 'border-primary-200 shadow-sm' : 'border-slate-200/90'
            }`}
          >
            <button
              type="button"
              onClick={() => toggle(item.id)}
              aria-expanded={open}
              className="flex w-full items-start gap-3 px-4 py-3.5 text-left sm:px-5 sm:py-4"
            >
              <div className="min-w-0 flex-1">
                <p className="mkt-card-title leading-snug">{item.title}</p>
                <p className="mt-1.5 mkt-desc text-slate-600">{item.summary}</p>
              </div>
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  open ? 'bg-primary-50 text-primary-600' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </span>
            </button>
            {open ? (
              <div className="border-t border-slate-100 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
                <DetailBody detail={item.detail} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
