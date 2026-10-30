import { useCallback, useEffect, useState } from "react";
import {
  checkPublicHandleAvailable,
  claimPublicHandle,
  fetchPublicHandleStatus,
  needsPublicHandleClaim,
  readLocalPublicHandle
} from "../lib/publicHandleClaim.js";
import {
  isValidMemberHandleSlug,
  normalizeMemberHandleSlug
} from "../lib/memberHandleRules.js";

/**
 * 케이스함·소셜 진입 전 고유 @아이디 필수 설정 게이트.
 * (5-Way 닉네임/프로필 스위칭과 무관 — publicHandle만 다룸)
 */
export default function PublicHandleClaimGate({
  active = true,
  title = "고유 @아이디 설정",
  subtitle = "케이스함과 소셜 기능을 쓰려면 고유 @아이디가 필요합니다.",
  onClaimed,
  onSkipUnavailable,
  children
}) {
  const [checking, setChecking] = useState(Boolean(active));
  const [needsClaim, setNeedsClaim] = useState(false);
  const [draft, setDraft] = useState("");
  const [hint, setHint] = useState("");
  const [available, setAvailable] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!active) {
      setChecking(false);
      setNeedsClaim(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setChecking(true);
      const local = readLocalPublicHandle();
      if (local && !needsPublicHandleClaim(local)) {
        if (!cancelled) {
          setNeedsClaim(false);
          setChecking(false);
        }
        return;
      }
      const status = await fetchPublicHandleStatus();
      if (cancelled) return;
      setNeedsClaim(Boolean(status.needsClaim));
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  const runAvailability = useCallback(async (raw) => {
    const slug = normalizeMemberHandleSlug(raw);
    setDraft(slug);
    setError("");
    if (!slug) {
      setAvailable(null);
      setHint("");
      return;
    }
    if (!isValidMemberHandleSlug(slug)) {
      setAvailable(false);
      setHint("영문 소문자로 시작, 3~20자(소문자·숫자·_), 숫자 1자 이상");
      return;
    }
    setHint("중복 확인 중…");
    const res = await checkPublicHandleAvailable(slug);
    setAvailable(Boolean(res.available));
    setHint(res.available ? `@${res.normalized || slug} 사용 가능` : res.reason || "사용할 수 없습니다");
  }, []);

  const submit = useCallback(async () => {
    const slug = normalizeMemberHandleSlug(draft);
    if (!isValidMemberHandleSlug(slug)) {
      setError("아이디 형식을 확인해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    const res = await claimPublicHandle(slug);
    setBusy(false);
    if (!res.ok) {
      setError(res.error || "설정에 실패했습니다.");
      setAvailable(false);
      return;
    }
    setNeedsClaim(false);
    onClaimed?.(res.publicHandle);
  }, [draft, onClaimed]);

  if (!active) return children || null;
  if (checking) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-6 text-center text-[13px] text-gray-500">
        @아이디 확인 중…
      </div>
    );
  }
  if (!needsClaim) return children || null;

  return (
    <div
      className="flex min-h-[70vh] flex-col items-center justify-center px-5 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="public-handle-claim-title"
    >
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-lg">
        <h2 id="public-handle-claim-title" className="text-center text-[17px] font-extrabold text-gray-900">
          {title}
        </h2>
        <p className="mt-2 text-center text-[12px] leading-relaxed text-gray-500">{subtitle}</p>
        <label className="mt-5 block text-[11px] font-bold text-gray-600">@아이디</label>
        <div className="mt-1.5 flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5">
          <span className="text-[15px] font-bold text-sky-600">@</span>
          <input
            value={draft}
            onChange={(e) => runAvailability(e.target.value)}
            placeholder="ceo1"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="w-full bg-transparent text-[15px] font-semibold outline-none"
            disabled={busy}
          />
        </div>
        {hint ? (
          <p
            className={`mt-2 text-[11px] font-semibold ${
              available === true ? "text-emerald-600" : available === false ? "text-rose-600" : "text-gray-500"
            }`}
          >
            {hint}
          </p>
        ) : null}
        {error ? <p className="mt-2 text-[12px] font-bold text-rose-600">{error}</p> : null}
        <button
          type="button"
          disabled={busy || available !== true}
          onClick={submit}
          className="mt-5 w-full rounded-xl bg-sky-600 py-3 text-[14px] font-extrabold text-white disabled:opacity-40"
        >
          {busy ? "저장 중…" : "아이디 확정하고 계속"}
        </button>
        {typeof onSkipUnavailable === "function" ? (
          <button
            type="button"
            className="mt-2 w-full py-2 text-[12px] font-semibold text-gray-400"
            onClick={onSkipUnavailable}
          >
            나중에
          </button>
        ) : null}
      </div>
    </div>
  );
}
