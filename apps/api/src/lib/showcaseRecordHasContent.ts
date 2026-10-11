/**
 * 저장된 쇼케이스에 유저 기록이 있는지.
 * includeDigitalCard 만 켜진 빈 스타일은 기록이 아니다.
 * 재설치·업데이트의 빈 푸시가 이 기록을 지우면 안 된다.
 */
function asObj(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

function filled(value: unknown): boolean {
  return String(value ?? "").trim().length > 0;
}

function photoListHasUrl(raw: unknown): boolean {
  if (!Array.isArray(raw)) return false;
  return raw.some((item) => {
    if (typeof item === "string") return filled(item);
    const photo = asObj(item);
    return Boolean(photo && (filled(photo.url) || filled(photo.src) || filled(photo.imageUrl)));
  });
}

/** 빈 페이지 껍데기는 기록이 아니다. 사진·본문·링크·음악이 있어야 한다. */
function pageHasSubstance(raw: unknown): boolean {
  const page = asObj(raw);
  if (!page) return false;
  if (photoListHasUrl(page.photos) || photoListHasUrl(asObj(page.gallery)?.photos)) return true;
  const rich = asObj(page.richCustom);
  if (rich && filled(rich.bodyText)) return true;
  if (filled(page.caption) || filled(page.title) || filled(page.body)) return true;
  const link = asObj(page.businessLink);
  if (link && (filled(link.url) || filled(link.href))) return true;
  return false;
}

export function showcaseRecordHasContent(raw: unknown): boolean {
  const style = asObj(raw);
  if (!style) return false;
  const bgm = asObj(style.bgm) || {};
  if (filled(bgm.audioUrl) || filled(bgm.soundId)) return true;
  if (bgm.mode && bgm.mode !== "none" && filled(bgm.title)) return true;
  if (Array.isArray(bgm.playlist) && bgm.playlist.length > 0) return true;
  if (Array.isArray(style.pages) && style.pages.some(pageHasSubstance)) return true;
  const gallery = asObj(style.gallery) || {};
  if (photoListHasUrl(gallery.photos)) return true;
  const commercial = asObj(style.commercial) || {};
  const outlinks = asObj(commercial.outlinks) || {};
  if (Object.values(outlinks).some((v) => filled(v))) return true;
  if (Array.isArray(commercial.links) && commercial.links.length > 0) return true;
  const rich = asObj(style.richCustom) || {};
  if (filled(rich.bodyText)) return true;
  if (Array.isArray(style.tags) && style.tags.some((tag) => filled(tag))) return true;
  return false;
}

/** 이름·사진·연락처가 있는 DCC 스냅샷. 빈 객체로 바꾸지 않는다. */
export function dccSnapshotHasContent(raw: unknown): boolean {
  const snap = asObj(raw);
  if (!snap) return false;
  const keys = [
    "name",
    "displayName",
    "photoUrl",
    "logoUrl",
    "organization",
    "companyName",
    "email",
    "title",
    "intro",
    "companyIntro"
  ];
  return keys.some((key) => String(snap[key] || "").trim().length > 0);
}
