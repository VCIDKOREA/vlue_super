import type { SocialLoginProvider } from "@prisma/client";
import { prisma } from "../db/client.js";
import { normalizeSocialPhotoUrl, resolveDisplaySocialPhotoUrl } from "../lib/socialPhotoUrl.js";
import { fetchKakaoUserFromAccessToken } from "../integrations/kakao/kakaoUserMe.js";
import { fetchInstagramProfile } from "../integrations/instagram/instagramOAuth.js";

export const PROFILE_SOURCES = ["kakao", "naver", "google", "instagram", "vlue"] as const;
export type ProfileSource = (typeof PROFILE_SOURCES)[number];
export type DisplayNameMode = "legal" | "nickname";

const SOCIAL_SOURCES = new Set(["kakao", "naver", "google", "instagram"]);

export function normalizeProfileSource(raw: unknown): ProfileSource | null {
  const s = String(raw || "")
    .trim()
    .toLowerCase();
  if ((PROFILE_SOURCES as readonly string[]).includes(s)) return s as ProfileSource;
  return null;
}

export function normalizeDisplayNameMode(raw: unknown): DisplayNameMode {
  return String(raw || "")
    .trim()
    .toLowerCase() === "legal"
    ? "legal"
    : "nickname";
}

function scrubNick(raw: unknown, max = 64): string {
  const s = String(raw || "").trim().slice(0, max);
  if (!s) return "";
  if (/^vlue$/i.test(s) || /^vlue[\s_-]*official$/i.test(s)) return "";
  return s;
}

function defaultSourceFromSignup(signupMethod: string | null | undefined): ProfileSource {
  const s = String(signupMethod || "").trim().toLowerCase();
  if (SOCIAL_SOURCES.has(s)) return s as ProfileSource;
  return "vlue";
}

type LinkRow = {
  provider: SocialLoginProvider;
  providerNickname: string | null;
  providerProfileImageUrl: string | null;
  providerEmail: string | null;
  linkedAt: Date;
  lastLoginAt: Date | null;
};

type KakaoRow = {
  nickname: string;
  profileImageUrl: string | null;
} | null;

type IgRow = { username: string } | null;

export type ProfileSlotDto = {
  source: ProfileSource;
  label: string;
  linked: boolean;
  selectable: boolean;
  nickname: string;
  photoUrl: string;
  isDefault: boolean;
  isActive: boolean;
};

export type ProfileDisplayState = {
  activeProfileSource: ProfileSource;
  displayNameMode: DisplayNameMode;
  legalName: string;
  /** 표기 모드에 따른 상대방 노출명 */
  publicDisplayName: string;
  /** 활성 슬롯의 닉(표기 모드와 무관) */
  activeNickname: string;
  activePhotoUrl: string;
  vlueNicknameLocked: boolean;
  slots: ProfileSlotDto[];
};

const SOURCE_LABELS: Record<ProfileSource, string> = {
  kakao: "카카오",
  naver: "네이버",
  google: "구글",
  instagram: "인스타그램",
  vlue: "VLUE 프로필"
};

function nickFromLink(
  provider: SocialLoginProvider,
  links: LinkRow[],
  kakao: KakaoRow,
  ig: IgRow
): { nickname: string; photoUrl: string } {
  const link = links.find((l) => l.provider === provider);
  if (provider === "kakao") {
    const nickname =
      scrubNick(link?.providerNickname) || scrubNick(kakao?.nickname) || "";
    const photoUrl = normalizeSocialPhotoUrl(
      link?.providerProfileImageUrl || kakao?.profileImageUrl || ""
    );
    return { nickname, photoUrl };
  }
  if (provider === "instagram") {
    const nickname =
      scrubNick(link?.providerNickname) || scrubNick(ig?.username) || "";
    return {
      nickname,
      photoUrl: normalizeSocialPhotoUrl(link?.providerProfileImageUrl || "")
    };
  }
  return {
    nickname: scrubNick(link?.providerNickname) || "",
    photoUrl: normalizeSocialPhotoUrl(link?.providerProfileImageUrl || "")
  };
}

