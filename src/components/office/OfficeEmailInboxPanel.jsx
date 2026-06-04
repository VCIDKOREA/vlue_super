import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchOfficeEmailInbox } from "../../lib/vlueOfficeApi.js";
import { OFFICE_EMAIL_INBOX_CHANGED } from "../../lib/vlueAssetFilesStorage.js";

function formatWhen(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function OfficeEmailInboxPanel({ vaultFiles = [], onSelectAttachment, onToast }) {
  const [inbox, setInbox] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState("");

  const fileById = useMemo(() => {
    const m = new Map();
    for (const f of vaultFiles) {
      if (f.id) m.set(f.id, f);
    }
    return m;
  }, [vaultFiles]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOfficeEmailInbox();
      setInbox(data.inbox || []);
    } catch {
      setInbox([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onChanged = () => refresh();
    window.addEventListener(OFFICE_EMAIL_INBOX_CHANGED, onChanged);
    const t = window.setInterval(refresh, 12000);
    return () => {
      window.removeEventListener(OFFICE_EMAIL_INBOX_CHANGED, onChanged);
      window.clearInterval(t);
    };
  }, [refresh]);

  const pickAttachment = (assetId, label) => {
    const file = fileById.get(assetId);
    if (file) {
      onSelectAttachment?.(file);
      onToast?.(`「${label || file.name}」 — 프린트/팩스 리모컨에 연결`);
      return;
    }
    onToast?.("자료실 동기화 중입니다. 잠시 후 다시 시도하세요.");
  };

  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-black text-slate-900">@vlue.kr 수신함</p>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="rounded-lg px-2 py-1 text-[11px] font-bold text-blue-600 disabled:opacity-50"
        >
          {loading ? "…" : "새로고침"}
        </button>
      </div>
      {inbox.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-[12px] text-slate-500">
          수신 메일이 없습니다. Cloudflare 라우팅 또는 시뮬레이터로 테스트하세요.
        </p>
      ) : (
        <ul className="max-h-52 space-y-2 overflow-y-auto">
          {inbox.map((row) => {
            const ids = row.attachmentAssetIds || [];
            const names = row.attachmentNames || [];
            const open = expandedId === row.id;
            return (
              <li key={row.id} className="rounded-xl border border-slate-100 bg-slate-50/80 p-2">
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? "" : row.id)}
                  className="w-full text-left"
                >
                  <p className="truncate text-[12px] font-bold text-slate-900">{row.subject || "(제목 없음)"}</p>
                  <p className="mt-0.5 truncate text-[10px] text-slate-500">
                    {row.fromAddress} · {formatWhen(row.createdAt)}
                  </p>
                  {ids.length > 0 ? (
                    <p className="mt-1 text-[10px] font-semibold text-blue-600">첨부 {ids.length}건</p>
                  ) : null}
                </button>
                {open && ids.length > 0 ? (
                  <div className="mt-2 space-y-1 border-t border-slate-200/80 pt-2">
                    {ids.map((aid, i) => (
                      <button
                        key={`${row.id}-${aid}`}
                        type="button"
                        onClick={() => pickAttachment(aid, names[i])}
                        className="flex w-full items-center justify-between rounded-lg bg-white px-2 py-2 text-left ring-1 ring-slate-100 active:bg-blue-50"
                      >
                        <span className="min-w-0 truncate text-[11px] font-semibold text-slate-800">
                          {names[i] || "첨부파일"}
                        </span>
                        <span className="shrink-0 text-[10px] font-bold text-blue-600">리모컨 →</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
