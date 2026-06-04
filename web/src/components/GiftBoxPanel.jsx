import { useCallback, useEffect, useMemo, useState } from "react";
import ModalCloseButton from "./common/ModalCloseButton";
import {
  countAvailableGifts,
  countExpiringSoon,
  readGiftBox,
  writeGiftBox
} from "../lib/giftBoxStorage.js";

const FILTERS = [
  { id: "all", label: "전체" },
  { id: "available", label: "사용 가능" },
  { id: "used", label: "사용 완료" },
  { id: "expired", label: "만료" }
];

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function kindEmoji(kind) {
  if (kind === "product") return "📦";
  if (kind === "voucher") return "🎫";
  return "🎟️";
}

function statusLabel(status) {
  if (status === "used") return "사용 완료";
  if (status === "expired") return "만료";
  return "사용 가능";
}

function statusTone(status, isDarkMode) {
  if (status === "available") {
    return isDarkMode ? "bg-rose-500/20 text-rose-200" : "bg-rose-50 text-rose-700";
  }
  if (status === "used") {
    return isDarkMode ? "bg-slate-500/20 text-slate-300" : "bg-slate-100 text-slate-600";
  }
  return isDarkMode ? "bg-amber-500/15 text-amber-200" : "bg-amber-50 text-amber-800";
}

