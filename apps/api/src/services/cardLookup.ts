import { prisma } from "../db/client.js";
import { normalizeToE164KR } from "../lib/phoneE164.js";
import { isPlatformCeoHandle } from "./admin/platformAccountRoles.js";
import { getVluePublicOrigin } from "./bizcard/bizcardPublicUrls.js";
import { buildViewerAccessContext } from "./follow/followService.js";
import { maskProfileForViewer, privacySelect } from "./follow/profileAccessControl.js";

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

type LookupOptions = {
  viewerId?: string | null;
  /**
   * 공개 공유 링크(OG/카카오 스크래퍼)용.
   * 검색·팔로워 비공개 마스킹을 적용하지 않고 명함 표기명을 그대로 노출한다.
   * (링크를 보낸 사람은 이미 초대 의 — 「비공개 회원」으로 가리면 안 됨)
   */
  forPublicOgShare?: boolean;
};

/** 번호 기준 조회 응답 본문 — GET /lookup · GET /by-number 공용 */
export async function lookupCardByRawNumber(raw: string, opts: LookupOptions = {}) {
  const viewerId = opts.viewerId ?? null;
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
          publicHandle: true
        }
      }
    }
  });

  if (card) {
    const profile = (card.profileJson as Record<string, unknown> | null) ?? null;
    const rawDisplay = card.displayName || card.user.legalName || "";

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
          jobTitle: card.jobTitle || "",
          companyName: card.companyName || "",
          profile,
          image_url: pickProfileString(profile, ["image_url", "imageUrl", "photo_url", "portrait_url"]),
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
      jobTitle: card.jobTitle
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
        profile,
        image_url: pickProfileString(profile, ["image_url", "imageUrl", "photo_url", "portrait_url"]),
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
    include: {
      businessProfile: true,
      digitalCard: true
    }
  });

  if (user) {
    const tierSnap = String(user.digitalCard?.membershipTierSnapshot || "").toLowerCase();
    const isPremiumLine = ["paid", "premium", "b2b", "business"].includes(tierSnap);
    const dc = user.digitalCard as
      | { photoUrl?: string | null; logoUrl?: string | null; exportSnapshotJson?: unknown }
      | null
      | undefined;
    const exportSnap =
      dc?.exportSnapshotJson && typeof dc.exportSnapshotJson === "object"
        ? (dc.exportSnapshotJson as Record<string, unknown>)
        : null;
    const photoOnly =
      (typeof dc?.photoUrl === "string" && dc.photoUrl.trim()) ||
      (typeof exportSnap?.photoUrl === "string" && String(exportSnap.photoUrl).trim()) ||
      null;
    const logoOnly =
      (typeof dc?.logoUrl === "string" && dc.logoUrl.trim()) ||
      (typeof exportSnap?.logoUrl === "string" && String(exportSnap.logoUrl).trim()) ||
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
          displayName: user.legalName || "",
          publicHandle: user.publicHandle || "",
          jobTitle: user.businessProfile?.jobTitle || "",
          companyName: user.businessProfile?.companyName || "",
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
      displayName: user.legalName || "",
      legalName: user.legalName,
      phoneE164: user.phoneE164,
      publicHandle: user.publicHandle,
      companyName: user.businessProfile?.companyName,
      jobTitle: user.businessProfile?.jobTitle
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
