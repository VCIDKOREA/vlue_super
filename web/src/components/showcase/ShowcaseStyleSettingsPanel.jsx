import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, ChevronRight, ChevronUp, HelpCircle, Music2, Plus, Trash2 } from "lucide-react";
import BackButton from "../common/BackButton";
import { isPaidLetteringTier } from "../../lib/letteringMembership.js";
import { requiresPremium } from "../../lib/showcase/showcaseStylePermissions.js";
import {
  SHOWCASE_STYLE_CHANGED_EVENT,
  readShowcaseStyle,
  writeShowcaseStyle,
  parseShowcaseTagsInput
} from "../../lib/showcase/showcaseStyleStorage.js";
import { writeShowcasePrivacyMode } from "../../lib/showcase/showcasePrivacyMode.js";
import { PRIVACY_MODES, maxShowcaseContentPagesForTier } from "../../lib/showcase/tentShowcaseTypes.js";
import {
  clampShowcasePages,
  contentPageDisplayNumber,
  createShowcasePage,
  isPageConfigured,
  normalizeShowcasePage,
  pageStatusSummary,
  pageTypeLabel,
  SHOWCASE_PAGE_TYPES
} from "../../lib/showcase/showcasePages.js";
import {
  applyInstagramVerifiedLocal,
  clearInstagramVerifiedLocal,
  disconnectInstagramLink,
  fetchInstagramLinkStatus,
  fetchInstagramMedia,
  startInstagramLink
} from "../../lib/instagramLinkApi.js";
import { readDigitalCardActive } from "../../lib/bizcardAccountSync.js";
import { LETTERING_OPEN_BIZCARD_SETTINGS_EVENT } from "../../lib/letteringBizcardStorage.js";
import { resolveVlueShowcaseCard } from "../../lib/vlueShowcaseCard.js";
import { applyShowcaseStyleToCard } from "../../lib/showcase/applyShowcaseStyleToCard.js";
import { syncShowcaseTagsToServer, fetchShowcaseSearchPrivacy, saveShowcaseSearchPrivacy } from "../../lib/showcase/showcaseTagsApi.js";
import { checkShowcaseLinkUri, WEB_RISK_BLOCK_MESSAGE } from "../../lib/showcase/webRiskLinkCheck.js";
import { VLUE_SHOWCASE } from "../../lib/vlueBrandSpaces.js";
import ShowcasePremiumGateModal from "./ShowcasePremiumGateModal.jsx";
import ShowcaseBgmPicker from "./ShowcaseBgmPicker.jsx";
import ShowcasePhotoEditor from "./ShowcasePhotoEditor.jsx";
import ShowcasePullDownPreview from "./ShowcasePullDownPreview.jsx";
import { pushAndroidBackHandler } from "../../lib/androidBackStack.js";
import "./showcase-style-settings.css";
import "../../styles/showcase-call-glass.css";

function gatePremium(feature, tier, setGate) {
  if (requiresPremium(feature, tier)) {
    setGate(true);
    return true;
  }
  return false;
}

