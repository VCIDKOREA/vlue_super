import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchOfficeEmailInbox, fetchOfficeEmailSent, fetchOfficeFiles } from "../../lib/vlueOfficeApi.js";
import {
  ASSET_FILES_CHANGED,
  mapOfficeFilesForUi,
  OFFICE_EMAIL_INBOX_CHANGED
} from "../../lib/vlueAssetFilesStorage.js";
import { getChatDisplayName } from "../../lib/memberCardStorage.js";
import { readAvatar } from "../../lib/vlueAvatar.js";
import OfficeRemotePanel from "./OfficeRemotePanel.jsx";
import BackButton from "../common/BackButton";

function readVlueMailAddress() {
  try {
    const uid = localStorage.getItem("vlue_server_user_id")?.trim();
    if (uid) return `${uid}@vlue.kr`;
  } catch {
    /* ignore */
  }
  return "user@vlue.kr";
}

function formatWhen(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return iso;
  }
}

function previewBody(text, max = 120) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  if (!s) return "(본문 없음)";
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function hasAttachments(row) {
  return (row.attachmentAssetIds || []).length > 0;
}

function matchSmartFolder(row, folderId) {
  const subj = String(row.subject || "").toLowerCase();
  const names = (row.attachmentNames || []).join(" ").toLowerCase();
  if (folderId === "bills") {
    return /청구|계약|invoice|견적|세금/.test(subj) || /청구|계약/.test(names);
  }
  if (folderId === "scan") {
    return names.includes("[메일수신]") || /스캔|scan/.test(subj);
  }
  if (folderId === "ppt") {
    return /\.pptx?|ai ppt|\[ai ppt\]/i.test(names) || /ppt|슬라이드/.test(subj);
  }
  return true;
}

function NavItem({ active, label, count, onClick, indent }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold transition-colors ${
        active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
      } ${indent ? "pl-6" : ""}`}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count != null && count > 0 ? (
        <span className="shrink-0 rounded-md bg-blue-600 px-1.5 py-0.5 text-[10px] font-black text-white">
          {count}
        </span>
      ) : null}
    </button>
  );
}

function QuickChip({ active, label, value, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-[72px] flex-col items-center rounded-xl border px-2 py-2 transition-colors ${
        active ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-100 bg-white text-slate-600"
      }`}
    >
      <span className="text-[15px] font-black tabular-nums">{value}</span>
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}

