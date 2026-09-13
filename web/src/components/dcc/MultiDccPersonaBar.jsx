import { useCallback, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { SOHO_BROADCAST_MONTHLY_KRW } from "../../lib/membershipBm.js";
import {
  completeMultiDccCheckout,
  fetchMultiDccEntitlement
} from "../../lib/jobOccupationVerifyApi.js";
import { fetchDccAgentProfiles } from "../../lib/dccAgentProfilesApi.js";
import { fetchDccLines } from "../../lib/dccLinesApi.js";
import {
  createCleanMultiDccProfileAndSwitch,
  switchToMultiDccProfile
} from "../../lib/multiDccSwitch.js";
import DccAgentManageModal from "./DccAgentManageModal.jsx";
import MultiDccPaySheet from "./MultiDccPaySheet.jsx";

/**
 * 멀티 프로필 — 계정 전환 진입
 */
export default function MultiDccPersonaBar({ isDarkMode = false, onToast, compact = false }) {
  const [profiles, setProfiles] = useState([]);
  const [lines, setLines] = useState([]);
  const [ent, setEnt] = useState(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [openCreateForm, setOpenCreateForm] = useState(false);
  const onToastRef = useRef(onToast);
  onToastRef.current = onToast;

  const monthlyKrw = ent?.monthlyKrw || SOHO_BROADCAST_MONTHLY_KRW;

  const reload = useCallback(async () => {
    try {
      const [p, e, l] = await Promise.all([
        fetchDccAgentProfiles(),
        fetchMultiDccEntitlement().catch(() => null),
        fetchDccLines().catch(() => ({ lines: [] }))
      ]);
      setProfiles(Array.isArray(p.profiles) ? p.profiles : []);
      setEnt(e);
      setLines(Array.isArray(l.lines) ? l.lines : []);
    } catch (err) {
      onToastRef.current?.(err instanceof Error ? err.message : "멀티 프로필을 불러오지 못했습니다.");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const allowed = Number(ent?.allowedSlots) || 1;
  const needPay = profiles.length >= allowed;
  const active = profiles.find((p) => p.isActive) || profiles[0];
  const rep = profiles.find((p) => p.isRepresentative) || profiles[0];

  const startAdd = () => {
    if (needPay) {
      setPayOpen(true);
      return;
    }
    setOpenCreateForm(true);
    setManageOpen(true);
  };

  const requestPay = () => {
    setManageOpen(false);
    setPayOpen(true);
  };

  const runPayUnlockSlot = async ({ devBypass = false } = {}) => {
    setBusy(true);
    try {
      let userId = "";
      try {
        userId = localStorage.getItem("vlue_server_user_id") || "";
      } catch {
        /* ignore */
      }
      const merchant_uid = devBypass ? `dev_multi_dcc_${Date.now()}` : `multi_dcc_${Date.now()}`;
      if (devBypass && !import.meta.env.DEV) {
        throw new Error("개발 결제 우회는 로컬에서만 가능합니다.");
      }
      await completeMultiDccCheckout({
        amountKrw: monthlyKrw,
        billingCycle: "monthly",
        merchant_uid,
        customer_uid: userId ? `user_customer_${userId}` : undefined,
        slotsToAdd: 1,
        devBillingBypass: Boolean(devBypass)
      });
      onToast?.("슬롯이 열렸습니다. 새 프로필을 만듭니다…");
      setPayOpen(false);
      setOpenCreateForm(true);
      await reload();
      setManageOpen(true);
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "결제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const createAndSwitch = async () => {
    const profile = await createCleanMultiDccProfileAndSwitch({
      lines,
      nextIndex: profiles.length + 1,
      profiles
    });
    onToast?.(
      `「${profile.label || "새 프로필"}」로 전환했습니다. 이름·전화 외 정보는 새로 입력하세요.`
    );
    setManageOpen(false);
    await reload();
  };

  const shell = isDarkMode
    ? "rounded-2xl border border-white/10 bg-white/[0.04] p-3 max-w-full min-w-0 overflow-hidden"
    : "rounded-2xl border border-slate-200 bg-white p-3 shadow-sm max-w-full min-w-0 overflow-hidden";

  return (
    <div className={shell}>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={`text-[13px] font-black ${isDarkMode ? "text-gray-100" : "text-slate-900"}`}>
            멀티프로필 +
          </p>
          {!compact ? (
            <p className={`mt-0.5 text-[10px] leading-relaxed ${isDarkMode ? "text-gray-400" : "text-slate-500"}`}>
              이름·전화만 공유 · 나머지는 프로필마다 새로 설정
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={startAdd}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-800 shadow-sm sm:px-3 sm:text-[12px]"
        >
          <Plus size={14} />
          {needPay ? "결제 후 추가" : "새 프로필"}
        </button>
      </div>
      <p className={`mt-2 text-[10px] font-semibold ${isDarkMode ? "text-gray-500" : "text-slate-400"}`}>
        {profiles.length}/{allowed}
        {active ? ` · 사용 중 ${active.label || active.displayName}` : ""}
        {rep ? ` · 대표 ${rep.label || rep.displayName}` : ""}
      </p>
      <button
        type="button"
        className={`mt-2 text-[11px] font-bold underline-offset-2 hover:underline ${
          isDarkMode ? "text-cyan-300" : "text-blue-700"
        }`}
        onClick={() => setManageOpen(true)}
      >
        계정 전환
      </button>

      <MultiDccPaySheet
        open={payOpen}
        monthlyKrw={monthlyKrw}
        busy={busy}
        onClose={() => setPayOpen(false)}
        onConfirm={(opts) => void runPayUnlockSlot(opts)}
      />

      <DccAgentManageModal
        open={manageOpen}
        profiles={profiles}
        lines={lines}
        maxCount={allowed}
        allowedSlots={allowed}
        monthlyKrw={monthlyKrw}
        openCreateForm={openCreateForm}
        onCreateFormConsumed={() => setOpenCreateForm(false)}
        onClose={() => {
          setManageOpen(false);
          setOpenCreateForm(false);
        }}
        onChanged={reload}
        onToast={onToast}
        onRequestPayCreate={requestPay}
        onCreateAndSwitch={createAndSwitch}
        onSwitchProfile={(profile) =>
          void switchToMultiDccProfile(profile, { lines })
            .then(() => {
              onToast?.(`「${profile.label || profile.displayName || "프로필"}」로 전환했습니다.`);
              setManageOpen(false);
              return reload();
            })
            .catch((e) => onToast?.(e instanceof Error ? e.message : "프로필 전환에 실패했습니다."))
        }
      />
    </div>
  );
}
