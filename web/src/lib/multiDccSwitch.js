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

function bundleHasDcc(bundle) {
  const dcc = bundle?.dcc;
  if (!dcc || typeof dcc !== "object") return false;
  return Object.keys(dcc).some((k) => {
    const v = dcc[k];
    if (v == null) return false;
    if (typeof v === "string") return Boolean(v.trim());
    if (typeof v === "boolean") return true;
    return true;
  });
}

async function restoreMasterDigitalCardLocally() {
  try {
    const { restoreDigitalCardFromServer } = await import("./digitalCardApi.js");
    await restoreDigitalCardFromServer({ force: true });
  } catch {
    /* ignore */
  }
  try {
    const { hydrateShowcaseStyleFromServer } = await import("./showcase/showcaseStyleSync.js");
    await hydrateShowcaseStyleFromServer({ forceServer: true });
  } catch {
    /* optional */
  }
}

/**
 * 멀티 프로필 전환 — 전화·이름만 유지, DCC·쇼케이스·BGM·상호·계좌 등은 프로필 번들로 교체.
 * forceClean=true 일 때만 로컬을 비운다 (새 프로필 생성).
 * 대표/기존 프로필에 번들이 비면 마스터 디지털명함에서 복원한다 (절대 지우지 않음).
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
  /* 새 프로필 생성에서만 명시적으로 비움 — 빈 번들만으로 대표 계정을 지우지 않음 */
  const forceClean = Boolean(opts.forceClean);
  const hasDcc = bundleHasDcc(bundle) || Boolean(profile.hasDcc);
  const hasShowcase =
    showcaseStyleHasContent(bundle?.showcase?.editor) ||
    showcaseStyleHasContent(bundle?.showcase?.live) ||
    Boolean(profile.hasShowcase);

  if (forceClean) {
    applyDccAgentBundleToLocalCard(
      { ...profile, title: "", department: "", photoUrl: null },
      { dcc: emptyDccSnapshot(sharedName), showcase: { editor: null, live: null } },
      { replaceAccount: true }
    );
    const empty = createDefaultShowcaseStyle();
    writeShowcaseStyle(empty, { replace: true, skipSync: true });
    writeLiveShowcaseStyle(empty, { source: "editor", skipSync: true });
  } else if (!hasDcc && !hasShowcase) {
    if (profile.isRepresentative) {
      /* 대표 계정 스냅샷이 비어 있으면 마스터에서 복원 — 로컬 타이틀/사진을 절대 비우지 않음 */
      await restoreMasterDigitalCardLocally();
    } else {
      /* 아직 내용 없는 추가 프로필로 전환 */
      applyDccAgentBundleToLocalCard(
        { ...profile, title: "", department: "", photoUrl: null },
        { dcc: emptyDccSnapshot(sharedName), showcase: { editor: null, live: null } },
        { replaceAccount: true }
      );
      const empty = createDefaultShowcaseStyle();
      writeShowcaseStyle(empty, { replace: true, skipSync: true });
      writeLiveShowcaseStyle(empty, { source: "editor", skipSync: true });
    }
  } else {
    applyDccAgentBundleToLocalCard(profile, bundle, { replaceAccount: true });
    const editor = bundle?.showcase?.editor || bundle?.showcase?.live || null;
    const live = bundle?.showcase?.live || editor;
    if (showcaseStyleHasContent(editor) || showcaseStyleHasContent(live)) {
      writeShowcaseStyle(editor || live, { replace: true, skipSync: true });
      writeLiveShowcaseStyle(live || editor, { source: "editor", skipSync: true });
      if (bundle?.showcase?.updatedAt) writeLocalShowcaseStyleUpdatedAt(bundle.showcase.updatedAt);
    } else if (profile.isRepresentative) {
      await restoreMasterDigitalCardLocally();
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
      if (!forceClean && (hasDcc || hasShowcase || profile.isRepresentative)) {
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
    { ...profile, hasDcc: false, hasShowcase: false, isRepresentative: false },
    { ...opts, forceClean: true }
  );
  return profile;
}
