import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { fetchDccAgentProfiles } from "../../lib/dccAgentProfilesApi.js";
import { fetchDccLines, fetchDccLineBundle } from "../../lib/dccLinesApi.js";
import { fetchMultiDccEntitlement, completeMultiDccCheckout } from "../../lib/jobOccupationVerifyApi.js";
import { createDccAgentProfile } from "../../lib/dccAgentProfilesApi.js";
import { switchToMultiDccProfile } from "../../lib/multiDccSwitch.js";
import { writeDccLinePreviewFromBundle, writeSelectedDccLineId } from "../../lib/dccLineState.js";
import {
  createDefaultShowcaseStyle,
  writeLiveShowcaseStyle,
  writeShowcaseStyle
} from "../../lib/showcase/showcaseStyleStorage.js";
import { showcaseStyleHasContent, writeLocalShowcaseStyleUpdatedAt } from "../../lib/showcase/showcaseStyleSync.js";
import { SOHO_BROADCAST_MONTHLY_KRW } from "../../lib/membershipBm.js";
import { readLetteringFixedIdentity } from "../../lib/letteringBizcardStorage.js";
import DccAgentManageModal from "./DccAgentManageModal.jsx";

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

  const runPayAndCreate = async ({ devBypass = false } = {}) => {
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
      const fixedName = String(readLetteringFixedIdentity().name || "").trim() || "새 프로필";
      await createDccAgentProfile({
        displayName: fixedName,
        title: "",
        department: "",
        label: `프로필 ${profiles.length + 1}`
      });
      onToast?.(`멀티 프로필 슬롯이 추가되었습니다. (월 ${monthlyKrw.toLocaleString("ko-KR")}원)`);
      setPayOpen(false);
      await reload();
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "결제·추가에 실패했습니다.");
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
        title="멀티프로필 — 전화·이름 공유 · 그 외 프로필별 설정"
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
        onClose={() => setOpen(false)}
        onChanged={reload}
        onToast={onToast}
        onRequestPayCreate={() => setPayOpen(true)}
        onSelectLine={(id) => {
          if (!id) return;
          void fetchDccLineBundle(id)
            .then(applyLineToLocalPreview)
            .catch((e) => onToast?.(e instanceof Error ? e.message : "번호 로드 실패"));
        }}
        onSwitchProfile={(profile) => void switchToProfile(profile)}
      />
      {payOpen ? (
        <div className="fixed inset-0 z-[230] flex items-end justify-center bg-black/45 px-4 pb-8 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl">
            <p className="text-[15px] font-black text-slate-900">
              멀티 프로필 추가 · 월 {monthlyKrw.toLocaleString("ko-KR")}원
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
              DCC·쇼케이스·BGM 등 유료 콘텐츠를 프로필마다 따로 쓰려면 슬롯 결제가 필요합니다. 전화번호와
              이름만 공유됩니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-[12px] font-bold text-white disabled:opacity-60"
                onClick={() => void runPayAndCreate({ devBypass: import.meta.env.DEV })}
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : null}
                {import.meta.env.DEV ? "개발 결제 후 추가" : "결제 후 추가"}
              </button>
              <button
                type="button"
                className="rounded-xl px-3 py-2 text-[12px] font-bold text-slate-500"
                onClick={() => setPayOpen(false)}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
