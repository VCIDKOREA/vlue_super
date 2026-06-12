import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  dataUrlToBase64,
  postAiGenerate,
  postRegisterPageProduct
} from "../../lib/vlueCoreShoppingApi.js";
import { fetchScrapeProduct } from "../../lib/scrapeProductApi.js";
import { syncStoreProductToServer } from "../../lib/shopApi.js";
import { invalidatePageFeedCache } from "../../lib/mediaCommerceFeedService.js";
import { emitVaultChanged } from "../../lib/shoppingCoreStorage.js";
import ScreenBackHeader from "../common/ScreenBackHeader";
import SourcingFormSection from "./sourcing/SourcingFormSection.jsx";
import SourcingUnifiedMediaSection from "./sourcing/SourcingUnifiedMediaSection.jsx";
import ProductMediaDisplay from "./ProductMediaDisplay.jsx";
import SourcingCategorySelect from "./sourcing/SourcingCategorySelect.jsx";
import {
  getSourcingCategoryFields,
  mapSourcingCategoryToFeed
} from "../../lib/sourcingRegisterCategories.js";
import {
  MAX_HASHTAGS,
  MAX_SOURCING_PHOTOS,
  MAX_TITLE_LEN,
  buildDefaultFormState,
  buildRegisterMediaFromForm,
  calcDiscountPercent,
  clearSourcingDraft,
  compressImageFile,
  formatPriceDisplay,
  parsePriceDigits,
  readSourcingDraft,
  sectionComplete,
  validateSourcingForm,
  writeSourcingDraft
} from "../../lib/sourcingProductFormUtils.js";
import { publishSourcingToMyPage } from "../../lib/sourcingMyPageSync.js";
import { getPageDisplayProfile, isPageCreated } from "../../lib/pageProfileStorage.js";
import AuctionRegisterFields, {
  auctionPayloadFromForm,
  buildDefaultAuctionFields
} from "../auction/AuctionRegisterFields.jsx";
import { postCreateAuction } from "../../lib/auctionApi.js";

const AI_VIOLET = "bg-[#A78BFA] hover:bg-[#9F7AEE]";

function formatKrw(n) {
  return `${Number(n || 0).toLocaleString("ko-KR")}원`;
}

