import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, ChevronUp, Music2 } from "lucide-react";
import BackButton from "../common/BackButton";
import { isPaidLetteringTier } from "../../lib/letteringMembership.js";
import { getShowcasePermissions, requiresPremium } from "../../lib/showcase/showcaseStylePermissions.js";
import {
  SHOWCASE_STYLE_CHANGED_EVENT,
  readShowcaseStyle,
  writeShowcaseStyle,
  parseShowcaseTagsInput
} from "../../lib/showcase/showcaseStyleStorage.js";
import { writeShowcasePrivacyMode } from "../../lib/showcase/showcasePrivacyMode.js";
import { PRIVACY_MODES } from "../../lib/showcase/tentShowcaseTypes.js";
import { syncShowcaseTagsToServer, fetchShowcaseSearchPrivacy, saveShowcaseSearchPrivacy } from "../../lib/showcase/showcaseTagsApi.js";
import { SHOWCASE_FONT_SETS, SHOWCASE_CASE_FRAMES, SHOWCASE_STYLE_LIST, SHOWCASE_STYLE_TYPES } from "../../lib/showcase/showcaseStyleTypes.js";
import { resolveVlueShowcaseCard } from "../../lib/vlueShowcaseCard.js";
import { applyShowcaseStyleToCard } from "../../lib/showcase/applyShowcaseStyleToCard.js";
import { readDigitalCardActive } from "../../lib/bizcardAccountSync.js";
import { VLUE_SHOWCASE } from "../../lib/vlueBrandSpaces.js";
import LetteringIncomingNotification from "../LetteringIncomingNotification.jsx";
import ShowcasePremiumGateModal from "./ShowcasePremiumGateModal.jsx";
import ShowcaseBgmPicker from "./ShowcaseBgmPicker.jsx";
import ShowcasePhotoEditor from "./ShowcasePhotoEditor.jsx";
import "./showcase-style-settings.css";
import "../../styles/showcase-call-glass.css";

function gatePremium(feature, tier, setGate) {
  if (requiresPremium(feature, tier)) {
    setGate(true);
    return true;
  }
  return false;
}

