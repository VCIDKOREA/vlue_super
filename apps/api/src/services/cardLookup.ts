import { prisma } from "../db/client.js";
import { normalizeToE164KR } from "../lib/phoneE164.js";
import { buildViewerAccessContext } from "./follow/followService.js";
import { maskProfileForViewer, privacySelect } from "./follow/profileAccessControl.js";

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
          image_url: null as string | null,
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
        image_url: null as string | null,
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
