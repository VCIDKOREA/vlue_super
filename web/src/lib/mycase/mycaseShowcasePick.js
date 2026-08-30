import { isPaidLetteringTier } from "../letteringMembership.js";
import {
  readLiveShowcaseStyle,
  readShowcaseStyle,
  SHOWCASE_OPEN_SETTINGS_EVENT
} from "../showcase/showcaseStyleStorage.js";
import {
  clampShowcasePages,
  createShowcasePage,
  migrateLegacyPages,
  normalizeShowcasePage,
  SHOWCASE_PAGE_TYPES
} from "../showcase/showcasePages.js";
import { showcaseStyleHasContent } from "../showcase/showcaseStyleSync.js";
import { mycaseSocialSlideId } from "./mycasePostPayload.js";

const STORAGE_KEY = "vlue_mycase_showcase_pick_v1";
const SEED_KEY = "vlue_mycase_showcase_pick_seed_v1";
const PENDING_APPLY_KEY = "vlue_mycase_showcase_pick_pending_v1";
export const MYCASE_SHOWCASE_PICK_CHANGED_EVENT = "vlue-mycase-showcase-pick-changed";
export const MYCASE_SHOWCASE_PICK_APPLY_EVENT = "vlue-mycase-showcase-pick-apply";

export const SHOWCASE_PICK_LIMIT_FREE = 1;
export const SHOWCASE_PICK_LIMIT_PAID = 5;

function normalizeItem(row, fallbackOrder = 1) {
  return {
    order: Number(row?.order) || fallbackOrder,
    caseId: String(row?.caseId || ""),
    imageId: String(row?.imageId || ""),
    imageUrl: String(row?.imageUrl || "").trim(),
    caption: String(row?.caption || "").trim(),
    source: row?.source === "mycase" ? "mycase" : "showcase"
  };
}

function normalizeItems(items, limit) {
  const byOrder = new Map();
  for (const raw of Array.isArray(items) ? items : []) {
    const row = normalizeItem(raw);
    if (!row.imageUrl || row.order < 1 || row.order > limit) continue;
    byOrder.set(row.order, row);
  }
  return [...byOrder.values()].sort((a, b) => a.order - b.order);
}

/** @returns {{ items: Array<{ order: number, caseId: string, imageId: string, imageUrl: string, caption?: string, source?: string }> }} */
export function readMycaseShowcasePick() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [] };
    const parsed = JSON.parse(raw);
    const limit = SHOWCASE_PICK_LIMIT_PAID;
    return { items: normalizeItems(parsed?.items, limit) };
  } catch {
    return { items: [] };
  }
}

function readMycaseShowcasePickSeed() {
  try {
    const raw = localStorage.getItem(SEED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return normalizeItems(parsed?.items, SHOWCASE_PICK_LIMIT_PAID);
  } catch {
    return [];
  }
}

function writeMycaseShowcasePickSeed(items) {
  try {
    localStorage.setItem(SEED_KEY, JSON.stringify({ items: normalizeItems(items, SHOWCASE_PICK_LIMIT_PAID) }));
  } catch {
    /* ignore */
  }
}

function writeMycaseShowcasePick(items, limit) {
  const next = normalizeItems(items, limit);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: next }));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(MYCASE_SHOWCASE_PICK_CHANGED_EVENT));
}

/** 쇼케이스 편집본·송출본에서 슬롯 1~N 사진 추출 */
export function extractShowcasePickSlotsFromStyle(style, limit = SHOWCASE_PICK_LIMIT_PAID) {
  if (!style || typeof style !== "object") return [];
  const pages = Array.isArray(style.pages) && style.pages.length
    ? style.pages.map(normalizeShowcasePage)
    : migrateLegacyPages(style).map(normalizeShowcasePage);

  const slots = [];
  for (let i = 0; i < Math.min(limit, pages.length); i++) {
    const page = pages[i];
    const photo = (page?.gallery?.photos || [])[0];
    const url = String(photo?.url || photo || "").trim();
    if (!url) continue;
    slots.push({
      order: i + 1,
      caseId: String(page?.mycaseCaseId || `showcase-page-${String(page?.id || i + 1)}`),
      imageId: String(page?.mycaseImageId || photo?.id || url),
      imageUrl: url,
      caption: String(page?.richCustom?.bodyText || "").trim(),
      source: "showcase"
    });
  }
  return slots;
}

