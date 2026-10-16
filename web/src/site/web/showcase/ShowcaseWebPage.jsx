import { useEffect, useMemo, useState } from "react";
import { Check, ExternalLink, Paperclip } from "lucide-react";
import { resolvePublicShowcaseByPhone } from "../../../lib/resolvePublicShowcaseByPhone.js";
import { formatLetteringPhoneDisplay } from "../../../lib/letteringPhoneMatch.js";
import { getVlueDownloadLinks } from "../../../lib/vlueClientAccess.js";
import { openVlueDownload } from "../../../lib/vlueDownloadActions.js";
import { hasShowcaseBgmConfigured } from "../../../lib/showcase/showcaseBgmPresets.js";
import { extractShowcaseCoverUrl } from "../../../lib/showcase/showcaseCover.js";
import { useShowcaseBgm } from "../../../context/ShowcaseBgmContext.jsx";
import PublicShowcaseStage from "../../../components/showcase/PublicShowcaseStage.jsx";
import "./showcase-web.css";

function downloadAttachment(file) {
  const url = String(file?.url || "").trim();
  if (!url) return;
  const a = document.createElement("a");
  a.href = url;
  a.download = file.fileName || file.label || "download";
  a.rel = "noopener noreferrer";
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function styleHasPublicShowcase(style) {
  if (!style || typeof style !== "object") return false;
  if (hasShowcaseBgmConfigured(style)) return true;
  if (extractShowcaseCoverUrl(style)) return true;
  if (Array.isArray(style.pages) && style.pages.some((p) => p && typeof p === "object")) return true;
  return false;
}

/**
 * 카톡·알림톡 공개 링크 — DCC+ 풀 쇼케이스(음악 포함) 우선, 없으면 간단 프로필
 */
export default function ShowcaseWebPage({ phone }) {
  const [payload, setPayload] = useState(null);
  const [showFull, setShowFull] = useState(true);
  const [stageKey, setStageKey] = useState(0);
  const [bgmPromptOpen, setBgmPromptOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const { unlockFromUserGesture, setPlaybackPhase, bindStyleConfig } = useShowcaseBgm();

  useEffect(() => {
    let cancelled = false;
    resolvePublicShowcaseByPhone(phone).then((data) => {
      if (!cancelled) setPayload(data);
    });
    return () => {
      cancelled = true;
    };
  }, [phone]);

  /* 스타일·BGM을 컨텍스트에 미리 바인딩 — 재생 수락 시 바로 들리게 */
  useEffect(() => {
    const style = payload?.card?.showcaseStyle || payload?.showcaseStyle;
    if (!style) return undefined;
    bindStyleConfig?.(style);
    return undefined;
  }, [payload, bindStyleConfig]);

  const reopenFullShowcase = () => {
    setStageKey((k) => k + 1);
    setShowFull(true);
  };

  /* 카톡 WebView bfcache — 접힌 상태로 복원되면 풀 쇼케이스 다시 연다 */
  useEffect(() => {
    reopenFullShowcase();
    const onPageShow = (e) => {
      if (e?.persisted) reopenFullShowcase();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- phone 변경 시에만 재바인딩
  }, [phone]);

  useEffect(() => {
    if (!toastMsg) return undefined;
    const t = window.setTimeout(() => setToastMsg(""), 3200);
    return () => window.clearTimeout(t);
  }, [toastMsg]);

  const links = getVlueDownloadLinks();

  const handleAppDownload = () => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
    if (/iphone|ipad|ipod/i.test(ua)) {
      if (!openVlueDownload("appStore")) window.location.assign(links.downloadPage);
      return;
    }
    if (/android/i.test(ua)) {
      if (!openVlueDownload("playStore")) window.location.assign(links.downloadPage);
      return;
    }
    window.location.assign(links.downloadPage);
  };

  const handleCloseFull = () => {
    setPlaybackPhase?.("idle", { fade: true, steal: true, owner: "public-showcase" });
    setBgmPromptOpen(false);
    setShowFull(false);
  };

  const canShowFull = useMemo(() => {
    if (!payload?.card) return false;
    if (styleHasPublicShowcase(payload.card.showcaseStyle || payload.showcaseStyle)) return true;
    if (payload.isPaid) return true;
    return false;
  }, [payload]);

  const hasBgm = useMemo(
    () =>
      hasShowcaseBgmConfigured(payload?.card?.showcaseStyle || payload?.showcaseStyle),
    [payload]
  );

  useEffect(() => {
    if (!canShowFull || !showFull || !hasBgm) {
      setBgmPromptOpen(false);
      return undefined;
    }
    setBgmPromptOpen(true);
    return undefined;
  }, [canShowFull, showFull, hasBgm, stageKey]);

  const acceptBgm = () => {
    setBgmPromptOpen(false);
    const style = payload?.card?.showcaseStyle || payload?.showcaseStyle;
    unlockFromUserGesture?.();
    if (style) {
      bindStyleConfig?.(style);
      /* 이미 재생 중이면 이어서 — 처음부터 다시 시작하지 않음 */
      setPlaybackPhase?.("preview", {
        forceRestart: false,
        steal: true,
        owner: "public-showcase",
        styleConfig: style
      });
    }
  };

  const declineBgm = () => {
    setBgmPromptOpen(false);
    setPlaybackPhase?.("idle", { fade: true, steal: true, owner: "public-showcase" });
  };

  const showToast = (msg) => {
    const text = String(msg || "").trim();
    if (text) setToastMsg(text);
  };

  if (!payload) {
    const displayPhone = formatLetteringPhoneDisplay(phone) || phone || "";
    return (
      <div
        className="showcase-web showcase-web--full-fs showcase-web--static-shell"
        data-vlue-public-showcase="1"
        style={{
          minHeight: "100vh",
          backgroundColor: "#0B101B",
          color: "#e2e8f0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          boxSizing: "border-box"
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            borderRadius: "24px",
            background: "linear-gradient(180deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
            overflow: "hidden",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)"
          }}
        >
          {/* Top Badges */}
          <div style={{ padding: "16px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "9999px",
                  backgroundColor: "#38bdf8",
                  boxShadow: "0 0 10px #38bdf8",
                  display: "inline-block"
                }}
              />
              <span style={{ fontSize: "12px", fontWeight: "800", color: "#38bdf8", letterSpacing: "-0.02em" }}>
                VLUÉ 인증 쇼케이스
              </span>
            </div>
            {displayPhone ? (
              <span style={{ fontSize: "12px", fontWeight: "600", color: "#94a3b8", letterSpacing: "-0.01em" }}>
                {displayPhone}
              </span>
            ) : null}
          </div>

          {/* Cover Skeleton */}
          <div
            style={{
              width: "100%",
              aspectRatio: "1.6",
              background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.04), transparent)",
                animation: "vlue-shell-pulse 1.8s ease-in-out infinite"
              }}
            />
            <div style={{ textAlign: "center", padding: "16px", zIndex: 1 }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "9999px",
                  background: "rgba(56, 189, 248, 0.12)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  margin: "0 auto 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#38bdf8"
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <p style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#e2e8f0" }}>
                보안 인증 쇼케이스 연결 중…
              </p>
            </div>
          </div>

          {/* Content Skeleton */}
          <div style={{ padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "16px",
                  background: "rgba(148, 163, 184, 0.15)",
                  flexShrink: 0
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    width: "55%",
                    height: "16px",
                    borderRadius: "6px",
                    background: "rgba(148, 163, 184, 0.2)",
                    marginBottom: "8px"
                  }}
                />
                <div
                  style={{
                    width: "35%",
                    height: "12px",
                    borderRadius: "4px",
                    background: "rgba(148, 163, 184, 0.12)"
                  }}
                />
              </div>
            </div>

            <div
              style={{
                width: "100%",
                height: "42px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, rgba(29, 78, 216, 0.5), rgba(37, 99, 235, 0.5))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "13px",
                fontWeight: "700",
                color: "#93c5fd"
              }}
            >
              안심 프로필 불러오는 중…
            </div>
          </div>
        </div>
        <style>{`
          @keyframes vlue-shell-pulse {
            0%, 100% { transform: translateX(-100%); }
            50% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }

  if (canShowFull && showFull) {
    return (
      <div className="showcase-web showcase-web--full-fs" data-vlue-public-showcase="1">
        <div className="showcase-web__fs-topbar">
          <button type="button" className="showcase-web__fs-open-app" onClick={handleAppDownload}>
            VLUÉ 앱에서 열기
          </button>
        </div>
        <div className="showcase-web__fs-stage">
          <PublicShowcaseStage
            key={stageKey}
            card={payload.card}
            onToast={showToast}
            onClose={handleCloseFull}
          />
        </div>

        {bgmPromptOpen ? (
          <div className="showcase-web__bgm-modal" role="dialog" aria-modal="true" aria-labelledby="showcase-bgm-title">
            <div className="showcase-web__bgm-card">
              <p id="showcase-bgm-title" className="showcase-web__bgm-title">
                이 쇼케이스의 BGM이 재생 중입니다.
                <br />
                계속 재생합니다.
              </p>
              <div className="showcase-web__bgm-actions">
                <button type="button" className="showcase-web__bgm-btn showcase-web__bgm-btn--ghost" onClick={declineBgm}>
                  취소
                </button>
                <button type="button" className="showcase-web__bgm-btn showcase-web__bgm-btn--primary" onClick={acceptBgm}>
                  확인
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {toastMsg ? (
          <div className="showcase-web__toast" role="status">
            {toastMsg}
          </div>
        ) : null}
      </div>
    );
  }

  const { card, phone: phoneDisplay, verified, isPaid, attachments, outlinks } = payload;
  const titlePhoto = String(card.titlePhotoUrl || "").trim();
  const profilePhoto = String(card.photoUrl || "").trim();
  const photo = (card.noTitlePhoto ? "" : titlePhoto) || profilePhoto;
  const moodText = String(card.companyIntro || "").trim();
  const displayName = String(card.name || "").trim();
  const vlueId = String(card.publicHandle || card.loginId || "").trim();
  const vlueIdLabel = vlueId ? (vlueId.startsWith("@") ? vlueId : `@${vlueId}`) : "";
  const orgLine = isPaid
    ? [card.organization, card.title].filter(Boolean).join(" · ")
    : "";

  return (
    <div className="showcase-web">
      <header className="showcase-web__trust" role="status">
        <span className="showcase-web__trust-icon" aria-hidden>
          <Check strokeWidth={3} size={11} />
        </span>
        <span className="showcase-web__trust-text">
          {verified ? "VLUÉ 인증 완료 번호" : "VLUÉ 번호 확인"}
        </span>
      </header>

      <div className="showcase-web__inner">
        <section className="showcase-web__hero" aria-label="디지털 프로필">
          <p className="showcase-web__eyebrow">안심 통신 프로필</p>
          <h1 className="showcase-web__phone">{phoneDisplay}</h1>

          {displayName ? <p className="showcase-web__name">{displayName}</p> : null}

          {!isPaid && vlueIdLabel ? <p className="showcase-web__meta showcase-web__meta--id">{vlueIdLabel}</p> : null}

          {isPaid && orgLine ? <p className="showcase-web__meta">{orgLine}</p> : null}

          {!isPaid && !displayName && !vlueIdLabel ? <p className="showcase-web__meta">VLUÉ 일상 프로필</p> : null}

          {moodText ? <p className="showcase-web__intro">{moodText}</p> : null}

          {verified ? <span className="showcase-web__badge-row">VLUÉ Showcase</span> : null}

          {photo ? <img className="showcase-web__photo" src={photo} alt="" /> : null}

          {canShowFull ? (
            <button type="button" className="showcase-web__open-full" onClick={reopenFullShowcase}>
              풀 쇼케이스 보기 (음악 포함)
            </button>
          ) : null}
        </section>

        {attachments?.length > 0 ? (
          <section className="showcase-web__section" aria-label="첨부파일">
            <h2 className="showcase-web__section-title">첨부파일</h2>
            <div className="showcase-web__card-stack">
              {attachments.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  className="showcase-web__file-btn"
                  onClick={() => downloadAttachment(file)}
                >
                  <span className="showcase-web__file-icon" aria-hidden>
                    <Paperclip size={18} strokeWidth={2} />
                  </span>
                  <span className="showcase-web__file-copy">
                    <span className="showcase-web__file-label">{file.label}</span>
                    <span className="showcase-web__file-meta">{file.fileName}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {outlinks?.length > 0 ? (
          <section className="showcase-web__section" aria-label="외부 링크">
            <h2 className="showcase-web__section-title">링크</h2>
            <div className="showcase-web__card-stack">
              {outlinks.map((link) => (
                <a
                  key={link.id}
                  className="showcase-web__outlink"
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="showcase-web__outlink-label">
                    {link.platform === "instagram"
                      ? "Instagram"
                      : link.platform === "youtube"
                        ? "YouTube"
                        : link.label}
                  </span>
                  <span className="showcase-web__outlink-arrow" aria-hidden>
                    <ExternalLink size={15} strokeWidth={2} />
                  </span>
                </a>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <div className="showcase-web__cta-wrap">
        <button type="button" className="showcase-web__cta" onClick={handleAppDownload}>
          1초 만에 내 번호도 안심 보호하기 (무료)
        </button>
      </div>

      {toastMsg ? (
        <div className="showcase-web__toast" role="status">
          {toastMsg}
        </div>
      ) : null}
    </div>
  );
}
