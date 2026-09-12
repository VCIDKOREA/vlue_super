import { useEffect, useState } from "react";
import {
  collectDccSecurityAttestation,
  DCC_SECURITY_COPY
} from "../lib/dccSecurityAttestation.js";
import { attestEnterpriseDccSecurity, saveEnterpriseWorkplace } from "../lib/enterpriseDccApi.js";

/**
 * DCC 최종 방어선 UI — 위치·모바일데이터·VPN/원격
 */
export default function DccSecurityLocationGate({
  applicationId,
  workplaceAddress = "",
  isDarkMode = false,
  onPassed,
  onToast
}) {
  const [addr, setAddr] = useState(workplaceAddress || "");
  const [busy, setBusy] = useState(false);
  const [gate, setGate] = useState(null);
  const [error, setError] = useState("");
  const [clientHint, setClientHint] = useState(null);

  const panel = isDarkMode ? "border-white/15 bg-slate-900/60" : "border-amber-100 bg-amber-50/80";
  const inputCls = isDarkMode
    ? "w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-[13px]"
    : "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px]";

  useEffect(() => {
    setAddr(workplaceAddress || "");
  }, [workplaceAddress]);

  const refreshClientHints = async () => {
    try {
      const a = await collectDccSecurityAttestation();
      setClientHint(a.clientHints);
      setGate(null);
      setError("");
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

  const runAttest = async () => {
    if (!applicationId || buttonBlocked) return;
    setBusy(true);
    setError("");
    try {
      if (addr.trim()) {
        await saveEnterpriseWorkplace(applicationId, { workplaceAddress: addr.trim() });
      }
      const attestation = await collectDccSecurityAttestation();
      setClientHint(attestation.clientHints);
      if (attestation.clientHints.wifiBlocked) {
        setError(DCC_SECURITY_COPY.wifi);
        return;
      }
      if (attestation.clientHints.vpnOrRemoteHint) {
        setError(DCC_SECURITY_COPY.vpnOrRemote);
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
        onToast?.(msg);
        return;
      }
      onToast?.("위치·보안 환경 인증이 완료되었습니다.");
      onPassed?.(res);
    } catch (e) {
      const msg = e?.message || "위치 인증에 실패했습니다.";
      setError(msg);
      onToast?.(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`space-y-3 rounded-xl border p-4 ${panel}`}>
      <p className="text-[13px] font-black">최종 보안 인증 (위치·기기 환경)</p>
      <p className={`text-[11px] leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
        대표자를 포함한 모든 DCC 신청자는 사업장 위치에서, 모바일 데이터로, VPN·원격제어 앱을 끈 뒤
        인증해야 합니다.
      </p>

      <label className="block text-[11px] font-bold opacity-70">사업장 주소 (공식 주소지)</label>
      <input
        className={inputCls}
        value={addr}
        onChange={(e) => setAddr(e.target.value)}
        placeholder="예: 서울특별시 …"
      />

      {blockReason ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-[12px] font-bold text-rose-700" role="alert">
          {blockReason}
        </p>
      ) : null}
      {error && error !== blockReason ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-[12px] font-bold text-rose-700" role="alert">
          {error}
        </p>
      ) : null}
      {gate?.checks ? (
        <p className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
          거리 {gate.checks.distanceMeters != null ? `${gate.checks.distanceMeters}m` : "—"} / 허용{" "}
          {gate.checks.radiusMeters}m · 데이터{" "}
          {gate.checks.mobileDataOk ? "OK" : "차단"} · VPN/원격{" "}
          {gate.checks.vpnRemoteOk ? "OK" : "차단"}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void refreshClientHints()}
          className="rounded-lg border border-slate-300 px-3 py-2 text-[12px] font-bold"
        >
          환경 다시 확인
        </button>
        <button
          type="button"
          disabled={buttonBlocked || !addr.trim()}
          onClick={() => void runAttest()}
          className="rounded-lg bg-sky-600 px-4 py-2 text-[12px] font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          {busy ? "인증 중…" : "위치 인증"}
        </button>
      </div>
    </div>
  );
}