export default function AiSourcingUploadScreen({ onBack, onToast, isDarkMode = false }) {
  const [form, setForm] = useState(buildDefaultFormState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const aiAutoRunRef = useRef(false);
  const [saleType, setSaleType] = useState("normal");
  const patch = useCallback((partial) => setForm((f) => ({ ...f, ...partial })), []);

  const inputCls = isDarkMode
    ? "w-full rounded-xl border border-white/10 bg-[#0f1218] px-3 py-2.5 text-[13px] text-gray-100 outline-none placeholder:text-gray-500"
    : "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-900 outline-none";

  const sub = isDarkMode ? "text-gray-400" : "text-slate-500";
  const discount = useMemo(
    () => calcDiscountPercent(form.salePrice, form.listPrice),
    [form.salePrice, form.listPrice]
  );
  const missing = useMemo(() => validateSourcingForm(form, { saleType }), [form, saleType]);
  const canRegister = missing.length === 0 && !busy;

  useEffect(() => {
    const saved = readSourcingDraft();
    if (saved) setForm((f) => ({ ...f, ...saved }));
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const scrollToSection = (id) => {
    document.getElementById(`sourcing-section-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const runAiAutofill = useCallback(async (sourcesOverride) => {
    const sources = sourcesOverride || form.previews;
    if (!sources.length) {
      setError("상품 사진을 1장 이상 업로드해 주세요.");
      scrollToSection("media");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await postAiGenerate({
        imageBase64List: sources.map((u) => dataUrlToBase64(u))
      });
      const d = data.draft || {};
      patch({
        draft: d,
        provider: data.provider || "",
        title: (d.title || form.title).slice(0, MAX_TITLE_LEN),
        description: d.marketingDescription || d.summary || form.description,
        salePrice: String(d.priceKrw || d.suggestedPrice || "").replace(/\D/g, "") || form.salePrice
      });
      onToast?.(`사진 분석 완료 · 상품명·설명을 확인해 주세요 (${data.provider === "openai" ? "Vision" : "템플릿"})`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "사진 분석에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }, [form.previews, form.title, form.description, form.salePrice, onToast, patch]);

  const queuePhotoAi = useCallback(
    (sources) => {
      if (!sources.length || busy) return;
      window.setTimeout(() => runAiAutofill(sources), 0);
    },
    [busy, runAiAutofill]
  );

  const onPickFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setError("");
    try {
      const urls = await Promise.all(files.map((f) => compressImageFile(f)));
      const hadPhotos = form.previews.length > 0;
      const nextPreviews = [...form.previews, ...urls].slice(0, MAX_SOURCING_PHOTOS);
      setForm((f) => ({
        ...f,
        previews: nextPreviews,
        draft: null
      }));
      if (!hadPhotos && nextPreviews.length > 0 && !aiAutoRunRef.current) {
        aiAutoRunRef.current = true;
        queuePhotoAi(nextPreviews);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "이미지를 불러오지 못했습니다.");
    }
  }, [form.previews, queuePhotoAi]);

  const aiImageSources = useMemo(() => form.previews, [form.previews]);

  const runScrapeImport = async () => {
    const url = form.inlineUrl.trim();
    if (!url) {
      setError("상품 URL을 입력해 주세요.");
      return;
    }
    setScrapeLoading(true);
    setError("");
    patch({ scrapeHint: "" });
    try {
      const data = await fetchScrapeProduct(url);
      if (data.blocked || !data.ok) {
        patch({
          scrapeHint: data.message || "해당 사이트는 직접 입력이 필요합니다"
        });
        return;
      }
      const imageUrl = data.imageUrl || "";
      patch({
        inlineItem: {
          sourceUrl: url,
          platform: /coupang/i.test(url) ? "coupang" : /smartstore|naver/i.test(url) ? "smartstore" : "store",
          title: data.title,
          priceKrw: data.price || 0,
          imageUrl,
          description: data.description || ""
        },
        inlineUrl: url,
        title: (data.title || "").slice(0, MAX_TITLE_LEN),
        salePrice: data.price ? String(data.price) : form.salePrice,
        description: data.description || form.description,
        previews: imageUrl
          ? [imageUrl, ...form.previews.filter((u) => u !== imageUrl)].slice(0, MAX_SOURCING_PHOTOS)
          : form.previews,
        scrapeHint: ""
      });
      onToast?.("상품 정보를 성공적으로 불러왔습니다! 수정할 부분을 확인하세요.");
    } catch (e) {
      patch({ scrapeHint: "해당 사이트는 직접 입력이 필요합니다" });
      setError(e instanceof Error ? e.message : "스크래핑에 실패했습니다.");
    } finally {
      setScrapeLoading(false);
    }
  };

  const addHashtag = (raw) => {
    const t = String(raw || "")
      .trim()
      .replace(/^#+/, "");
    if (!t || form.hashtags.length >= MAX_HASHTAGS) return;
    if (form.hashtags.includes(t)) return;
    patch({ hashtags: [...form.hashtags, t] });
    setTagInput("");
  };

  const saveDraft = () => {
    writeSourcingDraft(form);
    onToast?.("임시저장했습니다.");
  };

  const submitRegister = async () => {
    const miss = validateSourcingForm(form, { saleType });
    if (miss.length) {
      setError(`${miss.map((m) => m.label).join(", ")}을(를) 입력해 주세요.`);
      scrollToSection(miss[0].id);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const media = buildRegisterMediaFromForm(form);
      const feedCategory = mapSourcingCategoryToFeed(form.category);

      if (saleType === "auction") {
        await postCreateAuction(auctionPayloadFromForm(form, media));
        clearSourcingDraft();
        onToast?.("VLUE 개인 경매가 등록되었습니다.");
        onBack?.();
        return;
      }

      const reg = await postRegisterPageProduct({
        title: form.title.trim(),
        priceKrw: Number(parsePriceDigits(form.salePrice)) || 0,
        description: form.description.trim() || form.draft?.marketingDescription || "",
        imageUrls: media.imageUrls.slice(0, MAX_SOURCING_PHOTOS),
        videoUrl: media.videoUrl,
        mediaKind: media.mediaKind,
        listingType: media.listingType,
        sourceUrl: form.inlineItem?.sourceUrl || form.inlineUrl.trim(),
        sourceType: form.inlineItem ? "inline" : "ai",
        platform: form.inlineItem?.platform || "store",
        category: feedCategory,
        draft: {
          ...(form.draft || {}),
          sourcingCategory: form.category,
          listPriceKrw: Number(parsePriceDigits(form.listPrice)) || 0,
          quantity: form.quantity,
          hashtags: form.hashtags,
          tradeMethods: form.tradeMethods,
          shipping: form.tradeMethods.parcel ? form.shipping : null,
          categoryExtras: form.categoryExtras,
          listingType: media.listingType,
          mediaKind: media.mediaKind
        }
      });
      const externalId = reg?.vault?.id || `src-${Date.now()}`;
      const listPrice = Number(parsePriceDigits(form.listPrice)) || Number(parsePriceDigits(form.salePrice)) || 0;
      const salePrice = Number(parsePriceDigits(form.salePrice)) || 0;
      await syncStoreProductToServer({
        id: externalId,
        name: form.title.trim(),
        priceKrw: listPrice,
        salePriceKrw: salePrice < listPrice ? salePrice : null,
        shippingFeeKrw: form.tradeMethods?.parcel ? Number(form.shipping?.fee) || 0 : 0,
        stock: Math.max(0, Number(form.quantity) || 0),
        status: "on_sale"
      });
      if (form.syncToMyPage) {
        if (!isPageCreated()) {
          onToast?.("상품은 등록됐습니다. 마이페이지 게시물은 페이지 생성 후 가능합니다.");
        } else {
          const { feedName } = getPageDisplayProfile();
          const sync = publishSourcingToMyPage(form, { shopName: feedName });
          if (sync.ok) {
            onToast?.("매대 등록 · 마이페이지 게시물에 반영했습니다.");
          } else {
            onToast?.("매대 등록 완료. 마이페이지용 미디어가 없어 게시물은 생략했습니다.");
          }
        }
      } else {
        onToast?.("페이지 쇼핑 매대에 등록했습니다.");
      }
      invalidatePageFeedCache();
      emitVaultChanged();
      clearSourcingDraft();
      onBack?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "등록에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const categoryFields = getSourcingCategoryFields(form.category);

  return (
    <div className={`flex h-full min-h-0 flex-1 flex-col overflow-hidden ${isDarkMode ? "bg-[#0b0c10]" : "bg-[#f4f6fa]"}`}>
      <ScreenBackHeader title="소싱 · 등록" onBack={onBack} isDarkMode={isDarkMode} />

      <div className="mx-auto w-full max-w-lg min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-4 pb-32">
        <div className={`flex rounded-2xl border p-1 ${isDarkMode ? "border-white/10 bg-[#12151c]" : "border-slate-200 bg-white"}`}>
          {[
            { id: "normal", label: "일반 판매" },
            { id: "auction", label: "개인 경매" }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setSaleType(tab.id);
                if (tab.id === "auction" && !form.auction) {
                  patch({ auction: buildDefaultAuctionFields() });
                }
              }}
              className={`flex-1 rounded-xl py-2.5 text-[12px] font-black transition ${
                saleType === tab.id
                  ? "bg-violet-600 text-white shadow-sm"
                  : isDarkMode
                    ? "text-gray-400"
                    : "text-slate-500"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <label
          className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
            isDarkMode ? "border-white/10 bg-[#12151c]" : "border-slate-200 bg-white"
          }`}
        >
          <input
            type="checkbox"
            checked={form.useExternalUrl}
            onChange={(e) => patch({ useExternalUrl: e.target.checked, scrapeHint: "" })}
          />
          <span className={`text-[13px] font-black ${isDarkMode ? "text-gray-100" : "text-slate-900"}`}>
            외부 쇼핑몰 URL로 불러오기
          </span>
        </label>

        {form.useExternalUrl ? (
          <div
            id="sourcing-section-url"
            className={`rounded-xl border px-3 py-3 ${
              isDarkMode ? "border-blue-500/30 bg-blue-950/20" : "border-blue-100 bg-blue-50/60"
            }`}
          >
            <p className={`text-[11px] ${sub}`}>쿠팡 · 네이버 스마트스토어 등</p>
            <input
              value={form.inlineUrl}
              onChange={(e) => patch({ inlineUrl: e.target.value, scrapeHint: "" })}
              placeholder="https://..."
              className={`${inputCls} mt-2`}
            />
            <button
              type="button"
              disabled={scrapeLoading || busy}
              onClick={runScrapeImport}
              className={`mt-2 w-full rounded-xl py-2.5 text-[12px] font-black text-white disabled:opacity-50 ${
                isDarkMode ? "bg-blue-600" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {scrapeLoading ? "정보를 읽어오는 중…" : "가져오기"}
            </button>
            {form.scrapeHint ? (
              <p className="mt-2 text-[11px] font-semibold leading-relaxed text-amber-700">{form.scrapeHint}</p>
            ) : null}
          </div>
        ) : null}

        {/* 1. 사진 + 비디오 URL (통합 등록) */}
        <SourcingFormSection
          id="media"
          title="상품 미디어"
          required
          complete={sectionComplete(form, "media")}
          isDarkMode={isDarkMode}
        >
          <p className={`text-[11px] leading-relaxed ${sub}`}>
            사진과 설명 영상 URL을 한곳에서 등록합니다. 노출 시 영상과 사진이 분리되어 표시됩니다.
          </p>
          <SourcingUnifiedMediaSection
            previews={form.previews}
            onPreviewsChange={(previews) => patch({ previews, draft: null })}
            onPickGalleryFiles={onPickFiles}
            videoUrl={form.videoUrl}
            onVideoUrlChange={(videoUrl) => patch({ videoUrl })}
            onToast={onToast}
            isDarkMode={isDarkMode}
          />
          <button
            type="button"
            disabled={busy || !aiImageSources.length}
            onClick={() => runAiAutofill()}
            className={`mt-3 w-full rounded-xl py-3 text-[13px] font-black text-white disabled:opacity-50 ${AI_VIOLET}`}
          >
            {busy ? "사진 분석 중…" : "사진으로 AI 자동완성"}
          </button>
          {form.provider ? (
            <p className={`mt-1 text-[10px] ${sub}`}>분석 엔진: {form.provider === "openai" ? "Vision" : "템플릿"}</p>
          ) : null}
        </SourcingFormSection>

        {/* 2. 기본 정보 */}
        <SourcingFormSection
          id="basic"
          title="상품 기본 정보"
          required
          complete={sectionComplete(form, "basic")}
          isDarkMode={isDarkMode}
        >
          <label className={`block text-[12px] font-semibold ${sub}`}>
            상품명 <span className="text-rose-500">*</span>
          </label>
          <input
            value={form.title}
            maxLength={MAX_TITLE_LEN}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="상품명을 입력하세요"
            className={`${inputCls} mt-1`}
          />
          <p className={`mt-0.5 text-right text-[10px] ${sub}`}>
            {form.title.length}/{MAX_TITLE_LEN}
          </p>

          <label className={`mt-4 block text-[12px] font-semibold ${sub}`}>
            카테고리 <span className="text-rose-500">*</span>
          </label>
          <div className="mt-1">
            <SourcingCategorySelect
              value={form.category}
              onChange={(name) => patch({ category: name, categoryExtras: {} })}
              isDarkMode={isDarkMode}
              error={Boolean(error && !form.category)}
            />
          </div>

          {categoryFields.length ? (
            <div className="mt-3 space-y-2">
              <p className={`text-[11px] font-bold ${sub}`}>{form.category} 추가 정보</p>
              {categoryFields.map((field) => (
                <div key={field.key}>
                  <label className={`text-[11px] font-medium ${sub}`}>{field.label}</label>
                  {field.type === "textarea" ? (
                    <textarea
                      rows={2}
                      value={form.categoryExtras[field.key] || ""}
                      onChange={(e) =>
                        patch({
                          categoryExtras: { ...form.categoryExtras, [field.key]: e.target.value }
                        })
                      }
                      placeholder={field.placeholder}
                      className={`${inputCls} mt-0.5`}
                    />
                  ) : (
                    <input
                      value={form.categoryExtras[field.key] || ""}
                      onChange={(e) =>
                        patch({
                          categoryExtras: { ...form.categoryExtras, [field.key]: e.target.value }
                        })
                      }
                      placeholder={field.placeholder}
                      className={`${inputCls} mt-0.5`}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </SourcingFormSection>

        {saleType === "auction" ? (
          <SourcingFormSection
            id="auction"
            title="경매 설정"
            required
            complete={Boolean(form.auction?.startPrice && form.auction?.startsAt && form.auction?.endsAt)}
            isDarkMode={isDarkMode}
          >
            <AuctionRegisterFields
              form={form}
              patch={patch}
              inputCls={inputCls}
              sub={sub}
              busy={busy}
              setBusy={setBusy}
              setError={setError}
              onToast={onToast}
            />
          </SourcingFormSection>
        ) : null}

        {/* 2. 가격 */}
        {saleType === "normal" ? (
        <SourcingFormSection
          id="price"
          title="가격"
          required
          complete={sectionComplete(form, "price")}
          isDarkMode={isDarkMode}
        >
          <label className={`text-[12px] font-semibold ${sub}`}>
            판매가 <span className="text-rose-500">*</span>
          </label>
          <div className="relative mt-1">
            <input
              inputMode="numeric"
              value={formatPriceDisplay(form.salePrice)}
              onChange={(e) => patch({ salePrice: parsePriceDigits(e.target.value) })}
              placeholder="0"
              className={`${inputCls} pr-10 font-black`}
            />
            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-bold ${sub}`}>원</span>
          </div>
          <label className={`mt-3 block text-[12px] font-semibold ${sub}`}>정가 (선택)</label>
          <div className="relative mt-1">
            <input
              inputMode="numeric"
              value={formatPriceDisplay(form.listPrice)}
              onChange={(e) => patch({ listPrice: parsePriceDigits(e.target.value) })}
              placeholder="할인 전 가격"
              className={`${inputCls} pr-10`}
            />
            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[13px] ${sub}`}>원</span>
          </div>
          {discount != null ? (
            <p className={`mt-1 text-[12px] font-bold ${isDarkMode ? "text-rose-400" : "text-rose-600"}`}>
              {discount}% 할인
            </p>
          ) : null}

          <label className={`mt-3 block text-[12px] font-semibold ${sub}`}>수량</label>
          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => patch({ quantity: Math.max(1, form.quantity - 1) })}
              className={`h-10 w-10 rounded-xl border text-lg font-bold ${isDarkMode ? "border-white/15" : "border-slate-200"}`}
            >
              −
            </button>
            <span className={`min-w-[3rem] text-center text-[16px] font-black ${isDarkMode ? "text-gray-100" : "text-slate-900"}`}>
              {form.quantity}
            </span>
            <button
              type="button"
              onClick={() => patch({ quantity: Math.min(999, form.quantity + 1) })}
              className={`h-10 w-10 rounded-xl border text-lg font-bold ${isDarkMode ? "border-white/15" : "border-slate-200"}`}
            >
              +
            </button>
          </div>
        </SourcingFormSection>
        ) : null}

        {/* 배송 */}
        {form.tradeMethods.parcel ? (
          <SourcingFormSection
            id="shipping"
            title="배송"
            complete={sectionComplete(form, "shipping")}
            isDarkMode={isDarkMode}
          >
            <p className={`text-[12px] font-semibold ${sub}`}>배송비 부담</p>
            <div className="mt-2 space-y-1.5 text-[13px]">
              {[
                { id: "seller", label: "판매자 부담" },
                { id: "buyer", label: "구매자 부담" }
              ].map((o) => (
                <label key={o.id} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="feePayer"
                    checked={form.shipping.feePayer === o.id}
                    onChange={() => patch({ shipping: { ...form.shipping, feePayer: o.id } })}
                  />
                  {o.label}
                </label>
              ))}
            </div>
            {form.shipping.feePayer === "buyer" ? (
              <div className="relative mt-2">
                <input
                  inputMode="numeric"
                  value={formatPriceDisplay(form.shipping.shippingFee)}
                  onChange={(e) =>
                    patch({
                      shipping: {
                        ...form.shipping,
                        shippingFee: parsePriceDigits(e.target.value)
                      }
                    })
                  }
                  placeholder="배송비"
                  className={`${inputCls} pr-10`}
                />
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[13px] ${sub}`}>원</span>
              </div>
            ) : null}
            <label className={`mt-3 block text-[12px] font-semibold ${sub}`}>출고 소요일</label>
            <select
              value={form.shipping.leadDays}
              onChange={(e) => patch({ shipping: { ...form.shipping, leadDays: e.target.value } })}
              className={`${inputCls} mt-1`}
            >
              <option value="1">1일 이내</option>
              <option value="2">2일 이내</option>
              <option value="3">3일 이내</option>
              <option value="5">5일 이내</option>
            </select>
          </SourcingFormSection>
        ) : null}

        {/* 마지막: 상품 상세 (직접 작성) */}
        <SourcingFormSection
          id="detail"
          title="상품 상세"
          complete={sectionComplete(form, "detail")}
          isDarkMode={isDarkMode}
        >
          <label className={`text-[12px] font-semibold ${sub}`}>상품 설명</label>
          <p className={`text-[10px] ${sub}`}>
            사진 분석으로 채워진 내용을 확인·수정하세요. 직접 작성도 가능합니다.
          </p>
          <textarea
            value={form.description}
            onChange={(e) => patch({ description: e.target.value })}
            rows={6}
            placeholder="상세 설명을 입력하세요"
            className={`${inputCls} mt-1 leading-relaxed`}
          />

          <label className={`mt-3 block text-[12px] font-semibold ${sub}`}>해시태그 (최대 {MAX_HASHTAGS}개)</label>
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                addHashtag(tagInput);
              }
            }}
            placeholder="#태그 입력 후 Enter"
            className={`${inputCls} mt-1`}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {form.hashtags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => patch({ hashtags: form.hashtags.filter((h) => h !== t) })}
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  isDarkMode ? "bg-blue-600/30 text-blue-200" : "bg-blue-50 text-blue-700"
                }`}
              >
                #{t} ×
              </button>
            ))}
          </div>

          <p className={`mt-4 text-[12px] font-semibold ${sub}`}>거래 방식</p>
          <label className="mt-2 flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={form.tradeMethods.parcel}
              onChange={(e) =>
                patch({ tradeMethods: { ...form.tradeMethods, parcel: e.target.checked } })
              }
            />
            택배거래 (선택)
          </label>
          <label className="mt-1 flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={form.tradeMethods.vluePay}
              onChange={(e) =>
                patch({ tradeMethods: { ...form.tradeMethods, vluePay: e.target.checked } })
              }
            />
            무조건 VLUE 안심결제
          </label>

          <label
            className={`mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-3 ${
              isDarkMode ? "border-violet-500/35 bg-violet-950/30" : "border-violet-200 bg-violet-50/80"
            }`}
          >
            <input
              type="checkbox"
              className="mt-0.5"
              checked={form.syncToMyPage}
              onChange={(e) => patch({ syncToMyPage: e.target.checked })}
            />
            <span>
              <span className={`block text-[13px] font-black ${isDarkMode ? "text-violet-100" : "text-violet-950"}`}>
                페이지 동시 업로드
              </span>
              <span className={`mt-0.5 block text-[11px] leading-relaxed ${sub}`}>
                상품 등록 시 마이페이지 활동 보드에 게시물을 자동으로 올립니다.
              </span>
            </span>
          </label>
        </SourcingFormSection>

        {error ? <p className="text-[12px] font-semibold text-rose-600">{error}</p> : null}
      </div>

      {/* 하단 고정 */}
      <div
        className={`shrink-0 border-t px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${
          isDarkMode ? "border-white/10 bg-[#111827]" : "border-slate-200 bg-white"
        }`}
      >
        <div className="mx-auto flex max-w-lg gap-2">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className={`shrink-0 rounded-xl border px-3 py-3 text-[12px] font-bold ${
              isDarkMode ? "border-white/15 text-gray-300" : "border-slate-200 text-slate-600"
            }`}
          >
            미리보기
          </button>
          <button
            type="button"
            onClick={saveDraft}
            className={`flex-1 rounded-xl border py-3 text-[13px] font-bold ${
              isDarkMode ? "border-white/15 text-gray-200" : "border-slate-300 text-slate-700"
            }`}
          >
            임시저장
          </button>
          <button
            type="button"
            disabled={!canRegister}
            onClick={submitRegister}
            className={`flex-[1.2] rounded-xl py-3 text-[13px] font-black text-white disabled:opacity-45 ${AI_VIOLET}`}
          >
            상품 등록
          </button>
        </div>
        {!canRegister && missing.length ? (
          <p className={`mx-auto mt-1 max-w-lg text-center text-[10px] ${sub}`}>
            필수: {missing.map((m) => m.label).join(", ")}
          </p>
        ) : null}
      </div>

      {previewOpen ? (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 p-3 sm:items-center">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="미리보기 닫기"
            onClick={() => setPreviewOpen(false)}
          />
          <div
            className={`relative z-[1] max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl p-4 ${
              isDarkMode ? "bg-[#151821] text-gray-100" : "bg-white text-slate-900"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-black">등록 미리보기</p>
              <button type="button" onClick={() => setPreviewOpen(false)} className="text-[12px] font-bold text-slate-500">
                닫기
              </button>
            </div>
            <ProductMediaDisplay
              videoUrl={form.videoUrl}
              imageUrls={form.previews}
              className="mt-3"
            />
            <p className="mt-2 text-[16px] font-black">{form.title || "상품명 없음"}</p>
            <p className="text-[14px] font-bold text-violet-600">{formatKrw(parsePriceDigits(form.salePrice))}</p>
            {discount != null ? (
              <p className="text-[12px] text-rose-500 line-through">{formatKrw(parsePriceDigits(form.listPrice))}</p>
            ) : null}
            <p className={`mt-2 text-[12px] ${sub}`}>{form.category || "카테고리 미선택"}</p>
            <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed">
              {form.description || "설명 없음"}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
