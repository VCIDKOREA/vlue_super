import { useCallback, useEffect, useMemo, useState } from "react";
import ScanOcrHighlightCanvas from "./ScanOcrHighlightCanvas.jsx";
import { normalizeOcrBlocks, searchOcrBlocks, stepSearchFocus } from "../../lib/scanOcrSearch.js";
import { SCAN_TRANSLATE_LANGS } from "../../lib/clientTranslation.js";
import { translateUniversal } from "../../lib/universalTranslationManager.js";
import { hasNativeDocumentOcr, runNativeDocumentOcr } from "../../lib/documentOcrBridge.js";
import { hasNativePosOcr, runNativePosBillOcr } from "../../lib/posBillNativeOcr.js";
import { useSpellingCheckMode } from "../../hooks/useSpellingCheckMode.js";
import SpellingCorrectionField from "../spell/SpellingCorrectionField.jsx";
import { runSpellingCorrectionPipeline } from "../../lib/spellingCorrectionPipeline.js";

function RegionTranslatePopup({ open, original, translated, busy, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[260] flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[13px] font-bold text-slate-800">선택 영역 번역</p>
          <button type="button" onClick={onClose} className="text-slate-400 active:text-slate-600" aria-label="닫기">
            ✕
          </button>
        </div>
        <p className="mb-2 text-[11px] font-semibold text-slate-500">원문</p>
        <p className="mb-3 max-h-24 overflow-y-auto rounded-lg bg-slate-50 px-3 py-2 text-[12px] leading-relaxed text-slate-700">
          {original || "—"}
        </p>
        <p className="mb-2 text-[11px] font-semibold text-blue-600">번역</p>
        <p className="max-h-32 overflow-y-auto rounded-lg bg-blue-50 px-3 py-2 text-[12px] leading-relaxed text-slate-800">
          {busy ? "번역 중…" : translated || "—"}
        </p>
      </div>
    </div>
  );
}

