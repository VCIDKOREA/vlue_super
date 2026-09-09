import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { SOHO_BROADCAST_MONTHLY_KRW } from "../../lib/membershipBm.js";
import {
  completeMultiDccCheckout,
  fetchMultiDccEntitlement
} from "../../lib/jobOccupationVerifyApi.js";
import { fetchDccAgentProfiles } from "../../lib/dccAgentProfilesApi.js";
import { fetchDccLines, fetchDccLineBundle } from "../../lib/dccLinesApi.js";
import {
  writeDccLinePreviewFromBundle,
  writeSelectedDccLineId
} from "../../lib/dccLineState.js";
import {
  createDefaultShowcaseStyle,
  writeLiveShowcaseStyle,
  writeShowcaseStyle
} from "../../lib/showcase/showcaseStyleStorage.js";
import { showcaseStyleHasContent, writeLocalShowcaseStyleUpdatedAt } from "../../lib/showcase/showcaseStyleSync.js";
import { switchToMultiDccProfile } from "../../lib/multiDccSwitch.js";
import DccAgentManageModal from "./DccAgentManageModal.jsx";
import MultiDccPaySheet from "./MultiDccPaySheet.jsx";

function applyLineToLocalPreview(bundle) {
  const line = bundle?.line;
  if (!line?.id) return;
  writeDccLinePreviewFromBundle(bundle, { replaceMedia: true });
  writeSelectedDccLineId(line.id);
  const editor = bundle.showcase?.editor || bundle.showcase?.live || null;
  const live = bundle.showcase?.live || editor;
  const has = showcaseStyleHasContent(editor) || showcaseStyleHasContent(live);
  if (has) {
    writeShowcaseStyle(editor || live, { replace: true, skipSync: true });
    writeLiveShowcaseStyle(live || editor, { source: "editor", skipSync: true });
    if (bundle.showcase?.updatedAt) writeLocalShowcaseStyleUpdatedAt(bundle.showcase.updatedAt);
  } else {
    const empty = createDefaultShowcaseStyle();
    writeShowcaseStyle(empty, { replace: true, skipSync: true });
    writeLiveShowcaseStyle(empty, { source: "editor", skipSync: true });
  }
  try {
    window.dispatchEvent(new Event("vlue-showcase-style-changed"));
    window.dispatchEvent(new Event("vlue-showcase-live-style-changed"));
    window.dispatchEvent(new Event("vlue-lettering-bizcard-changed"));
  } catch {
    /* ignore */
  }
}

/**
 * 멀티 DCC 프로필 — 계정 1개 · 프로필 N개 (DCC~쇼케이스 전체)
 */
export default function MultiDccPersonaBar({ isDarkMode = false, onToast, compact = false }) {
  const [profiles, setProfiles] = useState([]);
  const [lines, setLines] = useState([]);
  const [ent, setEnt] = useState(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [openCreateForm, setOpenCreateForm] = useState(false);

  const monthlyKrw = ent?.monthlyKrw || SOHO_BROADCAST_MONTHLY_KRW;

  const reload = useCallback(async () => {
    try {
      const [p, e, l] = await Promise.all([
        fetchDccAgentProfiles(),
        fetchMultiDccEntitlement(),
        fetchDccLines().catch(() => ({ lines: [] }))
      ]);
      setProfiles(Array.isArray(p.profiles) ? p.profiles : []);
      setEnt(e);
      setLines(Array.isArray(l.lines) ? l.lines : []);
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "멀티 DCC 정보를 불러오지 못했습니다.");
    }
  }, [onToast]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const allowed = Number(ent?.allowedSlots) || 1;
  const needPay = profiles.length >= allowed;

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
      onToast?.("슬롯이 열렸습니다. 새 프로필을 만들어 주세요.");
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

  const onSelectLine = async (lineId) => {
    if (!lineId) return;
    try {
      const bundle = await fetchDccLineBundle(lineId);
      applyLineToLocalPreview(bundle);
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "번호 설정을 불러오지 못했습니다.");
    }
  };

  const shell = isDarkMode
    ? "rounded-2xl border border-white/10 bg-white/[0.04] p-3 max-w-full min-w-0 overflow-hidden"
    : "rounded-2xl border border-slate-200 bg-white p-3 shadow-sm max-w-full min-w-0 overflow-hidden";

  const rep = profiles.find((p) => p.isRepresentative) || profiles[0];

  return (
    <div className={shell}>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={`text-[13px] font-black ${isDarkMode ? "text-gray-100" : "text-slate-900"}`}>
            멀티 DCC
          </p>
          {!compact ? (
            <p className={`mt-0.5 text-[10px] leading-relaxed ${isDarkMode ? "text-gray-400" : "text-slate-500"}`}>
              전화·이름 공유 · 그 외 프로필별 · 추가 슬롯 월 {monthlyKrw.toLocaleString("ko-KR")}원
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={startAdd}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-800 shadow-sm sm:px-3 sm:text-[12px]"
        >
          <Plus size={14} />
          {needPay ? "결제 후 추가" : "프로필 추가"}
        </button>
      </div>
      <p className={`mt-2 text-[10px] font-semibold ${isDarkMode ? "text-gray-500" : "text-slate-400"}`}>
        {profiles.length}/{allowed}
        {rep ? ` · 대표 ${rep.displayName || "프로필"}` : ""}
      </p>
      <button
        type="button"
        className={`mt-2 text-[11px] font-bold underline-offset-2 hover:underline ${
          isDarkMode ? "text-cyan-300" : "text-blue-700"
        }`}
        onClick={() => setManageOpen(true)}
      >
        프로필 관리
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
        onSelectLine={(id) => void onSelectLine(id)}
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
