/**
 * 가입 직후 런타임 권한 안내 (연락처·카메라·사진·위치)
 * 「허용하고 계속」→ 실제 OS/브라우저 권한 요청을 연쇄 실행
 */

import { requestLetteringPermissions } from "./letteringSettings.js";

const PENDING_KEY = "vlue_runtime_perms_pending_v1";
const DONE_KEY = "vlue_runtime_perms_done_v1";

export function markRuntimePermissionsPending() {
  try {
    localStorage.setItem(PENDING_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function shouldShowRuntimePermissionsPrompt({ isLoggedIn, showAppShell }) {
  if (!isLoggedIn || !showAppShell) return false;
  try {
    if (localStorage.getItem(DONE_KEY) === "1") return false;
    return localStorage.getItem(PENDING_KEY) === "1";
  } catch {
    return false;
  }
}

export function markRuntimePermissionsDone() {
  try {
    localStorage.setItem(DONE_KEY, "1");
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function hasNativePermissionBridge() {
  try {
    return Boolean(
      window.Android?.requestLetteringPermissions ||
        window.VlueLettering?.requestLetteringPermissions
    );
  } catch {
    return false;
  }
}

export function readNativePermissionStatus() {
  try {
    const raw =
      window.Android?.getLetteringPermissionStatusJson?.() ||
      window.VlueLettering?.getLetteringPermissionStatusJson?.();
    if (!raw) return null;
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

function waitForNativePermissionResult(timeoutMs = 45000) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (detail) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.clearInterval(poll);
      window.removeEventListener("vlue-lettering-permissions-result", onEvent);
      resolve(detail || readNativePermissionStatus());
    };
    const onEvent = (ev) => {
      let detail = ev?.detail;
      if (typeof detail === "string") {
        try {
          detail = JSON.parse(detail);
        } catch {
          detail = null;
        }
      }
      finish(detail);
    };
    const timer = window.setTimeout(() => finish(readNativePermissionStatus()), timeoutMs);
    const poll = window.setInterval(() => {
      const st = readNativePermissionStatus();
      if (st?.contacts && st?.camera && st?.photos && st?.location) finish(st);
    }, 800);
    window.addEventListener("vlue-lettering-permissions-result", onEvent);
  });
}

async function requestWebCamera() {
  if (!navigator?.mediaDevices?.getUserMedia) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

async function requestWebLocation() {
  if (!navigator?.geolocation) return false;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      () => resolve(false),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });
}

async function requestWebContacts() {
  try {
    if (navigator?.contacts?.select) {
      await navigator.contacts.select(["name", "tel"], { multiple: true });
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * @returns {Promise<{
 *   contacts: boolean,
 *   camera: boolean,
 *   photos: boolean,
 *   location: boolean,
 *   native: boolean,
 *   allGranted: boolean,
 *   requiredIds: string[]
 * }>}
 */
export async function requestAppRuntimePermissions() {
  const native = hasNativePermissionBridge();
  const results = {
    contacts: false,
    camera: false,
    photos: false,
    location: false,
    native,
    allGranted: false,
    /** 앱: 4종 필수 / 브라우저: 카메라·위치 필수 */
    requiredIds: native ? ["contacts", "camera", "photos", "location"] : ["camera", "location"]
  };

  if (native) {
    const kick = requestLetteringPermissions();
    if (kick?.ok) {
      await sleep(350);
      let status = readNativePermissionStatus();
      if (!(status?.contacts && status?.camera && status?.photos && status?.location)) {
        status = (await waitForNativePermissionResult(60000)) || readNativePermissionStatus();
      }
      if (status && typeof status === "object") {
        results.contacts = Boolean(status.contacts);
        results.camera = Boolean(status.camera);
        results.photos = Boolean(status.photos);
        results.location = Boolean(status.location);
      }
    }
  }

  if (!results.camera) results.camera = await requestWebCamera();
  if (!results.location) results.location = await requestWebLocation();
  if (!results.contacts) results.contacts = await requestWebContacts();
  /* 브라우저 사진첩은 OS 사전 권한이 없음 — 앱에서만 필수 */
  if (!results.photos && !native) results.photos = results.camera;

  const again = readNativePermissionStatus();
  if (again) {
    results.contacts = results.contacts || Boolean(again.contacts);
    results.camera = results.camera || Boolean(again.camera);
    results.photos = results.photos || Boolean(again.photos);
    results.location = results.location || Boolean(again.location);
  }

  results.allGranted = results.requiredIds.every((id) => Boolean(results[id]));
  return results;
}