export default function GiftBoxPanel({ isDarkMode = false, onToast }) {
  const [items, setItems] = useState(() => readGiftBox());
  const [filter, setFilter] = useState("all");
  const [detailId, setDetailId] = useState("");

  const sync = useCallback(() => setItems(readGiftBox()), []);

  useEffect(() => {
    sync();
    window.addEventListener("vlue-gift-box-changed", sync);
    return () => window.removeEventListener("vlue-gift-box-changed", sync);
  }, [sync]);

  const availableCount = useMemo(() => countAvailableGifts(items), [items]);
  const expiringSoon = useMemo(() => countExpiringSoon(items), [items]);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((g) => g.status === filter);
  }, [items, filter]);

  const detail = useMemo(() => items.find((g) => g.id === detailId) || null, [items, detailId]);

  const panel = isDarkMode ? "border-white/10 bg-[#151821]" : "border-gray-100 bg-white";
  const subPanel = isDarkMode ? "border-white/10 bg-[#10131b]" : "border-gray-50 bg-white";
  const textStrong = isDarkMode ? "text-gray-100" : "text-gray-900";
  const textSub = isDarkMode ? "text-gray-400" : "text-gray-500";

  const markUsed = (id) => {
    const next = items.map((g) => (g.id === id && g.status === "available" ? { ...g, status: "used" } : g));
    writeGiftBox(next);
    setItems(next);
    onToast?.("선물을 사용 처리했습니다. 매장·라이브 결제 시 적용해 주세요.");
    setDetailId("");
  };

  return (
    <div className="space-y-2.5">
      <div className={`rounded-2xl border p-3 shadow-sm ${panel}`}>
        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl ${
              isDarkMode ? "bg-rose-500/20" : "bg-gradient-to-br from-rose-100 to-pink-100"
            }`}
          >
            🎁
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? "text-rose-300" : "text-rose-600"}`}>
              VLUE 선물함
            </p>
            <h2 className={`mt-0.5 text-[17px] font-black ${textStrong}`}>받은 선물 · 쿠폰</h2>
            <p className={`mt-1.5 text-[12px] leading-relaxed ${textSub}`}>
              라이브·입점 스토어·이벤트에서 받은 혜택을 모아 둡니다. 명함 지갑과는 별도로 관리됩니다.
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className={`rounded-xl border px-3 py-2.5 ${subPanel}`}>
            <p className={`text-[10px] font-bold ${textSub}`}>사용 가능</p>
            <p className={`mt-0.5 text-[20px] font-black ${isDarkMode ? "text-red-400" : "text-red-500"}`}>{availableCount}</p>
          </div>
          <div className={`rounded-xl border px-3 py-2.5 ${subPanel}`}>
            <p className={`text-[10px] font-bold ${textSub}`}>7일 내 만료</p>
            <p className={`mt-0.5 text-[20px] font-black ${isDarkMode ? "text-red-400" : "text-red-500"}`}>{expiringSoon}</p>
          </div>
        </div>
      </div>

      <div className="vlue-tab-strip overflow-x-auto pb-0.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`shrink-0 rounded-full font-black transition ${
              filter === f.id
                ? isDarkMode
                  ? "bg-rose-500/30 text-rose-100"
                  : "bg-rose-600 text-white"
                : isDarkMode
                  ? "bg-white/10 text-gray-400"
                  : "bg-white text-gray-600 shadow-sm border border-gray-100"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((gift) => (
          <article
            key={gift.id}
            className={`rounded-2xl border p-3 shadow-sm ${panel}`}
          >
            <div className="flex gap-3">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[22px] ${
                  isDarkMode ? "bg-white/5" : "bg-rose-50"
                }`}
              >
                {kindEmoji(gift.kind)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${statusTone(gift.status, isDarkMode)}`}>
                    {statusLabel(gift.status)}
                  </span>
                  {gift.valueLabel ? (
                    <span className={`text-[10px] font-bold ${textSub}`}>{gift.valueLabel}</span>
                  ) : null}
                </div>
                <h3 className={`mt-1 line-clamp-2 text-[14px] font-black leading-snug ${textStrong}`}>{gift.title}</h3>
                <p className={`mt-0.5 text-[11px] ${textSub}`}>
                  from {gift.fromLabel}
                  {gift.storeName && gift.storeName !== gift.fromLabel ? ` · ${gift.storeName}` : ""}
                </p>
                <p className={`mt-1 text-[10px] ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                  받은 날 {formatDate(gift.receivedAt)} · 만료 {formatDate(gift.expiresAt)}
                </p>
              </div>
            </div>
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                onClick={() => setDetailId(gift.id)}
                className={`flex-1 rounded-lg border py-2 text-[11px] font-black ${
                  isDarkMode ? "border-white/15 text-gray-200" : "border-gray-200 text-gray-700"
                }`}
              >
                상세
              </button>
              <button
                type="button"
                disabled={gift.status !== "available"}
                onClick={() => markUsed(gift.id)}
                className="flex-1 rounded-lg bg-rose-600 py-2 text-[11px] font-black text-white disabled:opacity-35"
              >
                사용하기
              </button>
            </div>
          </article>
        ))}
        {filtered.length === 0 && (
          <p className={`rounded-2xl border border-dashed py-10 text-center text-[12px] ${textSub} ${panel}`}>
            해당 조건의 선물이 없습니다.
          </p>
        )}
      </div>

      {detail ? (
        <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/45 p-4 sm:items-center" onMouseDown={() => setDetailId("")}>
          <div
            className={`relative w-full max-w-md rounded-2xl border p-4 pt-12 shadow-2xl ${panel}`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <ModalCloseButton variant="default" onClick={() => setDetailId("")} />
            <h3 className={`text-[16px] font-black ${textStrong}`}>{detail.title}</h3>
            <p className={`mt-2 text-[12px] ${textSub}`}>보낸 곳: {detail.fromLabel}</p>
            {detail.note ? <p className={`mt-2 rounded-lg px-3 py-2 text-[12px] ${isDarkMode ? "bg-white/5 text-gray-300" : "bg-gray-50 text-gray-700"}`}>{detail.note}</p> : null}
            <p className={`mt-3 text-[11px] ${textSub}`}>
              만료일 {formatDate(detail.expiresAt)} · {statusLabel(detail.status)}
            </p>
            {detail.status === "available" ? (
              <button
                type="button"
                onClick={() => markUsed(detail.id)}
                className="mt-4 w-full rounded-xl bg-rose-600 py-2.5 text-[13px] font-black text-white"
              >
                사용하기
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
