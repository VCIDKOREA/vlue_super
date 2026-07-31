import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";
import { normalizeLetteringBizcardTemplate } from "./letteringBizcardTemplates.js";
import {
  readLetteringBizcardEditable,
  writeLetteringBizcardEditable,
  readLetteringBizcardAddressFields,
  combineLetteringBizcardAddress,
  clampLetteringBizcardEmail,
  normalizePhotoFocus
} from "./letteringBizcardStorage.js";
import { writeMembershipBillingMeta } from "./authValidityPeriod.js";
import {
  hydrateAvatarsFromExportSnapshot,
  pushLocalAvatarsIfServerMissing
} from "./avatarServerSync.js";
import { hydrateFeedNicknameFromSnapshot, readFeedNickname } from "./memberCardStorage.js";

const DIGITAL_CARD_ID_KEY = "vlue_digital_card_id";

/** 메모리 캐시 — 동일 세션 중복 GET 차단 */
let digitalCardMetaCache = {
  at: 0,
  lite: null,
  full: null,
  inFlightLite: null,
  inFlightFull: null
};
const DIGITAL_CARD_META_TTL_MS = 60_000;

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
    logoDataUrl: (() => {
      const fromSnap = String(snap.logoUrl || "").trim();
      const localLogo = String(local.logoDataUrl || local.logoUrl || "").trim();
      if (force) return fromSnap || localLogo;
      return localLogo ? localLogo : fromSnap;
    })(),
    photoDataUrl: (() => {
      const fromSnap = String(snap.photoUrl || "").trim();
      const localPhoto = String(local.photoDataUrl || local.photoUrl || "").trim();
      /* force여도 서버에 사진이 없으면 빈 값으로 덮어 지우지 않음 */
      if (force) return fromSnap || localPhoto;
      return localPhoto ? localPhoto : fromSnap;
    })(),
    photoFocus:
      force || !String(local.photoFocus || "").trim()
        ? normalizePhotoFocus(snap.photoFocus || local.photoFocus)
        : normalizePhotoFocus(local.photoFocus),
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

/** 로컬 명함 편집값이 비어 재설치·캐시 유실로 보이는지 */
export function needsDigitalCardLocalRestore() {
  try {
    const ed = readLetteringBizcardEditable();
    const email = String(ed.email || "").trim();
    const photo = String(ed.photoDataUrl || ed.photoUrl || "").trim();
    const website = String(ed.website || "").trim();
    const address = String(ed.address || ed.addressRoad || "").trim();
    return !email && !photo && !website && !address;
  } catch {
    return true;
  }
}

/**
 * 재설치·로그인 후 서버 exportSnapshot 전체 복원 (lite 금지)
 * @param {{ force?: boolean }} [opts]
 */
export async function restoreDigitalCardFromServer(opts = {}) {
  const force = opts.force !== false;
  const meta = await fetchDigitalCardMeta({ force: true, lite: false });
  if (meta?.exportSnapshot) {
    hydrateLetteringEditableFromSnapshot(meta.exportSnapshot, { force });
    hydrateAvatarsFromExportSnapshot(meta.exportSnapshot, { force });
    hydrateFeedNicknameFromSnapshot(meta.exportSnapshot, { force });
    try {
      const name = String(
        meta.exportSnapshot.name || meta.exportSnapshot.displayName || ""
      ).trim();
      if (name) {
        localStorage.setItem("myCardDisplayName", name);
        if (!localStorage.getItem("vlue_legal_name")) {
          localStorage.setItem("vlue_legal_name", name);
        }
      }
      const org = String(
        meta.exportSnapshot.organization || meta.exportSnapshot.companyName || ""
      ).trim();
      if (org) localStorage.setItem("myCardOrganization", org);
      const phone = String(meta.exportSnapshot.phone || "").trim();
      if (phone) localStorage.setItem("myCardPhone", phone);
    } catch {
      /* ignore */
    }
    try {
      window.dispatchEvent(new CustomEvent("vlue-digital-card-changed"));
      window.dispatchEvent(new CustomEvent("vlue-lettering-bizcard-changed"));
      window.dispatchEvent(new Event("vlue-vcid-changed"));
    } catch {
      /* ignore */
    }
  }
  return meta;
}

