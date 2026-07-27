import { readAvatar, writeAvatar, writeProfilePhoto } from "./vlueAvatar.js";
import {
  readLetteringBizcardEditable,
  writeLetteringBizcardEditable
} from "./letteringBizcardStorage.js";

function isHttpUrl(url) {
  return /^https?:\/\//i.test(String(url || "").trim());
}

function shouldHydrateSlot(localUrl, serverUrl, force) {
  const server = String(serverUrl || "").trim();
  if (!server) return false;
  if (force) return true;
  const local = String(localUrl || "").trim();
  if (!local) return true;
  /* 로컬 data URL · 서버 CDN URL → 서버 우선 (앱·웹 동기화) */
  if (local.startsWith("data:") && isHttpUrl(server)) return true;
  return false;
}

async function patchExportSnapshot(cardPatch) {
  const { syncDigitalCardExportSnapshot } = await import("./digitalCardApi.js");
  return syncDigitalCardExportSnapshot(cardPatch);
}

/**
 * 서버 exportSnapshot → 헤더/마이페이지 아바타 슬롯 복원
 * (skipServerSync — hydrate 중 재업로드 루프 방지)
 */
export function hydrateAvatarsFromExportSnapshot(snap, opts = {}) {
  if (!snap || typeof snap !== "object") return { photo: false, logo: false };
  const force = Boolean(opts.force);
  const photo = String(snap.photoUrl || "").trim();
  const logo = String(snap.logoUrl || "").trim();
  let photoApplied = false;
  let logoApplied = false;

  if (shouldHydrateSlot(readAvatar("primary"), photo, force)) {
    writeProfilePhoto(photo, { skipServerSync: true });
    photoApplied = true;
  }
  if (shouldHydrateSlot(readAvatar("card"), logo, force)) {
    writeAvatar("card", logo, { skipServerSync: true });
    logoApplied = true;
  }
  return { photo: photoApplied, logo: logoApplied };
}

let syncTimer = null;
let pendingPatch = null;

function flushAvatarServerSync() {
  const patch = pendingPatch;
  pendingPatch = null;
  syncTimer = null;
  if (!patch) return;

  try {
    const edPatch = {};
    if (Object.prototype.hasOwnProperty.call(patch, "photoUrl")) {
      edPatch.photoDataUrl = patch.photoUrl || "";
      edPatch.noProfilePhoto = !patch.photoUrl;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "logoUrl")) {
      edPatch.logoDataUrl = patch.logoUrl || "";
      edPatch.noCompanyLogo = !patch.logoUrl;
    }
    if (Object.keys(edPatch).length) {
      writeLetteringBizcardEditable(edPatch);
    }
  } catch {
    /* ignore */
  }

  const ed = readLetteringBizcardEditable();
  void patchExportSnapshot({
    photoUrl: Object.prototype.hasOwnProperty.call(patch, "photoUrl")
      ? patch.photoUrl
      : ed.photoDataUrl || "",
    logoUrl: Object.prototype.hasOwnProperty.call(patch, "logoUrl")
      ? patch.logoUrl
      : ed.logoDataUrl || ""
  });
}

/**
 * 아바타 슬롯 변경 → 디지털 명함 스냅샷(photoUrl/logoUrl)에 반영
 * 앱·웹이 같은 계정으로 로그인하면 서로 같은 사진을 본다.
 */
export function syncAvatarSlotToServer(slot, url) {
  const v = String(url || "").trim();
  /* blob 은 동기화 불가 · 빈 값은 삭제 동기화 허용 */
  if (v.startsWith("blob:")) return;

  if (slot === "card") {
    pendingPatch = { ...(pendingPatch || {}), logoUrl: v };
  } else if (slot === "primary" || slot === "feed" || slot === "chat") {
    pendingPatch = { ...(pendingPatch || {}), photoUrl: v };
  } else {
    return;
  }

  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(flushAvatarServerSync, 400);
}

/**
 * 서버에 사진이 없고 로컬(아바타·명함)에만 있으면 서버로 밀어 넣음.
 * data:/blob: 는 절대 PATCH 하지 않음 — 서버가 거절해도 매 hydrate 마다 재시도되어 egress 폭증.
 */
export function pushLocalAvatarsIfServerMissing(snap) {
  const ed = readLetteringBizcardEditable();
  const serverPhoto = String(snap?.photoUrl || "").trim();
  const serverLogo = String(snap?.logoUrl || "").trim();
  const localPhoto =
    readAvatar("primary") || String(ed.photoDataUrl || ed.photoUrl || "").trim();
  const localLogo = readAvatar("card") || String(ed.logoDataUrl || ed.logoUrl || "").trim();
  const isHttp = (u) => /^https?:\/\//i.test(String(u || "").trim());
  const patch = {};

  if (!serverPhoto && isHttp(localPhoto)) {
    patch.photoUrl = localPhoto;
  }
  if (!serverLogo && isHttp(localLogo)) {
    patch.logoUrl = localLogo;
  }
  if (!Object.keys(patch).length) return;

  try {
    if (patch.photoUrl) {
      writeLetteringBizcardEditable({ photoDataUrl: patch.photoUrl, noProfilePhoto: false });
    }
    if (patch.logoUrl) {
      writeLetteringBizcardEditable({ logoDataUrl: patch.logoUrl, noCompanyLogo: false });
    }
  } catch {
    /* ignore */
  }
  void patchExportSnapshot(patch);
}