/** 트레이 최초 진입 시 기존 쇼케이스 사진을 슬롯에 채움 */
export function ensureMycaseShowcasePickSeeded(membershipTier) {
  const limit = showcasePickLimitForTier(membershipTier);
  const current = readMycaseShowcasePick().items;
  if (current.length) return current;

  const style = readShowcaseStyle();
  const live = readLiveShowcaseStyle();
  const fromStyle = extractShowcasePickSlotsFromStyle(style, limit);
  const fromLive =
    fromStyle.length >= limit ? [] : extractShowcasePickSlotsFromStyle(live, limit);
  const merged = normalizeItems(
    [...fromStyle, ...fromLive.filter((row) => !fromStyle.some((x) => x.order === row.order))],
    limit
  );

  if (merged.length) {
    writeMycaseShowcasePickSeed(merged);
    writeMycaseShowcasePick(merged, limit);
  }
  return merged;
}

/** 슬롯 1~limit (빈 슬롯 포함) */
export function readMycaseShowcasePickSlots(membershipTier) {
  const limit = showcasePickLimitForTier(membershipTier);
  const items = readMycaseShowcasePick().items;
  return Array.from({ length: limit }, (_, i) => {
    const order = i + 1;
    const found = items.find((x) => x.order === order);
    return found || { order, imageUrl: "", caseId: "", imageId: "", caption: "", source: "empty" };
  });
}

export function countMycaseShowcasePickFilled(membershipTier) {
  return readMycaseShowcasePickSlots(membershipTier).filter((x) => String(x.imageUrl || "").trim()).length;
}

export function showcasePickLimitForTier(membershipTier) {
  return isPaidLetteringTier(membershipTier) ? SHOWCASE_PICK_LIMIT_PAID : SHOWCASE_PICK_LIMIT_FREE;
}

function nextMycasePickOrder(items, limit) {
  for (let order = 1; order <= limit; order++) {
    const row = items.find((x) => x.order === order);
    if (!row) return order;
    if (row.source !== "mycase") return order;
  }
  return limit + 1;
}

/**
 * @param {{ membershipTier?: string, caseId: string, imageId: string, imageUrl: string, caption?: string }} input
 * @returns {{ ok: true, items: object[] } | { ok: false, message: string }}
 */
export function toggleMycaseShowcasePick(input) {
  const limit = showcasePickLimitForTier(input.membershipTier);
  ensureMycaseShowcasePickSeeded(input.membershipTier);
  const url = String(input.imageUrl || "").trim();
  const caseId = String(input.caseId || "").trim();
  const imageId = String(input.imageId || "").trim();
  if (!url || !caseId) return { ok: false, message: "사진을 선택할 수 없습니다." };

  let items = [...readMycaseShowcasePick().items];
  const seed = readMycaseShowcasePickSeed();
  const key = `${caseId}::${imageId || url}`;
  const exists = items.find((x) => `${x.caseId}::${x.imageId || x.imageUrl}` === key);

  if (exists) {
    const order = exists.order;
    const seedRow = seed.find((x) => x.order === order);
    items = items.filter((x) => x.order !== order);
    if (seedRow?.imageUrl) {
      items.push({ ...seedRow, source: "showcase" });
    }
    writeMycaseShowcasePick(items, limit);
    return { ok: true, items: normalizeItems(items, limit) };
  }

  const targetOrder = nextMycasePickOrder(items, limit);
  if (targetOrder > limit) {
    return {
      ok: false,
      message:
        limit <= SHOWCASE_PICK_LIMIT_FREE
          ? "통화 쇼케이스용으로는 1장만 선택할 수 있습니다."
          : `통화 쇼케이스는 최대 ${limit}장까지 선택할 수 있습니다.`
    };
  }

  items = items.filter((x) => x.order !== targetOrder);
  items.push({
    order: targetOrder,
    caseId,
    imageId: imageId || url,
    imageUrl: url,
    caption: String(input.caption || "").trim(),
    source: "mycase"
  });
  writeMycaseShowcasePick(items, limit);
  return { ok: true, items: normalizeItems(items, limit) };
}

