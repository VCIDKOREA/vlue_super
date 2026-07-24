import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";
import { normalizeLetteringBizcardTemplate } from "./letteringBizcardTemplates.js";
import {
  readLetteringBizcardEditable,
  writeLetteringBizcardEditable,
  readLetteringBizcardAddressFields,
  combineLetteringBizcardAddress,
  clampLetteringBizcardEmail
} from "./letteringBizcardStorage.js";
import { writeMembershipBillingMeta } from "./authValidityPeriod.js";

const DIGITAL_CARD_ID_KEY = "vlue_digital_card_id";

export function readStoredDigitalCardId() {
  try {
    return String(localStorage.getItem(DIGITAL_CARD_ID_KEY) || "").trim();
  } catch {
    return "";
  }
}

export function writeStoredDigitalCardId(cardId) {
  try {
    if (cardId) localStorage.setItem(DIGITAL_CARD_ID_KEY, String(cardId));
  } catch {
    /* ignore */
  }
}

/** 서버 exportSnapshot → 로컬 명함 편집 필드 복원 */
export function hydrateLetteringEditableFromSnapshot(snap, opts = {}) {
  if (!snap || typeof snap !== "object") return null;
  const force = Boolean(opts.force);
  const local = readLetteringBizcardEditable();
  const localEmail = String(local.email || "").trim();
  const localWebsite = String(local.website || "").trim();
  const localAddress = String(local.address || local.addressRoad || "").trim();
  const hasLocalContent = Boolean(localEmail || localWebsite || localAddress);

  if (hasLocalContent && !force) {
    /* 로컬에 이미 값이 있으면 덮어쓰지 않되, 빈 칸만 서버로 채움 */
  }

  const roadFromSnap = String(snap.addressRoad || "").trim();
  const detailFromSnap = String(snap.addressDetail || "").trim();
  const addressCombined =
    combineLetteringBizcardAddress(roadFromSnap, detailFromSnap) ||
    String(snap.address || "").trim();
  const { road: localRoad, detail: localDetail } = readLetteringBizcardAddressFields(local);

  const patch = {
    email: force || !localEmail ? clampLetteringBizcardEmail(snap.email || "") : local.email,
    website: force || !localWebsite ? String(snap.website || "").trim() : local.website,
    fax: force || !String(local.fax || "").trim() ? String(snap.fax || "").trim() : local.fax,
    addressRoad: force || !localRoad ? roadFromSnap || String(snap.address || "").trim() : localRoad,
    addressDetail: force || !localDetail ? detailFromSnap : localDetail,
    address: force || !localAddress ? addressCombined : local.address,
    companyIntro:
      force || !String(local.companyIntro || "").trim()
        ? String(snap.companyIntro || "").trim()
        : local.companyIntro,
    customBackText:
      force || !String(local.customBackText || "").trim()
        ? String(snap.customBackText || "").trim()
        : local.customBackText,
    /* 로컬 키는 logoDataUrl/photoDataUrl — 예전 hydrate가 logoUrl에 넣던 값도 흡수 */
    logoDataUrl:
      force || !String(local.logoDataUrl || local.logoUrl || "").trim()
        ? String(snap.logoUrl || "").trim()
        : String(local.logoDataUrl || local.logoUrl || "").trim(),
    photoDataUrl:
      force || !String(local.photoDataUrl || local.photoUrl || "").trim()
        ? String(snap.photoUrl || "").trim()
        : String(local.photoDataUrl || local.photoUrl || "").trim(),
    noCompanyLogo: force && snap.noCompanyLogo != null ? Boolean(snap.noCompanyLogo) : Boolean(local.noCompanyLogo),
    noProfilePhoto: force && snap.noProfilePhoto != null ? Boolean(snap.noProfilePhoto) : Boolean(local.noProfilePhoto),
    noFax: force && snap.noFax != null ? Boolean(snap.noFax) : Boolean(local.noFax),
    noWebsite: force && snap.noWebsite != null ? Boolean(snap.noWebsite) : Boolean(local.noWebsite),
    kakaoFeedBgDataUrl:
      force || !String(local.kakaoFeedBgDataUrl || "").trim()
        ? String(snap.shareCoverUrl || local.kakaoFeedBgDataUrl || "").trim()
        : local.kakaoFeedBgDataUrl,
    designTemplate: normalizeLetteringBizcardTemplate(
      snap.designTemplate || local.designTemplate || "classic-light"
    ),
    title: force || !String(local.title || "").trim() ? String(snap.title || "").trim() : local.title,
    department:
      force || !String(local.department || "").trim()
        ? String(snap.department || "").trim()
        : local.department
  };

  return writeLetteringBizcardEditable(patch)?.data ?? null;
}

