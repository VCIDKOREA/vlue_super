import { useCallback, useEffect, useMemo, useState } from "react";
import { addVaultItem, fetchVaultItems } from "../../lib/vlueCoreShoppingApi.js";
import { emitVaultChanged, parseVaultPayload, VAULT_CHANGED } from "../../lib/shoppingCoreStorage.js";

function formatKrw(n) {
  if (!n) return "";
  return `${Number(n).toLocaleString("ko-KR")}원`;
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default function PartnershipVaultScreen({ onToast, isDarkMode = false, compact = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const panel = isDarkMode ? "border-white/10 bg-[#151821]" : "border-slate-200 bg-white";
  const textStrong = isDarkMode ? "text-gray-100" : "text-slate-900";
  const textSub = isDarkMode ? "text-gray-400" : "text-slate-500";

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchVaultItems();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "보관함을 불러오지 못했습니다.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener(VAULT_CHANGED, onChange);
    return () => window.removeEventListener(VAULT_CHANGED, onChange);
  }, [refresh]);

  const productItems = useMemo(
    () => items.filter((row) => String(row.kind || "product") !== "order"),
    [items]
  );
  const orderItems = useMemo(() => items.filter((row) => String(row.kind) === "order"), [items]);

  const renderCard = (row) => {
    const payload = parseVaultPayload(row);
    const img = payload.imageUrl || "";
    const price = payload.priceKrw;
    const created = row.created_at || row.createdAt;

    return (
      <article key={row.id} className={`flex gap-3 rounded-2xl border p-3 ${panel}`}>
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
          {img ? <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`line-clamp-2 text-[14px] font-black ${textStrong}`}>{row.title}</p>
          {payload.platform ? (
            <p className={`mt-0.5 text-[11px] ${textSub}`}>{payload.platform}</p>
          ) : null}
          {price ? <p className="mt-1 text-[14px] font-black text-rose-600">{formatKrw(price)}</p> : null}
          <p className={`mt-1 text-[10px] ${textSub}`}>{formatDate(created)}</p>
        </div>
      </article>
    );
  };

  return (
    <div className={compact ? "" : "min-h-0 flex-1"}>
      {!compact ? (
        <div className={`border-b px-3 py-3 ${isDarkMode ? "border-white/10" : "border-slate-200"}`}>
          <h1 className={`text-[16px] font-black ${textStrong}`}>파트너십 보관함</h1>
        </div>
      ) : null}

      <div className={`space-y-3 ${compact ? "px-1 py-2" : "mx-auto max-w-lg px-3 py-4"}`}>
        {loading ? <p className={`py-8 text-center text-[12px] ${textSub}`}>불러오는 중…</p> : null}
        {error ? <p className="text-[12px] text-rose-600">{error}</p> : null}
        {!loading && productItems.length === 0 && orderItems.length === 0 ? (
          <p className={`py-10 text-center text-[12px] ${textSub}`}>보관함이 비어 있습니다.</p>
        ) : null}
        {productItems.length > 0 ? (
          <section className="space-y-2">
            <p className={`text-[12px] font-black ${textStrong}`}>찜 · 소싱</p>
            {productItems.map(renderCard)}
          </section>
        ) : null}
        {orderItems.length > 0 ? (
          <section className="space-y-2">
            <p className={`text-[12px] font-black ${textStrong}`}>결제 · 공구</p>
            {orderItems.map(renderCard)}
          </section>
        ) : null}
        <button type="button" onClick={refresh} className="w-full rounded-xl border py-2 text-[12px] font-bold">
          새로고침
        </button>
      </div>
    </div>
  );
}
