import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp, Hash, Link2, Music2, Palette, ShoppingBag, Sparkles } from "lucide-react";
import BackButton from "../common/BackButton";
import { isPaidLetteringTier } from "../../lib/letteringMembership.js";
import { getShowcasePermissions, requiresPremium } from "../../lib/showcase/showcaseStylePermissions.js";
import {
  SHOWCASE_STYLE_CHANGED_EVENT,
  readShowcaseStyle,
  writeShowcaseStyle,
  parseShowcaseTagsInput
} from "../../lib/showcase/showcaseStyleStorage.js";
import { syncShowcaseTagsToServer } from "../../lib/showcase/showcaseTagsApi.js";
import { SHOWCASE_FONT_SETS, SHOWCASE_CASE_FRAMES, SHOWCASE_STYLE_LIST, SHOWCASE_STYLE_TYPES } from "../../lib/showcase/showcaseStyleTypes.js";
import { resolveVlueShowcaseCard } from "../../lib/vlueShowcaseCard.js";
import { VLUE_SHOWCASE } from "../../lib/vlueBrandSpaces.js";
import ShowcaseStylePreview from "./ShowcaseStylePreview.jsx";
import ShowcasePremiumGateModal from "./ShowcasePremiumGateModal.jsx";
import ShowcaseBgmPicker from "./ShowcaseBgmPicker.jsx";
import ShowcasePhotoEditor from "./ShowcasePhotoEditor.jsx";
import "./showcase-style-settings.css";

const TABS = [
  { id: "style", label: "스타일", icon: Palette },
  { id: "photos", label: "사진", icon: Sparkles },
  { id: "bgm", label: "음악", icon: Music2 },
  { id: "biz", label: "비즈니스", icon: ShoppingBag }
];

function gatePremium(feature, tier, setGate) {
  if (requiresPremium(feature, tier)) {
    setGate(true);
    return true;
  }
  return false;
}

