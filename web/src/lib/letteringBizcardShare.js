import {
  buildBizcardSvgFileName,
  buildExportableBizcardSvg,
  downloadBizcardSvgFile
} from "./letteringBizcardSvgExport.js";
import {
  getVlueViralLinks,
  buildPublicCardViewUrl,
  isLocalDevOrigin
} from "./vlueViralLinks.js";
import { ensureDigitalCardId, syncDigitalCardExportSnapshot } from "./digitalCardApi.js";

function canShareFiles(file) {
  if (typeof navigator === "undefined" || !navigator.share) return false;
  if (navigator.canShare && file) {
    try {
      return navigator.canShare({ files: [file] });
    } catch {
      return false;
    }
  }
  return Boolean(navigator.share);
}

export async function prepareBizcardSvgBundle(card) {
  const cardId = (await ensureDigitalCardId()) || "";
  await syncDigitalCardExportSnapshot(card);
  const svg = await buildExportableBizcardSvg(card, cardId);
  const fileName = buildBizcardSvgFileName(card);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const file = new File([blob], fileName, { type: "image/svg+xml" });
  const viewUrl = buildPublicCardViewUrl(cardId);
  const localDev = typeof window !== "undefined" && isLocalDevOrigin(window.location?.origin);
  return { svg, fileName, file, cardId, viewUrl, localDev };
}

/** 보안 SVG 명함 파일 저장 */
export async function downloadBizcardSvg(card) {
  const { svg, fileName } = await prepareBizcardSvgBundle(card);
  downloadBizcardSvgFile(svg, fileName);
  return { ok: true, channel: "download_svg" };
}

function shareTextSummary(card, viewUrl = "") {
  const viral = getVlueViralLinks();
  return [
    `[VLUE 인증명함] ${card.organization || ""} ${card.name || ""}`.trim(),
    card.phone ? `Tel ${card.phone}` : "",
    "",
    "VLUE 공식 기업 인증 보안 명함입니다. (SVG · 실시간 검증)",
    viewUrl ? `명함 보기: ${viewUrl}` : "",
    `나도 만들기: ${viral.createUrl}`
  ]
    .filter(Boolean)
    .join("\n");
}

/** 링크 + SVG 파일 — 시스템 공유 시트 */
export async function shareBizcardSvgNative(card) {
  const viral = getVlueViralLinks();
  const { svg, file, fileName, viewUrl, cardId, localDev } = await prepareBizcardSvgBundle(card);
  if (!cardId) {
    return { ok: false, error: "명함 ID가 없습니다. 명함을 저장한 뒤 다시 시도해 주세요." };
  }
  const text = shareTextSummary(card, viewUrl);

  if (canShareFiles(file)) {
    try {
      await navigator.share({
        title: "VLUE 인증명함",
        files: [file]
      });
      return { ok: true, channel: "native_svg_file", localDev, viewUrl };
    } catch (err) {
      if (err?.name === "AbortError") return { ok: false, cancelled: true };
    }
  }

  if (navigator.share) {
    try {
      await navigator.share({ title: "VLUE 인증명함", text, url: viewUrl || viral.createUrl });
      return { ok: true, channel: "native_link", localDev, viewUrl };
    } catch (err) {
      if (err?.name === "AbortError") return { ok: false, cancelled: true };
    }
  }

  downloadBizcardSvgFile(svg, fileName);
  return { ok: true, channel: "download_fallback", localDev, viewUrl };
}

export async function shareBizcardViaSms(card) {
  const { viewUrl } = await prepareBizcardSvgBundle(card);
  const body = encodeURIComponent(shareTextSummary(card, viewUrl));
  window.location.href = `sms:?&body=${body}`;
  return { ok: true, channel: "sms" };
}

export async function shareBizcardViaEmail(card) {
  const { viewUrl } = await prepareBizcardSvgBundle(card);
  const subject = encodeURIComponent(`VLUE 인증명함 — ${card.name || ""}`);
  const body = encodeURIComponent(shareTextSummary(card, viewUrl));
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
  return { ok: true, channel: "email" };
}

/** 카카오톡 — Kakao.Share Feed 명함 이미지 카드만 (SVG·텍스트 링크 없음) */
export { shareBizcardViaKakaoFeed as shareBizcardViaKakao } from "./kakaoBizcardFeedShare.js";
