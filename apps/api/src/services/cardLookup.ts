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
import { formatPhoneDisplayKR } from "../lib/phoneDisplay.js";
import {
  PEER_REMOTE_SUMMARY,
  readOutgoingCallPathSignal
} from "./callPathPeerSignal.js";
import { slimShowcaseStyleForPublic } from "../lib/slimShowcaseStyle.js";

const EXPIRED_SUBTITLE = "인증기간이 만료된 번호입니다.";
const EXPIRED_DETAIL = "인증기간이 만료된 번호입니다. 직접 확인 부탁드립니다.";

/** 콜 오버레이 첫 페인트용 — live 우선, 없으면 editor. includeDigitalCard 포함 */
function overlayShowcaseStyleFromUser(user: {
  showcaseLiveStyleJson?: unknown;
  showcaseStyleJson?: unknown;
} | null | undefined): unknown | null {
  if (!user) return null;
  const raw = user.showcaseLiveStyleJson ?? user.showcaseStyleJson;
  if (raw == null) return null;
  return slimShowcaseStyleForPublic(raw);
}

function expiredLineLookupBody(opts: {
  phoneE164: string;
  cardId?: string;
  userId?: string;
  graceEndsAt?: Date | null;
}) {
  const phoneDisplay = formatPhoneDisplayKR(opts.phoneE164);
  return {
    matched: true,
    is_verified: false,
    source: "expired_line",
    profileKind: "expired_line",
    lineBillingStatus: "grace",
    displayName: phoneDisplay,
    jobTitle: "",
    companyName: "",
    email: "",
    profile: {},
    website: "",
    photoFocus: "",
    image_url: "",
    logo_url: "",
    voice_url: null as string | null,
    phoneE164: opts.phoneE164,
    cardId: opts.cardId || "",
    userId: opts.userId || "",
    membershipTier: "free",
    expiredSubtitle: EXPIRED_SUBTITLE,
    expiredDetail: EXPIRED_DETAIL,
    graceEndsAt: opts.graceEndsAt ? opts.graceEndsAt.toISOString() : null,
    access: {
      isOwner: false,
      isActiveFollower: false,
      isMutualFollow: false,
      isShowcasePrivate: true
    },
    visibility: { phone: true, name: false, org: false, id: false }
  };
}

async function resolveLineBillingGate(e164: string) {
  const card = await prisma.businessCard.findFirst({
    where: { phoneE164: e164 },
    select: {
      id: true,
      userId: true,
      phoneE164: true,
      lineSubscription: { select: { status: true, graceEndsAt: true } }
    }
  });
  const status = card?.lineSubscription?.status || "";
  if (status === "grace") {
    return { gate: "expired" as const, card };
  }
  if (status === "lapsed" || status === "cancelled") {
    return { gate: "unmatched" as const, card };
  }
  return { gate: "ok" as const, card };
}

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

/**
 * 오버레이 슬림 조회 — export_snapshot_json 통째 SELECT 없이 상호만 JSON path.
 * business_cards.company_name 이 비어 있는 CEO·개인명함(VCID KOREA 등) 보정.
 */
async function loadOverlayOrgByUserId(userId: string): Promise<string> {
  const rows = await prisma.$queryRaw<Array<{ org: string | null }>>`
    SELECT COALESCE(
      NULLIF(TRIM(organization), ''),
      NULLIF(TRIM(export_snapshot_json->>'organization'), ''),
      NULLIF(TRIM(export_snapshot_json->>'companyName'), '')
    ) AS org
    FROM digital_cards
    WHERE user_id = ${userId}::uuid
    LIMIT 1
  `;
  return firstStr(rows[0]?.org);
}

/** 시드·미리보기용 브랜드 자리표시 — 실제 상호로 송출하지 않음 */
function isPlaceholderBrandOrg(org: string): boolean {
  return /^vlue$/i.test(org.trim());
}

