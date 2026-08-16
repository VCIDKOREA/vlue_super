import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronRight, ChevronUp, HelpCircle, ImagePlus, Loader2, Music2, Plus, Trash2, X } from "lucide-react";
import BackButton from "../common/BackButton";
import { isPaidLetteringTier } from "../../lib/letteringMembership.js";
import { requiresPremium } from "../../lib/showcase/showcaseStylePermissions.js";
import {
  SHOWCASE_STYLE_CHANGED_EVENT,
  readShowcaseStyle,
  readLiveShowcaseStyle,
  writeShowcaseStyle,
  writeLiveShowcaseStyle,
  parseShowcaseTagsInput
} from "../../lib/showcase/showcaseStyleStorage.js";
import { archiveShowcaseToMycase } from "../../lib/mycaseApi.js";
import { applyMycaseItemToLiveBroadcast } from "../../lib/showcase/syncMycaseLiveBroadcast.js";
import {
  extractShowcaseArchiveTitle,
  extractShowcaseCoverUrl
} from "../../lib/showcase/showcaseCover.js";
import { slimShowcaseStyleForPersistWithVersion as slimShowcaseStyleForPersist } from "../../lib/showcase/slimShowcaseStyleForPersist.js";
import { hasShowcaseBgmConfigured } from "../../lib/showcase/showcaseBgmPresets.js";
import { PRIVACY_MODES, maxShowcaseContentPagesForTier } from "../../lib/showcase/tentShowcaseTypes.js";
import { SHOWCASE_CALL_IMAGE_GUIDE } from "../../lib/fitImageFile.js";
import {
  clampShowcasePages,
  contentPageDisplayNumber,
  createShowcasePage,
  isPageConfigured,
  normalizeBusinessLink,
  normalizeShowcasePage,
  pageStatusSummary,
  pageTypeLabel,
  SHOWCASE_PAGE_TYPES
} from "../../lib/showcase/showcasePages.js";
import {
  disconnectInstagramLink,
  fetchInstagramLinkStatus,
  startInstagramLink
} from "../../lib/instagramLinkApi.js";
import { readDigitalCardActive, readDccBroadcastOn } from "../../lib/bizcardAccountSync.js";
import {
  LETTERING_BIZCARD_CHANGED_EVENT,
  LETTERING_OPEN_BIZCARD_SETTINGS_EVENT
} from "../../lib/letteringBizcardStorage.js";
import { resolveVlueShowcaseCard } from "../../lib/vlueShowcaseCard.js";
import { applyShowcaseStyleToCard } from "../../lib/showcase/applyShowcaseStyleToCard.js";
import { syncShowcaseTagsToServer, fetchShowcaseSearchPrivacy, saveShowcaseSearchPrivacy } from "../../lib/showcase/showcaseTagsApi.js";
import { checkShowcaseLinkUri, WEB_RISK_BLOCK_MESSAGE } from "../../lib/showcase/webRiskLinkCheck.js";
import { compressAndUploadMediaImageOrThrow } from "../../lib/mediaImageUpload.js";
import { VLUE_SHOWCASE } from "../../lib/vlueBrandSpaces.js";
import ShowcasePremiumGateModal from "./ShowcasePremiumGateModal.jsx";
import ShowcaseBgmPicker from "./ShowcaseBgmPicker.jsx";
import ShowcasePhotoEditor from "./ShowcasePhotoEditor.jsx";
import ShowcasePullDownPreview from "./ShowcasePullDownPreview.jsx";
import CallBigPushPreviewSection from "../CallBigPushPreviewSection.jsx";
import DccLineSwitcher from "../dcc/DccLineSwitcher.jsx";
import "./showcase-style-settings.css";
import "./showcase-web-desk.css";
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

/** 적용 전후 dirty 비교용 */
function styleFingerprint(style) {
  try {
    return JSON.stringify(style && typeof style === "object" ? style : {});
  } catch {
    return "";
  }
}

function pageFingerprint(page) {
  try {
    return JSON.stringify(normalizeShowcasePage(page || {}));
  } catch {
    return "";
  }
}