/** 저장된 토큰으로 카카오·인스타 프로필 사진을 최신화 (실패해도 무시) */
async function refreshLinkedSocialPhotos(userId: string): Promise<void> {
  const [kakao, ig] = await Promise.all([
    prisma.userKakaoLink.findUnique({
      where: { userId },
      select: { accessToken: true, profileImageUrl: true }
    }),
    prisma.userInstagramLink.findUnique({
      where: { userId },
      select: { accessToken: true }
    })
  ]);

  if (kakao?.accessToken) {
    try {
      const profile = await fetchKakaoUserFromAccessToken(kakao.accessToken);
      const photo = normalizeSocialPhotoUrl(profile.profileImageUrl);
      const nick = scrubNick(profile.nickname);
      if (photo) {
        await prisma.userKakaoLink.update({
          where: { userId },
          data: {
            profileImageUrl: photo,
            ...(nick ? { nickname: nick.slice(0, 120) } : {})
          }
        });
        await prisma.userSocialLoginLink
          .updateMany({
            where: { userId, provider: "kakao" },
            data: {
              providerProfileImageUrl: photo,
              ...(nick ? { providerNickname: nick.slice(0, 120) } : {})
            }
          })
          .catch(() => undefined);
      }
    } catch {
      /* 토큰 만료 등 — 캐시 URL 유지 */
    }
  }

  if (ig?.accessToken) {
    try {
      const profile = await fetchInstagramProfile(ig.accessToken);
      const photo = normalizeSocialPhotoUrl(profile.profilePictureUrl);
      const nick = scrubNick(profile.username);
      if (photo || nick) {
        await prisma.userSocialLoginLink
          .updateMany({
            where: { userId, provider: "instagram" },
            data: {
              ...(photo ? { providerProfileImageUrl: photo } : {}),
              ...(nick ? { providerNickname: nick.slice(0, 120) } : {})
            }
          })
          .catch(() => undefined);
      }
    } catch {
      /* ignore */
    }
  }
}

export function resolvePublicDisplayName(input: {
  displayNameMode: DisplayNameMode | string | null | undefined;
  legalName: string | null | undefined;
  activeNickname: string | null | undefined;
  publicHandle?: string | null;
  fallback?: string;
}): string {
  const mode = normalizeDisplayNameMode(input.displayNameMode);
  const legal = scrubNick(input.legalName, 120);
  const nick = scrubNick(input.activeNickname, 64);
  if (mode === "legal" && legal) return legal;
  if (nick) return nick;
  if (legal) return legal;
  const handle = String(input.publicHandle || "")
    .replace(/^@+/, "")
    .trim();
  if (handle) return handle;
  return String(input.fallback || "회원").trim() || "회원";
}