/** 서버에서 디지털 명함 메타 (HTML 배포·검증·유효기간·편집 스냅샷) */
export async function fetchDigitalCardMeta() {
  const cached = readStoredDigitalCardId();
  try {
    const res = await vlueAuthFetch(apiUrl("/api/cards/my-digital-card"), {
      headers: vlueAuthHeaders()
    });
    if (!res.ok) {
      return {
        cardId: cached || null,
        issuedAt: null,
        designTemplate: null,
        issued: false,
        exportSnapshot: null
      };
    }
    const data = await res.json();
    if (data?.cardId) writeStoredDigitalCardId(data.cardId);
    if (data?.exportSnapshot) {
      hydrateLetteringEditableFromSnapshot(data.exportSnapshot, { force: false });
    }
    if (data?.subscription?.cycleEndAt) {
      writeMembershipBillingMeta({
        cycleEndAt: data.subscription.cycleEndAt,
        billingCycle: data.subscription.billingCycle,
        paidAt: data.subscription.cycleStartAt || undefined
      });
    }
    return {
      cardId: data?.cardId || cached || null,
      issuedAt: data?.issuedAt || null,
      designTemplate: data?.designTemplate || null,
      issued: Boolean(data?.issued),
      exportSnapshot: data?.exportSnapshot || null,
      subscription: data?.subscription || null
    };
  } catch {
    return {
      cardId: cached || null,
      issuedAt: null,
      designTemplate: null,
      issued: false,
      exportSnapshot: null
    };
  }
}

/** 서버에서 디지털 명함 ID 확보 (HTML 배포·검증용) */
export async function ensureDigitalCardId() {
  const meta = await fetchDigitalCardMeta();
  return meta.cardId || null;
}

export async function syncDigitalCardDesignTemplate(templateId) {
  const tpl = normalizeLetteringBizcardTemplate(templateId);
  try {
    const res = await vlueAuthFetch(apiUrl("/api/cards/my-digital-card"), {
      method: "PATCH",
      headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ designTemplate: tpl })
    });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return { ok: true, designTemplate: data.designTemplate || tpl };
  } catch {
    return { ok: false };
  }
}

/** OG 썸네일·서버 렌더·재로그인 복원용 명함 스냅샷 동기화 */
export async function syncDigitalCardExportSnapshot(card) {
  const ed = readLetteringBizcardEditable();
  const { road, detail } = readLetteringBizcardAddressFields(ed);
  const address =
    String(card?.address || "").trim() ||
    combineLetteringBizcardAddress(road, detail) ||
    String(ed.address || "").trim();

  try {
    const res = await vlueAuthFetch(apiUrl("/api/cards/my-digital-card"), {
      method: "PATCH",
      headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        designTemplate: normalizeLetteringBizcardTemplate(card?.designTemplate || ed.designTemplate),
        exportSnapshot: {
          organization: card?.organization || "",
          name: card?.name || card?.displayName || "",
          title: card?.title || ed.title || "",
          department: card?.department || ed.department || "",
          phone: card?.phone || "",
          email: clampLetteringBizcardEmail(card?.email || ed.email || ""),
          website: ed.noWebsite ? "" : String(card?.website || ed.website || "").trim(),
          noWebsite: Boolean(ed.noWebsite),
          fax: ed.noFax ? "" : String(card?.fax || ed.fax || "").trim(),
          noFax: Boolean(ed.noFax),
          address,
          addressRoad: road || String(ed.addressRoad || "").trim(),
          addressDetail: detail || String(ed.addressDetail || "").trim(),
          companyIntro: String(ed.companyIntro || card?.companyIntro || "").trim(),
          customBackText: String(ed.customBackText || card?.customBackText || "").trim(),
          logoUrl: String(card?.logoUrl || ed.logoDataUrl || ed.logoUrl || "").trim(),
          photoUrl: String(card?.photoUrl || ed.photoDataUrl || ed.photoUrl || "").trim(),
          noCompanyLogo: Boolean(ed.noCompanyLogo),
          noProfilePhoto: Boolean(ed.noProfilePhoto),
          shareCoverUrl: String(ed.kakaoFeedBgDataUrl || card?.shareCoverUrl || "").trim(),
          designTemplate: normalizeLetteringBizcardTemplate(card?.designTemplate || ed.designTemplate)
        }
      })
    });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    if (data?.cardId) writeStoredDigitalCardId(data.cardId);
    return { ok: true, cardId: data.cardId, exportSnapshot: data.exportSnapshot || null };
  } catch {
    return { ok: false };
  }
}