function ProfileRow({ label, hint, children, onClick, trailing }) {
  if (onClick) {
    return (
      <button type="button" className="showcase-profile-row showcase-profile-row--btn" onClick={onClick}>
        <span className="showcase-profile-row__label">
          {label}
          {hint ? <span className="showcase-profile-row__hint">{hint}</span> : null}
        </span>
        <span className="showcase-profile-row__trail">
          {trailing}
          <ChevronRight size={16} aria-hidden />
        </span>
      </button>
    );
  }
  return (
    <div className="showcase-profile-row">
      <span className="showcase-profile-row__label">
        {label}
        {hint ? <span className="showcase-profile-row__hint">{hint}</span> : null}
      </span>
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
  const perms = getShowcasePermissions(membershipTier);
  const [config, setConfig] = useState(() => readShowcaseStyle());
  const [gateOpen, setGateOpen] = useState(false);
  const [tagInput, setTagInput] = useState(() => (config.tags || []).join(" "));
  const [searchPrivacy, setSearchPrivacy] = useState({
    isPhoneSearchAllowed: false,
    isNameSearchAllowed: false,
    isIdSearchAllowed: false
  });
  /** 미리보기 시트 — 기본 접힘, 「올리기」로 아래에서 상승 */
  const [previewCollapsed, setPreviewCollapsed] = useState(true);
  const [openMusic, setOpenMusic] = useState(false);
  const [openBiz, setOpenBiz] = useState(false);
  const [openDecorate, setOpenDecorate] = useState(false);
  const previewDragRef = useRef({ startY: 0, dragging: false });

  const onPreviewPointerDown = useCallback((e) => {
    previewDragRef.current = { startY: e.clientY, dragging: true };
  }, []);

  const onPreviewPointerMove = useCallback((e) => {
    if (!previewDragRef.current.dragging) return;
    const dy = e.clientY - previewDragRef.current.startY;
    if (Math.abs(dy) < 28) return;
    if (dy > 28 && !previewCollapsed) {
      setPreviewCollapsed(true);
      previewDragRef.current.dragging = false;
    } else if (dy < -28 && previewCollapsed) {
      setPreviewCollapsed(false);
      previewDragRef.current.dragging = false;
    }
  }, [previewCollapsed]);

  const onPreviewPointerUp = useCallback(() => {
    previewDragRef.current.dragging = false;
  }, []);

  const card = useMemo(() => {
    const base = resolveVlueShowcaseCard({ membershipTier, previewExample: true });
    return applyShowcaseStyleToCard({ ...base, showcaseStyle: config }, membershipTier);
  }, [membershipTier, config]);

  const includeDigitalCard = isPaid && readDigitalCardActive();

  const persist = useCallback((patch) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      if (patch.bgm) next.bgm = { ...prev.bgm, ...patch.bgm };
      if (patch.richCustom) next.richCustom = { ...prev.richCustom, ...patch.richCustom };
      if (patch.commercial) next.commercial = { ...prev.commercial, ...patch.commercial };
      if (patch.platformFeed) next.platformFeed = { ...prev.platformFeed, ...patch.platformFeed };
      if (patch.caseTheme) next.caseTheme = { ...prev.caseTheme, ...patch.caseTheme };
      if (patch.gallery) next.gallery = { ...prev.gallery, ...patch.gallery };
      if (patch.tags) next.tags = patch.tags;
      writeShowcaseStyle(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const onExternal = () => {
      const latest = readShowcaseStyle();
      setConfig(latest);
      setTagInput((latest.tags || []).join(" "));
    };
    window.addEventListener(SHOWCASE_STYLE_CHANGED_EVENT, onExternal);
    return () => window.removeEventListener(SHOWCASE_STYLE_CHANGED_EVENT, onExternal);
  }, []);

  const onSelectStyle = (id) => {
    if (!perms.allowedStyleIds.includes(id)) {
      setGateOpen(true);
      return;
    }
    const bgmMode = SHOWCASE_STYLE_TYPES[id]?.bgmSource || "none";
    persist({
      styleType: id,
      bgm: {
        ...config.bgm,
        mode: bgmMode === "none" ? "none" : bgmMode === "platform" ? "platform" : config.bgm.mode || "preset"
      }
    });
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
  const styleMeta = SHOWCASE_STYLE_TYPES[config.styleType] || SHOWCASE_STYLE_TYPES.default;
  const photoCount = (config.gallery?.photos || []).length;

  return (
    <div
      className={`showcase-style-settings showcase-style-settings--profile flex min-h-0 flex-1 flex-col ${fullscreen ? "showcase-style-settings--fullscreen" : ""} ${isDarkMode ? "showcase-style-settings--dark" : ""}`}
    >
      {!hideHeader ? (
        <div className={`flex shrink-0 items-center gap-2 border-b px-3 py-2.5 ${isDarkMode ? "border-white/10" : "border-slate-100"}`}>
          <BackButton variant="inline" onBack={onBack} isDarkMode={isDarkMode} />
          <div className="min-w-0 flex-1">
            <p className={`text-[17px] font-black ${headText}`}>{VLUE_SHOWCASE.nameKo}</p>
            <p className={`text-[11px] ${subText}`}>프로필처럼 사진·스타일만 골라 주세요</p>
          </div>
          <button type="button" className="showcase-style-settings__done-btn" onClick={commitApply}>
            완료
          </button>
        </div>
      ) : (
        <div className="showcase-style-settings__sticky-done">
          <button type="button" className="showcase-style-settings__save-btn" onClick={commitApply}>
            적용하기
          </button>
        </div>
      )}

      <div className={`showcase-style-settings__split${fullscreen ? " showcase-style-settings__split--fullscreen" : " min-h-0 flex-1 overflow-hidden"}`}>
        <div className={`showcase-style-settings__form overflow-y-auto px-4 py-3 ${fullscreen ? "vlue-scroll-pad-bottom-nav min-h-0 flex-1" : "vlue-scroll-pad-profile-panel"}`}>
          {/* 1. Photos first — like Instagram profile */}
          <section className="showcase-profile-block">
            <ShowcasePhotoEditor
              photos={config.gallery?.photos || []}
              onChange={(photos) => persist({ gallery: { photos } })}
              membershipTier={membershipTier}
            />
          </section>

          {/* 2. Style chips */}
          <section className="showcase-profile-block">
            <p className="showcase-profile-block__title">화면 스타일</p>
            <div className="showcase-style-chips" role="listbox" aria-label="통화 화면 스타일">
              {SHOWCASE_STYLE_LIST.map((s) => {
                const meta = SHOWCASE_STYLE_TYPES[s.id] || s;
                const locked = !perms.allowedStyleIds.includes(s.id);
                const active = config.styleType === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`showcase-style-chip${active ? " is-active" : ""}${locked ? " is-locked" : ""}`}
                    onClick={() => onSelectStyle(s.id)}
                  >
                    <span className="showcase-style-chip__emoji" aria-hidden>
                      {meta.emoji || "📱"}
                    </span>
                    <span className="showcase-style-chip__label">
                      {s.label.replace("디지털인증명함", "인증명함")}
                      {locked ? " ·유료" : ""}
                    </span>
                    {active ? <Check size={14} className="showcase-style-chip__check" aria-hidden /> : null}
                  </button>
                );
              })}
            </div>
            <p className="showcase-profile-block__sub">{styleMeta.shortDesc}</p>
          </section>

          {/* 3. Profile fields — Kakao/Insta edit rows */}
          <section className="showcase-profile-group">
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

            {!readDigitalCardActive() ? (
              <label className="showcase-profile-row showcase-profile-row--toggle">
                <span className="showcase-profile-row__label">
                  이름 보이기
                  <span className="showcase-profile-row__hint">끄면 사진·번호만 · 상대 전화부 이름 사용</span>
                </span>
                <input
                  type="checkbox"
                  className="showcase-profile-switch"
                  checked={config.showBroadcastName !== false}
                  onChange={(e) => persist({ showBroadcastName: e.target.checked })}
                />
              </label>
            ) : null}

            {config.styleType === "kakao" ? (
              <>
                <ProfileRow label="카톡 이름">
                  <input
                    className={`showcase-profile-input ${inputCls}`}
                    placeholder="표시 이름"
                    value={config.platformFeed?.kakaoProfileTitle || ""}
                    onChange={(e) => persist({ platformFeed: { kakaoProfileTitle: e.target.value } })}
                  />
                </ProfileRow>
                <ProfileRow label="카톡 링크">
                  <input
                    className={`showcase-profile-input ${inputCls}`}
                    placeholder="카카오톡 프로필 링크"
                    value={config.platformFeed?.kakaoProfileUrl || ""}
                    onChange={(e) => persist({ platformFeed: { kakaoProfileUrl: e.target.value.trim() } })}
                  />
                </ProfileRow>
              </>
            ) : null}

            {config.styleType === "instagram" ? (
              <ProfileRow label="인스타그램" hint="@아이디">
                <input
                  className={`showcase-profile-input ${inputCls}`}
                  placeholder="@아이디"
                  value={
                    config.platformFeed?.instagramHandle ||
                    (config.platformFeed?.instagramProfileUrl
                      ? `@${String(config.platformFeed.instagramProfileUrl).match(/instagram\.com\/([^/?#]+)/i)?.[1] || ""}`
                      : "")
                  }
                  onChange={(e) => {
                    let handle = e.target.value.trim();
                    if (handle && !handle.startsWith("@")) handle = `@${handle}`;
                    const id = handle.replace(/^@/, "");
                    persist({
                      platformFeed: {
                        instagramHandle: handle,
                        instagramProfileUrl: id ? `https://instagram.com/${id}` : ""
                      }
                    });
                  }}
                />
              </ProfileRow>
            ) : null}

            {config.styleType === "rich_custom" ? (
              <>
                <button
                  type="button"
                  className="showcase-profile-row showcase-profile-row--btn"
                  onClick={() => setOpenDecorate((v) => !v)}
                >
                  <span className="showcase-profile-row__label">소개·꾸미기</span>
                  <span className="showcase-profile-row__trail">
                    {openDecorate ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </button>
                {openDecorate ? (
                  <div className="showcase-profile-nested">
                    <div className="showcase-style-settings__frame-grid">
                      {SHOWCASE_CASE_FRAMES.map((frame) => {
                        const active = (config.caseTheme?.frame || "classic") === frame.id;
                        return (
                          <button
                            key={frame.id}
                            type="button"
                            className={`showcase-style-settings__frame-chip${active ? " showcase-style-settings__frame-chip--active" : ""}`}
                            style={{ "--case-accent": frame.accent }}
                            onClick={() => persist({ caseTheme: { frame: frame.id, accent: frame.accent } })}
                          >
                            <span className="showcase-style-settings__frame-swatch" aria-hidden />
                            {frame.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="showcase-style-settings__toolbar mt-2">
                      <select
                        className={`showcase-style-settings__input ${inputCls}`}
                        value={config.richCustom.fontFamily}
                        onChange={(e) => persist({ richCustom: { fontFamily: e.target.value } })}
                      >
                        {SHOWCASE_FONT_SETS.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="color"
                        value={config.richCustom.fontColor}
                        onChange={(e) => persist({ richCustom: { fontColor: e.target.value } })}
                        className="showcase-style-settings__color"
                        aria-label="글자 색상"
                      />
                    </div>
                    <textarea
                      className={`showcase-style-settings__textarea mt-2 ${inputCls}`}
                      rows={3}
                      placeholder="소개 한 줄"
                      value={config.richCustom.bodyText}
                      onChange={(e) => persist({ richCustom: { bodyText: e.target.value } })}
                    />
                  </div>
                ) : null}
              </>
            ) : null}

            <ProfileRow label="#해시태그" hint={isPaid ? "검색용 · 공백으로 구분" : "유료 전용"}>
              <input
                className={`showcase-profile-input ${inputCls}`}
                placeholder={isPaid ? "예: #상호명 #지역" : "유료 회원만 등록"}
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
                  검색 공개 설정
                  <span className="showcase-profile-row__hint">기본 비공개 · 허용한 항목만 검색에 노출</span>
                </span>
                <label className="showcase-privacy-check">
                  <input
                    type="checkbox"
                    checked={searchPrivacy.isPhoneSearchAllowed}
                    onChange={(e) => onSearchPrivacyToggle("isPhoneSearchAllowed", e.target.checked)}
                  />
                  전화번호로 검색 허용
                </label>
                <label className="showcase-privacy-check">
                  <input
                    type="checkbox"
                    checked={searchPrivacy.isNameSearchAllowed}
                    onChange={(e) => onSearchPrivacyToggle("isNameSearchAllowed", e.target.checked)}
                  />
                  실명으로 검색 허용
                </label>
                <label className="showcase-privacy-check">
                  <input
                    type="checkbox"
                    checked={searchPrivacy.isIdSearchAllowed}
                    onChange={(e) => onSearchPrivacyToggle("isIdSearchAllowed", e.target.checked)}
                  />
                  아이디로 검색·문의 허용
                </label>
              </div>
            ) : null}

            {config.styleType !== "default" ? (
              <>
                <button
                  type="button"
                  className="showcase-profile-row showcase-profile-row--btn"
                  onClick={() => setOpenMusic((v) => !v)}
                >
                  <span className="showcase-profile-row__label">
                    <Music2 size={14} className="inline mr-1" aria-hidden />
                    배경음악
                  </span>
                  <span className="showcase-profile-row__trail">
                    <span className="showcase-profile-row__value">
                      {config.bgm?.mode === "none" ? "없음" : "설정됨"}
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
              </>
            ) : null}

            {isPaid ? (
              <>
                <button
                  type="button"
                  className="showcase-profile-row showcase-profile-row--btn"
                  onClick={() => setOpenBiz((v) => !v)}
                >
                  <span className="showcase-profile-row__label">비즈니스 · 링크</span>
                  <span className="showcase-profile-row__trail">
                    {openBiz ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </button>
                {openBiz ? (
                  <div className="showcase-profile-nested">
                    <input
                      className={`showcase-style-settings__input w-full ${inputCls}`}
                      placeholder="Instagram URL"
                      value={config.commercial.outlinks.instagram}
                      onChange={(e) =>
                        persist({ commercial: { outlinks: { ...config.commercial.outlinks, instagram: e.target.value } } })
                      }
                    />
                    <input
                      className={`showcase-style-settings__input mt-2 w-full ${inputCls}`}
                      placeholder="YouTube URL"
                      value={config.commercial.outlinks.youtube}
                      onChange={(e) =>
                        persist({ commercial: { outlinks: { ...config.commercial.outlinks, youtube: e.target.value } } })
                      }
                    />
                    <p className="showcase-profile-block__sub mt-3">메뉴</p>
                    <BizListEditor
                      items={config.commercial.menuItems}
                      placeholder="메뉴명 · 가격"
                      inputCls={inputCls}
                      onChange={(menuItems) => persist({ commercial: { menuItems } })}
                    />
                    <p className="showcase-profile-block__sub mt-3">상품 링크</p>
                    <BizProductEditor
                      products={config.commercial.products || []}
                      inputCls={inputCls}
                      onChange={(products) => persist({ commercial: { products } })}
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

          {!hideHeader ? (
            <button type="button" className="showcase-style-settings__save-btn" onClick={commitApply}>
              적용하기
            </button>
          ) : (
            <div className="h-14" aria-hidden />
          )}

          <p className={`text-center text-[11px] ${subText}`}>
            사진 {photoCount}장 · {styleMeta.label}
          </p>
        </div>

        <aside
          className={`showcase-style-settings__preview-pane showcase-style-settings__preview-pane--sheet${previewCollapsed ? " showcase-style-settings__preview-pane--collapsed" : " is-open"}`}
        >
          <button
            type="button"
            className="showcase-style-settings__preview-toggle"
            onClick={() => setPreviewCollapsed((v) => !v)}
            onPointerDown={onPreviewPointerDown}
            onPointerMove={onPreviewPointerMove}
            onPointerUp={onPreviewPointerUp}
            onPointerCancel={onPreviewPointerUp}
            aria-expanded={!previewCollapsed}
            aria-controls="showcase-call-preview"
          >
            <span className="showcase-style-settings__preview-toggle-handle" aria-hidden />
            <span className="showcase-style-settings__preview-label">미리보기</span>
            <span className="showcase-style-settings__preview-toggle-hint" data-collapsed={previewCollapsed ? "1" : "0"}>
              {previewCollapsed ? "올리기" : "내리기"}
              {previewCollapsed ? <ChevronUp size={15} aria-hidden /> : <ChevronDown size={15} aria-hidden />}
            </span>
          </button>
          <div
            id="showcase-call-preview"
            className={`showcase-style-settings__preview-body showcase-style-settings__preview-body--sheet${previewCollapsed ? " is-collapsed" : ""}`}
            aria-hidden={previewCollapsed}
          >
            <div className="showcase-style-settings__sheet-stage">
              <div className="lettering-home-push-embed">
                <LetteringIncomingNotification
                  verified={config.verifiedBadgeOn !== false}
                  previewMode
                  showOwnerSettings={false}
                  callPhase="connected"
                  platform="android"
                  isRecording={false}
                  callDurationSec={0}
                  recordingDurationSec={0}
                  incomingNumber={card?.phone || ""}
                  card={card}
                  includeDigitalCard={includeDigitalCard}
                  isKnownContact
                  expanded={!previewCollapsed}
                  onExpandedChange={(open) => {
                    if (!open) setPreviewCollapsed(true);
                  }}
                  onEndCall={() => setPreviewCollapsed(true)}
                  onToast={onToast}
                  className="lettering-ongoing--on-call lettering-ongoing--fullscreen-tent lettering-ongoing--home-glass"
                />
              </div>
            </div>
          </div>
        </aside>
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

function BizListEditor({ items = [], placeholder, inputCls, onChange }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...items, v]);
    setDraft("");
  };
  return (
    <div>
      <div className="flex gap-2">
        <input
          className={`showcase-style-settings__input flex-1 ${inputCls}`}
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button type="button" className="showcase-bgm-picker__yt-btn" onClick={add}>
          추가
        </button>
      </div>
      <ul className="showcase-biz-list">
        {items.map((item, i) => (
          <li key={`${item}-${i}`}>
            {item}
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BizProductEditor({ products = [], inputCls, onChange }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const add = () => {
    if (!name.trim() || !url.trim()) return;
    onChange([...products, { id: `pr-${Date.now()}`, name: name.trim(), url: url.trim(), platform: detectPlatform(url) }]);
    setName("");
    setUrl("");
  };
  return (
    <div>
      <input
        className={`showcase-style-settings__input w-full ${inputCls}`}
        placeholder="상품명"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className={`showcase-style-settings__input mt-2 w-full ${inputCls}`}
        placeholder="쇼핑 URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <button type="button" className="showcase-bgm-picker__yt-btn mt-2 w-full" onClick={add}>
        상품 추가
      </button>
      <ul className="showcase-biz-list">
        {products.map((p) => (
          <li key={p.id}>
            {p.name} <small>({p.platform})</small>
            <button type="button" onClick={() => onChange(products.filter((x) => x.id !== p.id))}>
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function detectPlatform(url) {
  const u = String(url).toLowerCase();
  if (u.includes("coupang")) return "쿠팡";
  if (u.includes("naver") || u.includes("smartstore")) return "네이버";
  if (u.includes("kakao")) return "카카오";
  return "외부";
}
