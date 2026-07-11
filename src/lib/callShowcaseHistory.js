import { formatLetteringPhoneDisplay } from "./letteringPhoneMatch.js";
import { createDefaultShowcaseStyle } from "./showcase/showcaseStyleStorage.js";

export const CALL_SHOWCASE_HISTORY_KEY = "vlue_call_showcase_history_v2";
export const CALL_SHOWCASE_HISTORY_CHANGED = "vlue-call-showcase-history-changed";

const AVATAR_KIM = "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80";
const AVATAR_JIYEON = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80";
const BANNER_JIYEON = "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&q=80";

function baseStyle(patch = {}) {
  const defaults = createDefaultShowcaseStyle();
  return {
    ...defaults,
    ...patch,
    platformFeed: { ...defaults.platformFeed, ...(patch.platformFeed || {}) },
    commercial: {
      ...defaults.commercial,
      ...(patch.commercial || {}),
      outlinks: {
        ...defaults.commercial.outlinks,
        ...(patch.commercial?.outlinks || {})
      }
    },
    gallery: { photos: patch.gallery?.photos || defaults.gallery.photos },
    richCustom: { ...defaults.richCustom, ...(patch.richCustom || {}) }
  };
}

/**
 * 통화 목록 데모 — 무료(카톡 프로필 사진) / 유료(디지털 인증명함) / 무료(사진 없음·이니셜)
 */
const DEMO_ENTRIES = [
  {
    id: "demo-kim",
    phone: "010-5555-1234",
    phoneDisplay: "010-5555-1234",
    name: "김친구",
    direction: "in",
    durationSec: 271,
    endedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    verified: true,
    membershipTier: "free",
    avatarUrl: AVATAR_KIM,
    cardSnapshot: {
      name: "김친구",
      phone: "010-5555-1234",
      membershipTier: "free",
      photoUrl: AVATAR_KIM,
      avatarUrl: AVATAR_KIM,
      companyIntro: "보안 솔루션 통합 플랫폼",
      website: "https://instagram.com/kim.chingu"
    },
    showcaseSnapshot: baseStyle({
      styleType: "kakao",
      privacyMode: "public",
      platformFeed: {
        kakaoProfileTitle: "김친구",
        kakaoProfileUrl: "https://open.kakao.com/o/vlue-kim",
        kakaoAvatarUrl: AVATAR_KIM,
        instagramHandle: "@kim.chingu",
        instagramProfileUrl: "https://instagram.com/kim.chingu"
      },
      commercial: {
        outlinks: {
          kakao: "https://open.kakao.com/o/vlue-kim",
          instagram: "https://instagram.com/kim.chingu"
        }
      },
      richCustom: { bodyText: "보안 솔루션 통합 플랫폼" }
    })
  },
  {
    id: "demo-jiyeon",
    phone: "010-7777-8888",
    phoneDisplay: "010-7777-8888",
    name: "지연",
    direction: "out",
    durationSec: 184,
    endedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    verified: true,
    membershipTier: "paid",
    avatarUrl: AVATAR_JIYEON,
    cardSnapshot: {
      name: "지연",
      displayName: "지연",
      title: "마케터",
      organization: "VLUE 파트너스",
      phone: "010-7777-8888",
      membershipTier: "paid",
      photoUrl: AVATAR_JIYEON,
      avatarUrl: AVATAR_JIYEON,
      companyIntro: "브랜드 성장과 인증 커뮤니케이션",
      website: "https://vlue.partners",
      email: "jiyeon@vlue.partners",
      verificationItems: ["VLUE 본인인증", "사업자 확인", "마케터 경력 5년"]
    },
    showcaseSnapshot: baseStyle({
      styleType: "certificate",
      privacyMode: "public",
      gallery: {
        photos: [{ id: "jy-1", url: BANNER_JIYEON, caption: "캠페인 하이라이트" }]
      },
      commercial: {
        outlinks: {
          instagram: "https://instagram.com/jiyeon.vlue",
          kakao: "https://open.kakao.com/o/vlue-jiyeon"
        }
      },
      richCustom: { bodyText: "브랜드 성장과 인증 커뮤니케이션" }
    })
  },
  {
    id: "demo-minsu",
    phone: "010-3333-4444",
    phoneDisplay: "010-3333-4444",
    name: "민수",
    direction: "in",
    durationSec: 92,
    endedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    verified: true,
    membershipTier: "free",
    avatarUrl: "",
    cardSnapshot: {
      name: "민수",
      phone: "010-3333-4444",
      membershipTier: "free",
      photoUrl: "",
      avatarUrl: "",
      companyIntro: "영업 · 현장 미팅 환영",
      title: "영업팀",
      organization: "역삼 블루정비"
    },
    showcaseSnapshot: baseStyle({
      styleType: "default",
      privacyMode: "public",
      commercial: {
        outlinks: {
          kakao: "https://open.kakao.com/o/vlue-minsu",
          instagram: "https://instagram.com/minsu.blue"
        }
      },
      richCustom: { bodyText: "영업 · 현장 미팅 환영" }
    })
  }
];

function emitChange() {
  window.dispatchEvent(new CustomEvent(CALL_SHOWCASE_HISTORY_CHANGED));
}

export function readCallShowcaseHistory() {
  try {
    const raw = localStorage.getItem(CALL_SHOWCASE_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    /* 예전에 심어 둔 데모 통화만 있으면 실가입처럼 비움 */
    const real = parsed.filter((row) => !String(row?.id || "").startsWith("demo-"));
    return real;
  } catch {
    return [];
  }
}

export function appendCallShowcaseHistory(entry) {
  const phone = String(entry?.phone || "").trim();
  if (!phone) return null;
  const row = {
    id: entry.id || `call-${Date.now()}`,
    phone,
    phoneDisplay: formatLetteringPhoneDisplay(phone),
    name: String(entry.name || "").trim() || formatLetteringPhoneDisplay(phone),
    direction: entry.direction === "out" ? "out" : "in",
    durationSec: Math.max(0, Number(entry.durationSec) || 0),
    endedAt: entry.endedAt || new Date().toISOString(),
    callState: entry.callState || (Number(entry.durationSec) > 0 ? "ended" : "missed"),
    verified: entry.verified !== false,
    membershipTier: entry.membershipTier || "free",
    avatarUrl: String(entry.avatarUrl || entry.cardSnapshot?.avatarUrl || entry.cardSnapshot?.photoUrl || "").trim(),
    showcaseSnapshot: entry.showcaseSnapshot || null,
    cardSnapshot: entry.cardSnapshot || null
  };
  const next = [row, ...readCallShowcaseHistory().filter((r) => r.id !== row.id)].slice(0, 80);
  try {
    localStorage.setItem(CALL_SHOWCASE_HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  emitChange();
  return row;
}

export function formatCallDuration(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function formatCallWhen(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit", hour12: true });
  }
  return d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
}

/** 목록·다시보기용 아바타 URL (없으면 빈 문자열 → 이니셜) */
export function resolveCallHistoryAvatar(call) {
  return String(
    call?.avatarUrl ||
      call?.cardSnapshot?.avatarUrl ||
      call?.cardSnapshot?.photoUrl ||
      call?.showcaseSnapshot?.platformFeed?.kakaoAvatarUrl ||
      call?.showcaseSnapshot?.platformFeed?.instagramAvatarUrl ||
      ""
  ).trim();
}
