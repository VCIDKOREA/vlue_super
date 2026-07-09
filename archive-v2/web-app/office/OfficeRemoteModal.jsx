import { useCallback, useEffect, useState } from "react";
import VaultSavedFileRow from "../VaultSavedFileRow.jsx";
import { fetchOfficeFiles } from "../../lib/vlueOfficeApi.js";
import { mapOfficeFilesForUi } from "../../lib/vlueAssetFilesStorage.js";

export default function OfficeRemoteModal({ open, onClose, onToast, isDarkMode = false }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOfficeFiles();
      setFiles(mapOfficeFilesForUi(data.files || []));
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[125] flex items-end justify-center bg-black/40 p-3 sm:items-center"
      onMouseDown={onClose}
    >
      <div
        className={`flex h-[min(68vh,520px)] w-full max-w-md flex-col overflow-hidden rounded-t-3xl shadow-2xl sm:rounded-3xl ${
          isDarkMode ? "bg-[#111827]" : "bg-slate-50"
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200/80 px-4 py-3">
          <div>
            <h4 className={`text-[16px] font-black ${isDarkMode ? "text-gray-100" : "text-slate-900"}`}>
              복합기 리모컨
            </h4>
            <p className={`text-[11px] ${isDarkMode ? "text-gray-400" : "text-slate-500"}`}>
              내 문서 파일 · 인쇄 · 팩스
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${
              isDarkMode ? "bg-white/10 text-gray-300" : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            닫기
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="py-10 text-center text-[12px] text-slate-400">불러오는 중…</p>
          ) : files.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-4 py-10 text-center text-[12px] text-slate-500">
              저장된 문서가 없습니다. VLUE로 보낸 파일이 내 문서에 모입니다.
            </p>
          ) : (
            <ul className="space-y-2">
              {files.map((f) => (
                <VaultSavedFileRow key={f.id || f.name} file={f} isDarkMode={isDarkMode} onToast={onToast} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
