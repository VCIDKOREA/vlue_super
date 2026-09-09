import { useCallback, useEffect, useState } from "react";
import { fetchDccAgentProfiles } from "../../lib/dccAgentProfilesApi.js";
import { fetchDccLines, fetchDccLineBundle } from "../../lib/dccLinesApi.js";
import { fetchMultiDccEntitlement, completeMultiDccCheckout } from "../../lib/jobOccupationVerifyApi.js";
import { switchToMultiDccProfile } from "../../lib/multiDccSwitch.js";
import { writeDccLinePreviewFromBundle, writeSelectedDccLineId } from "../../lib/dccLineState.js";
import {
  createDefaultShowcaseStyle,
  writeLiveShowcaseStyle,
  writeShowcaseStyle
} from "../../lib/showcase/showcaseStyleStorage.js";
import { showcaseStyleHasContent, writeLocalShowcaseStyleUpdatedAt } from "../../lib/showcase/showcaseStyleSync.js";
import { SOHO_BROADCAST_MONTHLY_KRW } from "../../lib/membershipBm.js";
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
 * 홈 상단 「멀티프로필 +」 — 결제 게이트 · 즉시 전환 · 프로필별 DCC/쇼케이스.
 */
export default function HeaderMultiProfileButton({ requireAuth, onToast }) {
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [lines, setLines] = useState([]);
  const [allowedSlots, setAllowedSlots] = useState(1);
  const [monthlyKrw, setMonthlyKrw] = useState(SOHO_BROADCAST_MONTHLY_KRW);
  const [payOpen, setPayOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [openCreateForm, setOpenCreateForm] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [p, l, e] = await Promise.all([
        fetchDccAgentProfiles(),
        fetchDccLines().catch(() => ({ lines: [] })),
        fetchMultiDccEntitlement().catch(() => null)
      ]);
      setProfiles(Array.isArray(p.profiles) ? p.profiles : []);
      const slots =
        Number(e?.allowedSlots) ||
        Number(p.entitlement?.allowedSlots) ||
        Number(p.maxCount) ||
        1;
      setAllowedSlots(slots);
      setMonthlyKrw(Number(e?.monthlyKrw) || SOHO_BROADCAST_MONTHLY_KRW);
      setLines(Array.isArray(l.lines) ? l.lines : []);
    } catch (err) {
      onToast?.(err instanceof Error ? err.message : "멀티 프로필을 불러오지 못했습니다.");
    }
  }, [onToast]);

  useEffect(() => {
    if (open) void reload();
  }, [open, reload]);

  const switchToProfile = async (profile) => {
    if (!profile?.id) return;
    try {
      await switchToMultiDccProfile(profile, { lines });
      onToast?.(`「${profile.label || profile.displayName || "프로필"}」로 전환했습니다.`);
      setOpen(false);
      await reload();
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "프로필 전환에 실패했습니다.");
    }
  };

  const requestPay = () => {
    setOpen(false);
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
      setOpen(true);
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "결제에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => requireAuth?.(() => setOpen(true)) ?? setOpen(true)}
        className="shrink-0 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-800 shadow-sm active:scale-95"
        aria-label="멀티프로필"
        title="멀티프로필"
      >
        멀티프로필 +
      </button>
      <DccAgentManageModal
        open={open}
        profiles={profiles}
        lines={lines}
        maxCount={allowedSlots}
        allowedSlots={allowedSlots}
        monthlyKrw={monthlyKrw}
        openCreateForm={openCreateForm}
        onCreateFormConsumed={() => setOpenCreateForm(false)}
        onClose={() => {
          setOpen(false);
          setOpenCreateForm(false);
        }}
        onChanged={reload}
        onToast={onToast}
        onRequestPayCreate={requestPay}
        onSelectLine={(id) => {
          if (!id) return;
          void fetchDccLineBundle(id)
            .then(applyLineToLocalPreview)
            .catch((e) => onToast?.(e instanceof Error ? e.message : "번호 로드 실패"));
        }}
        onSwitchProfile={(profile) => void switchToProfile(profile)}
      />
      <MultiDccPaySheet
        open={payOpen}
        monthlyKrw={monthlyKrw}
        busy={busy}
        onClose={() => setPayOpen(false)}
        onConfirm={(opts) => void runPayUnlockSlot(opts)}
      />
    </>
  );
}
