import { prisma } from "../db/client.js";
import { normalizeToE164KR } from "../lib/phoneE164.js";
import { isPlatformCeoHandle } from "./admin/platformAccountRoles.js";
import { getVluePublicOrigin } from "./bizcard/bizcardPublicUrls.js";
import { buildViewerAccessContext } from "./follow/followService.js";
import { maskProfileForViewer, privacySelect } from "./follow/profileAccessControl.js";
import {
  buildAgencyDcpLookupBody,
  resolveAgencyCallRoute
} from "./agency/nationalAgencyDcpService.js";

/** CEO 기본 VLUE 브랜드 로고 (업로드 없을 때) */
function ceoDefaultBrandLogoUrl(): string {
  return `${getVluePublicOrigin()}/vlue-brand-logo.svg`;
}

function pickProfileString(profileJson: unknown, keys: string[]): string | null {
  if (!profileJson || typeof profileJson !== "object") return null;
  const o = profileJson as Record<string, unknown>;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function firstStr(...values: unknown[]): string {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function httpOnlyUrl(v: unknown): string {
  const t = String(v || "").trim();
  if (!t || /^\s*data:/i.test(t) || /^\s*blob:/i.test(t)) return "";
  return t;
}

type ExportSnapLite = {
  name: string;
  title: string;
  email: string;
  website: string;
  fax: string;
  address: string;
  department: string;
  companyIntro: string;
  salesContent: string;
  photoUrl: string;
  logoUrl: string;
  /** 히어로 배경 초점: top | center | bottom */
  photoFocus: string;
};

/**
 * export_snapshot_json 전체 SELECT 금지 — Shared Pooler egress 폭주 방지.
 * JSON path 로 짧은 텍스트 필드만 추출.
 */
async function loadExportSnapLite(userId: string): Promise<ExportSnapLite | null> {
  const rows = await prisma.$queryRaw<
    Array<{
      name: string | null;
      display_name: string | null;
      title: string | null;
      email: string | null;
      website: string | null;
      fax: string | null;
      address: string | null;
      department: string | null;
      company_intro: string | null;
      sales_content: string | null;
      photo_url: string | null;
      logo_url: string | null;
      photo_focus: string | null;
    }>
  >`
    SELECT
      NULLIF(TRIM(export_snapshot_json->>'name'), '') AS name,
      NULLIF(TRIM(export_snapshot_json->>'displayName'), '') AS display_name,
      NULLIF(TRIM(export_snapshot_json->>'title'), '') AS title,
      NULLIF(TRIM(export_snapshot_json->>'email'), '') AS email,
      NULLIF(TRIM(export_snapshot_json->>'website'), '') AS website,
      NULLIF(TRIM(export_snapshot_json->>'fax'), '') AS fax,
      NULLIF(TRIM(export_snapshot_json->>'address'), '') AS address,
      NULLIF(TRIM(export_snapshot_json->>'department'), '') AS department,
      NULLIF(TRIM(export_snapshot_json->>'companyIntro'), '') AS company_intro,
      NULLIF(TRIM(export_snapshot_json->>'salesContent'), '') AS sales_content,
      NULLIF(TRIM(export_snapshot_json->>'photoUrl'), '') AS photo_url,
      NULLIF(TRIM(export_snapshot_json->>'logoUrl'), '') AS logo_url,
      NULLIF(TRIM(export_snapshot_json->>'photoFocus'), '') AS photo_focus
    FROM digital_cards
    WHERE user_id = ${userId}::uuid
    LIMIT 1
  `;
  const s = rows[0];
  if (!s) return null;
  return {
    name: firstStr(s.name, s.display_name),
    title: firstStr(s.title),
    email: firstStr(s.email),
    website: firstStr(s.website),
    fax: firstStr(s.fax),
    address: firstStr(s.address),
    department: firstStr(s.department),
    companyIntro: firstStr(s.company_intro),
    salesContent: firstStr(s.sales_content),
    photoUrl: httpOnlyUrl(s.photo_url),
    logoUrl: httpOnlyUrl(s.logo_url),
    photoFocus: firstStr(s.photo_focus)
  };
}

/** 쇼케이스 송출용 연락처 — User.email + snap lite + profileJson */
function buildContactProfile(opts: {
  userEmail?: string | null;
  exportSnap?: ExportSnapLite | Record<string, unknown> | null;
  profileJson?: Record<string, unknown> | null;
}): Record<string, unknown> {
  const snap = opts.exportSnap || {};
  const pj = opts.profileJson || {};
  const email = firstStr(
    (snap as ExportSnapLite).email,
    (snap as Record<string, unknown>).email,
    opts.userEmail,
    pj.email,
    pj.contactEmail,
    pj.mail
  );
  const website = firstStr(
    (snap as ExportSnapLite).website,
    (snap as Record<string, unknown>).website,
    pj.website,
    pj.homepage,
    pj.url,
    pj.web
  );
  const fax = firstStr(
    (snap as ExportSnapLite).fax,
    (snap as Record<string, unknown>).fax,
    pj.fax,
    pj.officePhone,
    pj.faxNumber,
    pj.tel,
    pj.landline
  );
  const address = firstStr(
    (snap as ExportSnapLite).address,
    (snap as Record<string, unknown>).address,
    pj.address,
    pj.businessAddress,
    pj.companyAddress,
    pj.roadAddress
  );
  const department = firstStr(
    (snap as ExportSnapLite).department,
    (snap as Record<string, unknown>).department,
    pj.department,
    pj.dept,
    pj.team
  );
  const title = firstStr(
    (snap as ExportSnapLite).title,
    (snap as Record<string, unknown>).title,
    pj.title,
    pj.jobTitle
  );
  const intro = firstStr(
    pj.intro,
    pj.companyIntro,
    (snap as ExportSnapLite).companyIntro,
    (snap as Record<string, unknown>).companyIntro
  );
  const sales = firstStr(
    pj.salesPitch,
    pj.promo,
    pj.salesContent,
    (snap as ExportSnapLite).salesContent,
    (snap as Record<string, unknown>).salesContent
  );
  return {
    ...pj,
    email,
    contactEmail: email,
    website,
    fax,
    address,
    department,
    title,
    jobTitle: title || firstStr(pj.jobTitle),
    intro,
    companyIntro: intro,
    salesContent: sales,
    photoUrl:
      firstStr(
        (snap as ExportSnapLite).photoUrl,
        (snap as Record<string, unknown>).photoUrl,
        pj.photoUrl,
        pj.image_url,
        pj.imageUrl
      ) || undefined,
    logoUrl:
      firstStr(
        (snap as ExportSnapLite).logoUrl,
        (snap as Record<string, unknown>).logoUrl,
        pj.logoUrl,
        pj.logo_url
      ) || undefined,
    photoFocus:
      firstStr(
        (snap as ExportSnapLite).photoFocus,
        (snap as Record<string, unknown>).photoFocus,
        pj.photoFocus
      ) || undefined
  };
}

type LookupOptions = {
  viewerId?: string | null;
  /**
   * 공개 공유 링크(OG/카카오 스크래퍼)용.
   * 검색·팔로워 비공개 마스킹을 적용하지 않고 명함 표기명을 그대로 노출한다.
   * (링크를 보낸 사람은 이미 초대 전의 — 「비공개 회원」으로 가리면 안 됨)
   */
  forPublicOgShare?: boolean;
  /** 테스트 시뮬레이터 — normal | abnormal */
  dcpRoute?: string | null;
};

/** 번호 기준 조회 응답 본문 — GET /lookup · GET /by-number 공용 */
export async function lookupCardByRawNumber(raw: string, opts: LookupOptions = {}) {
  const viewerId = opts.viewerId ?? null;
  const agencyRoute = await resolveAgencyCallRoute({
    number: raw,
    forceRoute: opts.dcpRoute
  });
  if (agencyRoute.status === "abnormal") {
    const agency = agencyRoute.agency;
    const body = agency
      ? buildAgencyDcpLookupBody(agency, "abnormal", agencyRoute.warning)
      : {
          matched: true,
          is_verified: false,
          source: "national_agency_dcp",
          profileKind: "dcp",
          displayName: "비정상 발신",
          companyName: "",
          phoneE164: String(raw || "").replace(/\D/g, ""),
          website: "",
          image_url: "",
          logo_url: "",
          membershipTier: "paid",
          profile: {},
          dcp: {
            id: "",
            agencyName: "",
            shortNumber: String(raw || "").replace(/\D/g, ""),
            officialWebsite: "",
            logoUrl: "",
            logoResourceName: "",
            routeStatus: "abnormal",
            warning: agencyRoute.warning
          }
        };
    return { status: 200 as const, body };
  }
  if (agencyRoute.status === "normal") {
    return {
      status: 200 as const,
      body: buildAgencyDcpLookupBody(agencyRoute.agency, "normal")
    };
  }

  const e164 = normalizeToE164KR(raw.trim());
  if (!e164) {
    return { status: 400 as const, body: { error: "유효한 번호 형식이 아닙니다.", matched: false } };
  }

  const card = await prisma.businessCard.findFirst({
    where: { phoneE164: e164, verificationStatus: "approved" },
    include: {
      user: {
        select: {
          ...privacySelect,
          legalName: true,
          publicHandle: true,
          email: true,
          digitalCard: {
            select: {
              photoUrl: true,
              logoUrl: true,
              displayName: true,
              titleSnapshot: true,
              membershipTierSnapshot: true
            }
          }
        }
      }
    }
  });

  if (card) {
    const exportSnap = await loadExportSnapLite(card.user.id);
    const baseProfile = (card.profileJson as Record<string, unknown> | null) ?? null;
    const profile = buildContactProfile({
      userEmail: card.user.email,
      exportSnap,
      profileJson: baseProfile
    });
    const rawDisplay = firstStr(
      card.displayName,
      exportSnap?.name,
      card.user.digitalCard?.displayName,
      card.user.legalName
    );
    const rawTitle = firstStr(
      card.jobTitle,
      exportSnap?.title,
      card.user.digitalCard?.titleSnapshot
    );
    const email = firstStr(profile.email, card.user.email);

    if (opts.forPublicOgShare) {
      return {
        status: 200 as const,
        body: {
          matched: true,
          is_verified: card.verificationStatus === "approved",
          source: "business_card",
          userId: card.user.id,
          cardId: card.id,
          kind: card.kind,
          displayName: rawDisplay,
          jobTitle: rawTitle,
          companyName: card.companyName || "",
          email,
          profile,
          website: firstStr(profile.website),
          photoFocus: firstStr(profile.photoFocus, exportSnap?.photoFocus),
          image_url:
            pickProfileString(profile, ["image_url", "imageUrl", "photo_url", "portrait_url", "photoUrl"]) ||
            firstStr(card.user.digitalCard?.photoUrl),
          voice_url: pickProfileString(profile, ["voice_url", "voiceUrl", "bluevoice_url"]),
          phoneE164: card.phoneE164,
          publicHandle: card.user.publicHandle || "",
          access: {
            isOwner: false,
            isActiveFollower: false,
            isMutualFollow: false,
            isShowcasePrivate: Boolean(card.user.isShowcasePrivate)
          },
          visibility: { phone: true, name: true, org: true, id: true }
        }
      };
    }

    const ctx = await buildViewerAccessContext(viewerId, card.user.id);
    const masked = maskProfileForViewer(card.user, {
      displayName: rawDisplay,
      legalName: card.user.legalName,
      phoneE164: card.phoneE164,
      publicHandle: card.user.publicHandle,
      companyName: card.companyName,
      jobTitle: rawTitle
    }, ctx);

    return {
      status: 200 as const,
      body: {
        matched: true,
        is_verified: card.verificationStatus === "approved",
        source: "business_card",
        userId: card.user.id,
        cardId: card.id,
        kind: card.kind,
        displayName: masked.displayName,
        jobTitle: masked.jobTitle,
        companyName: masked.companyName,
        email,
        profile,
        website: firstStr(profile.website),
        photoFocus: firstStr(profile.photoFocus, exportSnap?.photoFocus),
        image_url:
          pickProfileString(profile, ["image_url", "imageUrl", "photo_url", "portrait_url", "photoUrl"]) ||
          firstStr(card.user.digitalCard?.photoUrl),
        voice_url: pickProfileString(profile, ["voice_url", "voiceUrl", "bluevoice_url"]),
        phoneE164: masked.phoneE164,
        publicHandle: masked.publicHandle,
        access: masked.access,
        visibility: masked.visibility
      }
    };
  }

  const user = await prisma.user.findFirst({
    where: {
      phoneE164: e164,
      OR: [{ identityVerified: true }, { digitalCard: { isNot: null } }]
    },
    select: {
      ...privacySelect,
      legalName: true,
      publicHandle: true,
      email: true,
      phoneE164: true,
      identityVerified: true,
      businessProfile: { select: { companyName: true, jobTitle: true } },
      digitalCard: {
        select: {
          photoUrl: true,
          logoUrl: true,
          displayName: true,
          titleSnapshot: true,
          membershipTierSnapshot: true
        }
      }
    }
  });

  if (user) {
    const tierSnap = String(user.digitalCard?.membershipTierSnapshot || "").toLowerCase();
    const isPremiumLine = ["paid", "premium", "b2b", "business"].includes(tierSnap);
    const exportSnap = user.digitalCard ? await loadExportSnapLite(user.id) : null;
    const profile = buildContactProfile({
      userEmail: user.email,
      exportSnap,
      profileJson: null
    });
    const liveDisplayName = firstStr(
      exportSnap?.name,
      user.digitalCard?.displayName,
      user.legalName
    );
    const liveJobTitle = firstStr(
      exportSnap?.title,
      user.digitalCard?.titleSnapshot,
      user.businessProfile?.jobTitle
    );
    const email = firstStr(profile.email, user.email);
    const photoOnly =
      (typeof user.digitalCard?.photoUrl === "string" && user.digitalCard.photoUrl.trim()) ||
      exportSnap?.photoUrl ||
      null;
    const logoOnly =
      (typeof user.digitalCard?.logoUrl === "string" && user.digitalCard.logoUrl.trim()) ||
      exportSnap?.logoUrl ||
      null;
    const isCeo = isPlatformCeoHandle(user.publicHandle);
    /* 프로필 사진만 image_url. CEO 로고 슬롯만 VLUE 기본. 타인 빈 사진 → null(실루엣) */
    const imageUrl = photoOnly || (isCeo ? ceoDefaultBrandLogoUrl() : null);
    const logoUrl = logoOnly || (isCeo ? ceoDefaultBrandLogoUrl() : null);

    if (opts.forPublicOgShare) {
      return {
        status: 200 as const,
        body: {
          matched: true,
          is_verified: Boolean(user.identityVerified) || Boolean(user.digitalCard),
          source: "user_mobile",
          userId: user.id,
          displayName: liveDisplayName,
          publicHandle: user.publicHandle || "",
          jobTitle: liveJobTitle,
          companyName: user.businessProfile?.companyName || "",
          email,
          profile,
          website: firstStr(profile.website),
          photoFocus: firstStr(profile.photoFocus, exportSnap?.photoFocus),
          digitalCardActive: Boolean(user.digitalCard),
          is_premium_line: isPremiumLine,
          phoneE164: user.phoneE164,
          image_url: imageUrl,
          logo_url: logoUrl,
          voice_url: null as string | null,
          access: {
            isOwner: false,
            isActiveFollower: false,
            isMutualFollow: false,
            isShowcasePrivate: Boolean(user.isShowcasePrivate)
          },
          visibility: { phone: true, name: true, org: true, id: true }
        }
      };
    }

    const ctx = await buildViewerAccessContext(viewerId, user.id);
    const masked = maskProfileForViewer(user, {
      displayName: liveDisplayName,
      legalName: user.legalName,
      phoneE164: user.phoneE164,
      publicHandle: user.publicHandle,
      companyName: user.businessProfile?.companyName,
      jobTitle: liveJobTitle
    }, ctx);

    return {
      status: 200 as const,
      body: {
        matched: true,
        is_verified: Boolean(user.identityVerified) || Boolean(user.digitalCard),
        source: "user_mobile",
        userId: user.id,
        displayName: masked.displayName,
        publicHandle: masked.publicHandle,
        jobTitle: masked.jobTitle,
        companyName: masked.companyName,
        email,
        profile,
        website: firstStr(profile.website),
        photoFocus: firstStr(profile.photoFocus, exportSnap?.photoFocus),
        digitalCardActive: Boolean(user.digitalCard),
        is_premium_line: isPremiumLine,
        phoneE164: masked.phoneE164,
        image_url: imageUrl,
        logo_url: logoUrl,
        voice_url: null as string | null,
        access: masked.access,
        visibility: masked.visibility
      }
    };
  }

  return {
    status: 404 as const,
    body: { matched: false, message: "등록된 명함이 없습니다." }
  };
}