function MailList({ rows, expandedId, onOpen, onFocusAttach, emptyLabel }) {
  if (!rows.length) {
    return (
      <p className="rounded-2xl bg-white px-4 py-16 text-center text-[13px] text-slate-500 ring-1 ring-slate-100">
        {emptyLabel}
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {rows.map((row) => {
        const ids = row.attachmentAssetIds || [];
        const names = row.attachmentNames || [];
        const attach = ids.length > 0;
        const openRow = expandedId === row.id;
        return (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => onOpen(row)}
              className={`w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition-colors ${
                openRow ? "border-blue-300 ring-2 ring-blue-100" : "border-slate-200 active:bg-blue-50/30"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 truncate text-[12px] font-semibold text-blue-600">
                  {row.fromAddress || row.toAddress}
                </p>
                <span className="shrink-0 text-[10px] text-slate-400">{formatWhen(row.createdAt)}</span>
              </div>
              <p className="mt-1 text-[14px] font-black text-slate-900">{row.subject || "(제목 없음)"}</p>
              <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-slate-600">
                {previewBody(row.bodyText)}
              </p>
              {attach ? (
                <span className="mt-2 inline-flex rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">
                  📎 첨부파일 · 자료실 연동
                </span>
              ) : null}
            </button>
            {openRow && attach ? (
              <div className="mt-2 space-y-1.5 px-1">
                {ids.map((aid, i) => (
                  <button
                    key={`${row.id}-${aid}`}
                    type="button"
                    onClick={() => onFocusAttach(aid, names[i])}
                    className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-2 ring-1 ring-blue-100 active:bg-blue-50"
                  >
                    <span className="truncate text-[12px] font-semibold text-slate-800">
                      {names[i] || "첨부파일"}
                    </span>
                    <span className="shrink-0 text-[10px] font-bold text-blue-600">프린트/팩스 →</span>
                  </button>
                ))}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function SentTable({ rows, emptyLabel }) {
  if (!rows.length) {
    return (
      <p className="rounded-2xl bg-white px-4 py-16 text-center text-[13px] text-slate-500 ring-1 ring-slate-100">
        {emptyLabel}
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-[1.2fr_1fr_auto] gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
        <span>제목</span>
        <span>수신처</span>
        <span>상태</span>
      </div>
      <ul>
        {rows.map((row) => {
          const ok = row.status === "SUCCESS";
          return (
            <li
              key={row.id}
              className="grid grid-cols-[1.2fr_1fr_auto] gap-2 border-b border-slate-50 px-3 py-3 text-[12px] last:border-0"
            >
              <span className="min-w-0 truncate font-semibold text-slate-900">{row.subject}</span>
              <span className="min-w-0 truncate text-slate-600">{row.toAddress}</span>
              <span
                className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-black ${
                  ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                }`}
              >
                {ok ? "성공" : "실패"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function VlueEmailInboxScreen({ open, onClose, onToast, onOpenProfileSettings }) {
  const [folder, setFolder] = useState("inbox");
  const [quickFilter, setQuickFilter] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inbox, setInbox] = useState([]);
  const [sent, setSent] = useState([]);
  const [vaultFiles, setVaultFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState("");
  const [remoteFocusFileId, setRemoteFocusFileId] = useState("");
  const [showRemote, setShowRemote] = useState(false);
  const [avatarTick, setAvatarTick] = useState(0);
  const [nickTick, setNickTick] = useState(0);

  const mailAddress = useMemo(() => readVlueMailAddress(), [open]);
  const displayName = useMemo(() => getChatDisplayName(), [open, nickTick]);
  const primaryAvatar = useMemo(() => readAvatar("primary"), [open, avatarTick]);

  const fileById = useMemo(() => {
    const m = new Map();
    for (const f of vaultFiles) {
      if (f.id) m.set(f.id, f);
    }
    return m;
  }, [vaultFiles]);

  const remoteFiles = useMemo(
    () =>
      vaultFiles.filter((f) => {
        if (!f.id || !f.fileUrl) return false;
        const ct = String(f.contentType || "").toLowerCase();
        const name = String(f.name || "").toLowerCase();
        return ct.includes("pdf") || ct.includes("presentation") || ct.includes("ppt") || /\.(pdf|pptx?)$/i.test(name);
      }),
    [vaultFiles]
  );

  const stats = useMemo(() => {
    const withAttach = inbox.filter(hasAttachments).length;
    return {
      inboxTotal: inbox.length,
      attach: withAttach,
      sent: sent.length,
      vaultFiles: vaultFiles.length
    };
  }, [inbox, sent, vaultFiles]);

  const filteredInbox = useMemo(() => {
    let rows = [...inbox];
    if (folder === "vault") rows = rows.filter(hasAttachments);
    else if (folder === "bills" || folder === "scan" || folder === "ppt") {
      rows = rows.filter((r) => matchSmartFolder(r, folder));
    }
    if (quickFilter === "attach") rows = rows.filter(hasAttachments);
    return rows;
  }, [inbox, folder, quickFilter]);

  const folderTitle = useMemo(() => {
    const map = {
      all: "전체 메일",
      inbox: "받은 메일함",
      sent: "보낸 메일함",
      vault: "자료실 자동 인입",
      bills: "청구·계약서",
      scan: "CS·스캔 연계",
      ppt: "AI PPT 연계"
    };
    return map[folder] || "메일함";
  }, [folder]);

  const refreshVault = useCallback(async () => {
    try {
      const data = await fetchOfficeFiles();
      setVaultFiles(mapOfficeFilesForUi(data.files || []));
    } catch {
      setVaultFiles([]);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [inData, sentData] = await Promise.all([fetchOfficeEmailInbox(), fetchOfficeEmailSent()]);
      setInbox(inData.inbox || []);
      setSent(sentData.sent || []);
    } catch {
      setInbox([]);
      setSent([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onAvatar = () => setAvatarTick((n) => n + 1);
    const onNick = () => setNickTick((n) => n + 1);
    window.addEventListener("vlue-avatar-changed", onAvatar);
    window.addEventListener("vlue-nicknames-changed", onNick);
    return () => {
      window.removeEventListener("vlue-avatar-changed", onAvatar);
      window.removeEventListener("vlue-nicknames-changed", onNick);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    refresh();
    refreshVault();
    const onChanged = () => {
      refresh();
      refreshVault();
    };
    window.addEventListener(OFFICE_EMAIL_INBOX_CHANGED, onChanged);
    window.addEventListener(ASSET_FILES_CHANGED, refreshVault);
    const poll = window.setInterval(refresh, 10000);
    return () => {
      window.removeEventListener(OFFICE_EMAIL_INBOX_CHANGED, onChanged);
      window.removeEventListener(ASSET_FILES_CHANGED, refreshVault);
      window.clearInterval(poll);
    };
  }, [open, refresh, refreshVault]);

  const pickFolder = (id) => {
    setFolder(id);
    setExpandedId("");
    setSidebarOpen(false);
  };

  const focusAttachment = (assetId, label) => {
    const file = fileById.get(assetId);
    if (file) {
      setRemoteFocusFileId(file.id);
      setShowRemote(true);
      onToast?.(`「${label || file.name}」 — 프린트/팩스 리모컨`);
      return;
    }
    onToast?.("자료실 동기화 중입니다.");
    refreshVault();
  };

  const openMail = (row) => {
    setExpandedId((prev) => (prev === row.id ? "" : row.id));
    const ids = row.attachmentAssetIds || [];
    if (ids.length === 1) focusAttachment(ids[0], row.attachmentNames?.[0]);
  };

  const sidebar = (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 p-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100 font-bold text-gray-500">
            {primaryAvatar ? (
              <img src={primaryAvatar} alt="" className="h-full w-full object-cover" />
            ) : displayName ? (
              displayName.slice(0, 1)
            ) : (
              "이"
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="truncate py-[1px] text-[19px] font-normal leading-tight text-gray-900">{displayName}</p>
              <button
                type="button"
                onClick={() => onOpenProfileSettings?.()}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 active:scale-95"
                aria-label="채팅 프로필 설정"
                title="채팅 프로필 설정"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="6" x2="14" y2="6" />
                  <line x1="10" y1="18" x2="20" y2="18" />
                  <circle cx="17" cy="6" r="3" />
                  <circle cx="7" cy="18" r="3" />
                </svg>
              </button>
            </div>
            <p className="truncate text-[11px] font-semibold text-blue-600">{mailAddress}</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <QuickChip
            active={quickFilter === "attach"}
            label="첨부"
            value={stats.attach}
            onClick={() => setQuickFilter((f) => (f === "attach" ? "" : "attach"))}
          />
          <QuickChip
            active={quickFilter === ""}
            label="수신"
            value={stats.inboxTotal}
            onClick={() => setQuickFilter("")}
          />
          <QuickChip active={false} label="자료실" value={stats.vaultFiles} onClick={() => pickFolder("vault")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-b border-slate-100 p-3">
        <button
          type="button"
          onClick={() => onToast?.("메일 작성은 스마트 오피스 PC 웹에서 이용할 수 있습니다.")}
          className="rounded-xl bg-slate-800 py-2.5 text-[12px] font-black text-white active:scale-[0.98]"
        >
          메일 쓰기
        </button>
        <button
          type="button"
          onClick={() => onToast?.("임시 보관함은 준비 중입니다.")}
          className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-[12px] font-bold text-slate-700"
        >
          임시 보관
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto p-2">
        <NavItem active={folder === "all"} label="전체 메일" count={stats.inboxTotal} onClick={() => pickFolder("all")} />
        <NavItem
          active={folder === "inbox"}
          label="받은 메일함"
          count={stats.inboxTotal}
          onClick={() => pickFolder("inbox")}
        />
        <NavItem active={folder === "sent"} label="보낸 메일함" count={stats.sent} onClick={() => pickFolder("sent")} />
        <NavItem
          active={folder === "vault"}
          label="자료실 인입함"
          count={stats.attach}
          onClick={() => pickFolder("vault")}
        />

        <p className="mb-1 mt-4 px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">스마트 오피스</p>
        <NavItem active={folder === "bills"} label="청구·계약서" onClick={() => pickFolder("bills")} indent />
        <NavItem active={folder === "scan"} label="CS·스캔 연계" onClick={() => pickFolder("scan")} indent />
        <NavItem active={folder === "ppt"} label="AI PPT 연계" onClick={() => pickFolder("ppt")} indent />
      </nav>

      <div className="border-t border-slate-100 p-3 text-[11px] text-slate-500">
        <p className="font-semibold text-slate-600">개인 자료실 사용량</p>
        <p className="mt-0.5 font-black text-slate-800">{stats.vaultFiles}개 파일</p>
        <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
          Cloudflare 라우팅 수신 · PC 프린트/팩스 연동
        </p>
      </div>
    </aside>
  );

  if (!open) return null;

  const isSentView = folder === "sent";

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-slate-100">
      <header className="flex shrink-0 items-center gap-1 border-b border-slate-200 bg-white px-2 py-2 pt-[max(8px,env(safe-area-inset-top))] lg:hidden">
        <BackButton variant="inline" onBack={onClose} />
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="rounded-lg border border-slate-200 px-2 py-1.5 text-[12px] font-bold text-slate-700"
        >
          메일함
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-[14px] font-black text-slate-900">{folderTitle}</p>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="rounded-lg px-2 py-1.5 text-[12px] font-bold text-blue-600 disabled:opacity-50"
        >
          {loading ? "…" : "↻"}
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {sidebarOpen ? (
          <button
            type="button"
            aria-label="메뉴 닫기"
            className="absolute inset-0 z-30 bg-black/30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}
        <div
          className={`absolute inset-y-0 left-0 z-40 shadow-xl transition-transform lg:static lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {sidebar}
        </div>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-slate-50">
          <div className="hidden shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-3 lg:flex">
            <div>
              <p className="text-[16px] font-black text-slate-900">{folderTitle}</p>
              <p className="text-[11px] text-slate-500">VLUE 스마트 오피스 · 통합 수발신</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowRemote((v) => !v)}
                className={`rounded-xl px-3 py-2 text-[12px] font-bold ${
                  showRemote ? "bg-blue-600 text-white" : "border border-slate-200 text-slate-700"
                }`}
              >
                프린트/팩스
              </button>
              <button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-[12px] font-bold text-slate-600">
                닫기
              </button>
              <button
                type="button"
                onClick={refresh}
                disabled={loading}
                className="rounded-xl bg-blue-600 px-3 py-2 text-[12px] font-bold text-white disabled:opacity-50"
              >
                새로고침
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {isSentView ? (
              <SentTable rows={sent} emptyLabel="발송 내역이 없습니다." />
            ) : (
              <MailList
                rows={filteredInbox}
                expandedId={expandedId}
                onOpen={openMail}
                onFocusAttach={focusAttachment}
                emptyLabel="이 조건에 맞는 메일이 없습니다."
              />
            )}
          </div>

          {showRemote ? (
            <div className="shrink-0 border-t border-slate-200 bg-white p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
              <OfficeRemotePanel files={remoteFiles} focusFileId={remoteFocusFileId} onToast={onToast} />
            </div>
          ) : null}
        </main>
      </div>

      {!showRemote ? (
        <button
          type="button"
          onClick={() => setShowRemote(true)}
          className="fixed bottom-6 right-4 z-50 rounded-full bg-blue-600 px-4 py-3 text-[12px] font-black text-white shadow-lg lg:hidden"
        >
          프린트/팩스
        </button>
      ) : null}
    </div>
  );
}
