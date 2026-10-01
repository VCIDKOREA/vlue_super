import { useCallback, useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import AppFullScreenView from "./AppFullScreenView.jsx";
import { isPaidLetteringTier } from "../lib/letteringMembership.js";
import { postLetteringReport } from "../lib/letteringApi.js";
import {
  analyzeSmsMessage,
  fetchSmsMessages,
  fetchSmsSenderContext,
  fetchSmsThreads,
  markSmsThreadRead,
  mergeSmsAnalysis,
  requestSmsReadPermission,
  waitSmsPermission,
  watchSmsAnalyzeAd
} from "../lib/smsInbox.js";

function formatSmsWhen(dateMs) {
  const ms = Number(dateMs) || 0;
  if (!ms) return "";
  const date = new Date(ms);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
  }
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function formatBubbleTime(dateMs) {
  const ms = Number(dateMs) || 0;
  if (!ms) return "";
  return new Date(ms).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
}

function riskBadge(status) {
  if (status === "DANGER") return { mark: "🚨", label: "피싱 위험 번호", tone: "danger" };
  if (status === "SUSPICIOUS") return { mark: "⚠️", label: "의심 번호", tone: "suspect" };
  return { mark: "🟢", label: "안전", tone: "safe" };
}

function lookupLine(lookups, band) {
  if (!lookups && !band) return "";
  const piece = (title, row) => {
    if (!row || row.status === "unavailable") return `${title} 조회 불가`;
    if (row.status === "matched" && row.name) return `${title} ${row.name}`;
    return `${title} 불일치`;
  };
  const reports = lookups?.reports;
  const reportText = reports?.phishing
    ? `신고 ${reports.phishing}건`
    : reports?.total
      ? `제보 ${reports.total}건`
      : "신고 없음";
  return [
    band,
    reportText,
    piece("공공DB", lookups?.directory),
    piece("카카오", lookups?.kakao),
    piece("네이버", lookups?.naver),
    piece("공공데이터", lookups?.publicData)
  ].filter(Boolean).join(" · ");
}

function threadTitle(thread) {
  const name = String(thread?.name || "").trim();
  return name || String(thread?.address || "번호 없음");
}

function splitSafeLinks(text) {
  const source = String(text || "");
  const parts = [];
  const re = /https?:\/\/[^\s<>"']+/g;
  let last = 0;
  let match = re.exec(source);
  while (match) {
    if (match.index > last) parts.push({ type: "text", value: source.slice(last, match.index) });
    parts.push({ type: "link", value: match[0].replace(/[),.;]+$/g, "") });
    last = match.index + match[0].length;
    match = re.exec(source);
  }
  if (last < source.length) parts.push({ type: "text", value: source.slice(last) });
  return parts;
}

export default function SmsInboxSheet({ open, onClose, isDarkMode = false, membershipTier = "free" }) {
  const paid = isPaidLetteringTier(membershipTier);
  const [threads, setThreads] = useState([]);
  const [permission, setPermission] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [analysis, setAnalysis] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [reportBusyId, setReportBusyId] = useState(null);
  const [reported, setReported] = useState({});
  const [failures, setFailures] = useState({});

  const muted = isDarkMode ? "text-slate-400" : "text-slate-500";
  const strong = isDarkMode ? "text-slate-100" : "text-slate-900";
  const card = isDarkMode ? "border-white/10 bg-[#1c2430] text-slate-100" : "border-slate-200 bg-white text-slate-900";

  const loadThreads = useCallback(() => {
    const data = fetchSmsThreads();
    setPermission(data.permission);
    setThreads(data.threads);
  }, []);

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setLoading(true);
    loadThreads();
    setLoading(false);
  }, [open, loadThreads]);

  useEffect(() => {
    if (!open) return undefined;
    const onPermission = (event) => {
      if (event?.detail?.granted) loadThreads();
      else setPermission(false);
    };
    window.addEventListener("vlue-sms-permission", onPermission);
    return () => window.removeEventListener("vlue-sms-permission", onPermission);
  }, [open, loadThreads]);

  const openThread = (thread) => {
    markSmsThreadRead(thread.id, thread.address, thread.dateMs);
    setThreads((prev) => prev.map((row) => (row.id === thread.id ? { ...row, unread: 0 } : row)));
    const data = fetchSmsMessages(thread.id, thread.address);
    setMessages(data.messages);
    setSelected(thread);
  };

  const backToList = () => {
    setSelected(null);
    loadThreads();
  };

  const askPermission = async () => {
    requestSmsReadPermission();
    try {
      const detail = await waitSmsPermission();
      if (detail?.granted) loadThreads();
    } catch {
      setPermission(false);
    }
  };

  const analyze = async (message) => {
    const key = String(message.id);
    if (busyId) return;
    setBusyId(key);
    setFailures((prev) => ({ ...prev, [key]: "" }));
    try {
      if (!paid) await watchSmsAnalyzeAd();
      const sender = message.address || selected?.address || "";
      const body = message.body || "";
      const [result, context] = await Promise.all([
        analyzeSmsMessage(sender, body),
        fetchSmsSenderContext(sender, body)
      ]);
      setAnalysis((prev) => ({ ...prev, [key]: mergeSmsAnalysis(result, context) }));
    } catch (error) {
      setFailures((prev) => ({ ...prev, [key]: error?.message || "분석을 완료하지 못했습니다. 다시 시도해 주세요." }));
    } finally {
      setBusyId(null);
    }
  };

  const blockAndReport = async (message, result) => {
    const key = String(message.id);
    const phone = message.address || selected?.address || "";
    if (!phone || reportBusyId) return;
    setReportBusyId(key);
    try {
      const posted = await postLetteringReport({
        phone,
        reasonId: result?.status === "DANGER" ? "smishing_malware" : "fraud",
        detail: result?.summary || result?.senderReason || "문자 스캔 신고",
        verified: true
      });
      if (!posted?.ok) throw new Error(posted?.error || "차단·신고를 저장하지 못했습니다.");
      setReported((prev) => ({ ...prev, [key]: true }));
    } catch (error) {
      setFailures((prev) => ({ ...prev, [key]: error?.message || "차단·신고를 저장하지 못했습니다." }));
    } finally {
      setReportBusyId(null);
    }
  };

  const banner = (
    <div className={`mx-4 mt-3 rounded-2xl border px-4 py-3 ${card}`}>
      <p className={`text-[14px] font-black leading-snug ${strong}`}>
        AI로 악성 스미싱 메시지로부터 안전하게 보호하세요.
      </p>
      <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-[11px] font-bold ${isDarkMode ? "bg-blue-500/20 text-blue-200" : "bg-blue-50 text-blue-700"}`}>
        🤖 개별 메시지 AI 분석
      </p>
    </div>
  );

  const list = (
    <div className="flex min-h-0 flex-1 flex-col">
      {banner}
      {!permission ? (
        <div className="px-4 py-10 text-center">
          <p className={`text-[13px] font-semibold ${muted}`}>문자 목록을 보려면 문자 읽기 권한이 필요합니다.</p>
          <button type="button" onClick={() => void askPermission()} className="mt-3 rounded-full bg-blue-600 px-4 py-2 text-[13px] font-bold text-white">
            권한 허용
          </button>
        </div>
      ) : loading ? (
        <p className={`px-4 py-16 text-center text-[13px] font-semibold ${muted}`}>문자를 불러오는 중…</p>
      ) : threads.length === 0 ? (
        <p className={`px-4 py-16 text-center text-[13px] font-semibold ${muted}`}>받은 문자가 없습니다.</p>
      ) : (
        <ul className="m-0 mt-2 list-none overflow-y-auto p-0">
          {threads.map((thread) => (
            <li key={thread.id}>
              <button
                type="button"
                onClick={() => openThread(thread)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left ${isDarkMode ? "active:bg-white/5" : "active:bg-slate-50"}`}
              >
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-black ${isDarkMode ? "bg-slate-700 text-slate-200" : "bg-slate-200 text-slate-600"}`}>
                  {threadTitle(thread).slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className={`truncate text-[15px] font-bold ${strong}`}>{threadTitle(thread)}</span>
                    <span className={`shrink-0 text-[11px] ${muted}`}>{formatSmsWhen(thread.dateMs)}</span>
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-2">
                    <span className={`truncate text-[12px] ${muted}`}>{thread.snippet || "내용 없음"}</span>
                    {Number(thread.unread) > 0 ? (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-black text-white">
                        {thread.unread}
                      </span>
                    ) : null}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const detail = selected ? (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={`vlue-top-safe flex items-center gap-2 border-b px-3 pb-2 ${isDarkMode ? "border-white/10" : "border-slate-200"}`}
        style={{ paddingTop: "max(8px, var(--vlue-safe-top, env(safe-area-inset-top, 0px)))" }}
      >
        <button type="button" onClick={backToList} className={`px-2 text-[18px] ${strong}`} aria-label="목록">
          ←
        </button>
        <p className={`min-w-0 flex-1 truncate text-[16px] font-black ${strong}`}>{threadTitle(selected)}</p>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {messages.map((message) => {
          const key = String(message.id);
          const result = analysis[key];
          const danger = result?.status === "DANGER";
          const suspect = result?.status === "SUSPICIOUS";
          const safe = result?.status === "SAFE";
          const incoming = message.incoming !== false;
          return (
            <div key={key} className={`flex ${incoming ? "justify-start" : "justify-end"}`}>
              <div
                className={`relative max-w-[88%] overflow-hidden rounded-2xl px-3 py-2 ${busyId === key ? "sms-scan" : ""}`}
                style={{
                  background: danger ? "rgba(244, 67, 54, 0.12)" : suspect ? "rgba(245, 158, 11, 0.16)" : safe ? "rgba(76, 175, 80, 0.12)" : isDarkMode ? "#243041" : "#F1F5F9",
                  border: danger ? "1px solid #F44336" : suspect ? "1px solid #D97706" : safe ? "1px solid #4CAF50" : "1px solid transparent"
                }}
                onClick={() => {
                  if (danger) {
                    window.alert("🚨 AI 분석 결과 스미싱 위험 문자로 판정되어 링크 접근이 차단되었습니다.");
                  }
                }}
              >
                <p className={`whitespace-pre-wrap text-[15px] leading-relaxed ${strong}`}>
                  {safe
                    ? splitSafeLinks(message.body).map((part, index) =>
                        part.type === "link" ? (
                          <a key={index} href={part.value} target="_blank" rel="noreferrer" className="underline">
                            {part.value}
                          </a>
                        ) : (
                          <span key={index}>{part.value}</span>
                        )
                      )
                    : message.body}
                </p>
                <div className="mt-1 flex items-end justify-end gap-2">
                  <span className={`text-[10px] ${muted}`}>{formatBubbleTime(message.dateMs)}</span>
                  <button
                    type="button"
                    disabled={busyId === key}
                    onClick={(event) => {
                      event.stopPropagation();
                      void analyze(message);
                    }}
                    className="rounded-full bg-blue-600/10 px-2 py-1 text-[11px] font-bold text-blue-600 disabled:opacity-50"
                  >
                    {busyId === key ? "분석 중..." : "🤖 AI 분석"}
                  </button>
                </div>
                {busyId === key ? (
                  <p className="relative z-[1] mt-1 text-[11px] font-bold text-blue-700">발신번호 대조와 Gemini 분석 중...</p>
                ) : null}
                {result ? (
                  <div className={`relative z-[1] mt-2 rounded-xl px-2.5 py-2 text-[12px] leading-relaxed ${danger ? "bg-red-50 text-red-800" : suspect ? "bg-amber-50 text-amber-950" : "bg-emerald-50 text-emerald-800"}`}>
                    <p className="font-black">
                      {riskBadge(result.status).mark} {riskBadge(result.status).label}
                    </p>
                    {result.senderBand || result.senderLookups ? (
                      <p className="mt-1 text-[11px] leading-snug opacity-80">{lookupLine(result.senderLookups, result.senderBand)}</p>
                    ) : null}
                    <p className="mt-1 whitespace-pre-line font-bold">
                      {result.summary || result.senderReason || (danger ? "🚨 [스미싱 차단] 위험한 링크가 포함되어 있어 터치를 차단했습니다." : "🟢 안전 / 정상 메시지")}
                    </p>
                    {danger && result.unshortenedUrl ? <p className="mt-1 break-all">최종 URL: {result.unshortenedUrl}</p> : null}
                    <button
                      type="button"
                      disabled={reportBusyId === key || reported[key]}
                      onClick={(event) => {
                        event.stopPropagation();
                        void blockAndReport(message, result);
                      }}
                      className="mt-2 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-black text-white disabled:opacity-60"
                    >
                      {reported[key] ? "차단·신고 완료" : reportBusyId === key ? "저장 중..." : "차단 및 신고"}
                    </button>
                    {failures[key] ? <p className="mt-1 font-semibold">{failures[key]}</p> : null}
                  </div>
                ) : null}
                {!result && failures[key] ? (
                  <div className="relative z-[1] mt-2 rounded-xl bg-amber-50 px-2.5 py-2 text-[12px] text-amber-900">
                    <p>{failures[key]}</p>
                    <button
                      type="button"
                      className="mt-1 font-bold text-blue-700"
                      onClick={(event) => {
                        event.stopPropagation();
                        void analyze(message);
                      }}
                    >
                      다시 분석
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <AppFullScreenView
      open={open}
      onClose={() => {
        setSelected(null);
        onClose?.();
      }}
      title={selected ? threadTitle(selected) : "문자함"}
      subtitle={selected ? selected.address : "수신 문자 · 발신자별"}
      icon={MessageSquare}
      isDarkMode={isDarkMode}
      reserveBottomNav
      hideHeader={Boolean(selected)}
      showFloatingClose={!selected}
    >
      {selected ? detail : list}
    </AppFullScreenView>
  );
}
