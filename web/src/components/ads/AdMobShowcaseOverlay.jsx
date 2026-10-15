import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Volume2,
  VolumeX,
  Heart,
  MessageCircle,
  Send,
  MoreHorizontal,
  Car,
  Sparkles,
  Download,
  ShieldCheck
} from "lucide-react";
import AppFullScreenView from "../AppFullScreenView.jsx";
import { buildAdMobShowcaseCard, getBrandHighlightSpecs } from "../../lib/ads/buildAdMobShowcaseCard.js";
import {
  VLUE_CLOSE_ADMOB_SHOWCASE,
  VLUE_OPEN_ADMOB_SHOWCASE
} from "../../lib/ads/openAdMobShowcase.js";
import { CLOSE_SHOWCASE_OVERLAYS_EVENT } from "../../lib/showcase/closeShowcaseOverlays.js";
import { pushAndroidBackHandler } from "../../lib/androidBackStack.js";

/**
 * AdMob 및 VLUÉ 추천 스폰서 쇼케이스 오버레이
 * - 광고 원본 오디오 단독 출력 (외부 BGM 혼합 없음)
 * - 브랜드별 맞춤 사운드 트랙명 상단 바 자동 표시
 * - 상단 사운드 바 & 플로팅 버튼을 통한 1:1 음소거(Mute/Unmute) 토글
 * - 쇼케이스 진입/퇴장 시 메인 BGM 복원 로직 배제로 오디오 꼬임 현상 원천 방지
 * - 고화질 비디오 자동 재생 (Autoplay/Loop/Playsinline) 및 앰비언트 블러 배경
 * - 상단 헤더 안전 여백 확보 (텍스트 짤림 100% 방지)
 * - 브랜드별 맞춤형 하단 CTA 버튼 동적 매핑
 */
