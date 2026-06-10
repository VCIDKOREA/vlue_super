import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildPaymentPreview,
  REFERRAL_FRIEND_DISCOUNT_NOTICE,
  REFERRAL_PROMO_DISCOUNT_NOTICE,
  REFERRAL_PROMO_SPONSOR_NOTICE
} from "../lib/membershipBm.js";
import { verifyReferralCode } from "../lib/referralVerifyApi.js";

const IDLE = { status: "idle", message: "", sponsorDisplayName: "", sponsorHandle: "", referralCode: "" };

/**
 * 유료 멤버십 — 추천인 코드 확인 · 스폰서 표시 · 할인 안내 동의
 * onMetaChange: { hasCode, verified, discountAgree, codeForApi }
 */
export default function ReferralCodeVerifyBlock({
  billingCycle = "monthly",
  referralCode,
  onReferralCodeChange,
  onMetaChange,
  isDarkMode = false,
  /** true 이면 추천인 없음 비활성 · 코드 필수 */
  requireReferrer = false,
  /** B2B 등 별도 예상 결제 영역 사용 시 */
  hidePaymentPreview = false
}) {
  const [check, setCheck] = useState(IDLE);
  const [discountAgree, setDiscountAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [noReferrer, setNoReferrer] = useState(false);

  const codeTrim = String(referralCode || "").trim();
  const hasCode = Boolean(codeTrim) && !noReferrer;
  const verified = check.status === "ok";
  const withDiscount = verified && discountAgree;

  const paymentPreview = useMemo(
    () => buildPaymentPreview(billingCycle, withDiscount),
    [billingCycle, withDiscount]
  );

  useEffect(() => {
    onMetaChange?.({
      hasCode,
      noReferrer,
      verified,
      discountAgree,
      codeForApi: verified ? check.referralCode || codeTrim : null,
      sponsorDisplayName: verified ? check.sponsorDisplayName : "",
      sponsorHandle: verified ? check.sponsorHandle : ""
    });
  }, [hasCode, noReferrer, verified, discountAgree, check, codeTrim, onMetaChange]);

  const resetCheck = useCallback(() => {
    setCheck(IDLE);
    setDiscountAgree(false);
  }, []);

  const onCodeChange = (v) => {
    onReferralCodeChange?.(v);
    setNoReferrer(false);
    resetCheck();
  };

  const selectNoReferrer = () => {
    if (requireReferrer) return;
    if (noReferrer) {
      cancelNoReferrer();
      return;
    }
    onReferralCodeChange?.("");
    setNoReferrer(true);
    resetCheck();
    setCheck({
      ...IDLE,
      status: "ok",
      message: "추천인 없이 진행합니다."
    });
  };

  const cancelNoReferrer = () => {
    setNoReferrer(false);
    resetCheck();
  };

  const runVerify = async () => {
    if (!codeTrim) {
      setCheck({ ...IDLE, status: "invalid", message: "추천인 코드를 입력해 주세요." });
      return;
    }
    setBusy(true);
    setCheck({ ...IDLE, status: "checking", message: "추천인 확인 중…" });
    try {
      const data = await verifyReferralCode(codeTrim);
      if (!data.valid) {
        setCheck({
          ...IDLE,
          status: "invalid",
          message: data.error || "유효하지 않은 추천인 코드입니다."
        });
        return;
      }
      setCheck({
        status: "ok",
        message: "추천인 코드가 확인되었습니다.",
        sponsorDisplayName: data.sponsorDisplayName || "",
        sponsorHandle: data.sponsorHandle || "",
        referralCode: data.referralCode || codeTrim
      });
    } catch (e) {
      setCheck({
        ...IDLE,
        status: "invalid",
        message: e instanceof Error ? e.message : "확인 요청에 실패했습니다."
      });
    } finally {
      setBusy(false);
    }
  };

  const textStrong = isDarkMode ? "text-gray-100" : "text-slate-900";
  const textSub = isDarkMode ? "text-gray-400" : "text-slate-600";
  const fieldBorder = isDarkMode ? "border-white/15 bg-white/5" : "border-slate-200 bg-white";

  return (
    <div className="space-y-3">
      <label className={`block text-[12px] font-bold ${textStrong}`}>
        추천인 (전화번호 또는 VLUER 코드)
        <div className="mt-1.5 space-y-1.5">
          <input
            value={noReferrer ? "" : referralCode}
            onChange={(e) => {
              const v = e.target.value;
              const digits = v.replace(/\D/g, "");
              onCodeChange(digits.length >= 10 ? digits : v.toUpperCase());
            }}
            placeholder={requireReferrer ? "전화번호 또는 VLUER 코드" : "01012345678 또는 VLUER 코드"}
            disabled={noReferrer}
            className={`w-full rounded-lg border px-2.5 py-2 text-[13px] outline-none focus:border-blue-400 disabled:opacity-60 ${fieldBorder}`}
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={busy || !codeTrim || noReferrer}
              onClick={runVerify}
              className="rounded-full bg-indigo-600 px-2.5 py-1 text-[10px] font-bold text-white disabled:opacity-45"
            >
              {busy ? "확인 중" : "추천인 인증"}
            </button>
            {!requireReferrer ? (
            <button
              type="button"
              disabled={busy}
              onClick={selectNoReferrer}
              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold disabled:opacity-45 ${
                noReferrer
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                  : isDarkMode
                    ? "border-white/20 bg-white/5 text-gray-300"
                    : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              {noReferrer ? "선택 해제" : "추천인 없음"}
            </button>
            ) : null}
          </div>
        </div>
      </label>

      {check.status === "checking" && (
        <p className={`text-[11px] font-semibold ${textSub}`}>{check.message}</p>
      )}
      {check.status === "invalid" && check.message && (
        <p className="rounded-lg bg-red-50 px-2 py-2 text-[11px] font-semibold text-red-800">{check.message}</p>
      )}
      {verified && noReferrer && (
        <div
          className={`rounded-lg border px-3 py-2.5 ${
            isDarkMode ? "border-slate-400/30 bg-slate-800/40" : "border-slate-200 bg-slate-50"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className={`text-[11px] font-black ${textStrong}`}>✓ 추천인 없이 진행</p>
            <button
              type="button"
              onClick={cancelNoReferrer}
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold underline-offset-2 hover:underline ${
                isDarkMode
                  ? "border-white/20 text-blue-200"
                  : "border-slate-200 bg-white text-indigo-700"
              }`}
            >
              추천인 코드 입력
            </button>
          </div>
          <p className={`mt-1 text-[10px] leading-relaxed ${textSub}`}>
            추천인 할인 없이 정가로 가입합니다. 나중에 사후 추천인 등록이 가능할 수 있습니다.
          </p>
        </div>
      )}
      {verified && !noReferrer && (
        <div
          className={`rounded-lg border px-3 py-2.5 ${
            isDarkMode ? "border-emerald-400/30 bg-emerald-900/20" : "border-emerald-200 bg-emerald-50"
          }`}
        >
          <p className={`text-[11px] font-black ${isDarkMode ? "text-emerald-200" : "text-emerald-900"}`}>
            ✓ 추천인 인증 완료
          </p>
          <p className={`mt-1 text-[12px] font-bold ${textStrong}`}>{check.sponsorDisplayName}</p>
          {check.sponsorHandle ? (
            <p className={`text-[11px] ${textSub}`}>회원 ID {check.sponsorHandle}</p>
          ) : null}
          {check.referralCode ? (
            <p className={`mt-0.5 text-[10px] font-mono ${textSub}`}>코드: {check.referralCode}</p>
          ) : null}
        </div>
      )}

      {hasCode && (
        <label
          className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2.5 ${
            isDarkMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-white"
          }`}
        >
          <input
            type="checkbox"
            checked={discountAgree}
            disabled={!verified}
            onChange={(e) => setDiscountAgree(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 disabled:opacity-40"
          />
          <span className={`text-[10px] leading-relaxed ${verified ? textSub : "text-slate-400"}`}>
            {REFERRAL_FRIEND_DISCOUNT_NOTICE}
            <span className="mt-1.5 block">{REFERRAL_PROMO_DISCOUNT_NOTICE}</span>
            <span className="mt-1.5 block">{REFERRAL_PROMO_SPONSOR_NOTICE}</span>
            {!verified ? (
              <span className="mt-1 block font-bold text-amber-800">※ 「추천인 인증」 후 동의할 수 있습니다.</span>
            ) : null}
          </span>
        </label>
      )}

      {!hasCode && !noReferrer && (
        <p className={`text-[10px] leading-relaxed ${textSub}`}>
          {REFERRAL_FRIEND_DISCOUNT_NOTICE}
          <span className="mt-1.5 block">{REFERRAL_PROMO_DISCOUNT_NOTICE}</span>
        </p>
      )}

      {!hidePaymentPreview ? (
      <div
        className={`rounded-xl border px-3 py-2.5 ${
          isDarkMode ? "border-blue-400/25 bg-blue-950/30" : "border-blue-100 bg-blue-50/80"
        }`}
      >
        <p className={`text-[11px] font-bold ${isDarkMode ? "text-blue-200/90" : "text-blue-900/80"}`}>
          예상 결제 (가입 후)
        </p>
        <p className={`mt-0.5 text-[17px] font-black tabular-nums leading-tight ${isDarkMode ? "text-blue-100" : "text-blue-900"}`}>
          {paymentPreview.amountLabel}
        </p>
        {paymentPreview.compareFrom && paymentPreview.compareTo ? (
          <p className={`mt-1 text-[11px] font-semibold tabular-nums ${isDarkMode ? "text-blue-200/80" : "text-blue-800/90"}`}>
            <span className="line-through opacity-65">{paymentPreview.compareFrom}</span>
            <span className="mx-1 font-normal text-[10px]">→</span>
            <span>{paymentPreview.compareTo}</span>
            <span className="ml-1 text-[10px] font-bold text-emerald-700">(2개월 무료)</span>
          </p>
        ) : null}
        {paymentPreview.detailLine ? (
          <p className={`mt-0.5 text-[10px] leading-snug ${isDarkMode ? "text-blue-200/70" : "text-blue-800/75"}`}>
            {paymentPreview.detailLine}
          </p>
        ) : null}
        {paymentPreview.badges.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {paymentPreview.badges.map((b) => (
              <span
                key={b}
                className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                  isDarkMode ? "bg-blue-500/25 text-blue-100" : "bg-blue-100 text-blue-800"
                }`}
              >
                {b}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      ) : null}
    </div>
  );
}

/** 부모에서 다음 단계 전 검증용 */
export function validateReferralMeta(meta) {
  if (meta?.noReferrer) return { ok: true, verifiedCode: null };
  if (!meta?.hasCode) {
    return {
      ok: false,
      message: "추천인 코드를 입력·인증하거나 「추천인 없음」을 선택해 주세요."
    };
  }
  if (!meta.verified) {
    return { ok: false, message: "추천인 코드를 입력한 뒤 「추천인 인증」을 완료해 주세요." };
  }
  if (!meta.discountAgree) {
    return { ok: false, message: "추천인 할인·사후 등록 안내에 동의해 주세요." };
  }
  return { ok: true, verifiedCode: meta.codeForApi };
}

/** B2B — 추천인 선택(없음 가능), 코드 입력 시 인증만 */
export function validateReferralMetaB2b(meta) {
  if (meta?.noReferrer) return { ok: true, verifiedCode: null };
  if (!meta?.hasCode) return { ok: true, verifiedCode: null };
  if (!meta?.verified) {
    return { ok: false, message: "추천인 코드를 입력한 뒤 「추천인 인증」을 완료하거나 「추천인 없음」을 선택해 주세요." };
  }
  return { ok: true, verifiedCode: meta.codeForApi || null };
}
