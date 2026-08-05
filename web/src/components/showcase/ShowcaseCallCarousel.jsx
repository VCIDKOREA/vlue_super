import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Settings, X } from "lucide-react";
import LetteringDigitalReception from "../LetteringDigitalReception.jsx";
import FreeTierCallShowcase from "./FreeTierCallShowcase.jsx";
import ShowcaseIdentityCorner from "./ShowcaseIdentityCorner.jsx";
import ShowcaseBannerSocialLayer from "./ShowcaseBannerSocialLayer.jsx";
import ShowcaseMediaPage from "./ShowcaseMediaPage.jsx";
import InCallDtmfPad from "../call/InCallDtmfPad.jsx";
import {
  maxInstagramEmbedsForTier,
  maxShowcasePhotosPerPage,
  normalizeUserTier,
  USER_TIERS
} from "../../lib/showcase/tentShowcaseTypes.js";
import {
  listInstagramShowcaseMedia,
  photosForInstagramMediaItem,
  isInstagramVerified,
  instagramVerifiedLabel
} from "../../lib/showcase/instagramEmbed.js";
import { resolveInstagramMediaUrls } from "../../lib/instagramLinkApi.js";
import { v1AppShell } from "../../lib/v1ReleaseScope.js";
import ShowcaseInstagramPost from "./ShowcaseInstagramPost.jsx";
import ShowcaseSlideChrome from "./ShowcaseSlideChrome.jsx";
import ShowcaseBgmTrackChip from "./ShowcaseBgmTrackChip.jsx";
import ShowcaseBgmTransport from "./ShowcaseBgmTransport.jsx";
import { useShowcaseBgm } from "../../context/ShowcaseBgmContext.jsx";
import { resolveShowcaseBgmUrl, hasShowcaseBgmConfigured, showcaseBgmIdentityKey } from "../../lib/showcase/showcaseBgmPresets.js";
import { SHOWCASE_BGM_OWNER_RELEASED_EVENT } from "../../lib/showcase/closeShowcaseOverlays.js";
import { readActiveShowcaseStyle } from "../../lib/showcase/showcaseStyleStorage.js";

/** 갤러리 사진 → 슬라이드용 (텍스트 오버레이 필드 유지) */
function pickPhotoSlideFields(p = {}) {
  return {
    id: p.id,
    url: p.url,
    overlayText: p.overlayText,
    overlayFont: p.overlayFont,
    overlayFontSize: p.overlayFontSize,
    overlayColor: p.overlayColor,
    overlayX: p.overlayX,
    overlayY: p.overlayY,
    overlayAnim: p.overlayAnim,
    overlayBorder: p.overlayBorder,
    textOverlays: Array.isArray(p.textOverlays) ? p.textOverlays : undefined
  };
}

/**
 * 통화 쇼케이스 시네마틱 캐러셀
 * - 상하 스와이프 / 마우스 휠: 페이지 이동 (디지털 인증명함 ↔ 쇼케이스)
 * - Instagram: API media_url → VLUE 커스텀 카드 (embed/iframe 없음)
 * - 일반 사진: 페이지 안 좌우 최대 20장
 */