export default function ShowcaseStyleSettingsPanel({
  membershipTier = "free",
  isDarkMode = false,
  onBack,
  onOpenUpgrade,
  onToast,
  hideHeader = false,
  fullscreen = false,
  /** sheet(기본·앱) | webDesk(www 미리보기|설정 2열) */
  layout = "sheet",
  /** 부모가 X/돌아가기 시 호출할 가드 등록 (미적용 확인) */
  onBindCloseGuard
}) {
  const isWebDesk = layout === "webDesk";
  const isPaid = isPaidLetteringTier(membershipTier);
  const includeDigitalCard = isPaid && readDigitalCardActive() && readDccBroadcastOn();
  const maxContentPages = maxShowcaseContentPagesForTier(membershipTier, { includeDigitalCard });
  const [config, setConfig] = useState(() => readShowcaseStyle());
  const [appliedFp, setAppliedFp] = useState(() => styleFingerprint(readShowcaseStyle()));
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [identityTick, setIdentityTick] = useState(0);
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
  const [openReactions, setOpenReactions] = useState(() => layout !== "webDesk");
  const [openSearch, setOpenSearch] = useState(false);
  const [expandedPageId, setExpandedPageId] = useState("");
  const settingsScrollRef = useRef(null);
  const [igLink, setIgLink] = useState({ linked: false });
  const [igLinkLoading, setIgLinkLoading] = useState(false);
  /** 적용 시 마이케이스에 새 게시물로 올릴지 (기본 꺼짐 — 사진 수정마다 쌓이는 것 방지) */
  const [alsoUploadToMycase, setAlsoUploadToMycase] = useState(false);
  const [lineBusy, setLineBusy] = useState(false);
  const [deskNotice, setDeskNotice] = useState("");
  const pages = useMemo(
    () => (Array.isArray(config.pages) ? config.pages.map(normalizeShowcasePage) : []),
    [config.pages]
  );
  const canAddPage = pages.length < maxContentPages;

  const notify = useCallback(
    (msg) => {
      const text = String(msg || "").trim();
      if (!text) return;
      onToast?.(text);
      if (isWebDesk) setDeskNotice(text);
    },
    [isWebDesk, onToast]
  );

  useEffect(() => {
    if (!deskNotice) return undefined;
    const t = window.setTimeout(() => setDeskNotice(""), 5000);
    return () => window.clearTimeout(t);
  }, [deskNotice]);

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

  /* 설정 진입 시 서버/로컬 → 초안. 편집 중에는 storage·서버에 쓰지 않음 */
  useEffect(() => {
    let cancelled = false;
    const applyLocal = () => {
      if (cancelled) return;
      const latest = readShowcaseStyle();
      setConfig(latest);
      setAppliedFp(styleFingerprint(latest));
      setTagInput((latest.tags || []).join(" "));
    };
    void import("../../lib/showcase/showcaseStyleSync.js")
      .then(async (m) => {
        if (m.needsShowcaseStyleLocalRestore()) {
          await m.restoreShowcaseStyleFromServer();
        } else {
          m.seedEditorFromLocalLiveIfEmpty?.();
          /* 웹 PC는 앱과 같은 서버본을 강제 적용 (브라우저에 남은 예전 localStorage 우선 방지) */
          await m.hydrateShowcaseStyleFromServer({ forceServer: Boolean(isWebDesk) });
        }
        applyLocal();
      })
      .catch(() => {
        applyLocal();
      });
    return () => {
      cancelled = true;
    };
  }, [isWebDesk]);

  /* 명함 사진·신원 변경 시 미리보기 즉시 반영 */
  useEffect(() => {
    const bump = () => {
      setIdentityTick((n) => n + 1);
      setConfig((prev) => {
        const on = readDccBroadcastOn();
        if (prev.includeDigitalCard === on) return prev;
        return { ...prev, includeDigitalCard: on };
      });
    };
    window.addEventListener(LETTERING_BIZCARD_CHANGED_EVENT, bump);
    window.addEventListener("vlue-digital-card-changed", bump);
    window.addEventListener("vlue-avatar-changed", bump);
    window.addEventListener("vlue-dcc-line-changed", bump);
    return () => {
      window.removeEventListener(LETTERING_BIZCARD_CHANGED_EVENT, bump);
      window.removeEventListener("vlue-digital-card-changed", bump);
      window.removeEventListener("vlue-avatar-changed", bump);
      window.removeEventListener("vlue-dcc-line-changed", bump);
    };
  }, []);

  const card = useMemo(() => {
    const base = resolveVlueShowcaseCard({ membershipTier, previewExample: true });
    /* 설정 미리보기는 편집 초안(config)만 사용 — 라이브/마이케이스와 섞지 않음 */
    return applyShowcaseStyleToCard(base, membershipTier, {
      style: config,
      digitalCardActive: includeDigitalCard
    });
  }, [membershipTier, config, includeDigitalCard, identityTick]);

  const persist = useCallback((patch) => {
    setConfig((prev) => {
      let next = { ...prev, ...patch };
      if (patch.bgm) {
        next.bgm = {
          ...prev.bgm,
          ...patch.bgm
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
      /* 편집 중: React 초안만 — 로컬/서버 저장·PUT 없음 (적용하기에서만) */
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
        if (Object.prototype.hasOwnProperty.call(patch, "businessLink")) {
          merged.businessLink = normalizeBusinessLink(patch.businessLink);
        }
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
    /* storage write 금지 — 초안에만 반영 */
    const profileUrl = `https://instagram.com/${String(igLink.username).replace(/^@/, "")}`;
    persist({
      platformFeed: {
        ...(config.platformFeed || {}),
        instagramHandle: handle,
        instagramProfileUrl: profileUrl,
        instagramVerified: true
      },
      commercial: {
        ...(config.commercial || {}),
        outlinks: {
          ...(config.commercial?.outlinks || {}),
          instagram: profileUrl
        }
      }
    });
  }, [
    igLink.linked,
    igLink.username,
    igLink.expired,
    config.platformFeed?.instagramVerified,
    config.platformFeed?.instagramHandle,
    config.commercial?.outlinks?.instagram,
    persist
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

  const addPage = () => {
    if (!canAddPage) {
      onToast?.(`콘텐츠 페이지는 최대 ${maxContentPages}장입니다.`);
      return;
    }
    const page = createShowcasePage(SHOWCASE_PAGE_TYPES.RICH_CUSTOM);
    persistPages([...pages, page]);
    setExpandedPageId(page.id);
  };

  const removePage = (pageId) => {
    const nextPages = pages.filter((p) => p.id !== pageId);
    persistPages(nextPages);
    if (expandedPageId === pageId) setExpandedPageId(nextPages[0]?.id || "");
    onToast?.("편집에서 페이지를 제거했습니다. 「적용하기」를 눌러 저장하세요.");
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

  const dirty = useMemo(() => {
    const draft = { ...config, tags: parseShowcaseTagsInput(tagInput) };
    return styleFingerprint(draft) !== appliedFp;
  }, [config, tagInput, appliedFp]);

  const appliedPagesById = useMemo(() => {
    try {
      const applied = JSON.parse(appliedFp || "{}");
      const list = Array.isArray(applied?.pages) ? applied.pages : [];
      return new Map(list.map((p) => [p.id, normalizeShowcasePage(p)]));
    } catch {
      return new Map();
    }
  }, [appliedFp]);

  const pageStatusLine = useCallback(
    (page) => {
      const summary = pageStatusSummary(page);
      const applied = appliedPagesById.get(page.id);
      const sameAsApplied = Boolean(applied) && pageFingerprint(page) === pageFingerprint(applied);
      if (sameAsApplied && isPageConfigured(applied)) {
        return { text: `${summary} · 설정완료 ✔`, ready: true };
      }
      if (isPageConfigured(page)) {
        return { text: `${summary} · 미적용`, ready: false };
      }
      return { text: summary, ready: false };
    },
    [appliedPagesById]
  );

  const discardAndLeave = useCallback(() => {
    setLeaveOpen(false);
    try {
      const baseline = JSON.parse(appliedFp || "{}");
      if (baseline && typeof baseline === "object") {
        setConfig(baseline);
        setTagInput((baseline.tags || []).join(" "));
      }
    } catch {
      /* ignore */
    }
    onBack?.();
  }, [appliedFp, onBack]);

  const requestClose = useCallback(() => {
    if (!dirty) {
      onBack?.();
      return;
    }
    setLeaveOpen(true);
  }, [dirty, onBack]);

  useEffect(() => {
    if (typeof onBindCloseGuard !== "function") return undefined;
    onBindCloseGuard(requestClose);
    return () => onBindCloseGuard(null);
  }, [onBindCloseGuard, requestClose]);

  const commitApply = useCallback(() => {
    const withTags = {
      ...config,
      includeDigitalCard,
      tags: isPaid ? parseShowcaseTagsInput(tagInput) : config.tags || []
    };
    const latest = slimShowcaseStyleForPersist(
      clampShowcasePages(withTags, membershipTier, { includeDigitalCard })
    );
    try {
      writeShowcaseStyle(latest, { replace: true, skipSync: true });
      writeLiveShowcaseStyle(latest, { source: "editor", skipSync: true });
    } catch (e) {
      notify(e instanceof Error ? e.message : "쇼케이스 적용에 실패했습니다.");
      return;
    }
    setConfig(latest);
    setAppliedFp(styleFingerprint(latest));
    setTagInput((latest.tags || []).join(" "));
    if (isPaid) {
      void syncShowcaseTagsToServer(latest.tags || []);
    }

    const previewCard = resolveVlueShowcaseCard({ membershipTier, previewExample: true });
    const hasProfilePhoto = Boolean(String(previewCard?.photoUrl || "").trim());

    /* 적용 즉시 서버에 확정 — 재설치·재로그인 복원의 기준본 */
    void import("../../lib/showcase/showcaseStyleSync.js")
      .then(async (m) => {
        m.bumpLocalShowcaseStyleUpdatedAt?.();
        const pushed = await m.pushShowcaseStyleBundle({ force: true });
        if (!pushed?.ok && !pushed?.skipped) {
          notify(
            "기기에 저장됐습니다. 서버 동기화에 실패했습니다. 네트워크 확인 후 다시 적용해 주세요."
          );
        }
      })
      .catch(() => {});

    if (includeDigitalCard && !hasProfilePhoto) {
      notify(
        "쇼케이스 설정은 저장됐습니다. 프로필 사진은 「1페이지 · 디지털인증명함 → 설정하러가기」에서 등록·저장해야 미리보기에 나옵니다."
      );
      if (!alsoUploadToMycase) return;
    }

    if (!alsoUploadToMycase) {
      notify("적용되었습니다. (마이케이스에는 올리지 않음)");
      return;
    }
    /* 체크한 경우에만 마이케이스에 새 게시물로 쌓고 메인 송출 반영 */
    try {
      const cover = extractShowcaseCoverUrl(latest);
      const title = extractShowcaseArchiveTitle(latest);
      void archiveShowcaseToMycase({
        title,
        thumbnailUrl: cover || null,
        payloadJson: { style: latest, source: "showcase_apply" },
        isPublic: latest?.privacyMode !== "friend_only",
        promoteToMain: true
      }).then((res) => {
        if (res?.ok && res.item) {
          applyMycaseItemToLiveBroadcast(res.item);
          /* 게시물 hydrate 후에도 편집 BGM·source=editor 유지 — 새로고침 시 음원 보존 */
          writeLiveShowcaseStyle(
            { ...(readLiveShowcaseStyle() || latest), bgm: latest.bgm },
            { source: "editor" }
          );
          notify(
            hasProfilePhoto
              ? "적용 · 마이케이스 저장 · 메인 송출 반영"
              : "적용 · 마이케이스 저장. 프로필 사진은 디지털인증명함 설정에서 등록해 주세요."
          );
        } else if (res?.ok) {
          notify("적용 · 마이케이스에 저장되었습니다.");
        } else {
          notify(res?.message || "적용되었습니다. (마이케이스 저장 실패)");
        }
      });
    } catch {
      notify("적용되었습니다.");
    }
  }, [
    alsoUploadToMycase,
    config,
    includeDigitalCard,
    isPaid,
    membershipTier,
    notify,
    tagInput
  ]);

  const headText = isDarkMode ? "text-gray-100" : "text-slate-900";
  const subText = isDarkMode ? "text-gray-400" : "text-slate-500";
  const inputCls = isDarkMode ? "border-white/10 bg-white/5 text-gray-100" : "border-slate-200 bg-white text-slate-900";
  const configuredCount = pages.filter(isPageConfigured).length;
  const digitalCardReady = includeDigitalCard;
  const hasDigitalCardPhoto = Boolean(
    includeDigitalCard && String(card?.photoUrl || "").trim()
  );

  const pagesSection = (
    <section className="showcase-profile-block">
      {!isWebDesk ? (
        <div className="mb-3">
          <p className="showcase-profile-block__title">발·수신 담당자</p>
          <DccLineSwitcher compact onToast={onToast} onBusyChange={setLineBusy} />
        </div>
      ) : null}
      <p className="showcase-profile-block__title">
        쇼케이스 페이지
        <HelpTip
          text={[
            "디지털인증명함을 쓰면 1페이지는 항상 명함입니다.",
            "2페이지부터 메인커스텀 페이지를 추가할 수 있습니다.",
            `콘텐츠 페이지 최대 ${maxContentPages}장 · 커스텀은 사진 1장.`,
            "추천 1080×1920(9:16) · 하단 1/3은 통화 UI에 가릴 수 있음 · 「통화화면 보기」로 확인",
            isWebDesk
              ? "왼쪽 미리보기에서 실시간으로 확인하세요."
              : "오른쪽 사이드 탭(〈)을 누르면 통화 빅푸시 미리보기가 전체 화면으로 열립니다."
          ].join(" ")}
        />
      </p>
      {!isWebDesk ? (
        <p
          className={`mb-3 rounded-xl px-3 py-2 text-[11px] font-semibold leading-snug ${
            isDarkMode
              ? "border border-blue-400/25 bg-blue-500/10 text-blue-100"
              : "border border-blue-100 bg-blue-50 text-blue-900"
          }`}
          style={{ wordBreak: "keep-all" }}
        >
          사진 {SHOWCASE_CALL_IMAGE_GUIDE.sizeHint}. {SHOWCASE_CALL_IMAGE_GUIDE.safeZoneHint} 「통화화면 보기」로
          실제 통화 옵션이 가리는 영역을 확인할 수 있습니다.
        </p>
      ) : null}

      {includeDigitalCard ? (
        <div className="showcase-page-card showcase-page-card--digital">
          <div className="showcase-page-card__head">
            <div className="min-w-0 flex-1">
              <p className="showcase-page-card__title">1페이지 · 디지털인증명함</p>
              <p className={`showcase-page-card__status ${digitalCardReady && hasDigitalCardPhoto ? "is-ready" : ""}`}>
                {!digitalCardReady
                  ? "미설정"
                  : hasDigitalCardPhoto
                    ? "설정완료 ✔"
                    : "프로필 사진 미등록"}
              </p>
            </div>
            <button type="button" className="showcase-page-card__cta" onClick={openBizcardSettings}>
              설정하러가기
              <ChevronRight size={16} aria-hidden />
            </button>
          </div>
          <p className="showcase-page-card__hint">
            명함 디자인·상호·연락처·프로필 사진은 디지털인증명함 설정에서 편집·저장해야 미리보기에 반영됩니다.
            쇼케이스 「적용하기」만으로는 프로필 사진이 바뀌지 않습니다. 담당자만 바꿀 때는 상단 드롭다운을 사용하세요.
          </p>
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
                <p className={`showcase-page-card__status ${pageStatusLine(page).ready ? "is-ready" : ""}`}>
                  {pageStatusLine(page).text}
                </p>
              </div>
              <span className="showcase-page-card__trail">
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </span>
            </button>

            {expanded ? (
              <div className="showcase-page-card__body">
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
                  <div className="showcase-page-card__biz">
                    <p className="showcase-profile-block__sub">
                      <span className="showcase-profile-row__label-text">
                        비즈니스 링크
                        <HelpTip text="이 페이지에만 보이는 링크입니다. 페이지당 1개만 넣을 수 있습니다. 로고가 없으면 기본 버튼으로 표시됩니다." />
                      </span>
                    </p>
                    <BizLinkEditor
                      links={page.businessLink ? [page.businessLink] : []}
                      maxCount={1}
                      inputCls={inputCls}
                      isDarkMode={isDarkMode}
                      onToast={onToast}
                      onChange={(links) =>
                        updatePage(page.id, {
                          businessLink: Array.isArray(links) && links[0] ? links[0] : null
                        })
                      }
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="showcase-page-card__remove"
                  onClick={() => removePage(page.id)}
                >
                  <Trash2 size={14} aria-hidden />
                  이 페이지 삭제 (편집만)
                </button>
              </div>
            ) : null}
          </div>
        );
      })}

      {canAddPage ? (
        <button type="button" className="showcase-page-add-btn showcase-page-add-btn--solo" onClick={addPage}>
          <Plus size={16} aria-hidden />
          {isWebDesk ? "메인커스텀 페이지" : "개인커스텀 페이지"}
        </button>
      ) : (
        <p className={`text-[11px] ${subText}`}>콘텐츠 페이지 한도({maxContentPages})에 도달했습니다.</p>
      )}

      {igLink.linked && !igLink.expired ? (
        <button
          type="button"
          className="showcase-bgm-picker__yt-btn mt-2"
          disabled={igLinkLoading}
          onClick={async () => {
            if (!window.confirm("Instagram 인증을 해제할까요? 홍보 링크에 넣은 프로필 주소도 지워집니다.")) return;
            setIgLinkLoading(true);
            try {
              await disconnectInstagramLink();
              persist({
                platformFeed: {
                  ...(config.platformFeed || {}),
                  instagramVerified: false,
                  instagramHandle: "",
                  instagramProfileUrl: "",
                  instagramProfilePictureUrl: ""
                },
                commercial: {
                  ...(config.commercial || {}),
                  outlinks: { ...(config.commercial?.outlinks || {}), instagram: "" }
                }
              });
              await refreshIgLink();
              onToast?.("Instagram 인증이 해제되었습니다. 「적용하기」를 눌러 저장하세요.");
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
  );

  const commonSection = (
    <section className="showcase-profile-group">
      <p className="showcase-profile-block__title" style={{ padding: "12px 14px 0" }}>
        공통 설정
        <HelpTip text="배경음악·검색 공개는 모든 페이지(명함 포함)에 공통으로 적용됩니다." />
      </p>

      {isWebDesk ? (
        <button
          type="button"
          className="showcase-profile-row showcase-profile-row--btn"
          onClick={() => {
            if (pages[0]) {
              setExpandedPageId(pages[0].id);
              onToast?.("위에서 커스텀 페이지를 펼친 뒤 글꼴·텍스트를 편집하세요.");
              return;
            }
            if (canAddPage) {
              addPage();
              onToast?.("메인커스텀 페이지를 추가했습니다. 사진·글꼴을 편집하세요.");
              return;
            }
            onToast?.("편집할 페이지가 없습니다.");
          }}
        >
          <span className="showcase-profile-row__label">
            <span className="showcase-profile-row__label-text">
              글꼴 설정
              <HelpTip text="커스텀 페이지 사진 위 텍스트·글꼴에서 설정합니다." />
            </span>
          </span>
          <span className="showcase-profile-row__trail">
            <ChevronRight size={16} />
          </span>
        </button>
      ) : null}

      {!isPaid ? (
        <div className="showcase-profile-row showcase-profile-row--stack">
          <span className="showcase-profile-row__label">공유 범위</span>
          <div className="showcase-style-settings__phase-toggle">
            <button
              type="button"
              className={(config.privacyMode || PRIVACY_MODES.FRIEND_ONLY) === PRIVACY_MODES.FRIEND_ONLY ? "active" : ""}
              onClick={() => {
                persist({ privacyMode: PRIVACY_MODES.FRIEND_ONLY });
              }}
            >
              친구만
            </button>
            <button
              type="button"
              className={config.privacyMode === PRIVACY_MODES.PUBLIC ? "active" : ""}
              onClick={() => {
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

      <button
        type="button"
        className="showcase-profile-row showcase-profile-row--btn"
        onClick={() => setOpenReactions((v) => !v)}
      >
        <span className="showcase-profile-row__label">
          <span className="showcase-profile-row__label-text">
            반응 설정
            <HelpTip text="좋아요는 항상 켜집니다. 댓글·공유만 끌 수 있습니다." />
          </span>
        </span>
        <span className="showcase-profile-row__trail">
          {openReactions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>
      {openReactions ? (
        <div className="showcase-profile-nested">
          <label className="showcase-profile-row showcase-profile-row--toggle">
            <span className="showcase-profile-row__label">좋아요</span>
            <input type="checkbox" className="showcase-profile-switch" checked disabled readOnly aria-label="좋아요 항상 활성" />
          </label>
          <label className="showcase-profile-row showcase-profile-row--toggle">
            <span className="showcase-profile-row__label">댓글</span>
            <input
              type="checkbox"
              className="showcase-profile-switch"
              checked={config.commentsEnabled !== false}
              onChange={(e) => persist({ commentsEnabled: e.target.checked })}
            />
          </label>
          <label className="showcase-profile-row showcase-profile-row--toggle">
            <span className="showcase-profile-row__label">공유</span>
            <input
              type="checkbox"
              className="showcase-profile-switch"
              checked={config.shareEnabled !== false}
              onChange={(e) => persist({ shareEnabled: e.target.checked })}
            />
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
            <HelpTip text="쇼케이스 미리보기·상대 쇼케이스·마이케이스에서만 자동 재생됩니다. 설정에서는 「BGM 미리듣기」로만 확인합니다. Signature / User Original / Shared Track을 연결합니다." />
          </span>
        </span>
        <span className="showcase-profile-row__trail">
          <span className="showcase-profile-row__value">
            {hasShowcaseBgmConfigured({ bgm: config.bgm })
              ? Array.isArray(config.bgm?.playlist) && config.bgm.playlist.length > 1
                ? `설정됨 · ${config.bgm.playlist.length}곡`
                : "설정됨"
              : "미설정"}
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
            onToast={onToast}
            coexistWithPreview={isWebDesk}
          />
        </div>
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
        <>
          <button
            type="button"
            className="showcase-profile-row showcase-profile-row--btn"
            onClick={() => setOpenSearch((v) => !v)}
          >
            <span className="showcase-profile-row__label">
              <span className="showcase-profile-row__label-text">
                검색 공개 설정
                <HelpTip text="비공개가 기본입니다. 이름·상호·전화·아이디는 각각 허용한 항목만 검색·결과에 노출됩니다." />
              </span>
            </span>
            <span className="showcase-profile-row__trail">
              {openSearch ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </button>
          {openSearch ? (
            <div className="showcase-profile-nested">
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
        </>
      ) : null}

      {isPaid ? (
        <>
          <button
            type="button"
            className="showcase-profile-row showcase-profile-row--btn"
            onClick={() => setOpenBiz((v) => !v)}
          >
            <span className="showcase-profile-row__label">
              <span className="showcase-profile-row__label-text showcase-profile-row__label-text--stack">
                <span className="showcase-biz-social-title">
                  <span>비즈니스</span>
                  <span>쇼셜링크</span>
                </span>
                <HelpTip text="Instagram은 로그인·회원가입·홍보 링크용입니다. 인증 시 프로필 URL이 자동 입력됩니다. 카카오는 오픈채팅·프로필을 따로 넣으세요." />
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
                value={config.commercial.outlinks.kakaoOpenChat || ""}
                inputCls={inputCls}
                onChange={(v) => {
                  const kakaoOpenChat = String(v || "").trim();
                  const kakaoProfile = String(config.commercial.outlinks.kakaoProfile || "").trim();
                  persist({
                    commercial: {
                      outlinks: {
                        ...config.commercial.outlinks,
                        kakaoOpenChat,
                        kakao: kakaoOpenChat || kakaoProfile || ""
                      }
                    }
                  });
                }}
              />
              <BusinessOutlinkRow
                brand="kakao"
                label="카카오 프로필"
                placeholder="https://pf.kakao.com/… 또는 카톡 프로필 URL"
                value={config.commercial.outlinks.kakaoProfile || ""}
                inputCls={inputCls}
                onChange={(v) => {
                  const kakaoProfile = String(v || "").trim();
                  const kakaoOpenChat = String(config.commercial.outlinks.kakaoOpenChat || "").trim();
                  persist({
                    commercial: {
                      outlinks: {
                        ...config.commercial.outlinks,
                        kakaoProfile,
                        kakao: kakaoOpenChat || kakaoProfile || ""
                      }
                    }
                  });
                }}
              />
              <p className="showcase-profile-block__sub mt-3 text-[11px] opacity-70">
                홍보용 비즈니스 링크는 각 메인커스텀 페이지에서 페이지당 1개씩 설정합니다.
              </p>
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
  );

  const applyFooter = (
    <>
      <p className={`text-center text-[11px] ${subText}`}>
        {includeDigitalCard ? "명함 1 · " : ""}
        콘텐츠 {pages.length}페이지 · 설정됨 {configuredCount}
        {dirty ? " · 미적용 변경 있음" : ""}
      </p>

      <label className={`showcase-mycase-upload-check ${isDarkMode ? "is-dark" : ""}`}>
        <input
          type="checkbox"
          checked={alsoUploadToMycase}
          onChange={(e) => setAlsoUploadToMycase(e.target.checked)}
        />
        <span>
          <b>[마이케이스]</b> 함께 올리기
          <em>체크한 경우에만 마이케이스에 새 게시물로 저장됩니다</em>
        </span>
      </label>

      <button
        type="button"
        className={`showcase-style-settings__save-btn${fullscreen && !isWebDesk ? " showcase-style-settings__save-btn--compact" : ""}`}
        onClick={commitApply}
      >
        적용하기
      </button>
      {isWebDesk && deskNotice ? (
        <p className="showcase-web-desk__save-notice" role="status" aria-live="polite">
          {deskNotice}
        </p>
      ) : null}
    </>
  );

  const gateModal = (
    <ShowcasePremiumGateModal
      open={gateOpen}
      onClose={() => setGateOpen(false)}
      isDarkMode={isDarkMode}
      onOpenUpgrade={() => {
        setGateOpen(false);
        onOpenUpgrade?.();
      }}
    />
  );

  const leaveModal =
    leaveOpen && typeof document !== "undefined"
      ? createPortal(
          <div className="showcase-leave-confirm" role="dialog" aria-modal="true" aria-labelledby="showcase-leave-title">
            <button
              type="button"
              className="showcase-leave-confirm__backdrop"
              aria-label="닫기"
              onClick={() => setLeaveOpen(false)}
            />
            <div className={`showcase-leave-confirm__panel ${isDarkMode ? "is-dark" : ""}`}>
              <h2 id="showcase-leave-title" className="showcase-leave-confirm__title">
                적용되지 않았습니다. 뒤로 가시겠습니까?
              </h2>
              <p className="showcase-leave-confirm__hint">저장하지 않은 변경 내용은 사라집니다.</p>
              <div className="showcase-leave-confirm__actions">
                <button type="button" className="showcase-leave-confirm__btn showcase-leave-confirm__btn--ghost" onClick={() => setLeaveOpen(false)}>
                  취소
                </button>
                <button type="button" className="showcase-leave-confirm__btn showcase-leave-confirm__btn--ok" onClick={discardAndLeave}>
                  확인
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  if (isWebDesk) {
    return (
      <div
        className={`showcase-web-desk showcase-style-settings showcase-style-settings--profile ${
          isDarkMode ? "showcase-style-settings--dark" : ""
        }`}
        aria-busy={lineBusy ? "true" : undefined}
      >
        <div className="showcase-web-desk__tip">
          <p className="showcase-web-desk__tip-text">
            1열 미리보기 · 2열 설정 (듀얼 화면) · 담당자를 바꾸면 DCC·쇼케이스에 바로 반영됩니다
          </p>
          <DccLineSwitcher compact onToast={onToast} onBusyChange={setLineBusy} />
          {includeDigitalCard ? (
            <button
              type="button"
              className="showcase-web-desk__tip-cta"
              disabled={lineBusy}
              onClick={openBizcardSettings}
            >
              설정하러가기
              <ChevronRight size={14} aria-hidden />
            </button>
          ) : null}
        </div>

        <div className="showcase-web-desk__body">
          <aside className="showcase-web-desk__preview-col" aria-label="미리보기">
            <p className="showcase-web-desk__preview-label">미리보기</p>
            <CallBigPushPreviewSection
              membershipTier={membershipTier}
              isDarkMode={isDarkMode}
              onToast={onToast}
              expandMode="inline"
              defaultExpanded
              suppressExpandGuide
            />
          </aside>

          <section className="showcase-web-desk__settings-col" aria-label="설정">
            <p className="showcase-web-desk__settings-label">설정</p>
            <div className="showcase-web-desk__settings-scroll" ref={settingsScrollRef}>
              {pagesSection}
              {commonSection}
              {applyFooter}
            </div>
          </section>
        </div>

        {lineBusy ? (
          <div className="showcase-web-desk__loading" role="status" aria-live="polite">
            <Loader2 size={22} className="showcase-web-desk__loading-spin" aria-hidden />
            번호를 불러오는 중…
          </div>
        ) : null}
        {gateModal}
        {leaveModal}
      </div>
    );
  }

  return (
    <div
      className={`showcase-style-settings showcase-style-settings--profile flex min-h-0 flex-1 flex-col ${fullscreen ? "showcase-style-settings--fullscreen" : ""} ${isDarkMode ? "showcase-style-settings--dark" : ""}`}
    >
      {!hideHeader ? (
        <div className={`flex shrink-0 items-center gap-2 border-b px-3 py-2.5 ${isDarkMode ? "border-white/10" : "border-slate-100"}`}>
          <BackButton variant="inline" onBack={requestClose} isDarkMode={isDarkMode} />
          <div className="min-w-0 flex-1">
            <p className={`text-[17px] font-black ${headText}`}>{VLUE_SHOWCASE.nameKo}</p>
            <p className={`text-[11px] ${subText}`}>
              {alsoUploadToMycase ? "적용 → 마이케이스 저장 · 자동 송출" : "적용 → 미리보기 반영 (마이케이스는 선택 시)"}
            </p>
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
          {pagesSection}
          {commonSection}
          {applyFooter}
        </div>
      </div>

      {gateModal}
      {leaveModal}
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

function stripUrlSchemeForInput(raw) {
  return String(raw || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^\/\//, "");
}

function BizLinkEditor({ links = [], inputCls, onChange, onToast, isDarkMode = false, maxCount = 0 }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const logoInputRef = useRef(null);
  const limit = Number(maxCount) > 0 ? Number(maxCount) : 0;
  const singleMode = limit === 1;
  const atLimit = limit > 0 && links.length >= limit;

  const clearDraft = () => {
    setName("");
    setUrl("");
    setLogoUrl("");
  };

  const onPickLogo = async (file) => {
    if (!file) return;
    if (!/^image\//i.test(file.type || "")) {
      const msg = "이미지 파일만 선택할 수 있습니다.";
      setError(msg);
      onToast?.(msg);
      return;
    }
    setBusy(true);
    try {
      /* data URL 로컬 저장은 동기화·서버 저장 시 유실됨 → R2 https URL 사용 */
      const uploaded = await compressAndUploadMediaImageOrThrow(file, "logo");
      const nextUrl = String(uploaded?.url || "").trim();
      if (!nextUrl) throw new Error("로고 업로드 URL이 비어 있습니다.");
      setLogoUrl(nextUrl);
      if (error) setError("");
      onToast?.("링크 로고를 올렸습니다. 적용을 눌러 저장하세요.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "로고 이미지를 올릴 수 없습니다.";
      setError(msg);
      onToast?.(msg);
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    const linkName = name.trim();
    const hostPath = stripUrlSchemeForInput(url);
    if (!linkName || !hostPath || busy) return;
    if (atLimit && !singleMode) {
      onToast?.(`링크는 최대 ${limit}개까지 넣을 수 있습니다.`);
      return;
    }
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
      let resolvedLogo = String(logoUrl || "").trim();
      /* 예전 data: 로고가 남아 있으면 표시 불가 — 재업로드 유도 */
      if (resolvedLogo.startsWith("data:")) {
        const msg = "링크 로고를 다시 선택해 주세요. (클라우드 저장용으로 변경됨)";
        setError(msg);
        onToast?.(msg);
        return;
      }
      const nextLink = {
        id: singleMode && links[0]?.id ? links[0].id : `link-${Date.now()}`,
        name: linkName,
        url: String(check.uri || linkUrl).trim(),
        logoUrl: resolvedLogo
      };
      onChange(singleMode ? [nextLink] : [...links, nextLink]);
      clearDraft();
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
        <div className="showcase-biz-link-editor__divider" aria-hidden />
        <div className="showcase-biz-link-editor__logo-row">
          <span className="showcase-biz-link-editor__label">링크 로고 (선택)</span>
          <div className="showcase-biz-link-editor__logo-actions">
            <button
              type="button"
              className="showcase-biz-link-editor__logo-pick"
              disabled={busy}
              onClick={() => logoInputRef.current?.click()}
            >
              {logoUrl ? (
                <img src={logoUrl} alt="" className="showcase-biz-link-editor__logo-preview" />
              ) : (
                <>
                  <ImagePlus size={16} strokeWidth={2.2} aria-hidden />
                  <span>사진 선택</span>
                </>
              )}
            </button>
            {logoUrl ? (
              <button
                type="button"
                className="showcase-biz-link-editor__logo-clear"
                disabled={busy}
                aria-label="로고 제거"
                onClick={() => setLogoUrl("")}
              >
                <X size={14} strokeWidth={2.4} aria-hidden />
              </button>
            ) : null}
          </div>
          <p className="showcase-biz-link-editor__logo-hint">
            없으면 「링크」 기본 버튼으로 표시됩니다. 사진은 업로드 후 「적용」을 눌러야 저장됩니다.
          </p>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              void onPickLogo(file);
            }}
          />
        </div>
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
        {busy
          ? "안전성 검사 중…"
          : singleMode && links.length
            ? "링크 교체"
            : singleMode
              ? "링크 적용"
              : "링크 추가"}
      </button>
      {links.length ? (
        <ul className="showcase-biz-list">
          {links.map((p) => (
            <li key={p.id}>
              {p.logoUrl ? (
                <img src={p.logoUrl} alt="" className="showcase-biz-list__logo" />
              ) : (
                <span className="showcase-biz-list__btn-badge" aria-hidden>
                  링크
                </span>
              )}
              <span className="showcase-biz-list__meta">
                <span className="showcase-biz-list__name">{p.name}</span>
                {p.url ? <span className="showcase-biz-list__url">{p.url}</span> : null}
              </span>
              <button
                type="button"
                aria-label={`${p.name} 삭제`}
                onClick={() => onChange(links.filter((x) => x.id !== p.id))}
              >
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
