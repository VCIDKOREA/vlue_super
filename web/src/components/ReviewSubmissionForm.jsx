import { useEffect, useMemo, useRef, useState } from "react";
import { apiUrl } from "../lib/apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "../lib/vlueAuthHeaders.js";

function isValidNaverBlogUrl(url) {
  return /^https?:\/\/(blog\.naver\.com|m\.blog\.naver\.com)\//i.test(String(url || "").trim());
}

export default function ReviewSubmissionForm({ match, onClose, onSubmitted }) {
  const keywords = useMemo(
    () => (match?.campaign?.requiredKeywords || []).map((k) => String(k.keyword || "").trim()).filter(Boolean),
    [match]
  );
  const [blogUrl, setBlogUrl] = useState(match?.reviewDraft?.blogUrl || "");
  const [bodyText, setBodyText] = useState(match?.reviewDraft?.bodyText || "");
  const [summary3, setSummary3] = useState(match?.reviewDraft?.summary3Lines || "");
  const [photos, setPhotos] = useState(Array.isArray(match?.reviewDraft?.photosJson) ? match.reviewDraft.photosJson : []);
  const [parserBusy, setParserBusy] = useState(false);
  const [syncStep, setSyncStep] = useState("idle");
  const [syncMsg, setSyncMsg] = useState("");
  const typingTimersRef = useRef([]);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const [settlementPopup, setSettlementPopup] = useState({ open: false, amount: 0 });
  const ownerCheckStatus = match?.reviewSubmission?.status || "draft";

  const keywordStatus = useMemo(
    () => keywords.map((k) => ({ keyword: k, hit: bodyText.includes(k) || summary3.includes(k) })),
    [keywords, bodyText, summary3]
  );
  const keywordsHit = keywordStatus.every((x) => x.hit);
  const canSubmit = isValidNaverBlogUrl(blogUrl) && bodyText.trim() && summary3.trim() && photos.length >= 5 && keywordsHit;

  useEffect(
    () => () => {
      typingTimersRef.current.forEach((timerId) => clearTimeout(timerId));
      typingTimersRef.current = [];
    },
    []
  );

  const typeLikeAi = async (setter, text, chunk = 2, stepMs = 16) =>
    new Promise((resolve) => {
      const full = String(text || "");
      setter("");
      if (!full) {
        resolve();
        return;
      }
      let idx = 0;
      const run = () => {
        idx = Math.min(full.length, idx + chunk);
        setter(full.slice(0, idx));
        if (idx >= full.length) {
          resolve();
          return;
        }
        const timerId = setTimeout(run, stepMs);
        typingTimersRef.current.push(timerId);
      };
      run();
    });

  const handleDropFiles = async (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    const next = [...photos];
    for (const file of list) {
      if (!file.type.startsWith("image/")) continue;
      const url = URL.createObjectURL(file);
      next.push({
        url,
        name: file.name,
        size: file.size,
        meta: {
          mime: file.type,
          lastModified: file.lastModified
        }
      });
    }
    setPhotos(next.slice(0, 20));
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      await vlueAuthFetch(apiUrl(`/api/campaign/matches/${encodeURIComponent(match.id)}/review/draft`), {
        method: "POST",
        headers: vlueAuthHeaders(),
        body: JSON.stringify({
          blogUrl,
          bodyText,
          summary3Lines: summary3,
          photosJson: photos,
          keywordsCheckJson: keywordStatus
        })
      });
      setToast("임시 저장되었습니다.");
      setTimeout(() => setToast(""), 1600);
    } finally {
      setSaving(false);
    }
  };

  const loadFromUrl = async () => {
    if (!isValidNaverBlogUrl(blogUrl)) {
      setToast("네이버 블로그 URL 형식이 아닙니다.");
      setTimeout(() => setToast(""), 1800);
      return;
    }
    setParserBusy(true);
    setSyncStep("fetch");
    setSyncMsg("링크 내용을 확인하고 있습니다...");
    try {
      await new Promise((r) => setTimeout(r, 320));
      setSyncStep("parse");
      setSyncMsg("본문/사진 데이터를 정리하고 있습니다...");
      const res = await vlueAuthFetch(apiUrl("/api/campaign/ai-smart-sync/parse"), {
        method: "POST",
        headers: vlueAuthHeaders(),
        body: JSON.stringify({ blogUrl, requiredKeywords: keywords })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "파서 호출 실패");
      setSyncStep("summary");
      setSyncMsg("3줄 요약과 키워드 검사를 생성 중...");
      await new Promise((r) => setTimeout(r, 260));
      const nextBody = data.extractedText || bodyText;
      const nextSummary = (Array.isArray(data.summary3Lines) ? data.summary3Lines : []).join("\n");
      await typeLikeAi(setBodyText, nextBody, 3, 12);
      await typeLikeAi(setSummary3, nextSummary, 2, 18);
      setSyncStep("done");
      setSyncMsg("불러오기 완료");
      setToast("링크 데이터 불러오기를 완료했습니다.");
      setTimeout(() => setToast(""), 1800);
    } catch (e) {
      setToast(e?.message || "불러오기 실패");
      setTimeout(() => setToast(""), 1800);
      setSyncStep("idle");
      setSyncMsg("");
    } finally {
      setParserBusy(false);
      setTimeout(() => {
        setSyncStep("idle");
        setSyncMsg("");
      }, 900);
    }
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await vlueAuthFetch(apiUrl(`/api/campaign/matches/${encodeURIComponent(match.id)}/review/submit`), {
        method: "POST",
        headers: vlueAuthHeaders(),
        body: JSON.stringify({
          blogUrl,
          bodyText,
          summary3Lines: summary3,
          photos,
          keywordsHit
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "제출 실패");
      setSettlementPopup({ open: true, amount: Number(data.releasedCash || 0) });
      setTimeout(() => {
        setSettlementPopup({ open: false, amount: 0 });
        onSubmitted?.();
      }, 1800);
    } catch (e) {
      setToast(e?.message || "제출 실패");
      setTimeout(() => setToast(""), 1800);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[125] flex items-center justify-center bg-black/50 p-4" onMouseDown={onClose}>
      <div className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[16px] font-black text-slate-900">리뷰 제출</h3>
          <button type="button" className="rounded bg-slate-100 px-2 py-1 text-[12px]" onClick={onClose}>닫기</button>
        </div>
        <div className="space-y-3">
          <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-white to-blue-50 p-3">
            <p className="text-[11px] font-black text-blue-800">AI Smart Sync</p>
            <p className="mt-1 text-[12px] font-semibold text-slate-700">링크 입력 → 불러오기 → 요약 확인 → 제출</p>
            <div className="mt-2 flex items-center gap-1.5">
              {["fetch", "parse", "summary", "done"].map((step, idx) => {
                const active = syncStep === step || (syncStep === "done" && step !== "done");
                return (
                  <div key={step} className={`h-1.5 flex-1 rounded-full ${active ? "bg-blue-600" : "bg-blue-100"} ${parserBusy && active ? "animate-pulse" : ""}`} />
                );
              })}
            </div>
            {syncMsg ? <p className="mt-1 text-[11px] font-semibold text-blue-700">{syncMsg}</p> : null}
          </div>
          <div>
            <label className="text-[12px] font-bold text-slate-700">네이버 블로그 URL</label>
            <div className="mt-1 flex gap-2">
              <input className="flex-1 rounded border px-2 py-2 text-[12px]" value={blogUrl} onChange={(e) => setBlogUrl(e.target.value)} placeholder="https://blog.naver.com/..." />
              <button type="button" className="rounded bg-blue-600 px-3 py-2 text-[12px] font-bold text-white" onClick={loadFromUrl} disabled={parserBusy}>
                {parserBusy ? "불러오는 중" : "불러오기"}
              </button>
            </div>
          </div>

          <div className={parserBusy || syncStep === "summary" ? "rounded-xl border border-blue-100 bg-blue-50/40 p-2" : ""}>
            <label className="text-[12px] font-bold text-slate-700">본문</label>
            <textarea className="mt-1 w-full rounded border px-2 py-2 text-[12px]" rows={4} value={bodyText} onChange={(e) => setBodyText(e.target.value)} />
            {parserBusy || syncStep === "summary" ? <p className="mt-1 text-[10px] font-semibold text-blue-700">AI가 본문을 자동 정리 중입니다...</p> : null}
          </div>
          <div className={syncStep === "summary" || syncStep === "done" ? "rounded-xl border border-blue-100 bg-blue-50/40 p-2" : ""}>
            <label className="text-[12px] font-bold text-slate-700">3줄 요약</label>
            <textarea className="mt-1 w-full rounded border px-2 py-2 text-[12px]" rows={3} value={summary3} onChange={(e) => setSummary3(e.target.value)} />
            {syncStep === "summary" ? <p className="mt-1 text-[10px] font-semibold text-blue-700">요약 문장을 생성하고 있어요...</p> : null}
          </div>

          <div>
            <label className="text-[12px] font-bold text-slate-700">사진 업로드 (최소 5장)</label>
            <div
              className="mt-1 rounded border-2 border-dashed border-slate-300 p-4 text-center"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleDropFiles(e.dataTransfer.files);
              }}
            >
              <p className="text-[11px] text-slate-500">드래그 앤 드롭 또는 파일 선택</p>
              <input type="file" accept="image/*" multiple className="mt-2 text-[11px]" onChange={(e) => handleDropFiles(e.target.files)} />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {photos.map((p, idx) => (
                <img key={`${p.url}-${idx}`} src={p.url} alt="" className="h-12 w-12 rounded object-cover" />
              ))}
            </div>
          </div>

          <div className="rounded bg-slate-50 p-2">
            <p className="text-[11px] font-bold text-slate-700">필수 키워드 실시간 체크</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {keywordStatus.map((k) => (
                <span key={k.keyword} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${k.hit ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                  {k.keyword}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded border border-indigo-200 bg-indigo-50 px-3 py-2">
            <p className="text-[11px] font-bold text-indigo-800">사장님 확인 상태</p>
            <p className="mt-1 text-[12px] font-black text-indigo-900">
              {ownerCheckStatus === "approved"
                ? "승인 완료"
                : ownerCheckStatus === "rejected"
                  ? "반려됨(수정 후 재제출 필요)"
                  : ownerCheckStatus === "submitted"
                    ? "확인 대기 중"
                    : "임시저장/작성 중"}
            </p>
          </div>

          <div className="flex gap-2">
            <button type="button" className="flex-1 rounded bg-slate-100 py-2 text-[12px] font-bold" onClick={saveDraft} disabled={saving}>
              {saving ? "저장 중" : "임시 저장"}
            </button>
            <button type="button" className={`flex-1 rounded py-2 text-[12px] font-black text-white ${canSubmit ? "bg-blue-700" : "bg-slate-300"}`} disabled={!canSubmit || submitting} onClick={submit}>
              {submitting ? "제출 중" : "제출하기"}
            </button>
          </div>
        </div>
        {toast ? <div className="mt-2 rounded bg-slate-900 px-3 py-2 text-center text-[11px] font-bold text-white">{toast}</div> : null}
      </div>
      {settlementPopup.open && (
        <div className="pointer-events-none fixed inset-0 z-[130] flex items-center justify-center">
          <div className="animate-[ping_1.2s_ease-out_1] absolute h-56 w-56 rounded-full bg-emerald-300/35" />
          <div className="animate-[ping_1.5s_ease-out_1] absolute h-72 w-72 rounded-full bg-yellow-300/20" />
          <div className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-b from-white via-emerald-50 to-yellow-50 px-7 py-6 text-center shadow-2xl">
            <div className="absolute left-3 top-3 text-[16px]">✨</div>
            <div className="absolute right-3 top-5 text-[15px]">🎉</div>
            <div className="absolute bottom-4 left-5 text-[14px]">💸</div>
            <div className="absolute bottom-3 right-5 text-[14px]">🪙</div>
            <p className="text-[32px] leading-none">🏆</p>
            <p className="mt-2 text-[19px] font-black text-emerald-700">캐시 정산 완료!</p>
            <p className="mt-1 text-[15px] font-black text-slate-800">+{settlementPopup.amount.toLocaleString()}원 지급</p>
            <p className="mt-1 text-[11px] font-bold text-emerald-800">축하합니다! 수익이 즉시 반영되었습니다.</p>
          </div>
        </div>
      )}
    </div>
  );
}
