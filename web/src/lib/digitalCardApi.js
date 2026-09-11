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
import { hydrateFeedNicknameFromSnapshot, readFeedNickname, writeCardFields } from "./memberCardStorage.js";

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

/** 서버 스냅샷 → 로컬 명함 편집 필드 복원
 * force=true 여도 서버 빈 값으로 로컬에 이미 있는 값을 지우지 않음 (연락처·소개)
 */
export function hydrateLetteringEditableFromSnapshot(snap, opts = {}) {
  if (!snap || typeof snap !== "object") return null;
  const force = Boolean(opts.force);
  const local = readLetteringBizcardEditable();
  const localEmail = String(local.email || "").trim();
  const localWebsite = String(local.website || "").trim();
  const localAddress = String(local.address || local.addressRoad || "").trim();
  const localFax = String(local.fax || "").trim();

  const pickText = (snapVal, localVal, { preferSnap = force } = {}) => {
    const s = String(snapVal || "").trim();
    const l = String(localVal || "").trim();
    if (preferSnap) return s || l;
    return l || s;
  };

  const roadFromSnap = String(snap.addressRoad || "").trim();
  const detailFromSnap = String(snap.addressDetail || "").trim();
  const addressCombined =
    combineLetteringBizcardAddress(roadFromSnap, detailFromSnap) ||
    String(snap.address || "").trim();
  const { road: localRoad, detail: localDetail } = readLetteringBizcardAddressFields(local);

  const patch = {
    email: clampLetteringBizcardEmail(
      pickText(snap.email, local.email, { preferSnap: force || !localEmail })
    ),
    website: pickText(snap.website, local.website, { preferSnap: force || !localWebsite }),
    fax: pickText(snap.fax, local.fax, { preferSnap: force || !localFax }),
    addressRoad: pickText(
      roadFromSnap || String(snap.address || "").trim(),
      localRoad,
      { preferSnap: force || !localRoad }
    ),
    addressDetail: pickText(detailFromSnap, localDetail, {
      preferSnap: force || !localDetail
    }),
    address: pickText(addressCombined, local.address, {
      preferSnap: force || !localAddress
    }),
    companyIntro: pickText(snap.companyIntro, local.companyIntro, {
      preferSnap: force || !String(local.companyIntro || "").trim()
    }),
    customBackText: pickText(snap.customBackText, local.customBackText, {
      preferSnap: force || !String(local.customBackText || "").trim()
    }),
    logoDataUrl: (() => {
      const fromSnap = String(snap.logoUrl || "").trim();
      const localLogo = String(local.logoDataUrl || local.logoUrl || "").trim();
      if (force) return fromSnap || localLogo;
      return localLogo ? localLogo : fromSnap;
    })(),
    photoDataUrl: (() => {
      const fromSnap = String(snap.photoUrl || "").trim();
      const localPhoto = String(local.photoDataUrl || local.photoUrl || "").trim();
      if (force) return fromSnap || localPhoto;
      return localPhoto ? localPhoto : fromSnap;
    })(),
    titlePhotoDataUrl: (() => {
      const fromSnap = String(snap.titlePhotoUrl || "").trim();
      const localTitle = String(local.titlePhotoDataUrl || local.titlePhotoUrl || "").trim();
      if (force) return fromSnap || localTitle;
      return localTitle ? localTitle : fromSnap;
    })(),
    photoFocus:
      force || !String(local.photoFocus || "").trim()
        ? normalizePhotoFocus(snap.photoFocus || local.photoFocus)
        : normalizePhotoFocus(local.photoFocus),
    noCompanyLogo: force && snap.noCompanyLogo != null ? Boolean(snap.noCompanyLogo) : Boolean(local.noCompanyLogo),
    noProfilePhoto: force && snap.noProfilePhoto != null ? Boolean(snap.noProfilePhoto) : Boolean(local.noProfilePhoto),
    noTitlePhoto: force && snap.noTitlePhoto != null ? Boolean(snap.noTitlePhoto) : Boolean(local.noTitlePhoto),
    noFax: force && snap.noFax != null ? Boolean(snap.noFax) : Boolean(local.noFax),
    noWebsite: force && snap.noWebsite != null ? Boolean(snap.noWebsite) : Boolean(local.noWebsite),
    kakaoFeedBgDataUrl: pickText(snap.shareCoverUrl, local.kakaoFeedBgDataUrl, {
      preferSnap: force || !String(local.kakaoFeedBgDataUrl || "").trim()
    }),
    designTemplate: normalizeLetteringBizcardTemplate(
      snap.designTemplate || local.designTemplate || "classic-light"
    ),
    title: pickText(snap.title, local.title, {
      preferSnap: force || !String(local.title || "").trim()
    }),
    department: pickText(snap.department, local.department, {
      preferSnap: force || !String(local.department || "").trim()
    }),
    displayName: pickText(snap.name || snap.displayName, local.displayName, {
      preferSnap: force || !String(local.displayName || "").trim()
    }),
    accountType: (() => {
      const fromSnap = String(snap.accountType || "").trim();
      if (fromSnap) return fromSnap;
      return String(local.accountType || "").trim();
    })(),
    bankName: (() => {
      const fromSnap = String(snap.bankName || "").trim();
      if (fromSnap) return fromSnap;
      return String(local.bankName || "").trim();
    })(),
    accountNumber: (() => {
      const fromSnap = String(snap.accountNumber || "").replace(/\D/g, "");
      if (fromSnap) return fromSnap;
      return String(local.accountNumber || "").replace(/\D/g, "");
    })(),
    accountHolder: (() => {
      const fromSnap = String(snap.accountHolder || "").trim();
      if (fromSnap) return fromSnap;
      return String(local.accountHolder || "").trim();
    })(),
    isGroupVerified:
      snap.isGroupVerified != null
        ? Boolean(snap.isGroupVerified)
        : Boolean(local.isGroupVerified),
    accountGroupDocName: (() => {
      const fromSnap = String(snap.accountGroupDocName || "").trim();
      if (fromSnap) return fromSnap;
      return String(local.accountGroupDocName || "").trim();
    })()
  };

  /* 값이 복원됐으면 no* 플래그가 UI·동기화에서 가리지 않게 */
  if (String(patch.fax || "").trim() || String(snap.fax || "").trim()) {
    patch.noFax = false;
  }
  if (String(patch.website || "").trim() || String(snap.website || "").trim()) {
    patch.noWebsite = false;
  }
  if (
    String(patch.titlePhotoDataUrl || "").trim() ||
    String(snap.titlePhotoUrl || "").trim()
  ) {
    patch.noTitlePhoto = false;
  }
  if (String(patch.photoDataUrl || "").trim() || String(snap.photoUrl || "").trim()) {
    patch.noProfilePhoto = false;
  }
  if (String(patch.logoDataUrl || "").trim() || String(snap.logoUrl || "").trim()) {
    patch.noCompanyLogo = false;
  }

  const written = writeLetteringBizcardEditable(patch)?.data ?? null;
  if (written) {
    /* URL 이 복원됐으면 no* 플래그가 가리지 않게 */
    const fixFlags = {};
    if (String(written.titlePhotoDataUrl || written.titlePhotoUrl || "").trim()) {
      fixFlags.noTitlePhoto = false;
    }
    if (String(written.photoDataUrl || written.photoUrl || "").trim()) {
      fixFlags.noProfilePhoto = false;
    }
    if (String(written.logoDataUrl || written.logoUrl || "").trim()) {
      fixFlags.noCompanyLogo = false;
    }
    if (String(written.fax || "").trim()) {
      fixFlags.noFax = false;
    }
    if (String(written.website || "").trim()) {
      fixFlags.noWebsite = false;
    }
    if (Object.keys(fixFlags).length) {
      writeLetteringBizcardEditable(fixFlags);
    }
    writeCardFields({
      email: String(written.email || "").trim(),
      fax: String(written.fax || "").trim()
    });
  }
  return written;
}

