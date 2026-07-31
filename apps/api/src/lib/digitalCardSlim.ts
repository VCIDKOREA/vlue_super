/**
 * 디지털 명함 스냅샷 → 슬림 메타 (컬럼·lite API용)
 * full exportSnapshotJson 통째 전송 대체
 */

import { isDataUrl, isBlobUrl, isHttpMediaUrl } from "./mediaUrlGuard.js";

export type DigitalCardSlimMeta = {
  photoUrl: string | null;
  logoUrl: string | null;
  displayName: string | null;
  organization: string | null;
  title: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
  activityName: string | null;
};

function httpOnly(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s || isDataUrl(s) || isBlobUrl(s)) return null;
  if (!isHttpMediaUrl(s) && !s.startsWith("/")) return null;
  return s;
}

function text(v: unknown, max = 200): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  return s.slice(0, max);
}

export function extractDigitalCardSlimMeta(
  snap: Record<string, unknown> | null | undefined
): DigitalCardSlimMeta {
  const s = snap && typeof snap === "object" ? snap : {};
  return {
    photoUrl: httpOnly(s.photoUrl),
    logoUrl: httpOnly(s.logoUrl),
    displayName: text(s.name || s.displayName, 120),
    organization: text(s.organization || s.companyName, 200),
    title: text(s.title, 120),
    department: text(s.department, 120),
    phone: text(s.phone, 40),
    email: text(s.email, 160),
    activityName: text(s.activityName || s.nickname, 80)
  };
}

/** exportSnapshot 에서 자주 쓰는 키만 남긴 슬림 스냅 (GET 응답용) */
export function slimExportSnapshot(snap: unknown): Record<string, unknown> | null {
  if (!snap || typeof snap !== "object" || Array.isArray(snap)) return null;
  const s = snap as Record<string, unknown>;
  const meta = extractDigitalCardSlimMeta(s);
  const out: Record<string, unknown> = {};
  if (meta.photoUrl) out.photoUrl = meta.photoUrl;
  if (meta.logoUrl) out.logoUrl = meta.logoUrl;
  if (meta.displayName) {
    out.name = meta.displayName;
    out.displayName = meta.displayName;
  }
  if (meta.organization) {
    out.organization = meta.organization;
    out.companyName = meta.organization;
  }
  if (meta.title) out.title = meta.title;
  if (meta.department) out.department = meta.department;
  if (meta.phone) out.phone = meta.phone;
  if (meta.email) out.email = meta.email;
  if (meta.activityName) out.activityName = meta.activityName;
  const website = text(s.website, 300);
  if (website && !isDataUrl(website)) out.website = website;
  const fax = text(s.fax, 40);
  if (fax) out.fax = fax;
  const address = text(s.address, 300);
  if (address) out.address = address;
  const addressRoad = text(s.addressRoad, 200);
  if (addressRoad) out.addressRoad = addressRoad;
  const addressDetail = text(s.addressDetail, 200);
  if (addressDetail) out.addressDetail = addressDetail;
  const companyIntro = text(s.companyIntro, 2000);
  if (companyIntro) out.companyIntro = companyIntro;
  const customBackText = text(s.customBackText, 2000);
  if (customBackText) out.customBackText = customBackText;
  const shareCover = httpOnly(s.shareCoverUrl);
  if (shareCover) out.shareCoverUrl = shareCover;
  const tpl = text(s.designTemplate, 40);
  if (tpl) out.designTemplate = tpl;
  const focus = s.photoFocus;
  if (focus && typeof focus === "object") out.photoFocus = focus;
  if (typeof s.noProfilePhoto === "boolean") out.noProfilePhoto = s.noProfilePhoto;
  if (typeof s.noCompanyLogo === "boolean") out.noCompanyLogo = s.noCompanyLogo;
  if (typeof s.noFax === "boolean") out.noFax = s.noFax;
  if (typeof s.noWebsite === "boolean") out.noWebsite = s.noWebsite;
  return out;
}
