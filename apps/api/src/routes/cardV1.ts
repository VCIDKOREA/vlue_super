import { Hono } from "hono";

import { validateDigitalCardForExport } from "../services/cardValidateService.js";

import { loadBizcardSnapshotByCardId } from "../services/bizcard/cardExportSnapshot.js";

import { renderBizcardThumbPng, THUMB_HEIGHT, THUMB_WIDTH } from "../services/bizcard/bizcardThumbPng.js";

import { buildHostedCardViewPage } from "../services/bizcard/bizcardHostedView.js";

import { renderKakaoShareButtonPng } from "../services/bizcard/bizcardShareButtonPng.js";
import { renderKakaoFeedCardPng } from "../services/bizcard/bizcardKakaoFeedCardPng.js";

import { renderBizcardGalleryPng } from "../services/bizcard/bizcardGalleryPng.js";

import { buildBizcardVcf } from "../services/bizcard/bizcardVcf.js";

import { buildBizcardWalletPassStub } from "../services/bizcard/bizcardWalletPass.js";

import { buildBizcardVerifyPageHtml } from "../services/bizcard/bizcardVerifyPage.js";
import { attachmentDisposition } from "../lib/contentDisposition.js";

function pngResponse(png: Buffer, headers: Record<string, string>): Response {
  const ab = png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer;
  return new Response(ab, { status: 200, headers });
}

/** 공개 명함 — 검증·라이브 뷰어·소장 파이프라인 */

export const cardV1Routes = new Hono();



function stripThumbParam(raw: string) {

  return String(raw || "")

    .trim()

    .replace(/\.png$/i, "");

}



function apiBaseFromRequest(c: { req: { header: (n: string) => string | undefined } }) {

  const proto = c.req.header("x-forwarded-proto") || "http";

  const host = c.req.header("x-forwarded-host") || c.req.header("host") || "localhost:8788";

  return `${proto}://${host}`;

}



cardV1Routes.get("/validate/:cardId", async (c) => {

  try {

    const cardId = String(c.req.param("cardId") || "").trim();

    const result = await validateDigitalCardForExport(cardId);

    const expired =

      !result.valid &&

      (result.reason === "membership_expired" || result.reason === "account_suspended");



    const wantsHtml =

      String(c.req.query("format") || "") === "html" ||

      (c.req.header("accept") || "").includes("text/html");



    if (wantsHtml) {

      const html = buildBizcardVerifyPageHtml({

        cardId,

        apiBase: apiBaseFromRequest(c),

        valid: result.valid,

        message: result.message || "무효화된 명함입니다."

      });

      return c.html(html);

    }



    return c.json({ ...result, expired, status: expired ? "expired" : result.valid ? "active" : "invalid" }, 200, {

      "Cache-Control": "no-store, max-age=0"

    });

  } catch (err) {

    console.warn("[card-validate] failed", err);

    return c.json(

      {

        valid: false,

        expired: true,

        status: "expired",

        cardId: String(c.req.param("cardId") || ""),

        reason: "card_revoked",

        message: "명함 상태를 확인할 수 없습니다.",

        checkedAt: new Date().toISOString()

      },

      200,

      { "Cache-Control": "no-store, max-age=0" }

    );

  }

});



/** QR 스캔 — HTML 진본/만료 안내 (갤러리 PNG QR 타겟) */

cardV1Routes.get("/verify/:cardId", async (c) => {

  try {

    const cardId = String(c.req.param("cardId") || "").trim();

    const result = await validateDigitalCardForExport(cardId);

    const html = buildBizcardVerifyPageHtml({

      cardId,

      apiBase: apiBaseFromRequest(c),

      valid: result.valid,

      message: result.message || "유효기간이 만료되어 무효화된 명함입니다."

    });

    return c.html(html);

  } catch (err) {

    console.warn("[card-verify] failed", err);

    return c.text("검증 페이지를 불러올 수 없습니다.", 500);

  }

});



/** 카카오 Feed — 개인화 명함 카드 이미지 */
cardV1Routes.get("/kakao-feed/:cardId", async (c) => {
  try {
    const cardId = stripThumbParam(c.req.param("cardId"));
    const loaded = await loadBizcardSnapshotByCardId(cardId);
    const snapshot = loaded?.snapshot ?? {
      name: "VLUE 회원",
      organization: "VLUE",
      title: "디지털 인증명함",
      department: ""
    };
    const png = await renderKakaoFeedCardPng(snapshot);
    return pngResponse(png, {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=60, must-revalidate"
    });
  } catch (err) {
    console.warn("[card-kakao-feed] failed", err);
    try {
      const png = await renderKakaoShareButtonPng();
      return pngResponse(png, {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=60"
      });
    } catch {
      return c.body(new Uint8Array(0), 500);
    }
  }
});

/** 카카오 Feed 전용 — 공용 버튼 이미지 (개인 명함 데이터 없음) */

