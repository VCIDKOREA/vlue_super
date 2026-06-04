import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchB2bEnterpriseBranding,
  patchB2bEnterpriseBranding,
  uploadB2bEnterpriseLogo
} from "../lib/b2bEnterpriseApi.js";
import { applyCorporateBrandingToCard } from "../lib/b2bCorporateBranding.js";
import { notifyB2bBrandingChanged } from "../lib/b2bBrandingEvents.js";
import { logB2bPipeline } from "../lib/b2bPipelineLog.js";
import { readImageFileAsDataUrl } from "../lib/readImageFile.js";
import {
  buildUserLetteringCard,
  withLetteringBizcardPreviewFallback
} from "../lib/letteringBizcardProfile.js";
import LetteringBusinessCardPanel from "./LetteringBusinessCardPanel.jsx";
import { B2B_LOGO_SPEC, b2bLogoSizeGuideText } from "../lib/b2bLogoSpec.js";

const DEFAULT_PRIMARY = "#1e3a8a";
const DEFAULT_SECONDARY = "#3b82f6";

const FONT_OPTIONS = [
  { id: "pretendard", label: "Pretendard (기본)", value: "Pretendard, sans-serif" },
  { id: "noto", label: "Noto Sans KR", value: "Noto Sans KR, sans-serif" },
  { id: "apple", label: "Apple SD Gothic Neo", value: "Apple SD Gothic Neo, sans-serif" },
  { id: "malgun", label: "맑은 고딕", value: "Malgun Gothic, sans-serif" },
  { id: "serif", label: "명조(Georgia)", value: "Georgia, serif" }
];

