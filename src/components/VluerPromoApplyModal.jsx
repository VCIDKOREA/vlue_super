import { useEffect, useMemo, useState } from "react";
import { postVluerPromoApply } from "../lib/vluerPromoApplyApi.js";
import { isValidPromoUrl } from "../lib/promoUrlValidate.js";

const MAX_LINKS = 5;

export default function VluerPromoApplyModal({ open, onClose, onSubmitted, onToast }) {
  const [links, setLinks] = useState([""]);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLinks([""]);
    setTouched(false);
    setBusy(false);
  }, [open]);

  const trimmed = useMemo(() => links.map((v) => String(v || "").trim()), [links]);
  const validLinks = useMemo(() => trimmed.filter((v) => isValidPromoUrl(v)), [trimmed]);
  const hasInvalidFilled = useMemo(
    () => trimmed.some((v) => v.length > 0 && !isValidPromoUrl(v)),
    [trimmed]
  );
  const canSubmit = validLinks.length > 0 && !hasInvalidFilled && !busy;

  if (!open) return null;

  const updateLink = (index, value) => {
    setLinks((prev) => prev.map((row, i) => (i === index ? value : row)));
  };

  const addLink = () => {
    if (links.length >= MAX_LINKS) return;
    setLinks((prev) => [...prev, ""]);
  };

  const submit = async () => {
    setTouched(true);
    if (!canSubmit) return;
    setBusy(true);
    try {
      const data = await postVluerPromoApply({ links: validLinks });
      onToast?.(data.message || "신청이 접수되었습니다.");
      onSubmitted?.();
      onClose?.();
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "신청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[160] flex items-end justify-center bg-black/45 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <button type="button" className="absolute inset-0" aria-label="닫기" onClick={onClose} />
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 className="text-[15px] font-black text-slate-900">홍보 VLUER 신청</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
          SNS·유튜브·틱톡 계정 링크를 등록해 주세요. 확인 후 고유 추천 코드가 발급됩니다.
        </p>
        <div className="mt-3 space-y-2">
          {links.map((value, index) => (
            <input
              key={`promo-link-${index}`}
              value={value}
              onChange={(e) => updateLink(index, e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="https:// 계정 주소"
              className={`w-full rounded-xl border px-3 py-2.5 text-[13px] ${
                touched && value.trim() && !isValidPromoUrl(value)
                  ? "border-red-300 ring-1 ring-red-200"
                  : "border-slate-200"
              }`}
            />
          ))}
          {links.length < MAX_LINKS ? (
            <button
              type="button"
              onClick={addLink}
              className="w-full rounded-xl border border-dashed border-slate-300 py-2 text-[12px] font-bold text-slate-600"
            >
              + 추가
            </button>
          ) : null}
          {touched && hasInvalidFilled ? (
            <p className="text-[11px] font-semibold text-red-600">정확한 주소를 입력하세요</p>
          ) : null}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-[13px] font-bold text-slate-600"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={submit}
            className="flex-1 rounded-xl bg-violet-600 py-2.5 text-[13px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "접수 중…" : "신청하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