export default function ShowcaseCallCarousel({
  card,
  verified = true,
  verificationItems = [],
  incomingNumber = "",
  photos = [],
  membershipTier = "free",
  isKnownContact = false,
  scrollEnabled = true,
  previewMode = false,
  includeDigitalCard = true,
  /** true면 디지털인증명함 슬라이드만 (마이케이스 명함 버튼 등) */
  digitalCardOnly = false,
  /** 공개 링크 — 콘텐츠 슬라이드부터 시작 */
  preferContentSlide = false,
  face = "front",
  onFaceChange,
  showcaseOffPreview = false,
  /** 키패드 — 뷰포트(쇼케이스 전환 영역) 안에서만 표시 */
  keypadOpen = false,
  onKeypadClose,
  keypadDemoMode = false,
  onKeypadToast,
  /** false면 실통화 중 등 — 소셜 레일 숨김 */
  socialOverlayEnabled = true,
  onReport,
  /** 본인 미리보기 — 장면별 설정 버튼 */
  showOwnerSettings = false,
  /** @param {"card"|"showcase"} kind */
  onOpenSlideSettings,
  /** 상대 열람 — 설정 버튼 자리에 닫기 */
  showPeerClose = false,
  onPeerClose,
  /** @param {"card"|"banner"|"empty-slot"|"paid-identity"|"free-profile"|"free-safe"|string} type */
  onSlideTypeChange,
  /** 쇼케이스 스타일 — Instagram 인증·선택 사진 */
  showcaseStyle = null,
  /** true면 BGM을 건드리지 않음 (케이스함 BGM 유지·중복 방지) */
  suppressBgm = false,
  /** 실통화 하단 통화옵션과 겹치지 않게 */
  callChromeSafe = false
}) {
  const styleConfig = showcaseStyle || card?.showcaseStyle || null;
  const { bindStyleConfig, setPlaybackPhase, styleConfig: playingStyleConfig } = useShowcaseBgm();
  const [index, setIndex] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const dragging = useRef(false);
  const swipeAxis = useRef(null);
  const swipeStartTarget = useRef(null);
  const wheelLockUntil = useRef(0);
  const wheelAccum = useRef(0);
  const viewportRef = useRef(null);
  const igResolvingRef = useRef(new Set());
  const igFailCountRef = useRef(new Map());

  const resolveIgMediaSafe = useCallback((ids) => {
    const want = [...new Set((ids || []).map(String).filter(Boolean))].filter((id) => {
      if (igResolvingRef.current.has(id)) return false;
      if ((igFailCountRef.current.get(id) || 0) >= 2) return false;
      return true;
    });
    if (!want.length) return Promise.resolve(null);
    want.forEach((id) => igResolvingRef.current.add(id));
    return resolveInstagramMediaUrls(want)
      .then((res) => {
        const next = new Map();
        for (const row of res.media || []) {
          if (row?.id && row?.mediaUrl) next.set(String(row.id), String(row.mediaUrl));
          for (const child of row.children || []) {
            if (child?.id && child?.mediaUrl) next.set(String(child.id), String(child.mediaUrl));
          }
        }
        for (const id of want) {
          if (!next.has(id)) {
            igFailCountRef.current.set(id, (igFailCountRef.current.get(id) || 0) + 1);
          }
        }
        if (next.size) {
          setIgUrlMap((prev) => {
            const merged = new Map(prev);
            next.forEach((url, id) => merged.set(id, url));
            return merged;
          });
        }
        return res;
      })
      .catch(() => {
        for (const id of want) {
          igFailCountRef.current.set(id, (igFailCountRef.current.get(id) || 0) + 1);
        }
        return null;
      })
      .finally(() => {
        want.forEach((id) => igResolvingRef.current.delete(id));
      });
  }, []);

  const tier = normalizeUserTier(membershipTier || card?.membershipTier);
  const isPaid = tier === USER_TIERS.PAID;
  const photosPerPage = maxShowcasePhotosPerPage();
  const showDigitalCard = Boolean(includeDigitalCard) && isPaid;
  const maxIgPages = maxInstagramEmbedsForTier(tier, { includeDigitalCard: showDigitalCard });
  /** 게시물 열람(suppressBgm) 시에도 재생 중인 케이스함 음원 메타를 칩에 표시 */
  const bgmChipStyle =
    suppressBgm && !hasShowcaseBgmConfigured(styleConfig) && hasShowcaseBgmConfigured(playingStyleConfig)
      ? playingStyleConfig
      : styleConfig;
  const showCornerIdentity = !showDigitalCard;
  const igVerified = isInstagramVerified(styleConfig);
  const igBadge = instagramVerifiedLabel(styleConfig);
  const igUsername = String(styleConfig?.platformFeed?.instagramHandle || "")
    .trim()
    .replace(/^@+/, "");
  const igProfilePictureUrl = String(
    styleConfig?.platformFeed?.instagramProfilePictureUrl ||
      styleConfig?.platformFeed?.profilePictureUrl ||
      ""
  ).trim();
  const [igUrlMap, setIgUrlMap] = useState(() => new Map());

  const bgmFingerprint = useMemo(
    () => showcaseBgmIdentityKey(styleConfig?.bgm),
    [styleConfig]
  );
  const suppressBgmRef = useRef(suppressBgm);
  suppressBgmRef.current = suppressBgm;
  const prevSuppressBgmRef = useRef(suppressBgm);
  const bgmFpRef = useRef("");

  /* 쇼케이스 캐러셀이 보이면 BGM 바인딩·재생 (실통화 스크롤 잠금만 무음)
   * styleConfig 객체 참조·서명 URL 변경으로 effect가 반복 재실행되면 재생이 끊기므로 identity fingerprint만 의존
   * suppressBgm=true: 케이스함 게시물 등 처음부터 억제면 상위 BGM 유지 / 접힘으로 전환되면 재생 중지
   * setPlaybackPhase 는 deps 금지 — 콜백 신원 변경 시 cleanup idle 로 끊김 방지 */
  useEffect(() => {
    const wasSuppressed = prevSuppressBgmRef.current;
    prevSuppressBgmRef.current = suppressBgm;

    if (suppressBgm) {
      /* 홈 미리보기 접힘 등 — 재생 중이던 캐러셀 BGM 은 끈다.
         처음부터 suppress 로 마운트된 케이스함 게시물은 wasSuppressed=true 라 상위 음원을 건드리지 않음 */
      if (!wasSuppressed) {
        setPlaybackPhase("idle", { fade: true, owner: "carousel", steal: true });
        bgmFpRef.current = "";
      }
      return undefined;
    }
    const hasBgm =
      Boolean(resolveShowcaseBgmUrl(styleConfig)) || hasShowcaseBgmConfigured(styleConfig);
    if (!hasBgm) {
      setPlaybackPhase("idle", { fade: true, owner: "carousel", styleConfig });
      bgmFpRef.current = "";
      return () => {
        if (suppressBgmRef.current) return;
        setPlaybackPhase("idle", { fade: true, owner: "carousel" });
      };
    }
    const changed = bgmFpRef.current !== bgmFingerprint;
    bgmFpRef.current = bgmFingerprint;
    const liveCallMuted = !previewMode && !scrollEnabled;
    setPlaybackPhase(liveCallMuted ? "call_active" : previewMode ? "preview" : "replay", {
      forceRestart: changed || previewMode,
      steal: Boolean(previewMode),
      owner: "carousel",
      styleConfig
    });
    return () => {
      /* 접힘·게시물 suppress 로 넘길 때는 위에서 이미 처리 — 언마운트/실제 이탈만 idle */
      if (suppressBgmRef.current) return;
      setPlaybackPhase("idle", { fade: true, owner: "carousel" });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- styleConfig는 bgmFingerprint로 추적
  }, [bgmFingerprint, previewMode, scrollEnabled, suppressBgm]);

  /* 스타일 객체만 바뀌고 음원이 같으면 바인딩만 갱신 (재생 재시작 없음) */
  useEffect(() => {
    if (suppressBgm) return undefined;
    bindStyleConfig(styleConfig);
    return undefined;
  }, [styleConfig, suppressBgm, bindStyleConfig]);

  /* 설정 시트 종료 후 캐러셀 BGM 재개 (접힘 suppress 가 아닐 때만) */
  useEffect(() => {
    if (suppressBgm) return undefined;
    const onReleased = () => {
      /* persist 직후 React 클로저가 한 박자 늦을 수 있어 라이브 스토리지 우선 */
      let cfg = styleConfig;
      try {
        const live = readActiveShowcaseStyle();
        if (live?.bgm) cfg = { ...(styleConfig || {}), bgm: live.bgm };
      } catch {
        /* ignore */
      }
      const hasBgm =
        Boolean(resolveShowcaseBgmUrl(cfg)) || hasShowcaseBgmConfigured(cfg);
      if (!hasBgm) return;
      const liveCallMuted = !previewMode && !scrollEnabled;
      setPlaybackPhase(liveCallMuted ? "call_active" : previewMode ? "preview" : "replay", {
        forceRestart: true,
        steal: true,
        owner: "carousel",
        styleConfig: cfg
      });
    };
    window.addEventListener(SHOWCASE_BGM_OWNER_RELEASED_EVENT, onReleased);
    return () => window.removeEventListener(SHOWCASE_BGM_OWNER_RELEASED_EVENT, onReleased);
  }, [suppressBgm, styleConfig, previewMode, scrollEnabled, setPlaybackPhase]);

  const galleryPagePhotos = useMemo(() => {
    return (Array.isArray(photos) ? photos : [])
      .filter((p) => p?.url)
      .slice(0, photosPerPage)
      .map((p) => pickPhotoSlideFields(p));
  }, [photos, photosPerPage]);

  const contentPages = useMemo(() => {
    const raw = Array.isArray(styleConfig?.pages) ? styleConfig.pages : [];
    return raw.slice(0, maxIgPages);
  }, [styleConfig?.pages, maxIgPages]);

  const igPages = useMemo(() => {
    return listInstagramShowcaseMedia(styleConfig)
      .slice(0, maxIgPages)
      .map((m, i) => {
        const basePhotos = photosForInstagramMediaItem(m);
        const refreshed = basePhotos.map((p) => {
          const fresh = igUrlMap.get(p.id);
          return fresh ? { ...p, url: fresh } : p;
        });
        return {
          type: "instagram-post",
          id: `ig-page-${m.id || i}`,
          fromInstagram: true,
          caption: m.caption || "",
          photos: refreshed,
          mediaId: m.id || "",
          permalink: m.permalink || "",
          username: igUsername,
          profilePictureUrl: igProfilePictureUrl,
          mediaIds: [m.id, ...(m.children || []).map((c) => c.id)].filter(Boolean)
        };
      });
  }, [styleConfig, maxIgPages, igUrlMap, igUsername, igProfilePictureUrl]);

  useEffect(() => {
    const ids = igPages.flatMap((p) => p.mediaIds || []).filter(Boolean);
    if (!ids.length) return undefined;
    let cancelled = false;
    resolveIgMediaSafe(ids).then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [igPages.map((p) => (p.mediaIds || []).join(",")).join("|"), resolveIgMediaSafe]);

  const slides = useMemo(() => {
    const buildFromPages = (pages, limit) => {
      const out = [];
      for (const page of pages.slice(0, limit)) {
        const pType = String(page?.type || "");
        if (pType === "instagram") {
          const m = page.instagramMedia;
          const basePhotos = m?.id ? photosForInstagramMediaItem(m) : [];
          const refreshed = basePhotos.map((p) => {
            const fresh = igUrlMap.get(p.id);
            return fresh ? { ...p, url: fresh } : p;
          });
          if (!m?.id || !refreshed.length) {
            /* 미설정 인스타 페이지는 슬라이드 생략 */
            continue;
          }
          out.push({
            type: "instagram-post",
            id: page.id || `ig-page-${m.id}`,
            fromInstagram: true,
            caption: m.caption || "",
            photos: refreshed,
            mediaId: m.id || "",
            permalink: m.permalink || "",
            username: igUsername,
            profilePictureUrl: igProfilePictureUrl,
            mediaIds: [m.id, ...(m.children || []).map((c) => c.id)].filter(Boolean)
          });
          continue;
        }
        const pagePhotos = (Array.isArray(page?.gallery?.photos) ? page.gallery.photos : [])
          .filter((ph) => ph?.url)
          .slice(0, String(page?.type || "") === "rich_custom" ? 1 : photosPerPage)
          .map((ph) => pickPhotoSlideFields(ph));
        if (pagePhotos.length) {
          out.push({
            type: "media-page",
            id: page.id || `gallery-${out.length}`,
            photos: pagePhotos,
            caption: "",
            businessLink: page.businessLink || null
          });
        }
        /* 미설정(사진 없음) 개인커스텀 페이지는 슬라이드에 넣지 않음 */
      }
      return out;
    };

    if (!isPaid) {
      if (!showcaseOffPreview && contentPages.length > 0) {
        const built = buildFromPages(contentPages, 1);
        if (built.length) return built.slice(0, 1);
      }
      if (!showcaseOffPreview && igPages.length > 0) {
        return igPages.slice(0, 1);
      }
      if (!showcaseOffPreview && galleryPagePhotos.length > 0) {
        return [
          {
            type: "media-page",
            id: "gallery-page",
            photos: galleryPagePhotos,
            caption: ""
          }
        ];
      }
      return [
        {
          type: isKnownContact ? "free-profile" : "free-safe",
          id: isKnownContact ? "free-profile" : "free-safe"
        }
      ];
    }

    let content = buildFromPages(contentPages, maxIgPages);

    /* 레거시 폴백: pages 비어 있으면 기존 gallery + IG 병합 (데모 사진은 넣지 않음) */
    if (!content.length) {
      if (galleryPagePhotos.length) {
        content.push({
          type: "media-page",
          id: "gallery-page",
          photos: galleryPagePhotos,
          caption: ""
        });
      }
      for (const page of igPages) {
        if (content.length >= maxIgPages) break;
        content.push(page);
      }
    }

    const capped = content.slice(0, maxIgPages);

    if (showDigitalCard && digitalCardOnly) {
      return [{ type: "card", id: "digital-card" }];
    }

    const cardSlide = { type: "card", id: "digital-card" };

    if (showDigitalCard) {
      /* 콘텐츠 페이지가 없으면 명함만 — 빈 슬롯(2/2)을 만들지 않음 */
      if (capped.length === 0) {
        return [cardSlide];
      }
      /* preferContentSlide: 콘텐츠 먼저, 명함은 맨 뒤 (앱 내 일부 미리보기용) */
      if (preferContentSlide) {
        return [...capped, cardSlide];
      }
      /* 기본·카톡 공개 링크: 디지털인증명함이 1페이지 */
      return [cardSlide, ...capped];
    }
    if (capped.length === 0) {
      return [{ type: "empty-slot", id: "empty-1", slot: 1, max: photosPerPage }];
    }
    return capped;
  }, [
    isPaid,
    showcaseOffPreview,
    contentPages,
    igPages,
    isKnownContact,
    galleryPagePhotos,
    showDigitalCard,
    digitalCardOnly,
    preferContentSlide,
    maxIgPages,
    photosPerPage,
    igUrlMap,
    igUsername,
    igProfilePictureUrl
  ]);

  const count = slides.length;
  const canScroll = scrollEnabled && count > 1;
  const current = slides[index] || slides[0];
  const outerNavEnabled = canScroll;

  useEffect(() => {
    setIndex(0);
  }, [card?.phone, count, isPaid, isKnownContact, preferContentSlide, showDigitalCard]);

  useEffect(() => {
    if (!canScroll && index !== 0) setIndex(0);
  }, [canScroll, index]);

  useEffect(() => {
    if (!keypadOpen || !showDigitalCard) return;
    const cardIdx = slides.findIndex((s) => s.type === "card");
    if (cardIdx >= 0 && index !== cardIdx) setIndex(cardIdx);
  }, [keypadOpen, showDigitalCard, slides, index]);

  useEffect(() => {
    onSlideTypeChange?.(current?.type || "");
  }, [current?.type, onSlideTypeChange]);

  const go = useCallback(
    (dir) => {
      if (!outerNavEnabled) return;
      setIndex((i) => Math.max(0, Math.min(count - 1, i + dir)));
    },
    [outerNavEnabled, count]
  );

  const interactiveSelector =
    "a, button, input, textarea, select, label, .showcase-call-carousel__dots, .showcase-call-carousel__slide-settings, .showcase-media-page__nav, .showcase-media-page__dots, .showcase-ig-post__nav, .showcase-ig-post__dots, .showcase-ig-post__action, .ldr-face-tabs, .ldr-face-tab, .ldr-front-phone-link--btn, .ldr-contact-row-link, .showcase-social-rail, .showcase-banner-footer, .lettering-action";

  /** 휠: deltaY>0 = 아래(다음 페이지) */
  const canPanelConsumeWheel = (target, deltaY) => {
    const scrollEl = target?.closest?.(".ldr-panel, .ldr-panel-stage");
    if (!scrollEl) return false;
    const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
    if (maxScroll <= 8) return false;
    const top = scrollEl.scrollTop;
    if (deltaY < 0 && top > 2) return true;
    if (deltaY > 0 && top < maxScroll - 2) return true;
    return false;
  };

  /** 터치 스와이프: dy<0(위로 쓸기)=다음 페이지 — 패널이 그 방향으로 더 스크롤될 때만 양보 */
  const canPanelConsumeSwipe = (target, swipeDy) => {
    const scrollEl = target?.closest?.(".ldr-panel, .ldr-panel-stage");
    if (!scrollEl) return false;
    const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
    if (maxScroll <= 8) return false;
    const top = scrollEl.scrollTop;
    if (swipeDy < 0 && top < maxScroll - 2) return true;
    if (swipeDy > 0 && top > 2) return true;
    return false;
  };

  /* PC/트랙패드 휠 — 상하 페이지 전환 (모바일 스와이프와 동일 축). passive:false 로 preventDefault 보장 */
  const onWheel = useCallback(
    (e) => {
      if (keypadOpen || !outerNavEnabled) return;
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      if (canPanelConsumeWheel(e.target, e.deltaY)) return;

      const now = Date.now();
      if (now < wheelLockUntil.current) {
        e.preventDefault();
        return;
      }

      wheelAccum.current += e.deltaY;
      const threshold = 48;
      if (Math.abs(wheelAccum.current) < threshold) {
        e.preventDefault();
        return;
      }

      const dir = wheelAccum.current > 0 ? 1 : -1;
      wheelAccum.current = 0;
      wheelLockUntil.current = now + 420;
      e.preventDefault();
      go(dir);
    },
    [keypadOpen, outerNavEnabled, go]
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const handler = (e) => onWheel(e);
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [onWheel]);

  const finishSwipe = useCallback(
    (clientX, clientY) => {
      if (!dragging.current) return;
      dragging.current = false;
      const axis = swipeAxis.current;
      const startTarget = swipeStartTarget.current;
      swipeAxis.current = null;
      swipeStartTarget.current = null;
      if (axis === "x") return;
      const dx = clientX - startX.current;
      const dy = clientY - startY.current;
      if (Math.abs(dx) > Math.abs(dy)) return;
      if (Math.abs(dy) < 36) return;
      if (canPanelConsumeSwipe(startTarget, dy)) return;
      go(dy < 0 ? 1 : -1);
    },
    [go]
  );

  const shouldIgnoreCarouselStart = (target) => {
    return Boolean(target?.closest?.(interactiveSelector));
  };

  /* 축 잠금: 세로만 페이지 이동. 좌우는 ShowcaseMediaPage에 양보 (조기 capture 금지) */
  const onPointerDownCapture = (e) => {
    if (keypadOpen || !outerNavEnabled) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (shouldIgnoreCarouselStart(e.target)) return;
    dragging.current = true;
    swipeAxis.current = null;
    swipeStartTarget.current = e.target;
    startX.current = e.clientX;
    startY.current = e.clientY;
  };

  const onPointerMoveCapture = (e) => {
    if (!dragging.current || keypadOpen || !outerNavEnabled) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (swipeAxis.current == null && (Math.abs(dx) > 12 || Math.abs(dy) > 12)) {
      swipeAxis.current = Math.abs(dy) >= Math.abs(dx) ? "y" : "x";
      if (swipeAxis.current === "y") {
        if (canPanelConsumeSwipe(swipeStartTarget.current, dy)) {
          dragging.current = false;
          swipeAxis.current = null;
          swipeStartTarget.current = null;
          return;
        }
        try {
          e.currentTarget.setPointerCapture?.(e.pointerId);
        } catch {
          /* ignore */
        }
      } else {
        dragging.current = false;
      }
    }
  };

  const onPointerUpCapture = (e) => {
    if (!dragging.current && swipeAxis.current == null) return;
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
    finishSwipe(e.clientX, e.clientY);
  };

  const onTouchStartCapture = (e) => {
    if (keypadOpen || !outerNavEnabled) return;
    if (shouldIgnoreCarouselStart(e.target)) return;
    const t = e.touches?.[0];
    if (!t) return;
    dragging.current = true;
    swipeAxis.current = null;
    swipeStartTarget.current = e.target;
    startX.current = t.clientX;
    startY.current = t.clientY;
  };

  const onTouchMoveCapture = (e) => {
    if (!dragging.current || keypadOpen || !outerNavEnabled) return;
    const t = e.touches?.[0];
    if (!t) return;
    const dx = t.clientX - startX.current;
    const dy = t.clientY - startY.current;
    if (swipeAxis.current == null && (Math.abs(dx) > 12 || Math.abs(dy) > 12)) {
      swipeAxis.current = Math.abs(dy) >= Math.abs(dx) ? "y" : "x";
      if (swipeAxis.current === "x") {
        dragging.current = false;
      } else if (canPanelConsumeSwipe(swipeStartTarget.current, dy)) {
        dragging.current = false;
        swipeAxis.current = null;
        swipeStartTarget.current = null;
      }
    }
  };

  const onTouchEndCapture = (e) => {
    if (!dragging.current && swipeAxis.current == null) return;
    const t = e.changedTouches?.[0];
    finishSwipe(t?.clientX ?? startX.current, t?.clientY ?? startY.current);
  };

  const openSlideSettings = (kind) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenSlideSettings?.(kind);
  };

  const handlePeerClose = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onPeerClose?.();
  };

  const renderSlideCornerAction = (kind, banner = false) => {
    if (keypadOpen) return null;
    if (showPeerClose) {
      return (
        <button
          type="button"
          className={`showcase-call-carousel__slide-settings${banner ? " showcase-call-carousel__slide-settings--banner" : ""}`}
          aria-label="닫기"
          title="닫기"
          onClick={handlePeerClose}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
          닫기
        </button>
      );
    }
    if (!showOwnerSettings) return null;
    return (
      <button
        type="button"
        className={`showcase-call-carousel__slide-settings${banner ? " showcase-call-carousel__slide-settings--banner" : ""}`}
        aria-label={kind === "card" ? "디지털 인증명함 설정" : "블루 쇼케이스 설정"}
        title={kind === "card" ? "명함 설정" : "쇼케이스 설정"}
        onClick={openSlideSettings(kind)}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Settings className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
        설정
      </button>
    );
  };

  const cardAtEnd = Boolean(showDigitalCard && preferContentSlide);
  const photoIndexBase = showDigitalCard && !preferContentSlide ? 1 : 0;
  const showcaseSlideTotal = Math.max(1, count - (showDigitalCard ? 1 : 0));
  const contentOrdinal =
    current?.type === "card"
      ? 0
      : cardAtEnd
        ? index + 1
        : Math.max(1, index + 1 - photoIndexBase);
  const slideLabel =
    current?.type === "card"
      ? "디지털 인증명함"
      : current?.type === "instagram-post" ||
          current?.type === "media-page" ||
          current?.type === "banner"
        ? `쇼케이스 ${contentOrdinal}/${showcaseSlideTotal}`
        : current?.type === "empty-slot"
          ? `쇼케이스 ${current.slot}/${showcaseSlideTotal}`
          : current?.type === "paid-identity"
            ? "쇼케이스"
            : showcaseOffPreview
              ? ""
              : "";
  const showMeta = Boolean(slideLabel) && !showcaseOffPreview;

  const cornerName = String(card?.name || card?.displayName || "").trim();
  const cornerOrg = String(card?.organization || "").trim();
  const cornerShowName =
    card?.showcaseStyle?.showBroadcastName !== false && !card?.hideBroadcastName;

  return (
    <div
      className={`showcase-call-carousel showcase-call-carousel--vertical${canScroll ? "" : " showcase-call-carousel--locked"}${
        isPaid ? " showcase-call-carousel--paid" : " showcase-call-carousel--free"
      }${showCornerIdentity ? " showcase-call-carousel--corner-id" : ""}${
        current?.fromInstagram ? " showcase-call-carousel--ig-active" : ""
      }`}
      data-index={index}
      data-tier={tier}
      data-known={isKnownContact ? "1" : "0"}
      data-slide-kind={current?.type || ""}
      aria-roledescription={canScroll ? "carousel" : "region"}
    >
      {showMeta ? (
        <div className="showcase-call-carousel__meta">
          <span className="showcase-call-carousel__meta-label">{slideLabel}</span>
          <div className="showcase-call-carousel__meta-right">
            {/* suppressBgm 이어도 음원 칩·컨트롤은 표시 — 실제 재생은 케이스함 등 상위 owner 유지 */}
            {hasShowcaseBgmConfigured(bgmChipStyle) || !suppressBgm ? (
              <div className="showcase-call-carousel__bgm-bar" aria-label="쇼케이스 배경음악">
                <ShowcaseBgmTrackChip
                  styleConfig={bgmChipStyle}
                  placement="top"
                  className="showcase-call-carousel__bgm"
                  visible
                />
                <ShowcaseBgmTransport
                  className="showcase-call-carousel__bgm-transport"
                  styleConfig={bgmChipStyle}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div
        ref={viewportRef}
        className={`showcase-call-carousel__viewport${keypadOpen ? " showcase-call-carousel__viewport--keypad" : ""}`}
        onPointerDownCapture={onPointerDownCapture}
        onPointerMoveCapture={onPointerMoveCapture}
        onPointerUpCapture={onPointerUpCapture}
        onPointerCancel={() => {
          dragging.current = false;
          swipeAxis.current = null;
          swipeStartTarget.current = null;
        }}
        onTouchStartCapture={onTouchStartCapture}
        onTouchMoveCapture={onTouchMoveCapture}
        onTouchEndCapture={onTouchEndCapture}
        onTouchCancel={() => {
          dragging.current = false;
          swipeAxis.current = null;
          swipeStartTarget.current = null;
        }}
      >
        <div
          className={`showcase-call-carousel__stage${
            keypadOpen && current?.type !== "card" ? " is-dimmed" : ""
          }`}
          aria-hidden={keypadOpen && current?.type !== "card"}
        >
          <div
            className="showcase-call-carousel__track"
            style={{ transform: `translate3d(0, -${index * 100}%, 0)` }}
          >
            {slides.map((slide, slideIdx) => {
              const near = Math.abs(slideIdx - index) <= 1;
              return (
              <article key={slide.id} className="showcase-call-carousel__slide">
                {!near ? <div className="showcase-call-carousel__slide-placeholder" aria-hidden /> : null}
                {near && slide.type === "card" && isPaid ? (
                  <div className="showcase-call-carousel__card">
                    {renderSlideCornerAction("card")}
                    <LetteringDigitalReception
                      card={card}
                      verified={verified}
                      verificationItems={verificationItems}
                      incomingNumber={incomingNumber}
                      embeddedInPush
                      previewMode={previewMode}
                      enableContactLinks
                      face={face}
                      onFaceChange={onFaceChange}
                      keypadOpen={keypadOpen}
                      onKeypadClose={onKeypadClose}
                      keypadDemoMode={keypadDemoMode}
                      onToast={onKeypadToast}
                      callChromeSafe={callChromeSafe}
                    />
                  </div>
                ) : null}

                {near && slide.type === "instagram-post" ? (
                  <div className="showcase-call-carousel__banner showcase-call-carousel__banner--ig-post">
                    {renderSlideCornerAction("showcase", true)}
                    <ShowcaseInstagramPost
                      username={slide.username || igUsername}
                      profilePictureUrl={slide.profilePictureUrl || igProfilePictureUrl}
                      photos={slide.photos || []}
                      caption={slide.caption || ""}
                      mediaId={slide.mediaId || slide.id || ""}
                      permalink={slide.permalink || ""}
                      verified={igVerified}
                      onLike={(_ctx, _state) => {
                        /* TODO: VLUE 좋아요 API / Instagram Graph */
                      }}
                      onComment={(ctx) => {
                        /* TODO: 댓글 시트 + VLUE comments API */
                        onKeypadToast?.(`@${ctx.username || "instagram"} 댓글`);
                      }}
                      onShare={async (ctx) => {
                        /* TODO: 공유 기록 + 카카오/시스템 공유 */
                        try {
                          if (navigator.share && ctx.permalink) {
                            await navigator.share({
                              title: "VLUE Showcase",
                              url: ctx.permalink
                            });
                          } else if (ctx.permalink) {
                            await navigator.clipboard?.writeText?.(ctx.permalink);
                            onKeypadToast?.("링크를 복사했습니다.");
                          } else {
                            onKeypadToast?.("공유할 링크가 없습니다.");
                          }
                        } catch {
                          /* ignore cancel */
                        }
                      }}
                      onReport={(ctx) => {
                        /* TODO: VLUE 신고/차단 */
                        onReport?.({ card, phone: incomingNumber, mediaId: ctx.mediaId });
                        onKeypadToast?.("신고는 VLUE 앱 신고 화면에서 처리할 수 있습니다.");
                      }}
                      onImageError={(broken) => {
                        const id = broken?.id;
                        if (!id) return;
                        void resolveIgMediaSafe([id]);
                      }}
                    />
                    {/* 인스타 게시물: 비즈니스 링크 숨김 · 소셜 로고 + VLUE 프로필만 */}
                    {socialOverlayEnabled && !keypadOpen ? (
                      <ShowcaseSlideChrome
                        card={card}
                        variant="instagram"
                        hideBusinessLinks
                        fallbackToMe={false}
                        onToast={onKeypadToast}
                      />
                    ) : null}
                  </div>
                ) : null}

                {near && (slide.type === "media-page" || slide.type === "banner") ? (
                  <div className="showcase-call-carousel__banner">
                    {renderSlideCornerAction("showcase", true)}
                    <ShowcaseMediaPage
                      photos={
                        slide.type === "media-page"
                          ? slide.photos || []
                          : slide.url
                            ? [{ id: slide.id, url: slide.url }]
                            : []
                      }
                      caption={slide.caption || slide.overlayText || ""}
                      badge={igVerified && igBadge ? "Instagram 인증완료✔" : ""}
                      onImageError={(broken) => {
                        const id = broken?.id;
                        if (!id) return;
                        void resolveIgMediaSafe([id]);
                      }}
                    />
                    {socialOverlayEnabled && v1AppShell.showcaseSocialOverlay && !keypadOpen ? (
                      <>
                        <ShowcaseSlideChrome
                          card={card}
                          variant="custom"
                          businessLink={slide.businessLink || null}
                          fallbackToMe={false}
                          onToast={onKeypadToast}
                        />
                        <ShowcaseBannerSocialLayer
                          card={card}
                          slide={slide}
                          previewMode={previewMode}
                          onToast={onKeypadToast}
                          onReport={onReport}
                          hideFooter
                        />
                      </>
                    ) : null}
                  </div>
                ) : null}

                {near && slide.type === "paid-identity" ? (
                  <div className="showcase-call-carousel__paid-sheet">
                    <div className="showcase-call-carousel__paid-sheet-stage" aria-hidden />
                  </div>
                ) : null}

                {near && (slide.type === "free-profile" || slide.type === "free-safe") ? (
                  <div className="showcase-call-carousel__free">
                    <FreeTierCallShowcase
                      isKnownContact={slide.type === "free-profile" && !showcaseOffPreview}
                      card={card}
                      phone={incomingNumber}
                      verified={verified}
                      showcaseOffPreview={showcaseOffPreview}
                    />
                  </div>
                ) : null}

                {near && slide.type === "empty-slot" ? (
                  <div className="showcase-call-carousel__banner showcase-call-carousel__banner--empty">
                    {renderSlideCornerAction("showcase", true)}
                    <div className="showcase-call-carousel__paid-sheet-stage" aria-hidden />
                    <div className="showcase-call-carousel__banner-veil" aria-hidden />
                    <p className="showcase-call-carousel__banner-caption showcase-call-carousel__banner-caption--empty">
                      스타일 설정 → 사진에서 추가하면 여기에 표시됩니다. (최대 {slide.max}장)
                    </p>
                  </div>
                ) : null}
              </article>
              );
            })}
          </div>

          {canScroll && !keypadOpen ? (
            <div className="showcase-call-carousel__dots" role="tablist" aria-label="쇼케이스 슬라이드">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  className={`showcase-call-carousel__dot${i === index ? " is-active" : ""}`}
                  aria-label={
                    slide.type === "card"
                      ? "디지털 명함"
                      : slide.type === "empty-slot"
                        ? `빈 슬롯 ${slide.slot}`
                        : `쇼케이스 배너 ${i}`
                  }
                  aria-selected={i === index}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
          ) : null}

          {showCornerIdentity && isPaid && !keypadOpen && !socialOverlayEnabled ? (
            <ShowcaseIdentityCorner
              name={cornerName}
              organization={cornerOrg}
              phone={incomingNumber || card?.phone || ""}
              verified={verified}
              showName={cornerShowName}
            />
          ) : null}
        </div>

        {keypadOpen && current?.type !== "card" ? (
          <div className="showcase-call-carousel__keypad-layer">
            <InCallDtmfPad
              fill
              className="showcase-call-carousel__keypad"
              demoMode={keypadDemoMode}
              onClose={() => onKeypadClose?.()}
              onToast={onKeypadToast}
            />
          </div>
        ) : null}
      </div>

      {isPaid && !scrollEnabled && count > 1 ? (
        <p className="showcase-call-carousel__lock-hint">통화 연결 후 슬라이드할 수 있습니다</p>
      ) : null}
    </div>
  );
}
