import {
  buildBizcardSvgFileName,
  buildExportableBizcardSvg,
  downloadBizcardSvgFile
} from "./letteringBizcardSvgExport.js";
import {
  getVlueViralLinks,
  buildPublicCardViewUrl,
  buildPublicShowcaseUrl,
  isLocalDevOrigin
} from "./vlueViralLinks.js";
import { ensureDigitalCardId, syncDigitalCardExportSnapshot } from "./digitalCardApi.js";
import { readLetteringFixedIdentity } from "./letteringBizcardStorage.js";
import { isPaidLetteringTier } from "./letteringMembership.js";
import { formatLetteringPhoneDisplay } from "./letteringPhoneMatch.js";

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
    card.phone ? `Tel ${formatLetteringPhoneDisplay(card.phone) || card.phone}` : "",
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

/**
 * VLUE 쇼케이스 고유 주소 복사 — 명함 유무와 관계없이 전화번호 기준
 */
export async function copyShowcaseShareUrl(card, opts = {}) {
  const fixed = readLetteringFixedIdentity();
  const phone = String(fixed.phone || card?.phone || "").trim();
  if (!phone) {
    return { ok: false, error: "전화번호가 없습니다. 본인인증 후 다시 시도해 주세요." };
  }

  const isPaid = isPaidLetteringTier(card?.membershipTier || opts.membershipTier || "free");
  if (isPaid && card) {
    try {
      await syncDigitalCardExportSnapshot(card);
    } catch {
      /* 쇼케이스 URL 복사는 스냅샷 실패와 무관 */
    }
  }

  const viewUrl = buildPublicShowcaseUrl(phone);
  if (!viewUrl) {
    return { ok: false, error: "쇼케이스 주소를 만들지 못했습니다." };
  }

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(viewUrl);
    } else {
      const ta = document.createElement("textarea");
      ta.value = viewUrl;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    return { ok: true, channel: "copy_showcase_url", viewUrl };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "주소를 복사하지 못했습니다.",
      viewUrl
    };
  }
}

/**
 * @deprecated 쇼케이스 공유는 copyShowcaseShareUrl 사용
 */
export async function copyBizcardShareUrl(card) {
  return copyShowcaseShareUrl(card);
}

/** @deprecated SDK Feed 공유 — 인증 오류로 copyBizcardShareUrl 권장 */
export { shareBizcardViaKakaoFeed as shareBizcardViaKakao } from "./kakaoBizcardFeedShare.js";