/** 라벨 옆 (?) — 탭하면 상세 설명 (fixed로 올려 하단 잘림 방지) */
function HelpTip({ text }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const tip = String(text || "").trim();

  useEffect(() => {
    if (!open) {
      setPos(null);
      return undefined;
    }
    const place = () => {
      const el = btnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const popW = Math.min(280, window.innerWidth - 24);
      let left = Math.max(12, Math.min(r.left, window.innerWidth - popW - 12));
      const spaceBelow = window.innerHeight - r.bottom;
      const openAbove = spaceBelow < 140;
      setPos({
        left,
        width: popW,
        top: openAbove ? undefined : r.bottom + 8,
        bottom: openAbove ? window.innerHeight - r.top + 8 : undefined
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (btnRef.current?.contains(e.target)) return;
      if (e.target?.closest?.(".showcase-help-tip__pop")) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [open]);

  if (!tip) return null;

  return (
    <span className="showcase-help-tip">
      <span
        ref={btnRef}
        role="button"
        tabIndex={0}
        className="showcase-help-tip__btn"
        aria-label="상세 설명"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            setOpen((v) => !v);
          }
        }}
      >
        <HelpCircle size={14} strokeWidth={2.2} aria-hidden />
      </span>
      {open && pos
        ? createPortal(
            <span
              className="showcase-help-tip__pop showcase-help-tip__pop--fixed"
              role="tooltip"
              style={{
                left: pos.left,
                width: pos.width,
                top: pos.top,
                bottom: pos.bottom
              }}
            >
              {tip}
            </span>,
            document.body
          )
        : null}
    </span>
  );
}

function ProfileRow({ label, help, children, onClick, trailing }) {
  const labelNode = (
    <span className="showcase-profile-row__label">
      <span className="showcase-profile-row__label-text">
        {label}
        <HelpTip text={help} />
      </span>
    </span>
  );
  if (onClick) {
    return (
      <button type="button" className="showcase-profile-row showcase-profile-row--btn" onClick={onClick}>
        {labelNode}
        <span className="showcase-profile-row__trail">
          {trailing}
          <ChevronRight size={16} aria-hidden />
        </span>
      </button>
    );
  }
  return (
    <div className="showcase-profile-row">
      {labelNode}
      <div className="showcase-profile-row__control">{children}</div>
    </div>
  );
}

export default function ShowcaseStyleSettingsPanel({
  membershipTier = "free",
  isDarkMode = false,
  onBack,
  onOpenUpgrade,
  onToast,
  hideHeader = false,
  fullscreen = false
}) {
  const isPaid = isPaidLetteringTier(membershipTier);
  const includeDigitalCard = isPaid && readDigitalCardActive();
  const maxContentPages = maxShowcaseContentPagesForTier(membershipTier, { includeDigitalCard });
  const [config, setConfig] = useState(() => readShowcaseStyle());
  const [gateOpen, setGateOpen] = useState(false);
  const [tagInput, setTagInput] = useState(() => (config.tags || []).join(" "));
  const [searchPrivacy, setSearchPrivacy] = useState({
    isPhoneSearchAllowed: false,
    isNameSearchAllowed: false,
    isOrgSearchAllowed: false,
    isIdSearchAllowed: false
  });
  const [openMusic, setOpenMusic] = useState(false);
  const [openBiz, setOpenBiz] = useState(false);
  const [expandedPageId, setExpandedPageId] = useState("");
  const [igLink, setIgLink] = useState({ linked: false });
  const [igLinkLoading, setIgLinkLoading] = useState(false);
  /** @type {[{ pageId: string, mode: 'single'|'multi' }|null]} */
  const [igPicker, setIgPicker] = useState(null);
  const pages = useMemo(
    () => (Array.isArray(config.pages) ? config.pages.map(normalizeShowcasePage) : []),
    [config.pages]
  );
  const canAddPage = pages.length < maxContentPages;

  const refreshIgLink = useCallback(async () => {
    try {
      const status = await fetchInstagramLinkStatus();
      setIgLink(status);
    } catch {
      setIgLink({ linked: false });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await fetchInstagramLinkStatus();
        if (!cancelled) setIgLink(status);
      } catch {
        if (!cancelled) setIgLink({ linked: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const card = useMemo(() => {
    const base = resolveVlueShowcaseCard({ membershipTier, previewExample: true });
    return applyShowcaseStyleToCard({ ...base, showcaseStyle: config }, membershipTier);
  }, [membershipTier, config]);

  const persist = useCallback((patch) => {
    setConfig((prev) => {
      let next = { ...prev, ...patch };
      if (patch.bgm) {
        next.bgm = {
          ...prev.bgm,
          ...patch.bgm,
          youtube: { ...(prev.bgm?.youtube || {}), ...(patch.bgm?.youtube || {}) },
          soundcloud: { ...(prev.bgm?.soundcloud || {}), ...(patch.bgm?.soundcloud || {}) }
        };
      }
      if (patch.richCustom) next.richCustom = { ...prev.richCustom, ...patch.richCustom };
      if (patch.commercial) {
        next.commercial = {
          ...prev.commercial,
          ...patch.commercial,
          outlinks: { ...(prev.commercial?.outlinks || {}), ...(patch.commercial?.outlinks || {}) },
          products: patch.commercial.products ?? prev.commercial?.products,
          links: patch.commercial.links ?? prev.commercial?.links
        };
      }
      if (patch.platformFeed) next.platformFeed = { ...prev.platformFeed, ...patch.platformFeed };
      if (patch.caseTheme) next.caseTheme = { ...prev.caseTheme, ...patch.caseTheme };
      if (patch.gallery) next.gallery = { ...prev.gallery, ...patch.gallery };
      if (patch.tags) next.tags = patch.tags;
      if (Array.isArray(patch.pages)) next.pages = patch.pages.map(normalizeShowcasePage);
      next = clampShowcasePages(next, membershipTier, { includeDigitalCard });
      writeShowcaseStyle(next);
      return next;
    });
  }, [membershipTier, includeDigitalCard]);

  const persistPages = useCallback(
    (nextPages) => {
      persist({ pages: nextPages });
    },
    [persist]
  );

  const updatePage = useCallback(
    (pageId, patch) => {
      const next = pages.map((p) => {
        if (p.id !== pageId) return p;
        const merged = normalizeShowcasePage({ ...p, ...patch });
        if (patch.gallery) merged.gallery = { photos: patch.gallery.photos || [] };
        if (patch.richCustom) merged.richCustom = { ...p.richCustom, ...patch.richCustom };
        if (patch.caseTheme) merged.caseTheme = { ...p.caseTheme, ...patch.caseTheme };
        if (patch.type) merged.type = patch.type;
        if (Object.prototype.hasOwnProperty.call(patch, "instagramMedia")) {
          merged.instagramMedia = patch.instagramMedia;
        }
        return merged;
      });
      persistPages(next);
    },
    [pages, persistPages]
  );

  const openBizcardSettings = useCallback(() => {
    window.dispatchEvent(new Event(LETTERING_OPEN_BIZCARD_SETTINGS_EVENT));
  }, []);

  useEffect(() => {
    if (!igLink.linked || !igLink.username || igLink.expired) return;
    const handle = `@${igLink.username}`;
    if (
      config.platformFeed?.instagramVerified === true &&
      config.platformFeed?.instagramHandle === handle &&
      config.commercial?.outlinks?.instagram
    ) {
      return;
    }
    applyInstagramVerifiedLocal(igLink.username);
    setConfig(readShowcaseStyle());
  }, [
    igLink.linked,
    igLink.username,
    igLink.expired,
    config.platformFeed?.instagramVerified,
    config.platformFeed?.instagramHandle,
    config.commercial?.outlinks?.instagram
  ]);

  useEffect(() => {
    const onExternal = () => {
      const latest = readShowcaseStyle();
      setConfig(latest);
      setTagInput((latest.tags || []).join(" "));
    };
    window.addEventListener(SHOWCASE_STYLE_CHANGED_EVENT, onExternal);
    return () => window.removeEventListener(SHOWCASE_STYLE_CHANGED_EVENT, onExternal);
  }, []);

  /* 한도 초과 페이지 잘라냄 */
  useEffect(() => {
    if (pages.length <= maxContentPages) return;
    persistPages(pages.slice(0, maxContentPages));
  }, [maxContentPages, pages, persistPages]);

  const ensureIgLinked = async () => {
    if (igLink.linked && !igLink.expired) return true;
    setIgLinkLoading(true);
    try {
      const url = await startInstagramLink();
      window.location.assign(url);
      return false;
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "Instagram 연동을 시작할 수 없습니다.");
      setIgLinkLoading(false);
      return false;
    }
  };

  const addPage = async (type) => {
    if (!canAddPage) {
      onToast?.(`콘텐츠 페이지는 최대 ${maxContentPages}장입니다.`);
      return;
    }
    if (type === SHOWCASE_PAGE_TYPES.INSTAGRAM) {
      const ok = await ensureIgLinked();
      if (!ok) return;
      const page = createShowcasePage(SHOWCASE_PAGE_TYPES.INSTAGRAM);
      persistPages([...pages, page]);
      setExpandedPageId(page.id);
      setIgPicker({ pageId: page.id, mode: "single" });
      return;
    }
    const page = createShowcasePage(SHOWCASE_PAGE_TYPES.RICH_CUSTOM);
    persistPages([...pages, page]);
    setExpandedPageId(page.id);
  };

  const removePage = (pageId) => {
    persistPages(pages.filter((p) => p.id !== pageId));
    if (expandedPageId === pageId) setExpandedPageId("");
  };

  const onTagsChange = (raw) => {
    if (gatePremium("hashtag", membershipTier, setGateOpen)) return;
    setTagInput(raw);
    persist({ tags: parseShowcaseTagsInput(raw) });
  };

  useEffect(() => {
    if (!isPaid) return undefined;
    let cancelled = false;
    fetchShowcaseSearchPrivacy().then((res) => {
      if (cancelled || !res.ok || !res.privacy) return;
      setSearchPrivacy({
        isPhoneSearchAllowed: Boolean(res.privacy.isPhoneSearchAllowed),
        isNameSearchAllowed: Boolean(res.privacy.isNameSearchAllowed),
        isOrgSearchAllowed: Boolean(res.privacy.isOrgSearchAllowed),
        isIdSearchAllowed: Boolean(res.privacy.isIdSearchAllowed)
      });
    });
    return () => {
      cancelled = true;
    };
  }, [isPaid]);

  const onSearchPrivacyToggle = (key, checked) => {
    if (gatePremium("hashtag", membershipTier, setGateOpen)) return;
    const next = { ...searchPrivacy, [key]: checked };
    setSearchPrivacy(next);
    void saveShowcaseSearchPrivacy(next);
  };

  const isSearchPrivate =
    !searchPrivacy.isPhoneSearchAllowed &&
    !searchPrivacy.isNameSearchAllowed &&
    !searchPrivacy.isOrgSearchAllowed &&
    !searchPrivacy.isIdSearchAllowed;

  const onSearchPrivateToggle = (checked) => {
    if (gatePremium("hashtag", membershipTier, setGateOpen)) return;
    const next = checked
      ? {
          isPhoneSearchAllowed: false,
          isNameSearchAllowed: false,
          isOrgSearchAllowed: false,
          isIdSearchAllowed: false
        }
      : {
          isPhoneSearchAllowed: true,
          isNameSearchAllowed: true,
          isOrgSearchAllowed: true,
          isIdSearchAllowed: true
        };
    setSearchPrivacy(next);
    void saveShowcaseSearchPrivacy(next);
  };

  useEffect(() => {
    if (!isPaid) return undefined;
    const tags = parseShowcaseTagsInput(tagInput);
    const timer = setTimeout(() => {
      void syncShowcaseTagsToServer(tags);
    }, 600);
    return () => clearTimeout(timer);
  }, [tagInput, isPaid]);

  const commitApply = useCallback(() => {
    const latest = readShowcaseStyle();
    writeShowcaseStyle(latest);
    if (isPaid) {
      void syncShowcaseTagsToServer(parseShowcaseTagsInput(tagInput));
    }
    onToast?.("적용되었습니다.");
  }, [isPaid, onToast, tagInput]);

  const headText = isDarkMode ? "text-gray-100" : "text-slate-900";
  const subText = isDarkMode ? "text-gray-400" : "text-slate-500";
  const inputCls = isDarkMode ? "border-white/10 bg-white/5 text-gray-100" : "border-slate-200 bg-white text-slate-900";
  const configuredCount = pages.filter(isPageConfigured).length;
  const digitalCardReady = includeDigitalCard;

  return (
    <div
      className={`showcase-style-settings showcase-style-settings--profile flex min-h-0 flex-1 flex-col ${fullscreen ? "showcase-style-settings--fullscreen" : ""} ${isDarkMode ? "showcase-style-settings--dark" : ""}`}
    >
      {!hideHeader ? (
        <div className={`flex shrink-0 items-center gap-2 border-b px-3 py-2.5 ${isDarkMode ? "border-white/10" : "border-slate-100"}`}>
          <BackButton variant="inline" onBack={onBack} isDarkMode={isDarkMode} />
          <div className="min-w-0 flex-1">
            <p className={`text-[17px] font-black ${headText}`}>{VLUE_SHOWCASE.nameKo}</p>
            <p className={`text-[11px] ${subText}`}>페이지마다 따로 · 공통은 음악·검색</p>
          </div>
          <button type="button" className="showcase-style-settings__done-btn" onClick={commitApply}>
            완료
          </button>
        </div>
      ) : null}

      {fullscreen ? (
        <ShowcasePullDownPreview
          card={card}
          includeDigitalCard={includeDigitalCard}
          onToast={onToast}
        />
      ) : null}

      <div className={`showcase-style-settings__split${fullscreen ? " showcase-style-settings__split--fullscreen" : " min-h-0 flex-1 overflow-hidden"}`}>
        <div className={`showcase-style-settings__form overflow-y-auto px-4 py-3 ${fullscreen ? "min-h-0 flex-1" : "vlue-scroll-pad-profile-panel"}`}>
          <section className="showcase-profile-block">
            <p className="showcase-profile-block__title">
              쇼케이스 페이지
              <HelpTip
                text={[
                  "디지털인증명함을 쓰면 1페이지는 항상 명함입니다.",
                  "2페이지부터 인스타그램·개인커스텀을 각각 설정할 수 있습니다.",
                  `콘텐츠 페이지 최대 ${maxContentPages}장 · 인스타 페이지당 사진 최대 20장 · 개인커스텀은 사진 1장.`,
                  "오른쪽 사이드 탭(〈)을 누르면 통화 빅푸시 미리보기가 전체 화면으로 열립니다."
                ].join(" ")}
              />
            </p>

            {includeDigitalCard ? (
              <div className="showcase-page-card showcase-page-card--digital">
                <div className="showcase-page-card__head">
                  <div className="min-w-0 flex-1">
                    <p className="showcase-page-card__title">1페이지 · 디지털인증명함</p>
                    <p className={`showcase-page-card__status ${digitalCardReady ? "is-ready" : ""}`}>
                      {digitalCardReady ? "설정완료 ✔" : "미설정"}
                    </p>
                  </div>
                  <button type="button" className="showcase-page-card__cta" onClick={openBizcardSettings}>
                    설정하러가기
                    <ChevronRight size={16} aria-hidden />
                  </button>
                </div>
                <p className="showcase-page-card__hint">명함 디자인·상호·연락처는 디지털인증명함 설정에서 편집합니다.</p>
              </div>
            ) : null}

            {pages.map((page, idx) => {
              const pageNum = contentPageDisplayNumber(idx, includeDigitalCard);
              const expanded = expandedPageId === page.id;
              const label = pageTypeLabel(page.type);
              return (
                <div key={page.id} className={`showcase-page-card${expanded ? " is-open" : ""}`}>
                  <button
                    type="button"
                    className="showcase-page-card__head showcase-page-card__head--btn"
                    onClick={() => setExpandedPageId(expanded ? "" : page.id)}
                  >
                    <div className="min-w-0 flex-1 text-left">
                      <p className="showcase-page-card__title">
                        {pageNum}페이지 · {label}
                      </p>
                      <p className={`showcase-page-card__status ${isPageConfigured(page) ? "is-ready" : ""}`}>
                        {isPageConfigured(page)
                          ? `${pageStatusSummary(page)} · 설정완료 ✔`
                          : pageStatusSummary(page)}
                      </p>
                    </div>
                    <span className="showcase-page-card__trail">
                      {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </button>

                  {expanded ? (
                    <div className="showcase-page-card__body">
                      <div className="showcase-page-type-row" role="group" aria-label="페이지 유형">
                        {[
                          { id: SHOWCASE_PAGE_TYPES.INSTAGRAM, label: "인스타그램" },
                          { id: SHOWCASE_PAGE_TYPES.RICH_CUSTOM, label: "개인커스텀" }
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            className={`showcase-page-type-chip${page.type === opt.id ? " is-active" : ""}`}
                            onClick={async () => {
                              if (opt.id === SHOWCASE_PAGE_TYPES.INSTAGRAM) {
                                const ok = await ensureIgLinked();
                                if (!ok) return;
                              }
                              const patch = {
                                type: opt.id,
                                instagramMedia: opt.id === SHOWCASE_PAGE_TYPES.INSTAGRAM ? page.instagramMedia : null
                              };
                              if (opt.id === SHOWCASE_PAGE_TYPES.RICH_CUSTOM) {
                                patch.gallery = {
                                  photos: (page.gallery?.photos || []).slice(0, 1)
                                };
                              }
                              updatePage(page.id, patch);
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {page.type === SHOWCASE_PAGE_TYPES.INSTAGRAM ? (
                        <div className="showcase-page-card__section">
                          <ProfileRow
                            label="인스타그램"
                            help={
                              igLink.linked && !igLink.expired
                                ? `인증완료✔ @${igLink.username || ""} · 이 페이지에 게시물 1개`
                                : "Instagram 인증 후 게시물을 고를 수 있습니다."
                            }
                            onClick={async () => {
                              if (igLinkLoading) return;
                              const ok = await ensureIgLinked();
                              if (!ok) return;
                              setIgPicker({ pageId: page.id, mode: "single" });
                            }}
                            trailing={
                              <span className="showcase-profile-row__value">
                                {igLinkLoading
                                  ? "연결 중…"
                                  : page.instagramMedia?.id
                                    ? "게시물 변경"
                                    : igLink.linked
                                      ? "게시물 선택"
                                      : "인증하기"}
                              </span>
                            }
                          />
                          {page.instagramMedia?.id ? (
                            <p className="showcase-page-card__hint">
                              선택됨 · {String(page.instagramMedia.caption || page.instagramMedia.id).slice(0, 48)}
                            </p>
                          ) : (
                            <p className="showcase-page-card__hint">인증 후 게시물 사진을 선택하세요.</p>
                          )}
                        </div>
                      ) : (
                        <div className="showcase-page-card__section">
                          <ShowcasePhotoEditor
                            photos={page.gallery?.photos || []}
                            onChange={(photos) =>
                              updatePage(page.id, { gallery: { photos: (photos || []).slice(0, 1) } })
                            }
                            membershipTier={membershipTier}
                            maxPhotos={1}
                            enableTextOverlay
                          />
                          <p className="showcase-page-card__hint">
                            개인커스텀은 사진 1장 · 사진 위 텍스트(크기·위치·애니메이션) · 비즈니스 링크 중심입니다.
                          </p>
                        </div>
                      )}

                      <button
                        type="button"
                        className="showcase-page-card__remove"
                        onClick={() => removePage(page.id)}
                      >
                        <Trash2 size={14} aria-hidden />
                        이 페이지 삭제
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}

            {canAddPage ? (
              <div className="showcase-page-add-row">
                <button type="button" className="showcase-page-add-btn" onClick={() => addPage(SHOWCASE_PAGE_TYPES.INSTAGRAM)}>
                  <Plus size={16} aria-hidden />
                  인스타그램 페이지
                </button>
                <button type="button" className="showcase-page-add-btn" onClick={() => addPage(SHOWCASE_PAGE_TYPES.RICH_CUSTOM)}>
                  <Plus size={16} aria-hidden />
                  개인커스텀 페이지
                </button>
              </div>
            ) : (
              <p className={`text-[11px] ${subText}`}>콘텐츠 페이지 한도({maxContentPages})에 도달했습니다.</p>
            )}

            {igLink.linked && !igLink.expired ? (
              <button
                type="button"
                className="showcase-bgm-picker__yt-btn mt-2"
                disabled={igLinkLoading}
                onClick={async () => {
                  if (!window.confirm("Instagram 인증을 해제할까요? 인스타 페이지의 게시물도 함께 지워집니다.")) return;
                  setIgLinkLoading(true);
                  try {
                    await disconnectInstagramLink();
                    clearInstagramVerifiedLocal();
                    persistPages(
                      pages.map((p) =>
                        p.type === SHOWCASE_PAGE_TYPES.INSTAGRAM ? { ...p, instagramMedia: null } : p
                      )
                    );
                    setConfig(readShowcaseStyle());
                    await refreshIgLink();
                    onToast?.("Instagram 인증이 해제되었습니다.");
                  } catch (e) {
                    onToast?.(e instanceof Error ? e.message : "연동 해제에 실패했습니다.");
                  } finally {
                    setIgLinkLoading(false);
                  }
                }}
              >
                Instagram 인증 해제
              </button>
            ) : null}
          </section>

          <section className="showcase-profile-group">
            <p className="showcase-profile-block__title" style={{ padding: "12px 14px 0" }}>
              공통 설정
              <HelpTip text="배경음악·검색 공개는 모든 페이지(명함 포함)에 공통으로 적용됩니다." />
            </p>

            {!isPaid ? (
              <div className="showcase-profile-row showcase-profile-row--stack">
                <span className="showcase-profile-row__label">공유 범위</span>
                <div className="showcase-style-settings__phase-toggle">
                  <button
                    type="button"
                    className={(config.privacyMode || PRIVACY_MODES.FRIEND_ONLY) === PRIVACY_MODES.FRIEND_ONLY ? "active" : ""}
                    onClick={() => {
                      writeShowcasePrivacyMode(PRIVACY_MODES.FRIEND_ONLY, membershipTier);
                      persist({ privacyMode: PRIVACY_MODES.FRIEND_ONLY });
                    }}
                  >
                    친구만
                  </button>
                  <button
                    type="button"
                    className={config.privacyMode === PRIVACY_MODES.PUBLIC ? "active" : ""}
                    onClick={() => {
                      writeShowcasePrivacyMode(PRIVACY_MODES.PUBLIC, membershipTier);
                      persist({ privacyMode: PRIVACY_MODES.PUBLIC });
                    }}
                  >
                    전체
                  </button>
                </div>
              </div>
            ) : null}

            {!includeDigitalCard ? (
              <label className="showcase-profile-row showcase-profile-row--toggle">
                <span className="showcase-profile-row__label">
                  <span className="showcase-profile-row__label-text">
                    이름 보이기
                    <HelpTip text="끄면 사진·번호만 표시되며, 상대 전화부 이름을 사용합니다." />
                  </span>
                </span>
                <input
                  type="checkbox"
                  className="showcase-profile-switch"
                  checked={config.showBroadcastName !== false}
                  onChange={(e) => persist({ showBroadcastName: e.target.checked })}
                />
              </label>
            ) : null}

            <ProfileRow label="#해시태그" help={isPaid ? "검색용 · 공백으로 구분" : "유료회원만 해시태그를 등록할 수 있습니다."}>
              <input
                className={`showcase-profile-input ${inputCls}`}
                placeholder={isPaid ? "예: #상호명 #지역" : "유료회원만 등록"}
                value={tagInput}
                readOnly={!isPaid}
                onFocus={() => {
                  if (gatePremium("hashtag", membershipTier, setGateOpen)) return;
                }}
                onChange={(e) => onTagsChange(e.target.value)}
              />
            </ProfileRow>

            {isPaid ? (
              <div className="showcase-profile-row showcase-profile-row--stack">
                <span className="showcase-profile-row__label">
                  <span className="showcase-profile-row__label-text">
                    검색 공개 설정
                    <HelpTip text="비공개가 기본입니다. 이름·상호·전화·아이디는 각각 허용한 항목만 검색·결과에 노출됩니다." />
                  </span>
                </span>
                <label className="showcase-privacy-check">
                  <input type="checkbox" checked={isSearchPrivate} onChange={(e) => onSearchPrivateToggle(e.target.checked)} />
                  비공개
                </label>
                <label className="showcase-privacy-check">
                  <input
                    type="checkbox"
                    checked={searchPrivacy.isPhoneSearchAllowed}
                    onChange={(e) => onSearchPrivacyToggle("isPhoneSearchAllowed", e.target.checked)}
                  />
                  전화번호 검색 허용
                </label>
                <label className="showcase-privacy-check">
                  <input
                    type="checkbox"
                    checked={searchPrivacy.isNameSearchAllowed}
                    onChange={(e) => onSearchPrivacyToggle("isNameSearchAllowed", e.target.checked)}
                  />
                  이름 검색 허용
                </label>
                <label className="showcase-privacy-check">
                  <input
                    type="checkbox"
                    checked={searchPrivacy.isOrgSearchAllowed}
                    onChange={(e) => onSearchPrivacyToggle("isOrgSearchAllowed", e.target.checked)}
                  />
                  상호 검색 허용
                </label>
                <label className="showcase-privacy-check">
                  <input
                    type="checkbox"
                    checked={searchPrivacy.isIdSearchAllowed}
                    onChange={(e) => onSearchPrivacyToggle("isIdSearchAllowed", e.target.checked)}
                  />
                  아이디·활동명 검색 허용
                </label>
              </div>
            ) : null}

            <button
              type="button"
              className="showcase-profile-row showcase-profile-row--btn"
              onClick={() => setOpenMusic((v) => !v)}
            >
              <span className="showcase-profile-row__label">
                <span className="showcase-profile-row__label-text">
                  <Music2 size={14} className="inline mr-1" aria-hidden />
                  배경음악
                  <HelpTip text="한 곡만 선택하면 디지털 인증명함·모든 쇼케이스 페이지에 함께 재생됩니다." />
                </span>
              </span>
              <span className="showcase-profile-row__trail">
                <span className="showcase-profile-row__value">
                  {config.bgm?.mode === "none" || !config.bgm?.mode ? "없음" : "설정됨"}
                </span>
                {openMusic ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </span>
            </button>
            {openMusic ? (
              <div className="showcase-profile-nested">
                <ShowcaseBgmPicker
                  value={config.bgm}
                  inputCls={inputCls}
                  onChange={(bgm) => persist({ bgm: { ...config.bgm, ...bgm } })}
                />
              </div>
            ) : null}

            {isPaid ? (
              <>
                <button
                  type="button"
                  className="showcase-profile-row showcase-profile-row--btn"
                  onClick={() => setOpenBiz((v) => !v)}
                >
                  <span className="showcase-profile-row__label">
                    <span className="showcase-profile-row__label-text">
                      비즈니스 · 링크
                      <HelpTip text="Instagram은 인증 시 자동 입력됩니다. 카카오는 오픈채팅·프로필을 따로 넣으세요. YouTube·TikTok·Facebook은 프로필 URL입니다." />
                    </span>
                  </span>
                  <span className="showcase-profile-row__trail">
                    {openBiz ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </button>
                {openBiz ? (
                  <div className="showcase-profile-nested">
                    <BusinessOutlinkRow
                      brand="instagram"
                      label="Instagram"
                      placeholder="프로필 URL 또는 연동"
                      value={
                        config.commercial.outlinks.instagram ||
                        (igLink.linked && igLink.username ? `https://instagram.com/${igLink.username}` : "")
                      }
                      inputCls={inputCls}
                      onChange={(v) =>
                        persist({
                          commercial: { outlinks: { ...config.commercial.outlinks, instagram: v } }
                        })
                      }
                      onBrandTap={async () => {
                        if (igLinkLoading) return;
                        if (igLink.linked && !igLink.expired) {
                          const url = `https://instagram.com/${igLink.username}`;
                          persist({
                            commercial: { outlinks: { ...config.commercial.outlinks, instagram: url } }
                          });
                          onToast?.(`@${igLink.username} 프로필 링크를 넣었습니다.`);
                          return;
                        }
                        setIgLinkLoading(true);
                        try {
                          const url = await startInstagramLink();
                          window.location.assign(url);
                        } catch (e) {
                          onToast?.(e instanceof Error ? e.message : "Instagram 연동을 시작할 수 없습니다.");
                          setIgLinkLoading(false);
                        }
                      }}
                    />
                    <BusinessOutlinkRow
                      brand="youtube"
                      label="YouTube"
                      placeholder="https://youtube.com/…"
                      value={config.commercial.outlinks.youtube || ""}
                      inputCls={inputCls}
                      onChange={(v) =>
                        persist({
                          commercial: { outlinks: { ...config.commercial.outlinks, youtube: v } }
                        })
                      }
                    />
                    <BusinessOutlinkRow
                      brand="tiktok"
                      label="TikTok"
                      placeholder="https://tiktok.com/@…"
                      value={config.commercial.outlinks.tiktok || ""}
                      inputCls={inputCls}
                      onChange={(v) =>
                        persist({
                          commercial: { outlinks: { ...config.commercial.outlinks, tiktok: v } }
                        })
                      }
                    />
                    <BusinessOutlinkRow
                      brand="facebook"
                      label="Facebook"
                      placeholder="https://facebook.com/…"
                      value={config.commercial.outlinks.facebook || ""}
                      inputCls={inputCls}
                      onChange={(v) =>
                        persist({
                          commercial: { outlinks: { ...config.commercial.outlinks, facebook: v } }
                        })
                      }
                    />
                    <BusinessOutlinkRow
                      brand="kakao"
                      label="카카오 오픈채팅"
                      placeholder="https://open.kakao.com/…"
                      value={
                        config.commercial.outlinks.kakaoOpenChat ||
                        (/open\.kakao\.com/i.test(config.commercial.outlinks.kakao || "")
                          ? config.commercial.outlinks.kakao
                          : "")
                      }
                      inputCls={inputCls}
                      onChange={(v) =>
                        persist({
                          commercial: {
                            outlinks: {
                              ...config.commercial.outlinks,
                              kakaoOpenChat: v,
                              kakao: v || config.commercial.outlinks.kakaoProfile || ""
                            }
                          }
                        })
                      }
                    />
                    <BusinessOutlinkRow
                      brand="kakao"
                      label="카카오 프로필"
                      placeholder="https://pf.kakao.com/… 또는 카톡 프로필 URL"
                      value={
                        config.commercial.outlinks.kakaoProfile ||
                        (!/open\.kakao\.com/i.test(config.commercial.outlinks.kakao || "")
                          ? config.commercial.outlinks.kakao || ""
                          : "")
                      }
                      inputCls={inputCls}
                      onChange={(v) =>
                        persist({
                          commercial: {
                            outlinks: {
                              ...config.commercial.outlinks,
                              kakaoProfile: v,
                              kakao: config.commercial.outlinks.kakaoOpenChat || v || ""
                            }
                          }
                        })
                      }
                    />
                    <p className="showcase-profile-block__sub mt-3">
                      <span className="showcase-profile-row__label-text">
                        링크
                        <HelpTip text="링크 이름 · URL로 홍보할 수 있습니다. (상품·모임·자유 링크) 유해·불법 링크는 등록할 수 없으며, 등록 시 자동으로 차단됩니다." />
                      </span>
                    </p>
                    <BizLinkEditor
                      links={
                        Array.isArray(config.commercial.links) && config.commercial.links.length
                          ? config.commercial.links
                          : config.commercial.products || []
                      }
                      inputCls={inputCls}
                      isDarkMode={isDarkMode}
                      onToast={onToast}
                      onChange={(links) => persist({ commercial: { links, products: links } })}
                    />
                    <label className="showcase-style-settings__check mt-3">
                      <input
                        type="checkbox"
                        checked={config.verifiedBadgeOn}
                        onChange={(e) => persist({ verifiedBadgeOn: e.target.checked })}
                      />
                      VLUE 인증 마크 표시
                    </label>
                  </div>
                ) : null}
              </>
            ) : null}
          </section>

          {igPicker ? (
            <InstagramMediaPickerModal
              max={igPicker.mode === "single" ? 1 : Math.max(1, maxContentPages - pages.length + 1)}
              selectedMedia={
                igPicker.mode === "single"
                  ? pages.find((p) => p.id === igPicker.pageId)?.instagramMedia
                    ? [pages.find((p) => p.id === igPicker.pageId).instagramMedia]
                    : []
                  : []
              }
              isDarkMode={isDarkMode}
              onClose={() => setIgPicker(null)}
              onConfirm={(mediaItems) => {
                const handle = igLink.username ? `@${igLink.username}` : config.platformFeed?.instagramHandle;
                const id = handle ? String(handle).replace(/^@/, "") : "";
                const profileUrl = id ? `https://instagram.com/${id}` : "";
                if (igLink.username) applyInstagramVerifiedLocal(igLink.username);

                if (igPicker.mode === "single" && igPicker.pageId) {
                  updatePage(igPicker.pageId, { instagramMedia: mediaItems[0] || null });
                } else {
                  const room = Math.max(0, maxContentPages - pages.length);
                  const extras = mediaItems.slice(0, room).map((m) =>
                    createShowcasePage(SHOWCASE_PAGE_TYPES.INSTAGRAM, {
                      id: `ig-${m.id}`,
                      instagramMedia: m
                    })
                  );
                  persistPages([...pages, ...extras]);
                }

                if (profileUrl) {
                  persist({
                    platformFeed: {
                      instagramVerified: true,
                      ...(handle ? { instagramHandle: handle, instagramProfileUrl: profileUrl } : {})
                    },
                    commercial: {
                      outlinks: {
                        ...config.commercial.outlinks,
                        instagram: profileUrl
                      }
                    }
                  });
                }
                setIgPicker(null);
                onToast?.(mediaItems.length ? `게시물 ${mediaItems.length}개를 반영했습니다.` : "선택이 비었습니다.");
              }}
            />
          ) : null}

          <p className={`text-center text-[11px] ${subText}`}>
            {includeDigitalCard ? "명함 1 · " : ""}
            콘텐츠 {pages.length}페이지 · 설정됨 {configuredCount}
          </p>

          <button
            type="button"
            className={`showcase-style-settings__save-btn${fullscreen ? " showcase-style-settings__save-btn--compact" : ""}`}
            onClick={commitApply}
          >
            적용하기
          </button>
        </div>
      </div>

      <ShowcasePremiumGateModal
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        isDarkMode={isDarkMode}
        onOpenUpgrade={() => {
          setGateOpen(false);
          onOpenUpgrade?.();
        }}
      />
    </div>
  );
}
function BrandMark({ brand }) {
  if (brand === "instagram") {
    return (
      <span className="showcase-brand-mark showcase-brand-mark--ig" aria-hidden>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
        </svg>
      </span>
    );
  }
  if (brand === "youtube") {
    return (
      <span className="showcase-brand-mark showcase-brand-mark--yt" aria-hidden>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M23.5 7.2a3 3 0 0 0-2.1-2.1C19.5 4.6 12 4.6 12 4.6s-7.5 0-9.4.5A3 3 0 0 0 .5 7.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-4.8zM9.8 15.5v-7l6.3 3.5-6.3 3.5z" />
        </svg>
      </span>
    );
  }
  if (brand === "tiktok") {
    return (
      <span className="showcase-brand-mark showcase-brand-mark--tt" aria-hidden>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M16.5 3c.6 2.3 2.1 3.9 4.5 4.3v3.1c-1.6.1-3.1-.4-4.5-1.3v6.4c0 3.4-2.7 6.1-6.1 6.1S4.3 18.9 4.3 15.5 7 9.4 10.4 9.4c.4 0 .7 0 1.1.1v3.2c-.3-.1-.7-.2-1.1-.2-1.6 0-2.9 1.3-2.9 2.9s1.3 2.9 2.9 2.9 2.9-1.3 2.9-2.9V3h3.2z" />
        </svg>
      </span>
    );
  }
  if (brand === "kakao") {
    return (
      <span className="showcase-brand-mark showcase-brand-mark--kakao" aria-hidden>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M12 4C7.03 4 3 7.13 3 10.98c0 2.45 1.62 4.6 4.06 5.84-.13.48-.47 1.73-.54 2-.09.32.12.32.25.23.11-.07 1.72-1.17 2.41-1.64.6.09 1.21.13 1.82.13 4.97 0 9-3.13 9-6.98C21 7.13 16.97 4 12 4z" />
        </svg>
      </span>
    );
  }
  return (
    <span className="showcase-brand-mark showcase-brand-mark--fb" aria-hidden>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.6l.4-3H13v-2c0-.6.4-1 1-1z" />
      </svg>
    </span>
  );
}

function BusinessOutlinkRow({ brand, label, placeholder, value, inputCls, onChange, onBrandTap }) {
  return (
    <div className="showcase-business-outlink">
      <button
        type="button"
        className="showcase-business-outlink__brand"
        aria-label={`${label} ${onBrandTap ? "연동" : "링크"}`}
        onClick={() => (onBrandTap ? onBrandTap() : undefined)}
      >
        <BrandMark brand={brand} />
        <span>{label}</span>
      </button>
      <input
        className={`showcase-style-settings__input showcase-business-outlink__input ${inputCls}`}
        placeholder={placeholder}
        value={value}
        readOnly={brand === "instagram" && !!onBrandTap}
        onChange={(e) => onChange?.(e.target.value.trim())}
        onFocus={(e) => {
          if (brand === "instagram" && onBrandTap) {
            e.target.blur();
            onBrandTap();
          }
        }}
      />
    </div>
  );
}

function InstagramMediaPickerModal({ max = 1, selectedMedia = [], isDarkMode, onClose, onConfirm }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [media, setMedia] = useState([]);
  const [picked, setPicked] = useState(() => {
    const map = new Map();
    for (const row of selectedMedia || []) {
      if (row?.id) map.set(String(row.id), row);
    }
    return map;
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const result = await fetchInstagramMedia(40);
        if (!cancelled) setMedia(result.media || []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "게시물을 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return pushAndroidBackHandler(() => {
      onClose?.();
      return true;
    });
  }, [onClose]);

  const toggle = (item) => {
    const id = String(item?.id || "").trim();
    const imageUrl = String(item?.mediaUrl || item?.thumbnailUrl || "").trim();
    if (!id) return;
    /* 캐러셀은 children URL, 단일은 mediaUrl — 파일 저장 없이 메타+URL만 보관 */
    const children = (Array.isArray(item.children) ? item.children : [])
      .map((c) => ({
        id: String(c.id || "").trim(),
        mediaUrl: String(c.mediaUrl || c.thumbnailUrl || "").trim(),
        thumbnailUrl: String(c.thumbnailUrl || c.mediaUrl || "").trim(),
        mediaType: String(c.mediaType || "IMAGE")
      }))
      .filter((c) => c.id && c.mediaUrl)
      .slice(0, 20);
    if (!imageUrl && !children.length) return;
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      if (next.size >= max) {
        window.alert(`세로 쇼케이스 페이지는 최대 ${max}장까지 선택할 수 있습니다.`);
        return prev;
      }
      next.set(id, {
        id,
        mediaUrl: imageUrl || children[0]?.mediaUrl || "",
        thumbnailUrl: String(item.thumbnailUrl || imageUrl || children[0]?.thumbnailUrl || "").trim(),
        permalink: String(item.permalink || "").trim(),
        caption: typeof item.caption === "string" ? item.caption : null,
        mediaType: String(item.mediaType || "IMAGE"),
        timestamp: typeof item.timestamp === "string" ? item.timestamp : null,
        children
      });
      return next;
    });
  };

  const panelCls = isDarkMode
    ? "bg-slate-900 text-slate-100 border-slate-700"
    : "bg-white text-slate-900 border-slate-200";

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className={`flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border sm:rounded-2xl ${panelCls}`}>
        <div className="flex items-center justify-between border-b border-inherit px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Instagram 게시물 선택</p>
            <p className="text-[11px] opacity-70">
              {picked.size}/{max}페이지 · 게시물당 사진 최대 20장 · VLUE 카드 표시
            </p>
          </div>
          <button type="button" className="showcase-bgm-picker__yt-btn" onClick={onClose}>
            닫기
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {loading ? (
            <p className="py-8 text-center text-sm opacity-70">불러오는 중…</p>
          ) : error ? (
            <p className="py-8 text-center text-sm text-rose-500">{error}</p>
          ) : media.length === 0 ? (
            <p className="py-8 text-center text-sm opacity-70">표시할 게시물이 없습니다.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {media.map((item) => {
                const thumb = item.thumbnailUrl || item.mediaUrl || "";
                const active = picked.has(String(item.id));
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`relative aspect-square overflow-hidden rounded-lg border-2 ${
                      active ? "border-sky-500" : "border-transparent"
                    }`}
                    onClick={() => toggle(item)}
                  >
                    {thumb ? (
                      <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-slate-200 text-[10px] text-slate-600">
                        {item.mediaType || "MEDIA"}
                      </span>
                    )}
                    {active ? (
                      <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-white">
                        <Check size={12} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="border-t border-inherit p-3">
          <button
            type="button"
            className="showcase-bgm-picker__yt-btn w-full"
            disabled={loading || !!error}
            onClick={() => onConfirm?.(Array.from(picked.values()).slice(0, max))}
          >
            선택 적용 ({picked.size})
          </button>
        </div>
      </div>
    </div>
  );
}

function stripUrlSchemeForInput(raw) {
  return String(raw || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^\/\//, "");
}

function BizLinkEditor({ links = [], inputCls, onChange, onToast, isDarkMode = false }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const add = async () => {
    const linkName = name.trim();
    const hostPath = stripUrlSchemeForInput(url);
    if (!linkName || !hostPath || busy) return;
    const linkUrl = `https://${hostPath}`;
    setError("");
    setBusy(true);
    try {
      const check = await checkShowcaseLinkUri(linkUrl);
      if (!check.ok || !check.safe) {
        const msg = check.error || WEB_RISK_BLOCK_MESSAGE;
        setError(msg);
        onToast?.(msg);
        return;
      }
      onChange([
        ...links,
        {
          id: `link-${Date.now()}`,
          name: linkName,
          url: String(check.uri || linkUrl).trim()
        }
      ]);
      setName("");
      setUrl("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "링크 검사에 실패했습니다.";
      setError(msg);
      onToast?.(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`showcase-biz-link-editor${isDarkMode ? " showcase-biz-link-editor--dark" : ""}`}>
      <div className="showcase-biz-link-editor__card">
        <label className="showcase-biz-link-editor__field">
          <span className="showcase-biz-link-editor__label">링크 이름</span>
          <input
            className={`showcase-biz-link-editor__input ${inputCls}`}
            placeholder="예: 스마트스토어 · 모임 안내"
            value={name}
            disabled={busy}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError("");
            }}
          />
        </label>
        <div className="showcase-biz-link-editor__divider" aria-hidden />
        <label className="showcase-biz-link-editor__field">
          <span className="showcase-biz-link-editor__label">링크 URL</span>
          <div className="showcase-biz-link-editor__url-row">
            <span className="showcase-biz-link-editor__url-prefix" aria-hidden>
              https://
            </span>
            <input
              className={`showcase-biz-link-editor__input showcase-biz-link-editor__input--url ${inputCls}`}
              placeholder="example.com/page"
              value={url}
              disabled={busy}
              onChange={(e) => {
                setUrl(stripUrlSchemeForInput(e.target.value));
                if (error) setError("");
              }}
              onPaste={(e) => {
                const pasted = e.clipboardData?.getData("text") || "";
                if (!/^https?:\/\//i.test(pasted) && !/^\/\//.test(pasted.trim())) return;
                e.preventDefault();
                setUrl(stripUrlSchemeForInput(pasted));
                if (error) setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void add();
                }
              }}
            />
          </div>
        </label>
      </div>
      {error ? (
        <p className="showcase-biz-link-editor__error" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className="showcase-biz-link-editor__add"
        disabled={busy || !name.trim() || !stripUrlSchemeForInput(url)}
        onClick={() => void add()}
      >
        <Plus size={15} strokeWidth={2.4} aria-hidden />
        {busy ? "안전성 검사 중…" : "링크 추가"}
      </button>
      {links.length ? (
        <ul className="showcase-biz-list">
          {links.map((p) => (
            <li key={p.id}>
              <span className="showcase-biz-list__meta">
                <span className="showcase-biz-list__name">{p.name}</span>
                {p.url ? <span className="showcase-biz-list__url">{p.url}</span> : null}
              </span>
              <button type="button" aria-label={`${p.name} 삭제`} onClick={() => onChange(links.filter((x) => x.id !== p.id))}>
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** @deprecated BizLinkEditor 사용 */
function BizProductEditor({ products = [], inputCls, onChange }) {
  return <BizLinkEditor links={products} inputCls={inputCls} onChange={onChange} />;
}

function detectPlatform(url) {
  const u = String(url).toLowerCase();
  if (u.includes("coupang")) return "쿠팡";
  if (u.includes("naver") || u.includes("smartstore")) return "네이버";
  if (u.includes("kakao")) return "카카오";
  return "외부";
}