export async function getProfileDisplayState(userId: string): Promise<ProfileDisplayState> {
  /* 연동 토큰이 있으면 CDN 사진을 먼저 갱신 — 깨진/만료 URL 교체 */
  await refreshLinkedSocialPhotos(userId).catch(() => undefined);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      legalName: true,
      publicHandle: true,
      signupMethod: true,
      activeProfileSource: true,
      displayNameMode: true,
      vlueProfileNickname: true,
      vlueProfileNicknameLockedAt: true,
      vlueProfilePhotoUrl: true,
      nickFeed: true,
      nickChat: true,
      socialLoginLinks: {
        select: {
          provider: true,
          providerNickname: true,
          providerProfileImageUrl: true,
          providerEmail: true,
          linkedAt: true,
          lastLoginAt: true
        }
      },
      kakaoLink: { select: { nickname: true, profileImageUrl: true } },
      instagramLink: { select: { username: true } }
    }
  });
  if (!user) {
    throw Object.assign(new Error("사용자를 찾을 수 없습니다."), { statusCode: 404 });
  }

  const links = user.socialLoginLinks as LinkRow[];
  const linkedProviders = new Set(links.map((l) => l.provider as string));
  if (user.kakaoLink && !linkedProviders.has("kakao")) linkedProviders.add("kakao");
  if (user.instagramLink && !linkedProviders.has("instagram")) linkedProviders.add("instagram");

  const defaultSource = defaultSourceFromSignup(user.signupMethod);
  let active = normalizeProfileSource(user.activeProfileSource) || defaultSource;
  if (active !== "vlue" && !linkedProviders.has(active)) {
    active = linkedProviders.has(defaultSource) ? defaultSource : linkedProviders.size ? (Array.from(linkedProviders)[0] as ProfileSource) : "vlue";
  }

  const vlueNick =
    scrubNick(user.vlueProfileNickname) ||
    scrubNick(user.nickFeed) ||
    scrubNick(user.nickChat) ||
    "";
  const vluePhoto = resolveDisplaySocialPhotoUrl(user.vlueProfilePhotoUrl || "");
  const vlueLocked = Boolean(user.vlueProfileNicknameLockedAt) || Boolean(scrubNick(user.vlueProfileNickname));

  const slots: ProfileSlotDto[] = (PROFILE_SOURCES as readonly ProfileSource[]).map((source) => {
    if (source === "vlue") {
      return {
        source,
        label: SOURCE_LABELS.vlue,
        linked: true,
        selectable: true,
        nickname: vlueNick,
        photoUrl: vluePhoto,
        isDefault: defaultSource === "vlue",
        isActive: active === "vlue"
      };
    }
    const linked = linkedProviders.has(source);
    const { nickname, photoUrl } = nickFromLink(
      source,
      links,
      user.kakaoLink,
      user.instagramLink
    );
    return {
      source,
      label: SOURCE_LABELS[source],
      linked,
      selectable: linked,
      nickname,
      photoUrl: resolveDisplaySocialPhotoUrl(photoUrl),
      isDefault: defaultSource === source,
      isActive: active === source
    };
  });

  const activeSlot = slots.find((s) => s.source === active) || slots.find((s) => s.source === "vlue")!;
  const activeNickname = activeSlot.nickname;
  const activePhotoUrl = activeSlot.photoUrl;
  const displayNameMode = normalizeDisplayNameMode(user.displayNameMode);
  const legalName = scrubNick(user.legalName, 120);
  const publicDisplayName = resolvePublicDisplayName({
    displayNameMode,
    legalName,
    activeNickname,
    publicHandle: user.publicHandle
  });

  return {
    activeProfileSource: active,
    displayNameMode,
    legalName,
    publicDisplayName,
    activeNickname,
    activePhotoUrl,
    vlueNicknameLocked: vlueLocked,
    slots
  };
}