export default function ShowcaseStyleSettingsPanel({
  membershipTier = "free",
  isDarkMode = false,
  onBack,
  onOpenUpgrade,
  /** 저장 완료 알림 (예: 「적용되었습니다.」) */
  onToast,
  /** AppFullScreenView 안 — 상단 헤더 숨김 */
  hideHeader = false,
  /** V1 전체 화면 시트 레이아웃 */
  fullscreen = false
}) {
  const isPaid = isPaidLetteringTier(membershipTier);
  const perms = getShowcasePermissions(membershipTier);
  const [config, setConfig] = useState(() => readShowcaseStyle());
  const [tab, setTab] = useState("style");
  const [previewPhase, setPreviewPhase] = useState("preview");
  const [gateOpen, setGateOpen] = useState(false);
  const [tagInput, setTagInput] = useState(() => (config.tags || []).join(" "));
  /** 전체화면(모바일)에서는 미리보기를 접어 설정 공간을 확보 */
  const [previewCollapsed, setPreviewCollapsed] = useState(() => Boolean(fullscreen));
  const previewDragRef = useRef({ startY: 0, dragging: false });

  const onPreviewPointerDown = useCallback((e) => {
    if (!fullscreen) return;
    previewDragRef.current = { startY: e.clientY, dragging: true };
  }, [fullscreen]);

  const onPreviewPointerMove = useCallback((e) => {
    if (!fullscreen || !previewDragRef.current.dragging) return;
    const dy = e.clientY - previewDragRef.current.startY;
    if (Math.abs(dy) < 28) return;
    if (dy > 28 && !previewCollapsed) {
      setPreviewCollapsed(true);
      previewDragRef.current.dragging = false;
    } else if (dy < -28 && previewCollapsed) {
      setPreviewCollapsed(false);
      previewDragRef.current.dragging = false;
    }
  }, [fullscreen, previewCollapsed]);

  const onPreviewPointerUp = useCallback(() => {
    previewDragRef.current.dragging = false;
  }, []);

  const card = useMemo(() => resolveVlueShowcaseCard({ membershipTier }), [membershipTier]);

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
    const onExternal = () => setConfig(readShowcaseStyle());
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
    const tags = parseShowcaseTagsInput(raw);
    persist({ tags });
  };

  useEffect(() => {
    if (!isPaid) return undefined;
    const tags = parseShowcaseTagsInput(tagInput);
    const timer = setTimeout(() => {
      void syncShowcaseTagsToServer(tags);
    }, 600);
    return () => clearTimeout(timer);
  }, [tagInput, isPaid]);

  const onBizTab = () => {
    if (!isPaid) {
      setGateOpen(true);
      return;
    }
    setTab("biz");
  };

  const onSave = useCallback(() => {
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

  const saveButton = (
    <button type="button" className="showcase-style-settings__save-btn" onClick={onSave}>
      저장
    </button>
  );

  return (
    <div
      className={`showcase-style-settings flex min-h-0 flex-1 flex-col ${fullscreen ? "showcase-style-settings--fullscreen" : ""} ${isDarkMode ? "showcase-style-settings--dark" : ""}`}
    >
      {!hideHeader ? (
      <div className={`flex shrink-0 items-center gap-2 border-b px-3 py-2.5 ${isDarkMode ? "border-white/10" : "border-slate-100"}`}>
        <BackButton variant="inline" onBack={onBack} isDarkMode={isDarkMode} />
        <div className="min-w-0 flex-1">
          <p className={`text-[17px] font-black ${headText}`}>{VLUE_SHOWCASE.nameKo}</p>
          <p className={`text-[11px] ${subText}`}>아래에서 스타일·사진·음악을 바로 설정하세요</p>
        </div>
      </div>
      ) : null}

      <nav className="showcase-style-settings__tabs" aria-label="쇼케이스 설정 탭">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`showcase-style-settings__tab${tab === id ? " active" : ""}${id === "biz" && !isPaid ? " locked" : ""}`}
            onClick={() => (id === "biz" ? onBizTab() : setTab(id))}
          >
            <Icon size={15} aria-hidden />
            {label}
          </button>
        ))}
      </nav>

      <div className={`showcase-style-settings__split${fullscreen ? " showcase-style-settings__split--fullscreen" : " min-h-0 flex-1 overflow-hidden"}`}>
        <div className={`showcase-style-settings__form overflow-y-auto px-4 py-4 ${fullscreen ? "vlue-scroll-pad-bottom-nav min-h-0 flex-1" : "vlue-scroll-pad-profile-panel"}`}>
          {tab === "style" && (
            <>
              <section className="showcase-style-settings__section">
                <h2 className="showcase-style-settings__label">통화 화면 스타일 선택</h2>
                <p className={`showcase-style-settings__hint ${subText}`}>원하는 스타일 카드를 누르세요. 아래 미리보기에 바로 반영됩니다.</p>
                <div className="showcase-style-settings__pick-list">
                  {SHOWCASE_STYLE_LIST.map((s) => {
                    const meta = SHOWCASE_STYLE_TYPES[s.id] || s;
                    const locked = !perms.allowedStyleIds.includes(s.id);
                    const active = config.styleType === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        className={`showcase-style-settings__pick-card${active ? " active" : ""}${locked ? " locked" : ""}`}
                        onClick={() => onSelectStyle(s.id)}
                      >
                        <span
                          className="showcase-style-settings__pick-icon"
                          style={{ backgroundColor: meta.accent || "#2b6ff0" }}
                          aria-hidden
                        >
                          {meta.emoji || "📱"}
                        </span>
                        <span className="showcase-style-settings__pick-body">
                          <span className="showcase-style-settings__pick-title">
                            {s.label}
                            {locked ? " · 유료" : ""}
                          </span>
                          <span className="showcase-style-settings__pick-desc">{meta.shortDesc || s.desc}</span>
                        </span>
                        {active ? <Check size={18} className="showcase-style-settings__pick-check" aria-hidden /> : null}
                      </button>
                    );
                  })}
                </div>
              </section>

              {config.styleType === "kakao" && (
                <section className="showcase-style-settings__section showcase-style-settings__card">
                  <h2 className="showcase-style-settings__label">카카오톡 프로필</h2>
                  <input
                    className={`showcase-style-settings__input w-full ${inputCls}`}
                    placeholder="카톡 프로필 링크"
                    value={config.platformFeed?.kakaoProfileUrl || ""}
                    onChange={(e) => persist({ platformFeed: { kakaoProfileUrl: e.target.value.trim() } })}
                  />
                  <input
                    className={`showcase-style-settings__input mt-2 w-full ${inputCls}`}
                    placeholder="표시 이름"
                    value={config.platformFeed?.kakaoProfileTitle || ""}
                    onChange={(e) => persist({ platformFeed: { kakaoProfileTitle: e.target.value } })}
                  />
                </section>
              )}

              {config.styleType === "instagram" && (
                <section className="showcase-style-settings__section showcase-style-settings__card">
                  <h2 className="showcase-style-settings__label">인스타그램 프로필</h2>
                  <input
                    className={`showcase-style-settings__input w-full ${inputCls}`}
                    placeholder="https://instagram.com/아이디"
                    value={config.platformFeed?.instagramProfileUrl || ""}
                    onChange={(e) => {
                      const url = e.target.value.trim();
                      const handle = url.match(/instagram\.com\/([^/?#]+)/i)?.[1];
                      persist({
                        platformFeed: {
                          instagramProfileUrl: url,
                          ...(handle ? { instagramHandle: `@${handle}` } : {})
                        }
                      });
                    }}
                  />
                  <input
                    className={`showcase-style-settings__input mt-2 w-full ${inputCls}`}
                    placeholder="@아이디"
                    value={config.platformFeed?.instagramHandle || ""}
                    onChange={(e) => persist({ platformFeed: { instagramHandle: e.target.value } })}
                  />
                </section>
              )}

              {config.styleType === "rich_custom" && (
                <>
                  <section className="showcase-style-settings__section">
                    <h2 className="showcase-style-settings__label">케이스 프레임</h2>
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
                  </section>
                  <section className="showcase-style-settings__section">
                    <h2 className="showcase-style-settings__label">텍스트 꾸미기</h2>
                    <div className="showcase-style-settings__toolbar">
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
                      <button
                        type="button"
                        className="showcase-style-settings__tool-btn"
                        onClick={() => persist({ richCustom: { emoji: (config.richCustom.emoji || "") + "✨" } })}
                      >
                        😊
                      </button>
                    </div>
                    <textarea
                      className={`showcase-style-settings__textarea ${inputCls}`}
                      rows={3}
                      placeholder="소개 문구 (이모지 😀🚀🔥 지원)"
                      value={config.richCustom.bodyText}
                      onChange={(e) => persist({ richCustom: { bodyText: e.target.value } })}
                    />
                  </section>
                </>
              )}

              <section className="showcase-style-settings__section">
                <h2 className="showcase-style-settings__label">
                  <Hash size={13} className="inline mr-1" aria-hidden />
                  해시태그
                </h2>
                <p className={`showcase-style-settings__hint ${subText}`}>
                  홈 검색에서 #태그로 내 쇼케이스를 찾을 수 있습니다. 유료 회원 전용.
                </p>
                <input
                  className={`showcase-style-settings__input w-full ${inputCls}`}
                  placeholder="#소금빵 #대구소금빵"
                  value={tagInput}
                  readOnly={!isPaid}
                  onFocus={() => {
                    if (gatePremium("hashtag", membershipTier, setGateOpen)) return;
                  }}
                  onChange={(e) => onTagsChange(e.target.value)}
                />
                {!isPaid ? (
                  <p className={`mt-1 text-[10px] ${subText}`}>유료 회원만 해시태그를 등록·검색 노출할 수 있습니다.</p>
                ) : (
                  <p className={`mt-1 text-[10px] ${subText}`}>공백으로 구분 · 최대 12개 · 저장 시 서버에 동기화됩니다.</p>
                )}
              </section>
              {saveButton}
            </>
          )}

          {tab === "photos" && (
            <>
              <section className="showcase-style-settings__section">
                <ShowcasePhotoEditor
                  photos={config.gallery?.photos || []}
                  onChange={(photos) => persist({ gallery: { photos } })}
                  inputCls={inputCls}
                />
              </section>
              {saveButton}
            </>
          )}

          {tab === "bgm" && config.styleType !== "default" && (
            <>
              <section className="showcase-style-settings__section">
                <ShowcaseBgmPicker
                  value={config.bgm}
                  inputCls={inputCls}
                  onChange={(bgm) => persist({ bgm: { ...config.bgm, ...bgm } })}
                />
              </section>
              {saveButton}
            </>
          )}

          {tab === "bgm" && config.styleType === "default" && (
            <>
              <p className={`text-[12px] ${subText}`}>기본형은 BGM 없음. 개인스타일·인스타·인증명함에서 설정하세요.</p>
              {saveButton}
            </>
          )}

          {tab === "biz" && isPaid && (
            <>
              <section className="showcase-style-settings__section showcase-style-settings__card">
                <h2 className="showcase-style-settings__label">
                  <Link2 size={13} className="inline mr-1" aria-hidden />
                  소셜 링크
                </h2>
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
                  placeholder="YouTube 구독 URL"
                  value={config.commercial.outlinks.youtube}
                  onChange={(e) =>
                    persist({ commercial: { outlinks: { ...config.commercial.outlinks, youtube: e.target.value } } })
                  }
                />
              </section>

              <section className="showcase-style-settings__section">
                <h2 className="showcase-style-settings__label">메뉴판</h2>
                <BizListEditor
                  items={config.commercial.menuItems}
                  placeholder="메뉴명 · 가격"
                  inputCls={inputCls}
                  onChange={(menuItems) => persist({ commercial: { menuItems } })}
                />
              </section>

              <section className="showcase-style-settings__section">
                <h2 className="showcase-style-settings__label">상품 소개 (외부 링크)</h2>
                <BizProductEditor
                  products={config.commercial.products || []}
                  inputCls={inputCls}
                  onChange={(products) => persist({ commercial: { products } })}
                />
              </section>

              <label className="showcase-style-settings__check">
                <input
                  type="checkbox"
                  checked={config.verifiedBadgeOn}
                  onChange={(e) => persist({ verifiedBadgeOn: e.target.checked })}
                />
                VLUE 공식 인증 마크 표시
              </label>
              {saveButton}
            </>
          )}

          <div className="showcase-style-settings__phase-toggle">
            <button type="button" className={previewPhase === "call_active" ? "active" : ""} onClick={() => setPreviewPhase("call_active")}>
              통화 중 (BGM OFF)
            </button>
            <button type="button" className={previewPhase === "preview" ? "active" : ""} onClick={() => setPreviewPhase("preview")}>
              종료 후 재생
            </button>
          </div>
        </div>

        <aside
          className={`showcase-style-settings__preview-pane${fullscreen ? " showcase-style-settings__preview-pane--fullscreen" : ""}${fullscreen && previewCollapsed ? " showcase-style-settings__preview-pane--collapsed" : ""}`}
        >
          {fullscreen ? (
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
              <span className="showcase-style-settings__preview-label">통화 화면 미리보기</span>
              <span className="showcase-style-settings__preview-toggle-hint" data-collapsed={previewCollapsed ? "1" : "0"}>
                <span className="showcase-style-settings__preview-toggle-shimmer">
                  {previewCollapsed ? "올리기" : "내리기"}
                </span>
                {previewCollapsed ? <ChevronUp size={15} aria-hidden /> : <ChevronDown size={15} aria-hidden />}
              </span>
            </button>
          ) : (
            <p className="showcase-style-settings__preview-label showcase-style-settings__preview-label--static">
              통화 화면 미리보기
            </p>
          )}
          <div
            id="showcase-call-preview"
            className={`showcase-style-settings__preview-body${previewCollapsed && fullscreen ? " is-collapsed" : ""}`}
            aria-hidden={fullscreen && previewCollapsed}
          >
            <ShowcaseStylePreview styleConfig={config} card={card} membershipTier={membershipTier} phase={previewPhase} />
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
        <input className={`showcase-style-settings__input flex-1 ${inputCls}`} placeholder={placeholder} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
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
      <input className={`showcase-style-settings__input w-full ${inputCls}`} placeholder="상품명" value={name} onChange={(e) => setName(e.target.value)} />
      <input className={`showcase-style-settings__input mt-2 w-full ${inputCls}`} placeholder="쿠팡/네이버/카카오 쇼핑 URL" value={url} onChange={(e) => setUrl(e.target.value)} />
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