export default function AdMobShowcaseOverlay({ onToast }) {
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState(null);
  const [ctaPaused, setCtaPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(1);
  const [videoError, setVideoError] = useState(false);

  const rootRef = useRef(null);
  const videoRef = useRef(null);
  const bgVideoRef = useRef(null);
  const syncTimer = useRef(0);

  const bridge =
    typeof window !== "undefined" ? window.VlueLettering || window.Android : null;

  const hideBannersHard = useCallback(() => {
    try {
      bridge?.hideBannerAd?.("dcc_bottom");
      bridge?.hideBannerAd?.("bottom");
      bridge?.hideBannerAd?.("ribbon");
      window.dispatchEvent(new CustomEvent("vlue-hide-all-ads"));
    } catch {
      /* ignore */
    }
  }, [bridge]);

  // 쇼케이스 닫기 — 메인 시그니처 BGM 복원 없이 깔끔하게 영상 정지 및 종료
  const close = useCallback(() => {
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {
        /* ignore */
      }
    }
    if (bgVideoRef.current) {
      try {
        bgVideoRef.current.pause();
      } catch {
        /* ignore */
      }
    }

    setOpen(false);
    setAssets(null);
    setCtaPaused(false);
    setIsMuted(true);
    setLiked(false);
    setVideoError(false);

    try {
      bridge?.closeNativeAdShowcaseSlots?.();
    } catch {
      /* ignore */
    }
    try {
      window.dispatchEvent(new CustomEvent("vlue-resume-ads"));
    } catch {
      /* ignore */
    }
  }, [bridge]);

  useEffect(() => {
    const onOpen = (ev) => {
      const detail = ev?.detail && typeof ev.detail === "object" ? ev.detail : {};
      setAssets(detail);
      setOpen(true);
      setCtaPaused(false);
      setIsMuted(true);
      setLiked(false);
      setLikeCount(1);
      setVideoError(false);
      hideBannersHard();
    };
    const onClose = () => close();
    window.addEventListener(VLUE_OPEN_ADMOB_SHOWCASE, onOpen);
    window.addEventListener(VLUE_CLOSE_ADMOB_SHOWCASE, onClose);
    window.addEventListener(CLOSE_SHOWCASE_OVERLAYS_EVENT, onClose);
    return () => {
      window.removeEventListener(VLUE_OPEN_ADMOB_SHOWCASE, onOpen);
      window.removeEventListener(VLUE_CLOSE_ADMOB_SHOWCASE, onClose);
      window.removeEventListener(CLOSE_SHOWCASE_OVERLAYS_EVENT, onClose);
    };
  }, [close, hideBannersHard]);

  useEffect(() => {
    if (!open) return undefined;
    hideBannersHard();
    return undefined;
  }, [open, hideBannersHard]);

  useEffect(() => {
    const onPauseCta = (ev) => {
      setCtaPaused(Boolean(ev?.detail?.pause));
    };
    window.addEventListener("vlue-admob-pause-cta", onPauseCta);
    return () => window.removeEventListener("vlue-admob-pause-cta", onPauseCta);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    return pushAndroidBackHandler(() => {
      close();
      return true;
    });
  }, [open, close]);

  const card = useMemo(() => {
    if (!assets) return null;
    return buildAdMobShowcaseCard(assets, null);
  }, [assets]);

  // 비디오 URL 결정
  const videoUrl = useMemo(() => {
    if (videoError) return "";
    return String(assets?.videoUrl || assets?.video_url || "").trim();
  }, [assets, videoError]);

  const mediaUrl = useMemo(() => {
    return String(assets?.mediaUrl || assets?.bgImage || assets?.iconUrl || "").trim();
  }, [assets]);

  const advertiser = String(assets?.advertiser || card?.name || "스폰서").trim() || "스폰서";
  const headline = String(assets?.headline || card?.caption || "").trim();
  const body = String(assets?.body || "").trim();
  const badge = String(assets?.badge || "").trim();
  const accentColor = String(assets?.accentColor || "#38bdf8").trim();

  // 브랜드별 맞춤 사운드 트랙명 (예: GENESIS G90 Original Track, BMW AD Original Track 등)
  const brandTrackTitle = useMemo(() => {
    if (assets?.bgmTitle) return String(assets.bgmTitle).trim();
    if (advertiser && advertiser !== "스폰서") {
      return `${advertiser} AD Original Track`;
    }
    return "Sponsor AD Original Track";
  }, [assets?.bgmTitle, advertiser]);

  // 하이라이트 스펙
  const specs = useMemo(() => {
    if (Array.isArray(assets?.specs) && assets.specs.length > 0) return assets.specs;
    return getBrandHighlightSpecs(assets);
  }, [assets]);

  // 맞춤형 CTA 버튼 분석
  const ctaMeta = useMemo(() => {
    const rawLabel = String(assets?.ctaLabel || "").trim();
    const type = String(assets?.ctaType || "").toLowerCase();
    const category = String(assets?.category || "").toLowerCase();
    const brand = advertiser.toUpperCase();

    const isCar =
      type === "car" ||
      category.includes("자동차") ||
      category.includes("모빌리티") ||
      brand.includes("GENESIS") ||
      brand.includes("TESLA") ||
      brand.includes("PORSCHE") ||
      brand.includes("BMW") ||
      brand.includes("MAYBACH") ||
      brand.includes("BENZ");

    const isSafe =
      type === "safe" ||
      category.includes("금융") ||
      category.includes("보안") ||
      brand.includes("금융") ||
      brand.includes("감독원") ||
      brand.includes("위원회");

    const isApp = type === "app" || category.includes("앱") || category.includes("서비스");

    let finalLabel = rawLabel;
    let Icon = Sparkles;

    if (isCar) {
      Icon = Car;
      if (!finalLabel || finalLabel === "자세히 보기") finalLabel = "시승 신청하기";
    } else if (isSafe) {
      Icon = ShieldCheck;
      if (!finalLabel || finalLabel === "자세히 보기") finalLabel = "지금 안심 확인";
    } else if (isApp) {
      Icon = Download;
      if (!finalLabel || finalLabel === "자세히 보기") finalLabel = "지금 설치하기";
    } else {
      Icon = Sparkles;
      if (!finalLabel || finalLabel === "자세히 보기") {
        finalLabel = brand.includes("ROLEX") ? "컬렉션 상세보기" : "신제품 상세보기";
      }
    }

    return { label: finalLabel, Icon };
  }, [assets, advertiser]);

  // AD 영상 오디오 단독 재생 & 음소거 1:1 토글 제어
  const handleToggleSound = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
      if (!nextMuted) {
        videoRef.current.play().catch(() => {});
      }
    }

    onToast?.(nextMuted ? "광고 사운드가 음소거되었습니다." : `${brandTrackTitle} 사운드가 켜졌습니다.`);
  }, [isMuted, brandTrackTitle, onToast]);

  // 비디오 자동 재생 보장 (배경 블러 비디오는 항상 100% 무음 유지하여 중복 출력 방지)
  useEffect(() => {
    if (!open) return;
    if (videoUrl && videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.play().catch(() => {});
    }
    if (bgVideoRef.current) {
      bgVideoRef.current.muted = true;
      bgVideoRef.current.play().catch(() => {});
    }
  }, [open, videoUrl, isMuted]);

  // 좋아요 토글
  const handleLike = useCallback(() => {
    setLiked((prev) => {
      const next = !prev;
      setLikeCount((c) => (next ? c + 1 : Math.max(1, c - 1)));
      if (next) onToast?.("이 쇼케이스를 좋아합니다.");
      return next;
    });
  }, [onToast]);

  // 공유하기
  const handleShare = useCallback(() => {
    const targetUrl = assets?.landingUrl || assets?.link || window.location.href;
    if (navigator.share) {
      navigator
        .share({
          title: headline || advertiser,
          text: body || `${advertiser} 쇼케이스`,
          url: targetUrl
        })
        .catch(() => {});
    } else {
      navigator.clipboard
        ?.writeText(targetUrl)
        .then(() => onToast?.("쇼케이스 링크가 복사되었습니다."))
        .catch(() => onToast?.("링크 복사에 실패했습니다."));
    }
  }, [assets, headline, advertiser, body, onToast]);

  // 댓글 클릭
  const handleComment = useCallback(() => {
    onToast?.("스폰서 쇼케이스는 공식 파트너 피드에서 소통하실 수 있습니다.");
  }, [onToast]);

  // 네이티브 AdMob 슬롯 싱크 (isAdMob인 경우)
  const syncNativeSlots = useCallback(() => {
    if (!open || !bridge?.syncNativeAdShowcaseSlots) return;
    if (assets && assets.isAdMob === false) return;
    const root = rootRef.current;
    if (!root) return;
    const mediaEl =
      root.querySelector(".showcase-media-page__frame") ||
      root.querySelector(".showcase-call-carousel__banner");
    const ctaEl = root.querySelector("[data-admob-cta-slot]");
    if (!mediaEl || !ctaEl) return;

    const media = mediaEl.getBoundingClientRect();
    const cta = ctaEl.getBoundingClientRect();
    if (media.width < 40 || media.height < 40) return;
    if (!ctaPaused && (cta.width < 40 || cta.height < 20)) return;

    try {
      bridge.syncNativeAdShowcaseSlots(
        JSON.stringify({
          visible: true,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          hasVideoContent: Boolean(videoUrl || assets?.hasVideoContent),
          media: {
            left: media.left,
            top: media.top,
            width: media.width,
            height: media.height
          },
          cta: {
            left: cta.left,
            top: ctaPaused ? window.innerHeight + 80 : cta.top,
            width: Math.max(cta.width, 40),
            height: Math.max(cta.height, 40),
            label: ctaMeta.label,
            visible: !ctaPaused
          }
        })
      );
    } catch {
      /* ignore */
    }
  }, [open, bridge, videoUrl, assets, ctaMeta.label, ctaPaused]);

  useEffect(() => {
    if (!open) return undefined;
    const run = () => {
      window.clearTimeout(syncTimer.current);
      syncTimer.current = window.setTimeout(syncNativeSlots, 80);
    };
    run();
    const retries = [160, 400, 800, 1400].map((ms) => window.setTimeout(run, ms));
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(run) : null;
    if (rootRef.current && ro) ro.observe(rootRef.current);
    window.addEventListener("resize", run);
    return () => {
      window.clearTimeout(syncTimer.current);
      retries.forEach((id) => window.clearTimeout(id));
      ro?.disconnect();
      window.removeEventListener("resize", run);
    };
  }, [open, syncNativeSlots]);

  // CTA 버튼 클릭 시 이동
  const handleCtaClick = () => {
    const targetUrl = assets?.landingUrl || assets?.link;
    if (!targetUrl) return;
    try {
      if (bridge?.openExternalUrl) {
        bridge.openExternalUrl(targetUrl);
        return;
      }
    } catch {
      /* ignore */
    }
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  if (!open || !card || typeof document === "undefined") return null;

  const isNativeAdMob = Boolean(assets?.isAdMob && bridge?.syncNativeAdShowcaseSlots);
  const CtaIcon = ctaMeta.Icon;

  return createPortal(
    <AppFullScreenView
      open
      onClose={close}
      hideHeader
      showFloatingClose={false}
      coverBottomNav
      isDarkMode
      className="admob-showcase-overlay bg-[#0B101B]"
      captureAndroidBack={false}
    >
      <div
        ref={rootRef}
        className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden select-none bg-[#0B101B]"
        data-admob-showcase="1"
        data-admob-has-video={videoUrl ? "1" : "0"}
      >
        {/* 최상단 헤더 바 */}
        <header
          className="admob-slim-title shrink-0 border-b border-white/10 bg-[#0B101B] px-3 pb-2.5 pt-[max(10px,var(--vlue-safe-top,10px))]"
          data-admob-slim-title
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="lettering-live-indicator flex items-center gap-0.5" aria-hidden>
              <span className="inline-block h-3 w-1 rounded-full bg-cyan-400 animate-pulse" />
              <span className="inline-block h-4 w-1 rounded-full bg-cyan-400 animate-pulse delay-75" />
              <span className="inline-block h-2.5 w-1 rounded-full bg-cyan-400 animate-pulse delay-150" />
            </span>
            <p className="min-w-0 flex-1 truncate text-[13px] font-black tracking-tight text-white">
              {advertiser && advertiser !== "스폰서"
                ? `${advertiser} AD Sponsor Showcase`
                : "AD Sponsor Showcase"}
            </p>
            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white active:scale-95 transition-transform"
              aria-label="닫기"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                close();
              }}
            >
              <X size={18} strokeWidth={2.6} aria-hidden />
            </button>
          </div>
        </header>

        {/* BGM 및 브랜드별 사운드 트랙명 표시 바 (오디오 단독 제어) */}
        <div className="shrink-0 flex items-center justify-between px-3 py-1.5 bg-[#0e1626]/90 border-b border-white/5 backdrop-blur-sm z-20">
          <span className="text-[11px] font-bold text-slate-400 shrink-0">쇼케이스 1/1</span>

          {/* 중앙: 브랜드별 맞춤 사운드 트랙명 칩 (탭 시 음소거 토글 연동) */}
          <button
            type="button"
            onClick={handleToggleSound}
            className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold text-slate-200 max-w-[210px] sm:max-w-[270px] shadow-sm backdrop-blur-md active:scale-95 transition-all truncate"
            title={brandTrackTitle}
          >
            <span className="text-[12px] shrink-0">🎵</span>
            <span className="truncate text-slate-200 tracking-tight font-medium">
              {brandTrackTitle}
            </span>
          </button>

          {/* 우측: 1:1 오디오 Mute/Unmute 아이콘 토글 버튼 */}
          <button
            type="button"
            onClick={handleToggleSound}
            className="flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-200 active:scale-95 transition-all shadow-sm shrink-0"
            aria-label={isMuted ? "음소거 해제" : "음소거"}
          >
            {isMuted ? (
              <>
                <VolumeX size={14} className="text-slate-400" />
                <span className="text-[10px] text-slate-400 font-bold">음소거</span>
              </>
            ) : (
              <>
                <Volume2 size={14} className="text-cyan-400 animate-pulse" />
                <span className="text-[10px] text-cyan-300 font-bold">재생 중</span>
              </>
            )}
          </button>
        </div>

        {/* 메인 쇼케이스 뷰어 영역 */}
        <div className="relative min-h-0 flex-1 flex flex-col justify-between overflow-hidden">
          {/* 1. 고화질 풀스크린 앰비언트 블러 배경 (영상 또는 이미지) */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {videoUrl ? (
              <video
                ref={bgVideoRef}
                src={videoUrl}
                poster={mediaUrl}
                autoPlay
                loop
                muted
                playsInline
                className="h-full w-full object-cover blur-2xl scale-125 opacity-30 transition-opacity duration-700"
                aria-hidden="true"
              />
            ) : mediaUrl ? (
              <img
                src={mediaUrl}
                alt=""
                className="h-full w-full object-cover blur-2xl scale-125 opacity-30 transition-opacity duration-700"
                aria-hidden="true"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0B101B]/90 via-[#0B101B]/40 to-[#0B101B]" />
          </div>

          {/* 2. 상단 텍스트 영역: BGM 바 아래 안전 여백 확보하여 텍스트 짤림 100% 방지 */}
          <div className="relative z-10 px-5 pt-3 text-center">
            {badge ? (
              <span
                className="inline-block rounded-full px-2.5 py-0.5 text-[10.5px] font-black tracking-wider uppercase mb-1.5 shadow-sm"
                style={{
                  backgroundColor: `${accentColor}22`,
                  color: accentColor,
                  border: `1px solid ${accentColor}55`
                }}
              >
                {badge}
              </span>
            ) : null}

            <h3 className="text-[17px] font-black leading-snug tracking-tight text-white drop-shadow-lg px-2">
              {body || headline}
            </h3>

            {body && headline ? (
              <p className="mt-1 text-[12.5px] font-bold text-slate-300 tracking-tight drop-shadow-md">
                {headline}
              </p>
            ) : null}
          </div>

          {/* 3. 중앙 고화질 메인 비주얼 영역 (광고 영상 루프 또는 이미지) */}
          <div className="relative z-10 mx-auto w-[92%] max-w-[340px] flex-1 min-h-0 flex items-center justify-center my-1.5">
            <div className="showcase-media-page__frame relative w-full max-h-[100%] overflow-hidden rounded-2xl border border-white/20 bg-black/80 shadow-2xl">
              {videoUrl ? (
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                  <video
                    ref={videoRef}
                    key={videoUrl}
                    src={videoUrl}
                    poster={mediaUrl}
                    autoPlay
                    loop
                    muted={isMuted}
                    playsInline
                    onError={() => setVideoError(true)}
                    className="h-full w-full object-contain max-h-[265px] mx-auto select-none rounded-2xl"
                  />
                  {/* 영상 우측 상단 플로팅 사운드 토글 배지 */}
                  <button
                    type="button"
                    onClick={handleToggleSound}
                    className="absolute top-2.5 right-2.5 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md border border-white/20 active:scale-90 transition-transform shadow-lg"
                    aria-label="소리 켜기/끄기"
                  >
                    {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} className="text-cyan-400" />}
                  </button>
                </div>
              ) : mediaUrl ? (
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                  <img
                    key={mediaUrl}
                    src={mediaUrl}
                    alt={headline || "스폰서 쇼케이스"}
                    className="h-full w-full object-contain max-h-[265px] mx-auto select-none rounded-2xl"
                    draggable={false}
                  />
                </div>
              ) : null}
            </div>
          </div>

          {/* 4. 디테일 스펙/하이라이트 칩 (글래스모피즘 배지) */}
          <div className="relative z-10 px-4 pt-1 pb-2 text-center">
            {specs && specs.length > 0 ? (
              <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-[320px] mx-auto">
                {specs.map((spec, sIdx) => (
                  <span
                    key={sIdx}
                    className="flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10.5px] font-bold text-white/95 shadow-sm backdrop-blur-md"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: accentColor }}
                    />
                    {spec}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {/* 5. 하단 소셜 및 브랜드 프로필 인터랙션 바 */}
          <div className="relative z-10 flex items-center justify-between px-4 pb-2 pt-1 text-white">
            {/* 좌측: 좋아요 요약 & 브랜드 프로필 카드 */}
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <span className="text-[11px] font-bold text-sky-400 drop-shadow-sm">
                @ceo님이 좋아합니다
              </span>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/60 px-2.5 py-1.5 backdrop-blur-md max-w-[240px]">
                {mediaUrl ? (
                  <img
                    src={mediaUrl}
                    alt=""
                    className="h-7 w-7 rounded-full object-cover border border-white/20 shrink-0"
                  />
                ) : (
                  <div
                    className="h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0"
                    style={{ backgroundColor: accentColor }}
                  >
                    {advertiser.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] font-bold text-slate-400 tracking-wider">VLUÉ 프로필</div>
                  <div className="truncate text-[12px] font-black text-white">{advertiser}</div>
                </div>
                <span className="shrink-0 rounded bg-cyan-500/20 px-1.5 py-0.5 text-[9.5px] font-black text-cyan-400 border border-cyan-500/30">
                  [광고] AD
                </span>
              </div>
            </div>

            {/* 우측: 소셜 레일 인터랙션 버튼 (좋아요, 댓글, 공유, 더보기) */}
            <div className="flex flex-col items-center gap-2.5 shrink-0 pl-3">
              <button
                type="button"
                onClick={handleLike}
                className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
                aria-label="좋아요"
              >
                <Heart
                  size={22}
                  className={liked ? "fill-rose-500 text-rose-500 scale-110" : "text-white"}
                />
                <span className="text-[10px] font-bold text-white">{likeCount}</span>
              </button>
              <button
                type="button"
                onClick={handleComment}
                className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
                aria-label="댓글"
              >
                <MessageCircle size={22} className="text-white" />
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
                aria-label="공유하기"
              >
                <Send size={20} className="text-white" />
              </button>
              <button
                type="button"
                onClick={() => onToast?.(`${advertiser} 공식 스폰서 쇼케이스입니다.`)}
                className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
                aria-label="더보기"
              >
                <MoreHorizontal size={20} className="text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        {/* 최하단 브랜드별 맞춤형 CTA 버튼 */}
        <div className="shrink-0 bg-[#0B101B] px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 border-t border-white/5 z-20">
          <button
            type="button"
            data-admob-cta-slot
            onClick={handleCtaClick}
            className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-[16px] font-black text-white active:brightness-90 transition-all cursor-pointer shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${accentColor} 0%, #1e40af 100%)`,
              boxShadow: `0 4px 20px ${accentColor}44`,
              pointerEvents: isNativeAdMob ? "none" : "auto",
              visibility: ctaPaused ? "hidden" : "visible",
              height: ctaPaused ? 0 : undefined,
              paddingTop: ctaPaused ? 0 : undefined,
              paddingBottom: ctaPaused ? 0 : undefined,
              margin: 0,
              overflow: "hidden"
            }}
            tabIndex={0}
          >
            <CtaIcon size={19} strokeWidth={2.4} />
            <span>{ctaMeta.label}</span>
          </button>
        </div>
      </div>
    </AppFullScreenView>,
    document.body
  );
}
