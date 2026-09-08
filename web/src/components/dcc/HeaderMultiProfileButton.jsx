import { useCallback, useEffect, useState } from "react";
import {
  activateDccAgentProfile,
  fetchDccAgentProfiles
} from "../../lib/dccAgentProfilesApi.js";
import { fetchDccLines, fetchDccLineBundle } from "../../lib/dccLinesApi.js";
import { applyDccAgentToLocalCard, DCC_AGENT_CHANGED_EVENT } from "../../lib/dccAgentProfileState.js";
import {
  writeDccLinePreviewFromBundle,
  writeSelectedDccLineId
} from "../../lib/dccLineState.js";
import {
  createDefaultShowcaseStyle,
  readLiveShowcaseStyle,
  readShowcaseStyle,
  writeLiveShowcaseStyle,
  writeShowcaseStyle
} from "../../lib/showcase/showcaseStyleStorage.js";
import { showcaseStyleHasContent, writeLocalShowcaseStyleUpdatedAt } from "../../lib/showcase/showcaseStyleSync.js";
import DccAgentManageModal, { writeEditingMultiDccProfileId } from "./DccAgentManageModal.jsx";

function applyLineToLocalPreview(bundle) {
  const line = bundle?.line;
  if (!line?.id) return;
  writeDccLinePreviewFromBundle(bundle);
  writeSelectedDccLineId(line.id);
  const editor = bundle.showcase?.editor || bundle.showcase?.live || null;
  const live = bundle.showcase?.live || editor;
  const has = showcaseStyleHasContent(editor) || showcaseStyleHasContent(live);
  if (has) {
    writeShowcaseStyle(editor || live, { replace: true, skipSync: true });
    writeLiveShowcaseStyle(live || editor, { source: "editor", skipSync: true });
    if (bundle.showcase?.updatedAt) writeLocalShowcaseStyleUpdatedAt(bundle.showcase.updatedAt);
  } else if (
    line.isCertified &&
    (showcaseStyleHasContent(readShowcaseStyle()) || showcaseStyleHasContent(readLiveShowcaseStyle()))
  ) {
    /* keep */
  } else if (!line.isCertified) {
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
 * 홈 상단 「멀티프로필 +」 — 명함스캐너와 프로필 아바타 사이.
 * 팝업에서 프로필 선택 시 즉시 활성 프로필로 전환.
 */
export default function HeaderMultiProfileButton({
  requireAuth,
  onToast
}) {
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [lines, setLines] = useState([]);
  const [maxCount, setMaxCount] = useState(20);

  const reload = useCallback(async () => {
    try {
      const [p, l] = await Promise.all([
        fetchDccAgentProfiles(),
        fetchDccLines().catch(() => ({ lines: [] }))
      ]);
      setProfiles(Array.isArray(p.profiles) ? p.profiles : []);
      setMaxCount(Number(p.maxCount) || Number(p.entitlement?.allowedSlots) || 20);
      setLines(Array.isArray(l.lines) ? l.lines : []);
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "멀티 프로필을 불러오지 못했습니다.");
    }
  }, [onToast]);

  useEffect(() => {
    if (open) void reload();
  }, [open, reload]);

  const switchToProfile = async (profile) => {
    if (!profile?.id) return;
    try {
      const lineId =
        (Array.isArray(profile.assignedLineIds) && profile.assignedLineIds[0]) ||
        lines[0]?.id ||
        "";
      await activateDccAgentProfile(profile.id, lineId || undefined);
      applyDccAgentToLocalCard(profile);
      writeEditingMultiDccProfileId(profile.id);
      if (lineId) {
        writeSelectedDccLineId(lineId);
        try {
          const bundle = await fetchDccLineBundle(lineId);
          applyLineToLocalPreview(bundle);
        } catch {
          /* ignore */
        }
      }
      try {
        window.dispatchEvent(
          new CustomEvent(DCC_AGENT_CHANGED_EVENT, { detail: { profileId: profile.id } })
        );
      } catch {
        /* ignore */
      }
      onToast?.(`「${profile.displayName || "프로필"}」로 전환했습니다.`);
      setOpen(false);
      await reload();
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "프로필 전환에 실패했습니다.");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() =>
          requireAuth?.(() => setOpen(true)) ?? setOpen(true)
        }
        className="shrink-0 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-800 shadow-sm active:scale-95"
        aria-label="멀티프로필"
        title="멀티프로필 — 계정 1개 · 프로필 N개"
      >
        멀티프로필 +
      </button>
      <DccAgentManageModal
        open={open}
        profiles={profiles}
        lines={lines}
        maxCount={maxCount}
        onClose={() => setOpen(false)}
        onChanged={reload}
        onToast={onToast}
        onSelectLine={(id) => {
          if (!id) return;
          void fetchDccLineBundle(id)
            .then(applyLineToLocalPreview)
            .catch((e) => onToast?.(e instanceof Error ? e.message : "번호 로드 실패"));
        }}
        onSwitchProfile={(profile) => void switchToProfile(profile)}
      />
    </>
  );
}