cardV1Routes.get("/share-button.png", async (c) => {

  try {

    const png = await renderKakaoShareButtonPng();

    return pngResponse(png, {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400"
    });

  } catch (err) {

    console.warn("[card-share-button] failed", err);

    return c.body(new Uint8Array(0), 500);

  }

});



/** 레거시 썸네일 — 카카오 Feed 에서 사용 중단 (갤러리·vCard PHOTO 등 내부용) */

cardV1Routes.get("/thumb/:cardId", async (c) => {

  try {

    const cardId = stripThumbParam(c.req.param("cardId"));

    const loaded = await loadBizcardSnapshotByCardId(cardId);

    if (!loaded) {

      return c.body(new Uint8Array(0), 404, { "Content-Type": "image/png" });

    }



    const validation = await validateDigitalCardForExport(cardId);

    const invalidated = !validation.valid;

    const png = await renderBizcardThumbPng(loaded.snapshot, invalidated);



    return pngResponse(png, {
      "Content-Type": "image/png",
      "Cache-Control": invalidated ? "public, max-age=300" : "public, max-age=600",
      "X-VLUE-Thumb-Width": String(THUMB_WIDTH),
      "X-VLUE-Thumb-Height": String(THUMB_HEIGHT)
    });

  } catch (err) {

    console.warn("[card-thumb] render_failed", err);

    return c.body(new Uint8Array(0), 500, { "Content-Type": "image/png" });

  }

});



/** 라이브 홀로그램 웹 뷰어 + 소장 3종 */

cardV1Routes.get("/view/:cardId", async (c) => {

  try {

    const cardId = String(c.req.param("cardId") || "").trim();

    const loaded = await loadBizcardSnapshotByCardId(cardId);

    if (!loaded) return c.text("명함을 찾을 수 없습니다.", 404);



    const html = buildHostedCardViewPage({

      cardId,

      card: loaded.snapshot,

      apiBase: apiBaseFromRequest(c)

    });

    return c.html(html);

  } catch (err) {

    console.warn("[card-view] failed", err);

    return c.text("명함을 불러올 수 없습니다.", 500);

  }

});



/** A. 갤러리 저장 — 명함 + 진본 QR PNG */

cardV1Routes.get("/gallery-png/:cardId", async (c) => {

  try {

    const cardId = stripThumbParam(c.req.param("cardId"));

    const loaded = await loadBizcardSnapshotByCardId(cardId);

    if (!loaded) return c.text("명함을 찾을 수 없습니다.", 404);



    const validation = await validateDigitalCardForExport(cardId);

    const png = await renderBizcardGalleryPng(

      loaded.snapshot,

      cardId,

      apiBaseFromRequest(c),

      !validation.valid

    );



    return pngResponse(png, {
      "Content-Type": "image/png",
      "Content-Disposition": attachmentDisposition(`VLUE-${cardId.slice(0, 8)}-gallery.png`),
      "Cache-Control": "no-store"
    });

  } catch (err) {

    console.warn("[card-gallery-png] failed", err);

    return c.text("이미지 생성에 실패했습니다.", 500);

  }

});



/** C. 연락처 즉시 저장 — vCard 3.0 */

cardV1Routes.get("/vcf/:cardId", async (c) => {

  try {

    const cardId = String(c.req.param("cardId") || "").trim();

    const loaded = await loadBizcardSnapshotByCardId(cardId);

    if (!loaded) return c.text("명함을 찾을 수 없습니다.", 404);



    const resolvedId = loaded.cardId;
    const vcf = buildBizcardVcf(loaded.snapshot, resolvedId);
    const filename = `VLUE-${(loaded.snapshot.name || "contact").replace(/\s+/g, "-")}.vcf`;

    return c.body(vcf, 200, {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": attachmentDisposition(filename)
    });

  } catch (err) {

    console.warn("[card-vcf] failed", err);

    return c.text("연락처 파일 생성에 실패했습니다.", 500);

  }

});



/** B. Apple/Google Wallet — unsigned pkpass 스텁 */

cardV1Routes.get("/wallet-pass/:cardId", async (c) => {

  try {

    const cardId = String(c.req.param("cardId") || "").trim();

    const loaded = await loadBizcardSnapshotByCardId(cardId);

    if (!loaded) return c.text("명함을 찾을 수 없습니다.", 404);



    const resolvedId = loaded.cardId;
    const validation = await validateDigitalCardForExport(resolvedId);
    const zip = buildBizcardWalletPassStub(loaded.snapshot, resolvedId, !validation.valid);

    return c.body(zip, 200, {
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": attachmentDisposition(`VLUE-${resolvedId.slice(0, 8)}.pkpass`),

      "X-VLUE-Wallet-Stub": "unsigned-push-revoke-pending"

    });

  } catch (err) {

    console.warn("[card-wallet-pass] failed", err);

    return c.text("지갑 패스 생성에 실패했습니다.", 500);

  }

});


