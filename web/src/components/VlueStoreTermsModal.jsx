import { VLUE_STORE_FEE_SUMMARY, VLUE_STORE_SELLER_TERMS } from "../legal/vlueStoreSellerTerms.js";

export default function VlueStoreTermsModal({ open, onClose, onAgree }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-end justify-center bg-slate-900/55 p-3 sm:items-center" role="dialog" aria-modal="true">
      <div className="flex max-h-[min(88vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-4 py-3">
          <p className="text-[16px] font-black text-slate-900">상점 입점 · 판매 약관</p>
          <p className="mt-1 rounded-lg bg-amber-50 px-2.5 py-2 text-[12px] font-bold leading-snug text-amber-950">
            수수료: {VLUE_STORE_FEE_SUMMARY}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 text-[12px] leading-relaxed text-slate-700">
          {VLUE_STORE_SELLER_TERMS.map((art) => (
            <div key={art.title} className="mb-4 last:mb-0">
              <p className="text-[13px] font-black text-slate-900">{art.title}</p>
              <p className="mt-1">{art.body}</p>
            </div>
          ))}
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600">
            승인 후 등록 상품은 앱 내 결제로 판매되며, 정산 시 PG 수수료(VAT 별도)와 판매 수수료 3.3%(VAT 별도)가 각각 적용됩니다.
          </p>
        </div>
        <div className="flex gap-2 border-t border-slate-100 p-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-[13px] font-bold text-slate-700"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={onAgree}
            className="flex-1 rounded-xl bg-blue-600 py-2.5 text-[13px] font-black text-white"
          >
            동의하고 신청 계속
          </button>
        </div>
      </div>
    </div>
  );
}