export function reorderMycaseShowcasePick(fromOrder, toOrder, membershipTier) {
  const limit = showcasePickLimitForTier(membershipTier);
  const from = Number(fromOrder);
  const to = Number(toOrder);
  if (!from || !to || from === to || from < 1 || to < 1 || from > limit || to > limit) {
    return readMycaseShowcasePick().items;
  }

  const slots = readMycaseShowcasePickSlots(membershipTier);
  const fromRow = slots[from - 1];
  if (!String(fromRow?.imageUrl || "").trim()) {
    return readMycaseShowcasePick().items;
  }

  const next = [...slots];
  const [moved] = next.splice(from - 1, 1);
  next.splice(to - 1, 0, moved);

  const items = next
    .map((row, i) => {
      if (!String(row.imageUrl || "").trim()) return null;
      return normalizeItem({ ...row, order: i + 1 });
    })
    .filter(Boolean);

  writeMycaseShowcasePick(items, limit);
  return items;
}

export function isMycaseShowcasePickSelected(caseId, imageId, imageUrl) {
  const key = `${String(caseId || "")}::${String(imageId || imageUrl || "")}`;
  return readMycaseShowcasePick().items.some(
    (x) => `${x.caseId}::${x.imageId || x.imageUrl}` === key
  );
}

export function clearMycaseShowcasePick() {
  writeMycaseShowcasePick([], SHOWCASE_PICK_LIMIT_PAID);
  try {
    localStorage.removeItem(SEED_KEY);
  } catch {
    /* ignore */
  }
}

export function dispatchMycaseShowcasePickApply() {
  const { items } = readMycaseShowcasePick();
  window.dispatchEvent(
    new CustomEvent(MYCASE_SHOWCASE_PICK_APPLY_EVENT, {
      detail: { items: [...items] }
    })
  );
}

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
  const filled = readMycaseShowcasePick().items.filter((x) => String(x.imageUrl || "").trim());
  if (!filled.length) return false;
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

/**
 * 케이스함 선택 슬롯 → 쇼케이스 설정 초안 pages[] 병합 (슬롯 번호 = 콘텐츠 페이지 1~N)
 * @param {object} style
 * @param {object[]} picked
 * @param {number} maxContentPages
 * @param {string} membershipTier
 * @param {{ includeDigitalCard?: boolean }} [opts]
 */
export function mergeMycasePickIntoShowcaseStyle(
  style,
  picked,
  maxContentPages,
  membershipTier,
  opts = {}
) {
  const rows = (Array.isArray(picked) ? picked : []).filter((row) =>
    String(row?.imageUrl || "").trim()
  );
  if (!rows.length || !style || typeof style !== "object") return style;

  const sorted = [...rows].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  const currentPages = (
    Array.isArray(style.pages) && style.pages.length
      ? style.pages
      : migrateLegacyPages(style)
  ).map(normalizeShowcasePage);

  const nextPages = [];
  for (let i = 0; i < maxContentPages; i++) {
    const order = i + 1;
    const pick = sorted.find((row) => Number(row.order) === order);
    const existing = currentPages[i];
    if (pick) {
      const caseId = String(pick.caseId || "").trim();
      const imageId = String(pick.imageId || `pick-${order}`).trim();
      const socialSlideId =
        (caseId && !caseId.startsWith("showcase-page-")
          ? mycaseSocialSlideId(caseId, imageId)
          : "") ||
        String(existing?.socialSlideId || existing?.id || "").trim() ||
        mycaseSocialSlideId(caseId, imageId) ||
        `mycase-pick-${order}`;
      nextPages.push(
        createShowcasePage(SHOWCASE_PAGE_TYPES.RICH_CUSTOM, {
          id: socialSlideId,
          socialSlideId,
          mycaseCaseId: caseId.startsWith("showcase-page-") ? undefined : caseId || undefined,
          mycaseImageId: imageId,
          gallery: {
            photos: [
              {
                id: imageId,
                url: String(pick.imageUrl || "").trim()
              }
            ]
          },
          richCustom: {
            bodyText: String(pick.caption || existing?.richCustom?.bodyText || "").trim()
          },
          businessLink: existing?.businessLink || null,
          caseTheme: existing?.caseTheme
        })
      );
    } else if (existing) {
      nextPages.push(existing);
    }
  }

  if (!nextPages.length) return style;
  return clampShowcasePages({ ...style, pages: nextPages }, membershipTier, opts);
}
