import { useCallback, useEffect, useState } from "react";
import { downloadFraudEvidenceSecure, fetchFraudEvidenceList } from "../../lib/fraudApi.js";

export default function SecurityVaultPanel({ open, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchFraudEvidenceList();
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setItems([]);
      setNotice("보안함 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setNotice("");
    load();
  }, [open, load]);

  const onDownload = async (item) => {
    try {
      setBusyId(item.reportId);
      setNotice("");
      const data = await downloadFraudEvidenceSecure(item);
      const blob = new Blob([data.html || ""], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.fileName || `VLUE_증거_${item.certificationId}.html`;
      a.click();
      URL.revokeObjectURL(url);
      setNotice("해시 검증 완료 · 증거 패키지를 다운로드했습니다.");
    } catch (e) {
      setNotice(e?.message || "다운로드에 실패했습니다. 해시 검증을 확인해 주세요.");
    } finally {
      setBusyId("");
      setTimeout(() => setNotice(""), 3200);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/50 p-3 sm:items-center">
      <button type="button" className="absolute inset-0" aria-label="닫기" onClick={onClose} />
      <div className="relative z-[1] flex max-h-[min(82vh,560px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#2f3440] bg-[#151922] shadow-2xl">
        <div className="border-b border-red-900/40 bg-gradient-to-r from-[#1a1d24] to-[#2a1218] px-4 py-3">
          <p className="text-[15px] font-black text-red-100">🛡️ 마이페이지 보안함</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
            법적 무결성 증거 패키지는 본인 계정에만 격리 보관됩니다. 다운로드 전 SHA-256·블록체인 해시 검증이
            필수입니다.
          </p>
        </div>
        <div className="vlue-scroll-pad-bottom-nav flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <p className="text-center text-[12px] text-slate-400">목록 조회 중...</p>
          ) : items.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-4 text-center text-[12px] text-slate-400">
              격리 보관된 증거 패키지가 없습니다.
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.reportId}
                  className="rounded-xl border border-red-500/25 bg-[#1c1f28] px-3 py-2.5"
                >
                  <p className="text-[12px] font-black text-red-100">{item.certificationId}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    방 ID: {item.roomId} · {new Date(item.createdAt).toLocaleString("ko-KR")}
                  </p>
                  <p className="mt-1 break-all font-mono text-[9px] text-slate-500">{item.blockchainHash}</p>
                  <button
                    type="button"
                    disabled={busyId === item.reportId}
                    onClick={() => onDownload(item)}
                    className="mt-2 w-full rounded-lg border border-red-400/40 bg-red-950/50 py-2 text-[11px] font-black text-red-100 disabled:opacity-50"
                  >
                    {busyId === item.reportId ? "해시 검증 중..." : "해시 검증 후 다운로드"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {notice ? (
          <p className="border-t border-white/10 px-4 py-2 text-center text-[11px] font-semibold text-amber-200">
            {notice}
          </p>
        ) : null}
        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-slate-700 py-2.5 text-[13px] font-bold text-white"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
