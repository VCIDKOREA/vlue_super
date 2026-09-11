import {
  activateDccAgentProfile,
  createDccAgentProfile,
  fetchDccProfileBundle,
  putDccProfileBundle
} from "./dccAgentProfilesApi.js";
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
import { readLetteringFixedIdentity } from "./letteringBizcardStorage.js";
import {
  createDefaultShowcaseStyle,
  writeLiveShowcaseStyle,
  writeShowcaseStyle
} from "./showcase/showcaseStyleStorage.js";
import { showcaseStyleHasContent, writeLocalShowcaseStyleUpdatedAt } from "./showcase/showcaseStyleSync.js";

function emptyDccSnapshot(sharedName) {
  return {
    name: sharedName || "",
    displayName: sharedName || "",
    title: "",
    department: "",
    photoUrl: "",
    photoFocus: "center",
    titlePhotoUrl: "",
    noTitlePhoto: true,
    logoUrl: "",
    noCompanyLogo: true,
    email: "",
    website: "",
    noWebsite: true,
    fax: "",
    noFax: true,
    address: "",
    addressRoad: "",
    addressDetail: "",
    organization: "",
    companyName: "",
    companyIntro: "",
    customBackText: "",
    salesContent: "",
    accountType: "",
    bankName: "",
    accountNumber: "",
    accountHolder: "",
    isGroupVerified: false,
    accountGroupDocName: ""
  };
}

/**
 * 멀티 프로필 전환 — 전화·이름만 유지, DCC·쇼케이스·BGM·상호·계좌 등은 프로필 번들로 교체.
 * 빈 프로필이면 로컬을 깨끗이 비운다.
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

  const fixed = readLetteringFixedIdentity();
  const sharedName = String(fixed.name || profile.displayName || "").trim();
  const forceClean =
    Boolean(opts.forceClean) ||
    (!profile.hasDcc && !profile.hasShowcase) ||
    !bundle?.dcc ||
    (bundle.dcc && typeof bundle.dcc === "object" && Object.keys(bundle.dcc).length === 0);

  if (forceClean) {
    applyDccAgentBundleToLocalCard(
      { ...profile, title: "", department: "", photoUrl: null },
      { dcc: emptyDccSnapshot(sharedName), showcase: { editor: null, live: null } },
      { replaceAccount: true }
    );
    const empty = createDefaultShowcaseStyle();
    writeShowcaseStyle(empty, { replace: true, skipSync: true });
    writeLiveShowcaseStyle(empty, { source: "editor", skipSync: true });
  } else {
    applyDccAgentBundleToLocalCard(profile, bundle, { replaceAccount: true });
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
  }

  if (lineId) {
    writeSelectedDccLineId(lineId);
    try {
      const lineBundle = await fetchDccLineBundle(lineId);
      if (!forceClean) {
        writeDccLinePreviewFromBundle(lineBundle, { replaceMedia: true });
      }
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

  return { profileId: profile.id, lineId, bundle, forceClean };
}

/**
 * 멀티프로필+ — 즉시 생성 후 깨끗한 계정으로 전환 (이름·전화만 유지).
 */
export async function createCleanMultiDccProfileAndSwitch(opts = {}) {
  const fixed = readLetteringFixedIdentity();
  const sharedName = String(fixed.name || "").trim();
  if (!sharedName) {
    throw new Error("계정 이름이 없습니다. 가입 실명을 확인해 주세요.");
  }
  const nextIndex = Number(opts.nextIndex) || Number(opts.profiles?.length) + 1 || 2;
  const created = await createDccAgentProfile({
    displayName: sharedName,
    label: `프로필 ${nextIndex}`,
    title: "",
    department: "",
    photoUrl: null
  });
  const profile = created?.profile;
  if (!profile?.id) throw new Error("프로필을 만들지 못했습니다.");

  const emptyShowcase = createDefaultShowcaseStyle();
  try {
    await putDccProfileBundle(profile.id, {
      dcc: emptyDccSnapshot(sharedName),
      showcase: { editor: emptyShowcase, live: emptyShowcase }
    });
  } catch {
    /* local switch still clears */
  }

  await switchToMultiDccProfile(
    { ...profile, hasDcc: false, hasShowcase: false },
    { ...opts, forceClean: true }
  );
  return profile;
}
