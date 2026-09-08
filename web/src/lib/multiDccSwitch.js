import { activateDccAgentProfile, fetchDccProfileBundle } from "./dccAgentProfilesApi.js";
import { fetchDccLineBundle } from "./dccLinesApi.js";
import {
  applyDccAgentBundleToLocalCard,
  DCC_AGENT_CHANGED_EVENT,
  writeEditingMultiDccProfileId
} from "./dccAgentProfileState.js";
import {
  writeDccLinePreviewFromBundle,
  writeSelectedDccLineId
} from "./dccLineState.js";
import {
  createDefaultShowcaseStyle,
  writeLiveShowcaseStyle,
  writeShowcaseStyle
} from "./showcase/showcaseStyleStorage.js";
import { showcaseStyleHasContent, writeLocalShowcaseStyleUpdatedAt } from "./showcase/showcaseStyleSync.js";

/**
 * 멀티 프로필 전환 — 전화·이름만 유지, DCC·쇼케이스·BGM·상호·계좌 등은 프로필 번들로 교체.
 */
export async function switchToMultiDccProfile(profile, opts = {}) {
  if (!profile?.id) return null;
  const lines = Array.isArray(opts.lines) ? opts.lines : [];
  const lineId =
    (Array.isArray(profile.assignedLineIds) && profile.assignedLineIds[0]) ||
    opts.preferredLineId ||
    lines[0]?.id ||
    "";

  await activateDccAgentProfile(profile.id, lineId || undefined);
  writeEditingMultiDccProfileId(profile.id);

  let bundle = null;
  try {
    bundle = await fetchDccProfileBundle(profile.id);
  } catch {
    bundle = null;
  }

  applyDccAgentBundleToLocalCard(profile, bundle);

  const editor = bundle?.showcase?.editor || bundle?.showcase?.live || null;
  const live = bundle?.showcase?.live || editor;
  if (showcaseStyleHasContent(editor) || showcaseStyleHasContent(live)) {
    writeShowcaseStyle(editor || live, { replace: true, skipSync: true });
    writeLiveShowcaseStyle(live || editor, { source: "editor", skipSync: true });
    if (bundle?.showcase?.updatedAt) writeLocalShowcaseStyleUpdatedAt(bundle.showcase.updatedAt);
  } else {
    const empty = createDefaultShowcaseStyle();
    writeShowcaseStyle(empty, { replace: true, skipSync: true });
    writeLiveShowcaseStyle(empty, { source: "editor", skipSync: true });
  }

  if (lineId) {
    writeSelectedDccLineId(lineId);
    try {
      const lineBundle = await fetchDccLineBundle(lineId);
      writeDccLinePreviewFromBundle(lineBundle, { replaceMedia: true });
    } catch {
      /* profile bundle already applied locally */
    }
  }

  try {
    window.dispatchEvent(new Event("vlue-showcase-style-changed"));
    window.dispatchEvent(new Event("vlue-showcase-live-style-changed"));
    window.dispatchEvent(new Event("vlue-lettering-bizcard-changed"));
    window.dispatchEvent(new Event("vlue-digital-card-changed"));
    window.dispatchEvent(
      new CustomEvent(DCC_AGENT_CHANGED_EVENT, { detail: { profileId: profile.id } })
    );
  } catch {
    /* ignore */
  }

  return { profileId: profile.id, lineId, bundle };
}
