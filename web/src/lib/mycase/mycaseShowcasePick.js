import { isPaidLetteringTier } from "../letteringMembership.js";
import { readLiveShowcaseStyle, readShowcaseStyle, SHOWCASE_OPEN_SETTINGS_EVENT } from "../showcase/showcaseStyleStorage.js";
import { showcaseStyleHasContent } from "../showcase/showcaseStyleSync.js";

const STORAGE_KEY = "vlue_mycase_showcase_pick_v1";
const PENDING_APPLY_KEY = "vlue_mycase_showcase_pick_pending_v1";
export const MYCASE_SHOWCASE_PICK_CHANGED_EVENT = "vlue-mycase-showcase-pick-changed";
export const MYCASE_SHOWCASE_PICK_APPLY_EVENT = "vlue-mycase-showcase-pick-apply";

export const SHOWCASE_PICK_LIMIT_FREE = 1;
export const SHOWCASE_PICK_LIMIT_PAID = 5;

/** @returns {{ items: Array<{ order: number, caseId: string, imageId: string, imageUrl: string, caption?: string }> }} */
export function readMycaseShowcasePick() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [] };
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    return {
      items: items
        .map((row, i) => ({
          order: Number(row.order) || i + 1,
          caseId: String(row.caseId || ""),
          imageId: String(row.imageId || ""),
          imageUrl: String(row.imageUrl || "").trim(),
          caption: String(row.caption || "").trim()
        }))
        .filter((row) => row.imageUrl)
        .slice(0, SHOWCASE_PICK_LIMIT_PAID)
    };
  } catch {
    return { items: [] };
  }
}

function writeMycaseShowcasePick(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items }));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(MYCASE_SHOWCASE_PICK_CHANGED_EVENT));
}

export function showcasePickLimitForTier(membershipTier) {
  return isPaidLetteringTier(membershipTier) ? SHOWCASE_PICK_LIMIT_PAID : SHOWCASE_PICK_LIMIT_FREE;
}

/**
 * @param {{ membershipTier?: string, caseId: string, imageId: string, imageUrl: string, caption?: string }} input
 * @returns {{ ok: true, items: object[] } | { ok: false, message: string }}
 */
export function toggleMycaseShowcasePick(input) {
  const limit = showcasePickLimitForTier(input.membershipTier);
  const url = String(input.imageUrl || "").trim();
  const caseId = String(input.caseId || "").trim();
  const imageId = String(input.imageId || "").trim();
  if (!url || !caseId) return { ok: false, message: "사진을 선택할 수 없습니다." };

  const { items } = readMycaseShowcasePick();
  const key = `${caseId}::${imageId || url}`;
  const exists = items.findIndex((x) => `${x.caseId}::${x.imageId || x.imageUrl}` === key);
  if (exists >= 0) {
    const next = items.filter((_, i) => i !== exists).map((row, i) => ({ ...row, order: i + 1 }));
    writeMycaseShowcasePick(next);
    return { ok: true, items: next };
  }

  if (items.length >= limit) {
    return {
      ok: false,
      message:
        limit <= SHOWCASE_PICK_LIMIT_FREE
          ? "통화 쇼케이스용으로는 1장만 선택할 수 있습니다."
          : `통화 쇼케이스는 최대 ${limit}장까지 선택할 수 있습니다.`
    };
  }

  const next = [
    ...items,
    {
      order: items.length + 1,
      caseId,
      imageId: imageId || url,
      imageUrl: url,
      caption: String(input.caption || "").trim()
    }
  ];
  writeMycaseShowcasePick(next);
  return { ok: true, items: next };
}

export function isMycaseShowcasePickSelected(caseId, imageId, imageUrl) {
  const key = `${String(caseId || "")}::${String(imageId || imageUrl || "")}`;
  return readMycaseShowcasePick().items.some(
    (x) => `${x.caseId}::${x.imageId || x.imageUrl}` === key
  );
}

export function clearMycaseShowcasePick() {
  writeMycaseShowcasePick([]);
}

export function dispatchMycaseShowcasePickApply() {
  const { items } = readMycaseShowcasePick();
  window.dispatchEvent(
    new CustomEvent(MYCASE_SHOWCASE_PICK_APPLY_EVENT, {
      detail: { items: [...items] }
    })
  );
}

/** 편집 중·송출 중 쇼케이스에 실질 콘텐츠가 있는지 */
export function readExistingShowcaseHasContent() {
  return (
    showcaseStyleHasContent(readShowcaseStyle()) || showcaseStyleHasContent(readLiveShowcaseStyle())
  );
}

export function markMycaseShowcasePickPendingApply() {
  try {
    sessionStorage.setItem(PENDING_APPLY_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function consumeMycaseShowcasePickPendingApply() {
  try {
    const pending = sessionStorage.getItem(PENDING_APPLY_KEY) === "1";
    sessionStorage.removeItem(PENDING_APPLY_KEY);
    return pending;
  } catch {
    return false;
  }
}

/**
 * 케이스함 선택 → 쇼케이스 설정 화면 이동 + 선택 사진 반영 예약
 * @param {"web"|"app"} channel — www 케이스함(web) / 앱 하단 시트(app)
 */
export function goToShowcaseSettingsWithPick({ channel = "web" } = {}) {
  const { items } = readMycaseShowcasePick();
  if (!items.length) return false;
  markMycaseShowcasePickPendingApply();
  if (channel === "web") {
    const search = window.location.search || "";
    window.history.pushState(null, "", `/${search}#showcase`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    window.dispatchEvent(new Event(SHOWCASE_OPEN_SETTINGS_EVENT));
    window.setTimeout(() => dispatchMycaseShowcasePickApply(), 350);
  }
  return true;
}