/** 로컬 명함 편집값이 비어 재설치·캐시 유실·멀티프로필 오삭제 로 보이는지 */
export function needsDigitalCardLocalRestore() {
  try {
    const ed = readLetteringBizcardEditable();
    const email = String(ed.email || "").trim();
    const photo = String(ed.photoDataUrl || ed.photoUrl || "").trim();
    const titlePhoto = String(ed.titlePhotoDataUrl || ed.titlePhotoUrl || "").trim();
    const website = String(ed.website || "").trim();
    const address = String(ed.address || ed.addressRoad || "").trim();
    const fax = String(ed.fax || "").trim();
    const logo = String(ed.logoDataUrl || ed.logoUrl || "").trim();
    /* 재설치·오삭제: 연락/미디어가 비면 서버 full 복원 */
    if (!email && !photo && !website && !address && !fax && !logo) return true;
    /* 멀티프로필 오삭제로 타이틀·프로필이 같이 지워진 경우 */
    if (!titlePhoto && Boolean(ed.noTitlePhoto) && !photo) return true;
    /* emptyDccSnapshot 패턴: 타이틀+팩스+웹이 플래그로 같이 비움 */
    if (
      !titlePhoto &&
      Boolean(ed.noTitlePhoto) &&
      !fax &&
      Boolean(ed.noFax) &&
      !website &&
      Boolean(ed.noWebsite)
    ) {
      return true;
    }
    /* 이메일은 있는데 타이틀만 noTitlePhoto 로 가려진 부분 삭제 */
    if (email && !titlePhoto && Boolean(ed.noTitlePhoto)) return true;
    return false;
  } catch {
    return true;
  }
}

