import { useCallback, useEffect, useMemo, useState } from "react";
import { Hash, Link2, Music2, Palette, ShoppingBag, Sparkles } from "lucide-react";
import BackButton from "../common/BackButton";
import { isPaidLetteringTier } from "../../lib/letteringMembership.js";
import { getShowcasePermissions, requiresPremium } from "../../lib/showcase/showcaseStylePermissions.js";
import {
  SHOWCASE_STYLE_CHANGED_EVENT,
  readShowcaseStyle,
  writeShowcaseStyle,
  parseShowcaseTagsInput
} from "../../lib/showcase/showcaseStyleStorage.js";
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
  onOpenUpgrade
}) {
  const isPaid = isPaidLetteringTier(membershipTier);
  const perms = getShowcasePermissions(membershipTier);
  const [config, setConfig] = useState(() => readShowcaseStyle());
  const [tab, setTab] = useState("style");
  const [previewPhase, setPreviewPhase] = useState("preview");
  const [gateOpen, setGateOpen] = useState(false);
  const [tagInput, setTagInput] = useState(() => (config.tags || []).join(" "));

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

  const onBizTab = () => {
    if (!isPaid) {
      setGateOpen(true);
      return;
    }
    setTab("biz");
  };

  const headText = isDarkMode ? "text-gray-100" : "text-slate-900";
  const subText = isDarkMode ? "text-gray-400" : "text-slate-500";
  const inputCls = isDarkMode ? "border-white/10 bg-white/5 text-gray-100" : "border-slate-200 bg-white text-slate-900";

  return (
    <div className={`showcase-style-settings flex min-h-0 flex-1 flex-col ${isDarkMode ? "showcase-style-settings--dark" : ""}`}>
      <div className={`flex shrink-0 items-center gap-2 border-b px-3 py-2.5 ${isDarkMode ? "border-white/10" : "border-slate-100"}`}>
        <BackButton variant="inline" onBack={onBack} isDarkMode={isDarkMode} />
        <div className="min-w-0 flex-1">
          <p className={`text-[17px] font-black ${headText}`}>{VLUE_SHOWCASE.nameKo}</p>
          <p className={`text-[11px] ${subText}`}>카카오톡·인스타 감성으로 꾸며보세요</p>
        </div>
      </div>

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

      <div className="showcase-style-settings__split min-h-0 flex-1 overflow-hidden">
        <div className="showcase-style-settings__form vlue-scroll-pad-profile-panel overflow-y-auto px-4 py-4">
          {tab === "style" && (
            <>
              <section className="showcase-style-settings__section showcase-style-settings__section--ig">
                <h2 className="showcase-style-settings__label">프로필 스타일</h2>
                <div className="showcase-style-settings__style-grid showcase-style-settings__style-grid--story">
                  {SHOWCASE_STYLE_LIST.map((s) => {
                    const locked = !perms.allowedStyleIds.includes(s.id);
                    const active = config.styleType === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        className={`showcase-style-settings__story-chip${active ? " active" : ""}${locked ? " locked" : ""}`}
                        onClick={() => onSelectStyle(s.id)}
                      >
                        <span className="showcase-style-settings__story-ring" />
                        <span className="showcase-style-settings__story-label">{s.label}</span>
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
                  해시태그 (V2 검색 예정)
                </h2>
                <input
                  className={`showcase-style-settings__input w-full ${inputCls}`}
                  placeholder="#소금빵 #대구소금빵"
                  value={tagInput}
                  onFocus={() => {
                    if (gatePremium("hashtag", membershipTier, setGateOpen)) return;
                  }}
                  onChange={(e) => {
                    if (gatePremium("hashtag", membershipTier, setGateOpen)) return;
                    setTagInput(e.target.value);
                    persist({ tags: parseShowcaseTagsInput(e.target.value) });
                  }}
                />
                {!isPaid ? <p className={`mt-1 text-[10px] ${subText}`}>유료 회원만 해시태그 등록 가능 (V2 마이케이스 검색)</p> : null}
              </section>
            </>
          )}

          {tab === "photos" && (
            <section className="showcase-style-settings__section">
              <ShowcasePhotoEditor
                photos={config.gallery?.photos || []}
                onChange={(photos) => persist({ gallery: { photos } })}
                inputCls={inputCls}
              />
            </section>
          )}

          {tab === "bgm" && config.styleType !== "default" && (
            <section className="showcase-style-settings__section">
              <ShowcaseBgmPicker
                value={config.bgm}
                inputCls={inputCls}
                onChange={(bgm) => persist({ bgm: { ...config.bgm, ...bgm } })}
              />
            </section>
          )}

          {tab === "bgm" && config.styleType === "default" && (
            <p className={`text-[12px] ${subText}`}>기본형은 BGM 없음. 개인스타일·인스타·인증명함에서 설정하세요.</p>
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

        <aside className="showcase-style-settings__preview-pane">
          <ShowcaseStylePreview styleConfig={config} card={card} membershipTier={membershipTier} phase={previewPhase} />
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