async function resolveOverlayCompanyName(opts: {
  lineCompany?: string | null;
  digitalOrg?: string | null;
  profileCompany?: string | null;
  userId: string;
}): Promise<string> {
  for (const candidate of [opts.lineCompany, opts.digitalOrg, opts.profileCompany]) {
    const v = firstStr(candidate);
    if (v && !isPlaceholderBrandOrg(v)) return v;
  }
  const fromDb = await loadOverlayOrgByUserId(opts.userId);
  if (fromDb && !isPlaceholderBrandOrg(fromDb)) return fromDb;
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
  addressDetail: string;
  department: string;
  companyIntro: string;
  salesContent: string;
  customBackText: string;
  photoUrl: string;
  titlePhotoUrl: string;
  logoUrl: string;
  /** 히어로 배경 초점: top | center | bottom */
  photoFocus: string;
  noTitlePhoto: boolean;
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
      address_detail: string | null;
      department: string | null;
      company_intro: string | null;
      sales_content: string | null;
      custom_back_text: string | null;
      photo_url: string | null;
      title_photo_url: string | null;
      logo_url: string | null;
      photo_focus: string | null;
      no_title_photo: boolean | null;
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
      NULLIF(TRIM(export_snapshot_json->>'addressDetail'), '') AS address_detail,
      NULLIF(TRIM(export_snapshot_json->>'department'), '') AS department,
      NULLIF(TRIM(export_snapshot_json->>'companyIntro'), '') AS company_intro,
      NULLIF(TRIM(export_snapshot_json->>'salesContent'), '') AS sales_content,
      NULLIF(TRIM(export_snapshot_json->>'customBackText'), '') AS custom_back_text,
      NULLIF(TRIM(export_snapshot_json->>'photoUrl'), '') AS photo_url,
      NULLIF(TRIM(export_snapshot_json->>'titlePhotoUrl'), '') AS title_photo_url,
      NULLIF(TRIM(export_snapshot_json->>'logoUrl'), '') AS logo_url,
      NULLIF(TRIM(export_snapshot_json->>'photoFocus'), '') AS photo_focus,
      CASE
        WHEN export_snapshot_json ? 'noTitlePhoto'
          THEN (export_snapshot_json->>'noTitlePhoto')::boolean
        ELSE NULL
      END AS no_title_photo
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
    addressDetail: firstStr(s.address_detail),
    department: firstStr(s.department),
    companyIntro: firstStr(s.company_intro),
    salesContent: firstStr(s.sales_content),
    customBackText: firstStr(s.custom_back_text),
    photoUrl: httpOnlyUrl(s.photo_url),
    titlePhotoUrl: httpOnlyUrl(s.title_photo_url),
    logoUrl: httpOnlyUrl(s.logo_url),
    photoFocus: firstStr(s.photo_focus),
    noTitlePhoto: Boolean(s.no_title_photo)
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
  const customBackText = firstStr(
    pj.customBackText,
    pj.backText,
    pj.letteringBackText,
    (snap as ExportSnapLite).customBackText,
    (snap as Record<string, unknown>).customBackText
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
    customBackText,
    backText: customBackText,
    photoUrl:
      firstStr(
        (snap as ExportSnapLite).photoUrl,
        (snap as Record<string, unknown>).photoUrl,
        pj.photoUrl,
        pj.image_url,
        pj.imageUrl
      ) || undefined,
    titlePhotoUrl:
      firstStr(
        (snap as ExportSnapLite).titlePhotoUrl,
        (snap as Record<string, unknown>).titlePhotoUrl,
        pj.titlePhotoUrl
      ) || undefined,
    noTitlePhoto: Boolean(
      (snap as ExportSnapLite).noTitlePhoto ||
        (snap as Record<string, unknown>).noTitlePhoto ||
        pj.noTitlePhoto
    ),
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
  /** 통화 오버레이 — 기관 DB·export 스냅샷을 건너뛰고 최소 필드로 조회 */
  forCallOverlay?: boolean;
  /** 테스트 시뮬레이터 — normal | abnormal */
  dcpRoute?: string | null;
};

function attachPeerPath<T extends Record<string, unknown>>(
  body: T,
  peer: { reasons: string[] } | null
): T {
  if (!peer?.reasons?.length) return body;
  const prev =
    body.dcp && typeof body.dcp === "object" ? (body.dcp as Record<string, unknown>) : {};
  return {
    ...body,
    dcp: {
      ...prev,
      routeStatus: "abnormal",
      pathVerify: true,
      warning: PEER_REMOTE_SUMMARY,
      reasons: ["peer_remote_outgoing", ...peer.reasons]
    }
  };
}

async function lookupCardForCallOverlay(raw: string, opts: LookupOptions) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length > 0 && digits.length < 8) {
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
            dcp: { routeStatus: "abnormal", warning: agencyRoute.warning }
          };
      return { status: 200 as const, body };
    }
    if (agencyRoute.status === "normal") {
      return {
        status: 200 as const,
        body: buildAgencyDcpLookupBody(agencyRoute.agency, "normal")
      };
    }
  }

  const e164 = normalizeToE164KR(String(raw || "").trim());
  if (!e164) {
    return { status: 400 as const, body: { error: "유효한 번호 형식이 아닙니다.", matched: false } };
  }

  const [peer, card] = await Promise.all([
    readOutgoingCallPathSignal(e164),
    prisma.businessCard.findFirst({
    where: { phoneE164: e164 },
    select: {
      id: true,
      userId: true,
      phoneE164: true,
      displayName: true,
      jobTitle: true,
      companyName: true,
      verificationStatus: true,
      kind: true,
      dccSnapshotJson: true,
      profileJson: true,
      lineSubscription: { select: { status: true, graceEndsAt: true } },
      user: {
        select: {
          id: true,
          publicHandle: true,
          legalName: true,
          email: true,
          phoneE164: true,
          identityVerified: true,
          isShowcasePrivate: true,
          showcaseLiveStyleJson: true,
          showcaseStyleJson: true,
          businessProfile: { select: { companyName: true, jobTitle: true } },
          digitalCard: {
            select: {
              photoUrl: true,
              logoUrl: true,
              displayName: true,
              titleSnapshot: true,
              organization: true
            }
          },
          subscriptions: {
            where: { status: "active" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { cycleEndAt: true, cycleStartAt: true }
          }
        }
      }
    }
  })
  ]);

  const sub = card?.lineSubscription?.status || "";
  if (card && sub === "grace") {
    return {
      status: 200 as const,
      body: attachPeerPath(
        expiredLineLookupBody({
          phoneE164: card.phoneE164,
          cardId: card.id,
          userId: card.userId,
          graceEndsAt: card.lineSubscription?.graceEndsAt || null
        }) as Record<string, unknown>,
        peer
      )
    };
  }
  if (card && (sub === "lapsed" || sub === "cancelled")) {
    return {
      status: 200 as const,
      body: attachPeerPath({ matched: false, phoneE164: e164, source: "lapsed_line" }, peer)
    };
  }

  if (card && card.verificationStatus === "approved") {
    const lineSnap =
      card.dccSnapshotJson && typeof card.dccSnapshotJson === "object"
        ? (card.dccSnapshotJson as Record<string, unknown>)
        : null;
    const certified = Boolean(card.user.phoneE164) && card.phoneE164 === card.user.phoneE164;
    const masterSnap = certified ? await loadExportSnapLite(card.user.id) : null;
    const exportSnap = {
      name: firstStr(lineSnap?.name, lineSnap?.displayName, certified ? masterSnap?.name : ""),
      title: firstStr(lineSnap?.title, certified ? masterSnap?.title : ""),
      email: firstStr(lineSnap?.email, certified ? masterSnap?.email : ""),
      website: firstStr(lineSnap?.website, certified ? masterSnap?.website : ""),
      fax: firstStr(lineSnap?.fax, certified ? masterSnap?.fax : ""),
      address: firstStr(lineSnap?.address, certified ? masterSnap?.address : ""),
      department: firstStr(lineSnap?.department, certified ? masterSnap?.department : ""),
      companyIntro: firstStr(lineSnap?.companyIntro, certified ? masterSnap?.companyIntro : ""),
      salesContent: firstStr(lineSnap?.salesContent, certified ? masterSnap?.salesContent : ""),
      customBackText: firstStr(
        lineSnap?.customBackText,
        certified ? masterSnap?.customBackText : ""
      ),
      photoUrl: certified
        ? httpOnlyUrl(masterSnap?.photoUrl) || httpOnlyUrl(lineSnap?.photoUrl) || ""
        : httpOnlyUrl(lineSnap?.photoUrl) || "",
      /* 인증 번호: 마스터 DigitalCard가 타이틀·로고 정본 (라인 스냅 잔재 무시) */
      titlePhotoUrl: certified
        ? httpOnlyUrl(masterSnap?.titlePhotoUrl) || ""
        : httpOnlyUrl(lineSnap?.titlePhotoUrl) || "",
      noTitlePhoto: Boolean(
        certified ? masterSnap?.noTitlePhoto : (lineSnap?.noTitlePhoto ?? false)
      ),
      logoUrl: certified
        ? httpOnlyUrl(masterSnap?.logoUrl) || ""
        : httpOnlyUrl(lineSnap?.logoUrl) || "",
      photoFocus: firstStr(
        certified ? masterSnap?.photoFocus : lineSnap?.photoFocus,
        lineSnap?.photoFocus,
        masterSnap?.photoFocus
      )
    };
    const profile = buildContactProfile({
      userEmail: certified ? card.user.email : null,
      exportSnap,
      profileJson: (card.profileJson as Record<string, unknown> | null) ?? null
    });
    const rawTitle = firstStr(
      lineSnap?.title,
      card.jobTitle,
      exportSnap?.title,
      certified ? card.user.digitalCard?.titleSnapshot : "",
      card.user.businessProfile?.jobTitle
    );
    const email = firstStr(profile.email, certified ? card.user.email : "");
    const displayName = firstStr(
      lineSnap?.name,
      lineSnap?.displayName,
      card.displayName,
      exportSnap?.name,
      card.user.digitalCard?.displayName,
      card.user.legalName
    );
    const photo =
      pickProfileString(profile, ["image_url", "imageUrl", "photo_url", "portrait_url", "photoUrl"]) ||
      (typeof card.user.digitalCard?.photoUrl === "string" && card.user.digitalCard.photoUrl.trim()) ||
      "";
    const isCeo = isPlatformCeoHandle(card.user.publicHandle);
    const imageUrl = photo || (isCeo ? ceoDefaultBrandLogoUrl() : "");
    const companyName = await resolveOverlayCompanyName({
      lineCompany: card.companyName,
      digitalOrg: card.user.digitalCard?.organization,
      profileCompany: card.user.businessProfile?.companyName,
      userId: card.user.id
    });
    const authSub = card.user.subscriptions?.[0];
    const showcaseStyle = overlayShowcaseStyleFromUser(card.user);
    return {
      status: 200 as const,
      body: attachPeerPath(
        {
          matched: true,
          is_verified: true,
          source: "business_card",
          userId: card.user.id,
          cardId: card.id,
          kind: card.kind,
          displayName,
          jobTitle: rawTitle,
          companyName,
          membershipTier: "paid",
          email,
          profile,
          website: firstStr(profile.website),
          photoFocus: firstStr(profile.photoFocus, exportSnap?.photoFocus),
          titlePhotoUrl: firstStr(profile.titlePhotoUrl, exportSnap?.titlePhotoUrl),
          noTitlePhoto: Boolean(profile.noTitlePhoto || exportSnap?.noTitlePhoto),
          authCycleEndAt: authSub?.cycleEndAt ? authSub.cycleEndAt.toISOString() : null,
          authPaidAt: authSub?.cycleStartAt ? authSub.cycleStartAt.toISOString() : null,
          digitalCardActive: Boolean(card.user.digitalCard),
          showcaseStyle,
          image_url: imageUrl,
          logo_url:
            firstStr(
              card.user.digitalCard?.logoUrl,
              pickProfileString(profile, ["logoUrl", "logo_url"])
            ) || (isCeo ? ceoDefaultBrandLogoUrl() : ""),
          voice_url: null,
          phoneE164: card.phoneE164,
          publicHandle: card.user.publicHandle || "",
          access: {
            isOwner: false,
            isActiveFollower: false,
            isMutualFollow: false,
            isShowcasePrivate: Boolean(card.user.isShowcasePrivate)
          },
          visibility: { phone: true, name: true, org: true, id: true }
        },
        peer
      )
    };
  }

  const user = await prisma.user.findFirst({
    where: {
      phoneE164: e164,
      OR: [{ identityVerified: true }, { digitalCard: { isNot: null } }]
    },
    select: {
      id: true,
      publicHandle: true,
      legalName: true,
      email: true,
      identityVerified: true,
      isShowcasePrivate: true,
      phoneE164: true,
      showcaseLiveStyleJson: true,
      showcaseStyleJson: true,
      businessProfile: { select: { companyName: true, jobTitle: true } },
      digitalCard: {
        select: {
          photoUrl: true,
          logoUrl: true,
          displayName: true,
          titleSnapshot: true,
          organization: true
        }
      },
      subscriptions: {
        where: { status: "active" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { cycleEndAt: true, cycleStartAt: true }
      }
    }
  });

  if (user) {
    const exportSnap = user.digitalCard ? await loadExportSnapLite(user.id) : null;
    const profile = buildContactProfile({
      userEmail: user.email,
      exportSnap,
      profileJson: null
    });
    const isCeo = isPlatformCeoHandle(user.publicHandle);
    const photo =
      pickProfileString(profile, ["image_url", "imageUrl", "photo_url", "portrait_url", "photoUrl"]) ||
      (typeof user.digitalCard?.photoUrl === "string" && user.digitalCard.photoUrl.trim()) ||
      "";
    const companyName = await resolveOverlayCompanyName({
      digitalOrg: user.digitalCard?.organization,
      profileCompany: user.businessProfile?.companyName,
      userId: user.id
    });
    const sub = user.subscriptions?.[0];
    const showcaseStyle = overlayShowcaseStyleFromUser(user);
    return {
      status: 200 as const,
      body: attachPeerPath(
        {
          matched: true,
          is_verified: Boolean(user.identityVerified) || Boolean(user.digitalCard),
          source: "user_mobile",
          userId: user.id,
          displayName: firstStr(exportSnap?.name, user.digitalCard?.displayName, user.legalName),
          publicHandle: user.publicHandle || "",
          jobTitle: firstStr(
            exportSnap?.title,
            user.digitalCard?.titleSnapshot,
            user.businessProfile?.jobTitle
          ),
          companyName,
          membershipTier: "paid",
          email: firstStr(profile.email, user.email),
          profile,
          website: firstStr(profile.website),
          photoFocus: firstStr(profile.photoFocus, exportSnap?.photoFocus),
          titlePhotoUrl: firstStr(profile.titlePhotoUrl, exportSnap?.titlePhotoUrl),
          noTitlePhoto: Boolean(profile.noTitlePhoto || exportSnap?.noTitlePhoto),
          authCycleEndAt: sub?.cycleEndAt ? sub.cycleEndAt.toISOString() : null,
          authPaidAt: sub?.cycleStartAt ? sub.cycleStartAt.toISOString() : null,
          digitalCardActive: Boolean(user.digitalCard),
          showcaseStyle,
          image_url: photo || (isCeo ? ceoDefaultBrandLogoUrl() : null),
          logo_url:
            firstStr(
              user.digitalCard?.logoUrl,
              pickProfileString(profile, ["logoUrl", "logo_url"])
            ) || (isCeo ? ceoDefaultBrandLogoUrl() : null),
          voice_url: null,
          phoneE164: user.phoneE164,
          access: {
            isOwner: false,
            isActiveFollower: false,
            isMutualFollow: false,
            isShowcasePrivate: Boolean(user.isShowcasePrivate)
          },
          visibility: { phone: true, name: true, org: true, id: true }
        },
        peer
      )
    };
  }

  return {
    status: 200 as const,
    body: attachPeerPath({ matched: false, phoneE164: e164, source: "unmatched" }, peer)
  };
}

/** 번호 기준 조회 응답 본문 — GET /lookup · GET /by-number 공용 */
export async function lookupCardByRawNumber(raw: string, opts: LookupOptions = {}) {
  if (opts.forCallOverlay) {
    return lookupCardForCallOverlay(raw, opts);
  }
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

  const billingGate = await resolveLineBillingGate(e164);
  if (billingGate.gate === "expired" && billingGate.card) {
    return {
      status: 200 as const,
      body: expiredLineLookupBody({
        phoneE164: billingGate.card.phoneE164,
        cardId: billingGate.card.id,
        userId: billingGate.card.userId,
        graceEndsAt: billingGate.card.lineSubscription?.graceEndsAt || null
      })
    };
  }
  if (billingGate.gate === "unmatched") {
    /* 유예 경과·해지 회선은 일반 미인증으로 취급 — 아래 user/unmatched 분기로 */
  } else {
  const card = await prisma.businessCard.findFirst({
    where: { phoneE164: e164, verificationStatus: "approved" },
    include: {
      user: {
        select: {
          ...privacySelect,
          legalName: true,
          publicHandle: true,
          email: true,
          phoneE164: true,
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
    const lineSnap =
      card.dccSnapshotJson && typeof card.dccSnapshotJson === "object"
        ? (card.dccSnapshotJson as Record<string, unknown>)
        : null;
    const certified = Boolean(card.user.phoneE164) && card.phoneE164 === card.user.phoneE164;
    const masterSnap = certified ? await loadExportSnapLite(card.user.id) : null;
    const exportSnap = {
      name: firstStr(lineSnap?.name, lineSnap?.displayName, certified ? masterSnap?.name : ""),
      title: firstStr(lineSnap?.title, certified ? masterSnap?.title : ""),
      email: firstStr(lineSnap?.email, certified ? masterSnap?.email : ""),
      website: firstStr(lineSnap?.website, certified ? masterSnap?.website : ""),
      fax: firstStr(lineSnap?.fax, certified ? masterSnap?.fax : ""),
      address: firstStr(lineSnap?.address, certified ? masterSnap?.address : ""),
      department: firstStr(lineSnap?.department, certified ? masterSnap?.department : ""),
      companyIntro: firstStr(lineSnap?.companyIntro, certified ? masterSnap?.companyIntro : ""),
      salesContent: firstStr(lineSnap?.salesContent, certified ? masterSnap?.salesContent : ""),
      customBackText: firstStr(
        lineSnap?.customBackText,
        certified ? masterSnap?.customBackText : ""
      ),
      photoUrl: certified
        ? httpOnlyUrl(masterSnap?.photoUrl) || httpOnlyUrl(lineSnap?.photoUrl) || ""
        : httpOnlyUrl(lineSnap?.photoUrl) || "",
      /* 인증 번호: 마스터 DigitalCard가 타이틀·로고 정본 (라인 스냅 잔재 무시) */
      titlePhotoUrl: certified
        ? httpOnlyUrl(masterSnap?.titlePhotoUrl) || ""
        : httpOnlyUrl(lineSnap?.titlePhotoUrl) || "",
      noTitlePhoto: Boolean(
        certified ? masterSnap?.noTitlePhoto : (lineSnap?.noTitlePhoto ?? false)
      ),
      logoUrl: certified
        ? httpOnlyUrl(masterSnap?.logoUrl) || ""
        : httpOnlyUrl(lineSnap?.logoUrl) || "",
      photoFocus: firstStr(
        certified ? masterSnap?.photoFocus : lineSnap?.photoFocus,
        lineSnap?.photoFocus,
        masterSnap?.photoFocus
      )
    };
    const baseProfile = (card.profileJson as Record<string, unknown> | null) ?? null;
    const profile = buildContactProfile({
      userEmail: certified ? card.user.email : null,
      exportSnap,
      profileJson: baseProfile
    });
    const rawDisplay = firstStr(
      lineSnap?.name,
      lineSnap?.displayName,
      card.displayName,
      exportSnap?.name,
      certified ? card.user.digitalCard?.displayName : "",
      certified ? card.user.legalName : ""
    );
    const rawTitle = firstStr(
      lineSnap?.title,
      card.jobTitle,
      exportSnap?.title,
      certified ? card.user.digitalCard?.titleSnapshot : ""
    );
    const email = firstStr(profile.email, certified ? card.user.email : "");

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
          titlePhotoUrl: firstStr(profile.titlePhotoUrl, exportSnap?.titlePhotoUrl),
          noTitlePhoto: Boolean(profile.noTitlePhoto || exportSnap?.noTitlePhoto),
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
        titlePhotoUrl: firstStr(profile.titlePhotoUrl, exportSnap?.titlePhotoUrl),
        noTitlePhoto: Boolean(profile.noTitlePhoto || exportSnap?.noTitlePhoto),
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
  }

  if (billingGate.gate === "unmatched") {
    return {
      status: 404 as const,
      body: { matched: false, message: "등록된 명함이 없습니다." }
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
          titlePhotoUrl: firstStr(profile.titlePhotoUrl, exportSnap?.titlePhotoUrl),
          noTitlePhoto: Boolean(profile.noTitlePhoto || exportSnap?.noTitlePhoto),
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
        titlePhotoUrl: firstStr(profile.titlePhotoUrl, exportSnap?.titlePhotoUrl),
        noTitlePhoto: Boolean(profile.noTitlePhoto || exportSnap?.noTitlePhoto),
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
