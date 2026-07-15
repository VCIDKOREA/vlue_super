import { useCallback, useEffect, useState } from "react";
import { approveDevice, fetchPendingDevices } from "../lib/enterpriseShopApi.js";
import { requirePinForSensitiveAction } from "../lib/appLockBridge.js";

/** 마이페이지 — 미승인 PC/기기 승인 (카카오 PC 벤치마킹) */
export default function DeviceApprovalPanel() {
  const [devices, setDevices] = useState([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await fetchPendingDevices();
      setDevices(Array.isArray(list) ? list : []);
    } catch {
      setDevices([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (id) => {
    setBusy(true);
    setMsg("");
    try {
      const auth = await requirePinForSensitiveAction("remote_device");
      if (!auth.ok) {
        setMsg(auth.requiresReset ? "PIN 재설정이 필요합니다." : "기기 승인 전 PIN 인증이 필요합니다.");
        return;
      }
      await approveDevice(id);
      setMsg("기기가 승인되었습니다. 해당 PC에서 다시 로그인해 주세요.");
      await load();
    } catch (e) {
      setMsg(e?.message || "승인 실패");
    } finally {
      setBusy(false);
    }
  };

  if (devices.length === 0) return null;

  return (
    <section className="mt-3 rounded-xl border border-amber-200 bg-amber-50/90 p-3">
      <p className="text-[12px] font-black text-amber-950">기기 승인 대기 ({devices.length})</p>
      <p className="mt-1 text-[10px] text-amber-900/85">
        새 PC·브라우저 로그인은 승인된 기기에서만 허용됩니다. 아래 기기를 확인 후 승인해 주세요.
      </p>
      <ul className="mt-2 space-y-2">
        {devices.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-amber-100 bg-white px-2 py-2">
            <div>
              <p className="text-[11px] font-bold text-slate-800">{d.label || d.clientKind || "PC"}</p>
              <p className="max-w-[200px] truncate text-[9px] text-slate-500">{d.userAgent || ""}</p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => approve(d.id)}
              className="shrink-0 rounded-lg bg-amber-600 px-2.5 py-1.5 text-[10px] font-black text-white disabled:opacity-50"
            >
              승인
            </button>
          </li>
        ))}
      </ul>
      {msg && <p className="mt-2 text-[10px] font-semibold text-amber-900">{msg}</p>}
    </section>
  );
}
