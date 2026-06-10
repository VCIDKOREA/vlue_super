import { useState } from "react";
import { remoteVaultFile, shareVaultFile } from "../lib/vaultFileActions.js";

export default function VaultSavedFileRow({ file, isDarkMode = false, onToast }) {
  const [busy, setBusy] = useState("");

  const runShare = async () => {
    setBusy("share");
    try {
      const r = await shareVaultFile(file);
      if (r.cancelled) return;
      if (r.method === "clipboard") onToast?.("링크를 복사했습니다.");
      else if (r.method === "share") onToast?.("공유 메뉴를 열었습니다.");
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "공유에 실패했습니다.");
    } finally {
      setBusy("");
    }
  };

  const runRemote = async (action) => {
    setBusy(action);
    try {
      const data = await remoteVaultFile(file, action);
      onToast?.(`${action === "fax" ? "팩스" : "인쇄"} 요청 · ${data.job?.status || "접수"}`);
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "요청에 실패했습니다.");
    } finally {
      setBusy("");
    }
  };

  const btnBase =
    "flex-1 rounded-lg py-2 text-[11px] font-black transition active:scale-[0.98] disabled:opacity-40";
  const btnGhost = isDarkMode
    ? "bg-white/10 text-gray-200"
    : "bg-slate-100 text-slate-700";
  const btnPrint = "bg-blue-600 text-white";
  const btnFax = isDarkMode
    ? "border border-white/20 bg-white/5 text-gray-200"
    : "border border-slate-300 bg-white text-slate-700";

  return (
    <li
      className={`rounded-xl px-3 py-3 ring-1 ${
        isDarkMode ? "bg-white/5 ring-white/10" : "bg-white ring-slate-100"
      }`}
    >
      <p className={`truncate text-[13px] font-bold ${isDarkMode ? "text-gray-100" : "text-slate-900"}`}>
        {file.name}
      </p>
      <div className="mt-2.5 flex gap-1.5">
        <button
          type="button"
          disabled={Boolean(busy) || !file.fileUrl}
          onClick={runShare}
          className={`${btnBase} ${btnGhost}`}
        >
          {busy === "share" ? "…" : "공유"}
        </button>
        <button
          type="button"
          disabled={Boolean(busy) || !file.id}
          onClick={() => runRemote("print")}
          className={`${btnBase} ${btnPrint}`}
        >
          {busy === "print" ? "…" : "인쇄"}
        </button>
        <button
          type="button"
          disabled={Boolean(busy) || !file.id}
          onClick={() => runRemote("fax")}
          className={`${btnBase} ${btnFax}`}
        >
          {busy === "fax" ? "…" : "팩스"}
        </button>
      </div>
    </li>
  );
}