/**
 * 서버에서 디지털 명함 메타 (HTML 배포·검증·유효기간·편집 스냅샷)
 * @param {{ force?: boolean, lite?: boolean }} [opts]
 *  - force=true: 계정 전환 직후 — 서버본 덮어쓰기
 *  - lite=true: exportSnapshot 생략 (허브·계정 동기화 · egress 절감)
 */
export async function fetchDigitalCardMeta(opts = {}) {
  const force = Boolean(opts.force);
  const lite = Boolean(opts.lite);
  const cached = force ? null : readStoredDigitalCardId();
  const now = Date.now();
  if (force) {
    digitalCardMetaCache.at = 0;
    digitalCardMetaCache.lite = null;
    digitalCardMetaCache.full = null;
  }
  if (!force) {
    const slot = lite ? digitalCardMetaCache.lite : digitalCardMetaCache.full;
    if (slot && now - digitalCardMetaCache.at < DIGITAL_CARD_META_TTL_MS) {
      return slot;
    }
    const inflight = lite ? digitalCardMetaCache.inFlightLite : digitalCardMetaCache.inFlightFull;
    if (inflight) return inflight;
  }

  const run = (async () => {
    try {
      const q = lite ? "?lite=1" : "";
      const res = await vlueAuthFetch(apiUrl(`/api/cards/my-digital-card${q}`), {
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
      else if (force) {
        try {
          localStorage.removeItem(DIGITAL_CARD_ID_KEY);
        } catch {
          /* ignore */
        }
      }
      if (!lite && data?.exportSnapshot) {
        hydrateLetteringEditableFromSnapshot(data.exportSnapshot, { force });
        hydrateAvatarsFromExportSnapshot(data.exportSnapshot, { force });
        hydrateFeedNicknameFromSnapshot(data.exportSnapshot, { force });
        /* 계정 전환 직후에도 로컬(세션 복원분)·서버 중 사진이 있으면 스냅에 반영 */
        pushLocalAvatarsIfServerMissing(data.exportSnapshot);
      }
      if (data?.subscription?.cycleEndAt) {
        writeMembershipBillingMeta({
          cycleEndAt: data.subscription.cycleEndAt,
          billingCycle: data.subscription.billingCycle,
          paidAt: data.subscription.cycleStartAt || undefined
        });
      }
      const result = {
        cardId: data?.cardId || cached || null,
        issuedAt: data?.issuedAt || null,
        designTemplate: data?.designTemplate || null,
        issued: Boolean(data?.issued),
        exportSnapshot: lite ? null : data?.exportSnapshot || null,
        subscription: data?.subscription || null
      };
      digitalCardMetaCache.at = Date.now();
      if (lite) digitalCardMetaCache.lite = result;
      else digitalCardMetaCache.full = result;
      return result;
    } catch {
      return {
        cardId: cached || null,
        issuedAt: null,
        designTemplate: null,
        issued: false,
        exportSnapshot: null
      };
    }
  })();

  if (!force) {
    if (lite) {
      digitalCardMetaCache.inFlightLite = run.finally(() => {
        digitalCardMetaCache.inFlightLite = null;
      });
      return digitalCardMetaCache.inFlightLite;
    }
    digitalCardMetaCache.inFlightFull = run.finally(() => {
      digitalCardMetaCache.inFlightFull = null;
    });
    return digitalCardMetaCache.inFlightFull;
  }
  return run;
}

/** 서버에서 디지털 명함 ID 확보 (HTML 배포·검증용) */
export async function ensureDigitalCardId() {
  const meta = await fetchDigitalCardMeta({ lite: true });
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

  const { ensureHttpMediaUrl } = await import("./mediaImageUpload.js");

  let photoUrl = "";
  let logoUrl = "";
  let shareCoverUrl = "";
  let mediaError = "";
  try {
    photoUrl = await ensureHttpMediaUrl(
      card?.photoUrl || ed.photoDataUrl || ed.photoUrl || "",
      "photo"
    );
    logoUrl = await ensureHttpMediaUrl(
      card?.logoUrl || ed.logoDataUrl || ed.logoUrl || "",
      "logo"
    );
    shareCoverUrl = await ensureHttpMediaUrl(
      card?.shareCoverUrl || ed.kakaoFeedBgDataUrl || ed.kakaoFeedBgUrl || "",
      "cover"
    );
  } catch (e) {
    mediaError = e instanceof Error ? e.message : "이미지 업로드 실패";
    /* https 후보만이라도 남긴다 */
    const pickHttp = (...vals) => {
      for (const v of vals) {
        const s = String(v || "").trim();
        if (/^https?:\/\//i.test(s)) return s;
      }
      return "";
    };
    photoUrl =
      photoUrl ||
      pickHttp(card?.photoUrl, ed.photoDataUrl, ed.photoUrl);
    logoUrl = logoUrl || pickHttp(card?.logoUrl, ed.logoDataUrl, ed.logoUrl);
    shareCoverUrl =
      shareCoverUrl ||
      pickHttp(card?.shareCoverUrl, ed.kakaoFeedBgDataUrl, ed.kakaoFeedBgUrl);
  }

  /* 업로드 성공한 https 는 로컬에도 반영 — 재설치 복원·재업로드 루프 방지 */
  try {
    const patch = {};
    if (photoUrl && photoUrl !== String(ed.photoDataUrl || "").trim()) {
      patch.photoDataUrl = photoUrl;
      patch.noProfilePhoto = false;
    }
    if (logoUrl && logoUrl !== String(ed.logoDataUrl || "").trim()) {
      patch.logoDataUrl = logoUrl;
      patch.noCompanyLogo = false;
    }
    if (Object.keys(patch).length) writeLetteringBizcardEditable(patch);
  } catch {
    /* ignore */
  }

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
          logoUrl: ed.noCompanyLogo ? "" : logoUrl,
          photoUrl: ed.noProfilePhoto ? "" : photoUrl,
          photoFocus: normalizePhotoFocus(card?.photoFocus || ed.photoFocus),
          noCompanyLogo: Boolean(ed.noCompanyLogo),
          noProfilePhoto: Boolean(ed.noProfilePhoto),
          shareCoverUrl,
          designTemplate: normalizeLetteringBizcardTemplate(card?.designTemplate || ed.designTemplate),
          activityName: String(card?.activityName || readFeedNickname() || "").trim()
        }
      })
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: errBody?.error || mediaError || "서버 동기화 실패"
      };
    }
    const data = await res.json();
    if (data?.cardId) writeStoredDigitalCardId(data.cardId);
    digitalCardMetaCache.at = 0;
    digitalCardMetaCache.lite = null;
    digitalCardMetaCache.full = null;
    return {
      ok: true,
      cardId: data.cardId,
      exportSnapshot: null,
      photoUrl,
      logoUrl,
      mediaError: mediaError || null
    };
  } catch {
    return { ok: false, error: mediaError || "서버 동기화 실패" };
  }
}

/** 활동 닉네임만 스냅샷에 병합 (댓글·콘텐츠 표시용) */
export async function syncActivityNicknameToServer(activityName) {
  const name = String(activityName || readFeedNickname() || "").trim();
  try {
    const res = await vlueAuthFetch(apiUrl("/api/cards/my-digital-card"), {
      method: "PATCH",
      headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ exportSnapshot: { activityName: name } })
    });
    if (!res.ok) return { ok: false };
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
