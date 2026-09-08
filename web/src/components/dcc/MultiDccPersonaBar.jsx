import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { SOHO_BROADCAST_MONTHLY_KRW } from "../../lib/membershipBm.js";
import {
  completeMultiDccCheckout,
  fetchMultiDccEntitlement
} from "../../lib/jobOccupationVerifyApi.js";
import { createDccAgentProfile, fetchDccAgentProfiles } from "../../lib/dccAgentProfilesApi.js";
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
 * 멀티 DCC 프로필 — 계정 1개 · 프로필 N개 (DCC~쇼케이스 전체)
 * 번호 지정 송출 · 미지정/모르는 상대는 대표 프로필
 */
export default function MultiDccPersonaBar({ isDarkMode = false, onToast, compact = false }) {
  const [profiles, setProfiles] = useState([]);
  const [lines, setLines] = useState([]);
  const [ent, setEnt] = useState(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

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
    setManageOpen(true);
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
      onToast?.(`멀티 DCC 프로필 슬롯이 추가되었습니다. (월 ${monthlyKrw.toLocaleString("ko-KR")}원)`);
      setPayOpen(false);
      await reload();
      setManageOpen(true);
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "결제·추가에 실패했습니다.");
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
              전화·이름만 공유. DCC·쇼케이스·BGM·상호·계좌는 프로필마다 새로. 추가 슬롯 장당 SOHO +
              {monthlyKrw.toLocaleString("ko-KR")}원.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={startAdd}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-800 shadow-sm sm:px-3 sm:text-[12px]"
        >
          <Plus size={14} />
          멀티 DCC +
        </button>
      </div>
      <p className={`mt-2 text-[10px] font-semibold ${isDarkMode ? "text-gray-500" : "text-slate-400"}`}>
        사용 중 {profiles.length}/{allowed} · 무료 {ent?.freeSlots ?? 1} · 결제 슬롯 {ent?.paidSlots ?? 0}
        {rep ? ` · 대표 ${rep.displayName || "프로필"}` : ""}
      </p>
      <button
        type="button"
        className={`mt-2 text-[11px] font-bold underline-offset-2 hover:underline ${
          isDarkMode ? "text-cyan-300" : "text-blue-700"
        }`}
        onClick={() => setManageOpen(true)}
      >
        프로필 · 번호 배정 관리
      </button>

      {payOpen ? (
        <div
          className={`mt-3 rounded-xl border p-3 ${
            isDarkMode ? "border-white/10 bg-black/30" : "border-slate-200 bg-slate-50"
          }`}
        >
          <p className={`text-[12px] font-black ${isDarkMode ? "text-gray-100" : "text-slate-900"}`}>
            멀티 DCC 프로필 추가 · 월 {monthlyKrw.toLocaleString("ko-KR")}원 (SOHO)
          </p>
          <p className={`mt-1 text-[10px] ${isDarkMode ? "text-gray-400" : "text-slate-500"}`}>
            새 프로필마다 DCC·쇼케이스·BGM을 새로 설정합니다. 전화번호와 이름만 공유됩니다.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
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
              className={`rounded-xl px-3 py-2 text-[12px] font-bold ${
                isDarkMode ? "text-gray-400" : "text-slate-500"
              }`}
              onClick={() => setPayOpen(false)}
            >
              취소
            </button>
          </div>
        </div>
      ) : null}

      <DccAgentManageModal
        open={manageOpen}
        profiles={profiles}
        lines={lines}
        maxCount={allowed}
        allowedSlots={allowed}
        monthlyKrw={monthlyKrw}
        onClose={() => setManageOpen(false)}
        onChanged={reload}
        onToast={onToast}
        onRequestPayCreate={() => setPayOpen(true)}
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