export default function ScanDocumentReviewPanel({
  open,
  pages = [],
  onClose,
  onSave,
  onToast,
  busy = false
}) {
  const spellingCheck = useSpellingCheckMode();
  const [pageIndex, setPageIndex] = useState(0);
  const [ocrByPage, setOcrByPage] = useState([]);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState({ matches: [], total: 0, focusIndex: -1, query: "" });
  const [targetLang, setTargetLang] = useState("en");
  const [fullTranslation, setFullTranslation] = useState("");
  const [fullTranslateBusy, setFullTranslateBusy] = useState(false);
  const [showFullView, setShowFullView] = useState(false);
  const [regionPopup, setRegionPopup] = useState({ open: false, original: "", translated: "", busy: false });
  const [spellMemo, setSpellMemo] = useState("");
  const [spellBusy, setSpellBusy] = useState(false);

  const currentPage = pages[pageIndex] || "";
  const currentOcr = ocrByPage[pageIndex] || { text: "", blocks: [] };

  const runOcrForPage = useCallback(async (_index, dataUrl) => {
    if (!dataUrl) return { text: "", blocks: [] };
    if (hasNativeDocumentOcr()) {
      const native = await runNativeDocumentOcr(dataUrl);
      return normalizeOcrBlocks(native);
    }
    if (hasNativePosOcr()) {
      const text = await runNativePosBillOcr(dataUrl);
      return normalizeOcrBlocks(text);
    }
    return normalizeOcrBlocks({ text: "", blocks: [] });
  }, []);

  useEffect(() => {
    if (!open || !pages.length) return;
    setPageIndex(0);
    setSearchQuery("");
    setSearchResult({ matches: [], total: 0, focusIndex: -1, query: "" });
    setFullTranslation("");
    setShowFullView(false);

    let cancelled = false;
    (async () => {
      setOcrLoading(true);
      const results = [];
      for (let i = 0; i < pages.length; i++) {
        if (cancelled) return;
        const row = await runOcrForPage(i, pages[i]);
        results.push(row);
      }
      if (!cancelled) {
        setOcrByPage(results);
        if (!results.some((r) => r.text)) {
          onToast?.("OCR 결과가 없습니다. 갤러리·네이티브 앱에서 다시 시도해 주세요.");
        }
      }
      if (!cancelled) setOcrLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, pages, runOcrForPage, onToast]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        document.getElementById("scan-doc-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResult({ matches: [], total: 0, focusIndex: -1, query: "" });
      return;
    }
    const result = searchOcrBlocks(currentOcr.blocks, searchQuery);
    setSearchResult(result);
  }, [searchQuery, currentOcr.blocks]);

  const allText = useMemo(
    () => ocrByPage.map((r) => r.text).filter(Boolean).join("\n\n---\n\n"),
    [ocrByPage]
  );

  const runFullTranslate = async () => {
    const text = pageIndex === 0 && pages.length === 1 ? currentOcr.text : allText || currentOcr.text;
    if (!text.trim()) {
      onToast?.("번역할 텍스트가 없습니다.");
      return;
    }
    setFullTranslateBusy(true);
    try {
      const { translated } = await translateUniversal({
        text,
        sourceLang: "ko",
        targetLang,
        origin: "scanner"
      });
      setFullTranslation(translated);
      setShowFullView(true);
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "전체 번역에 실패했습니다.");
    } finally {
      setFullTranslateBusy(false);
    }
  };

  const onRegionSelect = async ({ text }) => {
    setRegionPopup({ open: true, original: text, translated: "", busy: true });
    try {
      const { translated } = await translateUniversal({
        text,
        sourceLang: "ko",
        targetLang,
        origin: "scanner"
      });
      setRegionPopup({ open: true, original: text, translated, busy: false });
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "부분 번역에 실패했습니다.");
      setRegionPopup({ open: false, original: "", translated: "", busy: false });
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[250] flex flex-col bg-white">
      <header className="shrink-0 border-b border-slate-100 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-full px-2 py-1 text-[12px] font-semibold text-slate-500 active:bg-slate-100"
          >
            ← 촬영
          </button>
          <p className="flex-1 text-center text-[14px] font-black text-slate-900">문서 검색 · 번역</p>
          <button
            type="button"
            disabled={busy}
            onClick={onSave}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
          >
            저장
          </button>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <input
            id="scan-doc-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="문서 내 검색 (Ctrl+F)"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-[12px] outline-none focus:border-blue-400"
          />
          <button
            type="button"
            disabled={!searchResult.total}
            onClick={() => setSearchResult((prev) => stepSearchFocus(prev, -1))}
            className="rounded-lg border border-slate-200 px-2 py-2 text-[11px] font-semibold text-slate-600 disabled:opacity-40"
            aria-label="이전"
          >
            ◀
          </button>
          <span className="w-10 text-center text-[10px] font-bold text-slate-500">
            {searchResult.total ? `${(searchResult.focusIndex ?? 0) + 1}/${searchResult.total}` : "0/0"}
          </span>
          <button
            type="button"
            disabled={!searchResult.total}
            onClick={() => setSearchResult((prev) => stepSearchFocus(prev, 1))}
            className="rounded-lg border border-slate-200 px-2 py-2 text-[11px] font-semibold text-slate-600 disabled:opacity-40"
            aria-label="다음"
          >
            ▶
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-700"
          >
            {SCAN_TRANSLATE_LANGS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={fullTranslateBusy || ocrLoading}
            onClick={runFullTranslate}
            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-700 disabled:opacity-50"
          >
            {fullTranslateBusy ? "번역 중…" : "전체 번역"}
          </button>
          <button
            type="button"
            onClick={() => spellingCheck.toggle()}
            title={spellingCheck.enabled ? "맞춤법 검사 켜짐" : "맞춤법 검사"}
            className={`rounded-lg border px-2 py-1.5 text-[11px] font-bold ${
              spellingCheck.enabled
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-400 grayscale"
            }`}
          >
            Aa 맞춤법
          </button>
          <button
            type="button"
            disabled={spellBusy || ocrLoading || !currentOcr.text}
            onClick={async () => {
              setSpellBusy(true);
              try {
                const result = await runSpellingCorrectionPipeline(currentOcr.text);
                setSpellMemo(result.corrected_text);
                onToast?.(`맞춤법 교정 완료 (${result.source})`);
              } catch (e) {
                onToast?.(e instanceof Error ? e.message : "맞춤법 검사에 실패했습니다.");
              } finally {
                setSpellBusy(false);
              }
            }}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700 disabled:opacity-50"
          >
            {spellBusy ? "검사 중…" : "OCR 맞춤법"}
          </button>
          <button
            type="button"
            disabled={fullTranslateBusy || ocrLoading}
            onClick={async () => {
              const text = pageIndex === 0 && pages.length === 1 ? currentOcr.text : allText || currentOcr.text;
              if (!text.trim()) {
                onToast?.("번역할 텍스트가 없습니다.");
                return;
              }
              setFullTranslateBusy(true);
              try {
                const { translated } = await translateUniversal({
                  text,
                  sourceLang: "ko",
                  targetLang,
                  enhanced: true,
                  origin: "scanner"
                });
                setFullTranslation(translated);
                setShowFullView(true);
                onToast?.("Gemini 고도화 번역 완료");
              } catch (e) {
                onToast?.(e instanceof Error ? e.message : "고도화 번역에 실패했습니다.");
              } finally {
                setFullTranslateBusy(false);
              }
            }}
            className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11px] font-bold text-violet-700 disabled:opacity-50"
          >
            고도화
          </button>
          {pages.length > 1 ? (
            <div className="ml-auto flex gap-1">
              <button
                type="button"
                disabled={pageIndex <= 0}
                onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
                className="rounded border border-slate-200 px-2 py-1 text-[10px] disabled:opacity-40"
              >
                이전 페이지
              </button>
              <span className="self-center text-[10px] font-bold text-slate-500">
                {pageIndex + 1}/{pages.length}
              </span>
              <button
                type="button"
                disabled={pageIndex >= pages.length - 1}
                onClick={() => setPageIndex((i) => Math.min(pages.length - 1, i + 1))}
                className="rounded border border-slate-200 px-2 py-1 text-[10px] disabled:opacity-40"
              >
                다음 페이지
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {ocrLoading ? (
          <p className="py-8 text-center text-[12px] font-semibold text-slate-500">ML Kit OCR 처리 중…</p>
        ) : (
          <ScanOcrHighlightCanvas
            imageUrl={currentPage}
            blocks={currentOcr.blocks}
            searchResult={searchResult}
            onRegionSelect={onRegionSelect}
          />
        )}
        {currentOcr.text ? (
          <p className="mt-3 text-[10px] leading-relaxed text-slate-400">
            추출 텍스트 {currentOcr.text.length.toLocaleString("ko-KR")}자 · 하이라이트는 검색어와 일치하는 구역에 표시됩니다.
          </p>
        ) : null}
      </div>

      {showFullView ? (
        <div className="shrink-0 border-t border-slate-100 bg-slate-50 p-3">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-700">전체 번역 결과</p>
            <button type="button" onClick={() => setShowFullView(false)} className="text-[10px] text-slate-400">
              접기
            </button>
          </div>
          <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap text-[11px] leading-relaxed text-slate-800">
            {fullTranslation}
          </pre>
        </div>
      ) : null}

      {spellingCheck.enabled ? (
        <div className="shrink-0 border-t border-emerald-100 bg-emerald-50/40 p-3">
          <p className="mb-1 text-[11px] font-bold text-emerald-800">맞춤법 메모</p>
          <SpellingCorrectionField
            enabled={spellingCheck.enabled}
            value={spellMemo}
            onChange={setSpellMemo}
            multiline
            placeholder="메모 입력 — 1.5초 후 자동 맞춤법 교정"
            inputClassName="min-h-16 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[12px]"
          />
        </div>
      ) : null}

      <RegionTranslatePopup
        open={regionPopup.open}
        original={regionPopup.original}
        translated={regionPopup.translated}
        busy={regionPopup.busy}
        onClose={() => setRegionPopup({ open: false, original: "", translated: "", busy: false })}
      />

    </div>
  );
}