export default function EnterpriseBrandingEditor({ onToast, companyName = "", onSaved }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFileName, setLogoFileName] = useState("");
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_SECONDARY);
  const [fontFamily, setFontFamily] = useState(FONT_OPTIONS[0].value);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchB2bEnterpriseBranding();
      const b = data.branding || {};
      setLogoUrl(String(b.logoUrl || ""));
      setLogoFileName(String(b.logoFileName || ""));
      setPrimaryColor(String(b.primaryColor || DEFAULT_PRIMARY));
      setSecondaryColor(String(b.secondaryColor || DEFAULT_SECONDARY));
      setFontFamily(String(b.fontFamily || FONT_OPTIONS[0].value));
    } catch (e) {
      onToast?.(e?.message || "브랜딩 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    load();
  }, [load]);

  const previewCard = useMemo(() => {
    const base = withLetteringBizcardPreviewFallback(
      buildUserLetteringCard({ membershipTier: "premium" })
    );
    if (companyName) base.organization = companyName;
    return applyCorporateBrandingToCard(
      base,
      {
        logoUrl,
        primaryColor,
        secondaryColor,
        fontFamily
      },
      { company_name: companyName || base.organization }
    );
  }, [logoUrl, primaryColor, secondaryColor, fontFamily, companyName]);

  const handleLogoFile = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const { dataUrl, fileName } = await readImageFileAsDataUrl(file);
      const result = await uploadB2bEnterpriseLogo({ dataUrl, fileName });
      setLogoUrl(String(result.branding?.logoUrl || dataUrl));
      setLogoFileName(fileName);
      logB2bPipeline("branding.logo_uploaded", { fileName });
      notifyB2bBrandingChanged({ logo: true });
      onSaved?.();
      onToast?.("로고가 업로드되었습니다. 이 기업 계정 전체 명함에 적용됩니다.");
    } catch (e) {
      onToast?.(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      const result = await patchB2bEnterpriseBranding({
        logoUrl: logoUrl.trim(),
        logoFileName: logoFileName || undefined,
        primaryColor,
        secondaryColor,
        fontFamily
      });
      logB2bPipeline("branding.saved", {
        appliesAccountWide: result.appliesAccountWide
      });
      notifyB2bBrandingChanged({ full: true });
      onSaved?.();
      onToast?.("기업 CI/BI가 저장되었습니다. 관리자·귀속 임직원 명함에 전체 적용됩니다.");
      await load();
    } catch (e) {
      logB2bPipeline("branding.save_failed", { error: e?.message });
      onToast?.(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="py-6 text-center text-[12px] text-slate-500">브랜딩 설정 불러오는 중…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-violet-100 bg-violet-50/70 p-3 text-[11px] leading-relaxed text-violet-950">
        <p className="font-black">기업 CI/BI 브랜딩 편집기</p>
        <p className="mt-1">
          저장·로고 업로드 시 <b>기업 관리자 계정</b>과 <b>귀속된 모든 임직원</b> 명함에 동일하게
          적용됩니다.
        </p>
      </div>

      <form
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-3"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div>
          <p className="text-[10px] font-bold text-slate-500">기업 로고 이미지 (파일 업로드)</p>
          <p className="mt-1 rounded-lg border border-violet-100 bg-violet-50/80 px-2.5 py-2 text-[10px] leading-relaxed text-violet-950">
            <span className="font-black">
              권장 크기 {B2B_LOGO_SPEC.recommendWidthPx} × {B2B_LOGO_SPEC.recommendHeightPx}px
            </span>
            <span className="text-violet-800"> (정사각형 1:1)</span>
            <br />
            명함에는 약 {B2B_LOGO_SPEC.displayWidthPx}×{B2B_LOGO_SPEC.displayHeightPx}px로 표시됩니다. 선명하게
            보이려면 {B2B_LOGO_SPEC.recommendRetinaWidthPx}×{B2B_LOGO_SPEC.recommendRetinaHeightPx}px PNG(투명
            배경)도 가능합니다.
            <br />
            <span className="text-slate-600">
              {B2B_LOGO_SPEC.formatsLabel} · 최대 {B2B_LOGO_SPEC.maxFileSizeMb}MB
            </span>
          </p>
          <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/50 py-5 text-center">
            <div
              className="mb-2 flex max-w-full items-center justify-center rounded-xl border border-dashed border-violet-300/60 bg-white aspect-square w-[125px] h-[125px]"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt=""
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <span className="text-center text-[9px] font-bold leading-tight text-violet-400">
                  {B2B_LOGO_SPEC.recommendWidthPx}
                  <br />×<br />
                  {B2B_LOGO_SPEC.recommendHeightPx}
                </span>
              )}
            </div>
            <span className="text-[11px] font-bold text-violet-900">
              {logoUrl ? "로고 교체 (클릭)" : "파일 선택 · 드롭"}
            </span>
            <span className="mt-0.5 text-[9px] text-slate-500">{b2bLogoSizeGuideText()}</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleLogoFile(f);
                e.target.value = "";
              }}
            />
          </label>
          {logoFileName ? (
            <p className="mt-1 truncate text-[9px] text-slate-500">{logoFileName}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-[10px] font-bold text-slate-500">
            프라이머리 컬러
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-slate-200"
              />
              <input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-2 text-[12px] font-mono"
              />
            </div>
          </label>
          <label className="block text-[10px] font-bold text-slate-500">
            세컨더리 컬러
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-slate-200"
              />
              <input
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-2 text-[12px] font-mono"
              />
            </div>
          </label>
        </div>

        <label className="block text-[10px] font-bold text-slate-500">
          폰트 패밀리
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-[13px] font-bold"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.id} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-violet-700 py-2.5 text-[12px] font-black text-white disabled:opacity-50"
        >
          브랜딩 저장 · 계정 전체 적용
        </button>
      </form>

      <section className="rounded-xl border border-cyan-100 bg-gradient-to-br from-slate-50 to-cyan-50/40 p-3">
        <p className="text-[12px] font-black text-cyan-900">실시간 미리보기 (계정 전체 명함)</p>
        <p className="mt-0.5 text-[10px] text-slate-500">
          좌상단 로고 영역 {B2B_LOGO_SPEC.displayWidthPx}×{B2B_LOGO_SPEC.displayHeightPx}px 기준 렌더
        </p>
        <div className="mt-3">
          <LetteringBusinessCardPanel
            card={previewCard}
            displayCard={previewCard}
            corporateOverride
          />
        </div>
      </section>
    </div>
  );
}
