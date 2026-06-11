import { useCallback, useEffect, useRef, useState } from "react";
import { runSpellingCorrectionPipeline } from "../../lib/spellingCorrectionPipeline.js";

const DEBOUNCE_MS = 1500;

/** 맞춤법 In-Place 자동 교정 입력 필드 */
export default function SpellingCorrectionField({
  value,
  onChange,
  enabled = false,
  placeholder = "",
  className = "",
  inputClassName = "",
  multiline = false,
  isDarkMode = false,
  inputRef,
  onKeyDown,
  onFocus
}) {
  const [checking, setChecking] = useState(false);
  const [fadePulse, setFadePulse] = useState(0);
  const [meta, setMeta] = useState(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const debounceRef = useRef(0);
  const lastCorrectedRef = useRef("");

  const runCheck = useCallback(
    async (sourceText) => {
      const text = String(sourceText || "").trim();
      if (!text || !enabled) return;
      if (text === lastCorrectedRef.current) return;

      setChecking(true);
      try {
        const result = await runSpellingCorrectionPipeline(text);
        if (result.corrected_text && result.corrected_text !== text) {
          lastCorrectedRef.current = result.corrected_text;
          setMeta({
            original: result.original || text,
            reason: result.reason || "맞춤법 교정",
            source: result.source
          });
          onChange?.(result.corrected_text);
          setFadePulse((k) => k + 1);
          console.info("[spelling] ui replace", { source: result.source });
        } else if (result.source === "unchanged") {
          setMeta(null);
        }
      } catch (e) {
        console.error("[spelling] ui check error", e);
      } finally {
        setChecking(false);
      }
    },
    [enabled, onChange]
  );

  useEffect(() => {
    if (!enabled) {
      setMeta(null);
      lastCorrectedRef.current = "";
      return undefined;
    }
    const text = String(value || "").trim();
    if (!text) return undefined;

    clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => runCheck(text), DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [value, enabled, runCheck]);

  useEffect(() => {
    if (!enabled) setTooltipOpen(false);
  }, [enabled]);

  const InputTag = multiline ? "textarea" : "input";
  const hasGuide = Boolean(enabled && meta);

  return (
    <div className={`relative min-w-0 flex-1 ${className}`}>
      <InputTag
        key={fadePulse}
        ref={inputRef}
        value={value}
        onChange={(e) => {
          lastCorrectedRef.current = "";
          setMeta(null);
          onChange?.(e.target.value);
        }}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        onClick={() => hasGuide && setTooltipOpen((v) => !v)}
        placeholder={placeholder}
        className={`w-full min-w-0 outline-none transition-opacity duration-500 ${
          fadePulse > 0 ? "animate-[spellFadeIn_0.45s_ease-out]" : ""
        } ${hasGuide ? "border-b-2 border-dashed border-emerald-400/80" : ""} ${inputClassName}`}
        style={
          hasGuide
            ? {
                textDecoration: "underline",
                textDecorationStyle: "dotted",
                textDecorationColor: "rgba(16,185,129,0.55)",
                textUnderlineOffset: "3px"
              }
            : undefined
        }
      />
      {checking ? (
        <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-bold text-emerald-600">
          …
        </span>
      ) : null}
      {tooltipOpen && meta ? (
        <div
          className={`absolute bottom-full left-0 z-30 mb-1 max-w-[min(100%,280px)] rounded-lg border px-3 py-2 text-[11px] shadow-lg ${
            isDarkMode ? "border-white/10 bg-[#1a2233] text-gray-200" : "border-emerald-200 bg-emerald-50 text-gray-800"
          }`}
        >
          <p className="font-bold text-emerald-700">교정 전</p>
          <p className="mt-0.5 whitespace-pre-wrap break-words">{meta.original}</p>
          <p className="mt-1.5 font-bold text-slate-700">이유</p>
          <p>{meta.reason}</p>
        </div>
      ) : null}
      <style>{`
        @keyframes spellFadeIn {
          from { opacity: 0.35; transform: translateY(2px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
