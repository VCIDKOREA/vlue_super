import { useEffect, useState } from "react";
import {
  collectDccSecurityAttestation,
  DCC_SECURITY_COPY
} from "../lib/dccSecurityAttestation.js";
import { attestEnterpriseDccSecurity, saveEnterpriseWorkplace } from "../lib/enterpriseDccApi.js";

/**
 * DCC 3단계 — GPS 위치 대조 (실제 근무지 기준)
 * 본사 주소 + 실근무지 이원화, 동일 체크박스, 상세 결과 패널
 */
export default function DccSecurityLocationGate({
  applicationId,
  hqAddress: hqAddressProp = "",
  workplaceAddress: workplaceAddressProp = "",
  workplaceSameAsHq: sameAsHqProp = false,
  isDarkMode = false,
  onPassed,
  onToast
}) {
  const [hqAddr, setHqAddr] = useState(hqAddressProp || "");
  const [workAddr, setWorkAddr] = useState(workplaceAddressProp || "");
  const [sameAsHq, setSameAsHq] = useState(
    Boolean(sameAsHqProp) ||
      (!workplaceAddressProp && Boolean(hqAddressProp)) ||
      (hqAddressProp && workplaceAddressProp && hqAddressProp === workplaceAddressProp)
  );
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle | loading | success | fail
  const [gate, setGate] = useState(null);
  const [error, setError] = useState("");
  const [clientHint, setClientHint] = useState(null);

  const panel = isDarkMode ? "border-white/15 bg-slate-900/60" : "border-amber-100 bg-amber-50/80";
  const inputCls = isDarkMode
    ? "w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-[13px] disabled:opacity-60"
    : "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] disabled:opacity-60";
  const muted = isDarkMode ? "text-slate-400" : "text-slate-600";
  const labelCls = isDarkMode ? "text-slate-300" : "text-slate-700";

  useEffect(() => {
    setHqAddr(hqAddressProp || "");
    setWorkAddr(workplaceAddressProp || hqAddressProp || "");
    if (sameAsHqProp || (!workplaceAddressProp && hqAddressProp) || hqAddressProp === workplaceAddressProp) {
      setSameAsHq(true);
    }
  }, [hqAddressProp, workplaceAddressProp, sameAsHqProp]);

  useEffect(() => {
    if (sameAsHq) setWorkAddr(hqAddr);
  }, [sameAsHq, hqAddr]);

  const refreshClientHints = async () => {
    try {
      const a = await collectDccSecurityAttestation();
      setClientHint(a.clientHints);
      setGate(null);
      setError("");
      setPhase("idle");
      return a;
    } catch (e) {
      setError(e?.message || "환경 확인 실패");
      return null;
    }
  };

  useEffect(() => {
    void refreshClientHints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  const buttonBlocked =
    Boolean(clientHint?.wifiBlocked) || Boolean(clientHint?.vpnOrRemoteHint) || busy;

  const blockReason = clientHint?.vpnOrRemoteHint
    ? DCC_SECURITY_COPY.vpnOrRemote
    : clientHint?.wifiBlocked
      ? DCC_SECURITY_COPY.wifi
      : "";

  const effectiveWork = sameAsHq ? hqAddr.trim() : workAddr.trim();
  const canSubmit = Boolean(hqAddr.trim() && effectiveWork);

  const runAttest = async () => {
    if (!applicationId || buttonBlocked || !canSubmit) return;
    setBusy(true);
    setPhase("loading");
    setError("");
    setGate(null);
    try {
      await saveEnterpriseWorkplace(applicationId, {
        hqAddress: hqAddr.trim(),
        workplaceAddress: effectiveWork,
        workplaceSameAsHq: sameAsHq
      });
      const attestation = await collectDccSecurityAttestation();
      setClientHint(attestation.clientHints);
      if (attestation.clientHints.wifiBlocked) {
        setError(DCC_SECURITY_COPY.wifi);
        setPhase("fail");
        return;
      }
      if (attestation.clientHints.vpnOrRemoteHint) {
        setError(DCC_SECURITY_COPY.vpnOrRemote);
        setPhase("fail");
        return;
      }
      const res = await attestEnterpriseDccSecurity(applicationId, {
        lat: attestation.lat,
        lng: attestation.lng,
        networkType: attestation.networkType,
        vpnActive: attestation.vpnActive,
        installedPackages: attestation.installedPackages
      });
      setGate(res);
      if (!res.ok) {
        const msg =
          res.message ||
          res.reasons?.[0] ||
          (!res.checks?.vpnRemoteOk
            ? DCC_SECURITY_COPY.vpnOrRemote
            : !res.checks?.locationOk
              ? DCC_SECURITY_COPY.locationMismatch
              : DCC_SECURITY_COPY.wifi);
        setError(msg);
        setPhase("fail");
        onToast?.(msg);
        return;
      }
      setPhase("success");
      if (typeof res.identityVerified === "boolean" && res.identityVerified) {
        try {
          localStorage.setItem("vlue_identity_verified", "1");
        } catch {
          /* ignore */
        }
      }
      onToast?.("실제 근무지 위치 인증이 승인되었습니다.");
      onPassed?.(res);
    } catch (e) {
      const msg = e?.message || "위치 인증에 실패했습니다.";
      setError(msg);
      setPhase("fail");
      onToast?.(msg);
    } finally {
      setBusy(false);
    }
  };

  const hqShown = String(gate?.checks?.hqAddress || hqAddr || "").trim() || "—";
  const workShown = String(gate?.checks?.workplaceAddress || effectiveWork || "").trim() || "—";
  const currentAddress = String(gate?.checks?.currentAddress || "").trim() || "—";
  const radiusM = Number(gate?.checks?.radiusMeters) || 150;
  const distanceM = gate?.checks?.distanceMeters;
  const locationFailed = gate && gate.checks && gate.checks.locationOk === false;

  return (
    <div className={`space-y-3 rounded-xl border p-4 ${panel}`}>
      <p className="text-[13px] font-black">3단계 · 위치확인 인증</p>
      <p className={`text-[11px] leading-relaxed ${muted}`}>
        GPS는 <strong>실제 근무지/매장/지점</strong> 주소와 대조합니다(반경 {radiusM}m). 본사 주소와
        실근무지가 다르면 각각 입력해 주세요.
      </p>

      <label className={`block text-[11px] font-bold ${labelCls}`}>
        사업자/법인/본사 주소
        <span className={`ml-1 font-medium ${muted}`}>(서류 기반)</span>
      </label>
      <input
        className={inputCls}
        value={hqAddr}
        disabled={busy}
        onChange={(e) => setHqAddr(e.target.value)}
        placeholder="예: 대구시 수성구 …"
      />

      <label
        className={`flex items-center gap-2 text-[12px] font-bold ${labelCls} ${busy ? "opacity-50" : ""}`}
      >
        <input
          type="checkbox"
          checked={sameAsHq}
          disabled={busy}
          onChange={(e) => setSameAsHq(e.target.checked)}
          className="h-4 w-4 accent-sky-600"
        />
        본사 주소와 동일
      </label>

      <label className={`block text-[11px] font-bold ${labelCls}`}>
        실제 근무지 / 매장 / 지점 주소
        <span className={`ml-1 font-medium ${muted}`}>(GPS 대조용)</span>
      </label>
      <input
        className={inputCls}
        value={sameAsHq ? hqAddr : workAddr}
        disabled={busy || sameAsHq}
        onChange={(e) => setWorkAddr(e.target.value)}
        placeholder="예: 대구시 북구 …"
      />

      {blockReason && phase !== "loading" ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-[12px] font-bold text-rose-700" role="alert">
          {blockReason}
        </p>
      ) : null}

      {phase === "loading" ? (
        <div
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
            isDarkMode ? "border-sky-500/30 bg-sky-500/10" : "border-sky-200 bg-sky-50"
          }`}
          role="status"
          aria-live="polite"
        >
          <span
            className="inline-block h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-sky-500 border-t-transparent"
            aria-hidden
          />
          <div>
            <p className={`text-[13px] font-black ${isDarkMode ? "text-sky-200" : "text-sky-800"}`}>
              위치를 확인 중입니다...
            </p>
            <p className={`mt-0.5 text-[11px] ${muted}`}>GPS 수집 · 주소 변환 · 실제 근무지 반경 대조</p>
          </div>
        </div>
      ) : null}

      {(phase === "success" || phase === "fail") && gate?.checks ? (
        <div
          className={`rounded-xl border px-3 py-3 ${
            phase === "success"
              ? isDarkMode
                ? "border-emerald-500/40 bg-emerald-500/10"
                : "border-emerald-200 bg-emerald-50"
              : isDarkMode
                ? "border-amber-500/40 bg-amber-500/10"
                : "border-amber-200 bg-amber-50"
          }`}
          role="status"
        >
          <p className={`text-[11px] font-bold ${labelCls}`}>사업장/본사 주소</p>
          <p className={`mt-0.5 text-[13px] font-semibold leading-snug ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
            {hqShown}
          </p>
          <p className={`mt-3 text-[11px] font-bold ${labelCls}`}>실제 근무지 주소</p>
          <p className={`mt-0.5 text-[13px] font-semibold leading-snug ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
            {workShown}
          </p>
          <p className={`mt-3 text-[11px] font-bold ${labelCls}`}>위치확인 주소</p>
          <p className={`mt-0.5 text-[13px] font-semibold leading-snug ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
            {currentAddress}
          </p>
          {distanceM != null ? (
            <p className={`mt-2 text-[11px] ${muted}`}>
              직선거리 {distanceM}m · 허용 반경 {radiusM}m
            </p>
          ) : null}
          <p
            className={`mt-3 text-[13px] font-black ${
              phase === "success"
                ? isDarkMode
                  ? "text-emerald-300"
                  : "text-emerald-800"
                : isDarkMode
                  ? "text-amber-200"
                  : "text-amber-900"
            }`}
          >
            {phase === "success"
              ? "✅ 실제 근무지 위치 인증이 승인되었습니다."
              : locationFailed
                ? `⚠️ 등록된 실제 근무지 위치 근처(반경 ${radiusM}m 이내)에서 인증을 진행해 주세요.`
                : `⚠️ ${error || gate.message || DCC_SECURITY_COPY.locationMismatch}`}
          </p>
        </div>
      ) : null}

      {error && phase === "fail" && !gate?.checks ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-[12px] font-bold text-rose-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void refreshClientHints()}
          className="rounded-lg border border-slate-300 px-3 py-2 text-[12px] font-bold disabled:opacity-45"
        >
          환경 다시 확인
        </button>
        <button
          type="button"
          disabled={buttonBlocked || !canSubmit || phase === "success"}
          onClick={() => void runAttest()}
          className="inline-flex min-w-[8.5rem] items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-[12px] font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          {busy ? (
            <>
              <span
                className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"
                aria-hidden
              />
              위치확인 중…
            </>
          ) : phase === "success" ? (
            "인증 완료"
          ) : (
            "위치확인 인증"
          )}
        </button>
      </div>
    </div>
  );
}