/** 이메일만 있고 주소·웹·소개 등이 비어 서버 스냅으로 빈 칸만 채울지 */
export function needsDigitalCardContactFill() {
  try {
    const ed = readLetteringBizcardEditable();
    return !(
      String(ed.email || "").trim() &&
      String(ed.website || "").trim() &&
      String(ed.address || ed.addressRoad || "").trim() &&
      String(ed.fax || "").trim() &&
      String(ed.companyIntro || "").trim() &&
      String(ed.customBackText || "").trim()
    );
  } catch {
    return true;
  }
}

/**
 * 로컬에 이미 있는 값은 유지하고, 빈 연락·소개 칸만 서버 스냅으로 채운다.
 */
export async function fillEmptyDigitalCardFieldsFromServer() {
  const meta = await fetchDigitalCardMeta({ force: true, lite: false });
  if (meta?.exportSnapshot) {
    hydrateLetteringEditableFromSnapshot(meta.exportSnapshot, { force: false });
    hydrateAvatarsFromExportSnapshot(meta.exportSnapshot, { force: false });
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
 * 재설치·로그인 후 서버 exportSnapshot 전체 복원 (lite 금지)
 * @param {{ force?: boolean }} [opts]
 */
export async function restoreDigitalCardFromServer(opts = {}) {
  const force = opts.force !== false;
  try {
    const { clearStaleAutoOmitFlags } = await import("./letteringBizcardStorage.js");
    clearStaleAutoOmitFlags();
  } catch {
    /* ignore */
  }
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
        subscription: data?.subscription || null,
        membershipTierSnapshot: data?.membershipTierSnapshot || null
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
export async function syncDigitalCardExportSnapshot(card, opts = {}) {
  /* 멀티프로필 오삭제로 로컬이 비었으면 서버로 덮어쓰지 말고 먼저 복원 */
  try {
    const ed0 = readLetteringBizcardEditable();
    const looksWiped =
      !String(ed0.email || "").trim() &&
      !String(ed0.titlePhotoDataUrl || ed0.titlePhotoUrl || "").trim() &&
      Boolean(ed0.noTitlePhoto);
    if (looksWiped || needsDigitalCardLocalRestore()) {
      await restoreDigitalCardFromServer({ force: true });
    }
  } catch {
    /* continue sync with whatever local has */
  }

  const ed = readLetteringBizcardEditable();
  const { road, detail } = readLetteringBizcardAddressFields(ed);
  const address =
    String(card?.address || "").trim() ||
    combineLetteringBizcardAddress(road, detail) ||
    String(ed.address || "").trim();

  const { ensureHttpMediaUrl } = await import("./mediaImageUpload.js");

  let photoUrl = "";
  let titlePhotoUrl = "";
  let logoUrl = "";
  let shareCoverUrl = "";
  let mediaError = "";
  try {
    photoUrl = await ensureHttpMediaUrl(
      card?.photoUrl || ed.photoDataUrl || ed.photoUrl || "",
      "photo"
    );
    titlePhotoUrl = await ensureHttpMediaUrl(
      card?.titlePhotoUrl || ed.titlePhotoDataUrl || ed.titlePhotoUrl || "",
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
    titlePhotoUrl =
      titlePhotoUrl ||
      pickHttp(card?.titlePhotoUrl, ed.titlePhotoDataUrl, ed.titlePhotoUrl);
    logoUrl = logoUrl || pickHttp(card?.logoUrl, ed.logoDataUrl, ed.logoUrl);
    shareCoverUrl =
      shareCoverUrl ||
      pickHttp(card?.shareCoverUrl, ed.kakaoFeedBgDataUrl, ed.kakaoFeedBgUrl);
  }

  /* 빈 로컬로 서버 타이틀/사진을 지우지 않음 — URL 이 있을 때만 no* 반영 */
  let faxValue = String(card?.fax || ed.fax || "").trim();
  let websiteValue = String(card?.website || ed.website || "").trim();
  let noTitlePhoto = Boolean(ed.noTitlePhoto) && !titlePhotoUrl;
  const noProfilePhoto = Boolean(ed.noProfilePhoto) && !photoUrl;
  const noCompanyLogo = Boolean(ed.noCompanyLogo) && !logoUrl;
  let noFax = Boolean(ed.noFax) && !faxValue;
  let noWebsite = Boolean(ed.noWebsite) && !websiteValue;

  /* 로컬이 오삭제 패턴(여러 no* + 빈 값)일 때만 서버 스냅으로 채움 — 의도적 단일 필드 삭제 보존 */
  const looksPartialWipe =
    (Boolean(ed.noTitlePhoto) && !titlePhotoUrl && Boolean(ed.noFax) && !faxValue) ||
    (Boolean(ed.noTitlePhoto) && !titlePhotoUrl && Boolean(ed.noWebsite) && !websiteValue) ||
    (Boolean(ed.noFax) && !faxValue && Boolean(ed.noWebsite) && !websiteValue && Boolean(ed.noTitlePhoto));
  if (looksPartialWipe) {
    try {
      const meta = await fetchDigitalCardMeta({ force: true, lite: false });
      const snap = meta?.exportSnapshot && typeof meta.exportSnapshot === "object" ? meta.exportSnapshot : {};
      if (!faxValue) faxValue = String(snap.fax || "").trim();
      if (!websiteValue) websiteValue = String(snap.website || "").trim();
      if (!titlePhotoUrl) {
        const fromSnap = String(snap.titlePhotoUrl || "").trim();
        if (/^https?:\/\//i.test(fromSnap)) titlePhotoUrl = fromSnap;
      }
      if (faxValue) noFax = false;
      if (websiteValue) noWebsite = false;
      if (titlePhotoUrl) noTitlePhoto = false;
      const heal = {};
      if (faxValue) {
        heal.fax = faxValue;
        heal.noFax = false;
      }
      if (websiteValue) {
        heal.website = websiteValue;
        heal.noWebsite = false;
      }
      if (titlePhotoUrl) {
        heal.titlePhotoDataUrl = titlePhotoUrl;
        heal.noTitlePhoto = false;
      }
      if (Object.keys(heal).length) writeLetteringBizcardEditable(heal);
    } catch {
      /* ignore */
    }
  }

  /* OG/카톡: 타이틀사진이 있으면 대표 썸네일로 맞춤(옛 shareCover·시가 사진 잔존 방지).
   * 전용 카톡 배경(kakaoFeedBg)을 따로 올린 경우는 유지 */
  const dedicatedKakaoCover = String(ed.kakaoFeedBgDataUrl || ed.kakaoFeedBgUrl || "").trim();
  const hasDedicatedKakaoCover =
    Boolean(dedicatedKakaoCover) &&
    /^https?:\/\//i.test(dedicatedKakaoCover) &&
    dedicatedKakaoCover !== titlePhotoUrl;
  if (titlePhotoUrl && !noTitlePhoto && !hasDedicatedKakaoCover) {
    shareCoverUrl = titlePhotoUrl;
  } else if (!shareCoverUrl && titlePhotoUrl && !noTitlePhoto) {
    shareCoverUrl = titlePhotoUrl;
  }

  /* 업로드 성공한 https 는 로컬에도 반영 — 재설치 복원·재업로드 루프 방지 */
  try {
    const patch = {};
    if (photoUrl && photoUrl !== String(ed.photoDataUrl || "").trim()) {
      patch.photoDataUrl = photoUrl;
      patch.noProfilePhoto = false;
    }
    if (titlePhotoUrl && titlePhotoUrl !== String(ed.titlePhotoDataUrl || "").trim()) {
      patch.titlePhotoDataUrl = titlePhotoUrl;
      patch.noTitlePhoto = false;
    }
    if (logoUrl && logoUrl !== String(ed.logoDataUrl || "").trim()) {
      patch.logoDataUrl = logoUrl;
      patch.noCompanyLogo = false;
    }
    if (shareCoverUrl && shareCoverUrl !== String(ed.kakaoFeedBgDataUrl || "").trim()) {
      patch.kakaoFeedBgDataUrl = shareCoverUrl;
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
        emailVerifyToken: opts.emailVerifyToken || opts.token || undefined,
        exportSnapshot: {
          organization: card?.organization || "",
          name: card?.name || card?.displayName || "",
          title: card?.title || ed.title || "",
          department: card?.department || ed.department || "",
          phone: card?.phone || "",
          email: clampLetteringBizcardEmail(card?.email || ed.email || ""),
          website: noWebsite ? "" : websiteValue,
          noWebsite,
          fax: noFax ? "" : faxValue,
          noFax,
          address,
          addressRoad: road || String(ed.addressRoad || "").trim(),
          addressDetail: detail || String(ed.addressDetail || "").trim(),
          companyIntro: String(ed.companyIntro || card?.companyIntro || "").trim(),
          customBackText: String(ed.customBackText || card?.customBackText || "").trim(),
          logoUrl: noCompanyLogo ? "" : logoUrl,
          photoUrl: noProfilePhoto ? "" : photoUrl,
          titlePhotoUrl: noTitlePhoto ? "" : titlePhotoUrl,
          photoFocus: normalizePhotoFocus(card?.photoFocus || ed.photoFocus),
          noCompanyLogo,
          noProfilePhoto,
          noTitlePhoto,
          shareCoverUrl,
          designTemplate: normalizeLetteringBizcardTemplate(card?.designTemplate || ed.designTemplate),
          activityName: String(card?.activityName || readFeedNickname() || "").trim(),
          accountType: String(card?.accountType || ed.accountType || "").trim(),
          bankName: String(card?.bankName || ed.bankName || "").trim(),
          accountNumber: String(card?.accountNumber || ed.accountNumber || "").replace(/\D/g, ""),
          accountHolder: String(card?.accountHolder || ed.accountHolder || "").trim(),
          isGroupVerified: Boolean(card?.isGroupVerified ?? ed.isGroupVerified),
          accountGroupDocName: String(card?.accountGroupDocName || ed.accountGroupDocName || "").trim()
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

    /* 멀티 프로필: 선택 회선이 있으면 동일 스냅샷을 회선(+연결된 프로필)에도 반영 */
    try {
      const { readSelectedDccLineId, readDccLinePreview } = await import("./dccLineState.js");
      const { putDccLineDcc } = await import("./dccLinesApi.js");
      const { putDccProfileBundle } = await import("./dccAgentProfilesApi.js");
      const lineId = String(readSelectedDccLineId() || "").trim();
      const preview = readDccLinePreview() || {};
      const snap = {
        organization: card?.organization || "",
        name: card?.name || card?.displayName || "",
        displayName: card?.name || card?.displayName || "",
        title: card?.title || ed.title || "",
        department: card?.department || ed.department || "",
        phone: card?.phone || "",
        email: clampLetteringBizcardEmail(card?.email || ed.email || ""),
        website: noWebsite ? "" : websiteValue,
        fax: noFax ? "" : faxValue,
        address,
        companyIntro: String(ed.companyIntro || card?.companyIntro || "").trim(),
        customBackText: String(ed.customBackText || card?.customBackText || "").trim(),
        logoUrl: noCompanyLogo ? "" : logoUrl,
        photoUrl: noProfilePhoto ? "" : photoUrl,
        titlePhotoUrl: noTitlePhoto ? "" : titlePhotoUrl,
        photoFocus: normalizePhotoFocus(card?.photoFocus || ed.photoFocus),
        accountType: String(card?.accountType || ed.accountType || "").trim(),
        bankName: String(card?.bankName || ed.bankName || "").trim(),
        accountNumber: String(card?.accountNumber || ed.accountNumber || "").replace(/\D/g, ""),
        accountHolder: String(card?.accountHolder || ed.accountHolder || "").trim(),
        isGroupVerified: Boolean(card?.isGroupVerified ?? ed.isGroupVerified)
      };
      if (lineId && !preview.isCertified) {
        await putDccLineDcc(lineId, snap);
      }
      let editingProfileId = "";
      try {
        editingProfileId = String(localStorage.getItem("vlue_multi_dcc_editing_profile_id") || "").trim();
      } catch {
        /* ignore */
      }
      let agentId = String(preview.agentId || editingProfileId || "").trim();
      if (!agentId) {
        try {
          const { fetchDccAgentProfiles } = await import("./dccAgentProfilesApi.js");
          const listed = await fetchDccAgentProfiles();
          agentId = String(listed?.activeId || listed?.representativeId || "").trim();
        } catch {
          /* ignore */
        }
      }
      /* 로컬이 비어 보이는 상태에서는 프로필 번들에 빈 스냅을 쓰지 않음 */
      const snapHasContent =
        Boolean(String(snap.email || "").trim()) ||
        Boolean(String(snap.photoUrl || "").trim()) ||
        Boolean(String(snap.titlePhotoUrl || "").trim()) ||
        Boolean(String(snap.organization || "").trim());
      if (agentId && snapHasContent) {
        await putDccProfileBundle(agentId, { dcc: snap });
      }
    } catch {
      /* 회선 동기화 실패해도 마스터 저장은 성공으로 유지 */
    }

    return {
      ok: true,
      cardId: data.cardId,
      exportSnapshot: null,
      photoUrl,
      titlePhotoUrl,
      logoUrl,
      shareCoverUrl,
      mediaError: mediaError || null
    };
  } catch (e) {
    const raw = e instanceof Error ? e.message : "";
    const net = /Failed to fetch|NetworkError|Load failed/i.test(raw);
    return {
      ok: false,
      error:
        mediaError ||
        (net
          ? "서버에 연결하지 못했습니다. (API 미기동·네트워크). 잠시 후 다시 시도해 주세요."
          : raw || "서버 동기화 실패")
    };
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