export async function patchProfileDisplay(
  userId: string,
  body: {
    activeProfileSource?: unknown;
    displayNameMode?: unknown;
    vlueNickname?: unknown;
    vluePhotoUrl?: unknown;
  }
): Promise<ProfileDisplayState> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      signupMethod: true,
      activeProfileSource: true,
      displayNameMode: true,
      vlueProfileNickname: true,
      vlueProfileNicknameLockedAt: true,
      vlueProfilePhotoUrl: true,
      socialLoginLinks: { select: { provider: true } },
      kakaoLink: { select: { kakaoUserId: true } },
      instagramLink: { select: { igUserId: true } }
    }
  });
  if (!user) {
    throw Object.assign(new Error("사용자를 찾을 수 없습니다."), { statusCode: 404 });
  }

  const data: {
    activeProfileSource?: string;
    displayNameMode?: string;
    vlueProfileNickname?: string;
    vlueProfileNicknameLockedAt?: Date;
    vlueProfilePhotoUrl?: string | null;
    nickFeed?: string;
    nickChat?: string;
  } = {};

  if (body.activeProfileSource !== undefined) {
    const source = normalizeProfileSource(body.activeProfileSource);
    if (!source) throw Object.assign(new Error("지원하지 않는 프로필 슬롯입니다."), { statusCode: 400 });
    if (source !== "vlue") {
      const linked = new Set(user.socialLoginLinks.map((l) => l.provider as string));
      if (user.kakaoLink) linked.add("kakao");
      if (user.instagramLink) linked.add("instagram");
      if (!linked.has(source)) {
        throw Object.assign(
          new Error(`${SOURCE_LABELS[source]} 계정을 먼저 연동해 주세요.`),
          { statusCode: 400 }
        );
      }
    }
    data.activeProfileSource = source;
  }

  if (body.displayNameMode !== undefined) {
    data.displayNameMode = normalizeDisplayNameMode(body.displayNameMode);
  }

  if (body.vlueNickname !== undefined) {
    const next = scrubNick(body.vlueNickname, 32);
    const locked =
      Boolean(user.vlueProfileNicknameLockedAt) || Boolean(scrubNick(user.vlueProfileNickname));
    if (locked) {
      const current = scrubNick(user.vlueProfileNickname);
      if (next && next !== current) {
        throw Object.assign(
          new Error("VLUE 프로필 닉네임은 최초 1회만 설정할 수 있습니다."),
          { statusCode: 400 }
        );
      }
    } else if (next) {
      data.vlueProfileNickname = next;
      data.vlueProfileNicknameLockedAt = new Date();
      data.nickFeed = next;
      data.nickChat = next;
    }
  }

  if (body.vluePhotoUrl !== undefined) {
    const url = String(body.vluePhotoUrl || "").trim();
    if (url && !/^https?:\/\//i.test(url) && !url.startsWith("data:image/")) {
      throw Object.assign(new Error("프로필 사진 URL 형식이 올바르지 않습니다."), { statusCode: 400 });
    }
    data.vlueProfilePhotoUrl = url || null;
  }

  if (Object.keys(data).length) {
    await prisma.user.update({ where: { id: userId }, data });
  }

  return getProfileDisplayState(userId);
}

/** 위치·채팅 등 서버 표기용 — 다건 */
export async function mapPublicDisplayNames(userIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(userIds.map((id) => String(id || "").trim()).filter(Boolean))];
  const out = new Map<string, string>();
  if (!ids.length) return out;

  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      legalName: true,
      publicHandle: true,
      displayNameMode: true,
      activeProfileSource: true,
      signupMethod: true,
      vlueProfileNickname: true,
      nickFeed: true,
      nickChat: true,
      socialLoginLinks: {
        select: { provider: true, providerNickname: true }
      },
      kakaoLink: { select: { nickname: true } },
      instagramLink: { select: { username: true } }
    }
  });

  for (const u of users) {
    const linked = new Set(u.socialLoginLinks.map((l) => l.provider as string));
    let active = normalizeProfileSource(u.activeProfileSource) || defaultSourceFromSignup(u.signupMethod);
    if (active !== "vlue" && !linked.has(active) && !(active === "kakao" && u.kakaoLink) && !(active === "instagram" && u.instagramLink)) {
      active = "vlue";
    }
    let activeNickname = "";
    if (active === "vlue") {
      activeNickname =
        scrubNick(u.vlueProfileNickname) || scrubNick(u.nickFeed) || scrubNick(u.nickChat) || "";
    } else if (active === "kakao") {
      const link = u.socialLoginLinks.find((l) => l.provider === "kakao");
      activeNickname = scrubNick(link?.providerNickname) || scrubNick(u.kakaoLink?.nickname) || "";
    } else if (active === "instagram") {
      const link = u.socialLoginLinks.find((l) => l.provider === "instagram");
      activeNickname = scrubNick(link?.providerNickname) || scrubNick(u.instagramLink?.username) || "";
    } else {
      const link = u.socialLoginLinks.find((l) => l.provider === active);
      activeNickname = scrubNick(link?.providerNickname) || "";
    }
    out.set(
      u.id,
      resolvePublicDisplayName({
        displayNameMode: u.displayNameMode,
        legalName: u.legalName,
        activeNickname,
        publicHandle: u.publicHandle
      })
    );
  }
  return out;
}
