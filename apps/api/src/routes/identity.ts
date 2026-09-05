import { Hono } from "hono";
import { prisma } from "../db/client.js";
import { issueTokenPair } from "../services/authSessions.js";
import { completePortoneIdentity } from "../services/identityPortone.js";
import { verifyNtsBusinessStatus } from "../services/onboarding/ntsBusinessVerifyService.js";

export const identityRoutes = new Hono();

const INVALID_BIZ_MSG =
  "유효하지 않거나 폐업된 사업자번호입니다. 다시 확인해주세요.";

/**
 * POST /api/identity/nts-business-status
 * 온보딩 「국세청 대조」— 가입 전 공개 조회 (S2S 국세청 상태 API).
 */
identityRoutes.post("/nts-business-status", async (c) => {
  try {
    const body = (await c.req.json().catch(() => ({}))) as {
      businessRegistrationNo?: string;
      representativeName?: string;
      openDate?: string;
    };
    const businessRegistrationNo = String(body.businessRegistrationNo || "").replace(/\D/g, "");
    const representativeName = String(body.representativeName || "").trim();
    const openDate = String(body.openDate || "").replace(/\D/g, "");

    if (businessRegistrationNo.length !== 10) {
      return c.json(
        { ok: false, error: "사업자등록번호 10자리를 입력해 주세요.", code: "INVALID_BIZ_NO" },
        400
      );
    }
    if (!representativeName) {
      return c.json(
        { ok: false, error: "대표자명을 입력해 주세요.", code: "INVALID_REP_NAME" },
        400
      );
    }
    if (openDate.length !== 8) {
      return c.json(
        { ok: false, error: "개업일자를 YYYY-MM-DD 형식으로 입력해 주세요.", code: "INVALID_OPEN_DATE" },
        400
      );
    }

    const nts = await verifyNtsBusinessStatus(
      { businessRegistrationNo, representativeName, openDate },
      { allowSilentMock: false }
    );

    if (nts.reason === "PUBLIC_DATA_SERVICE_KEY_MISSING" || nts.reason === "NTS_API_EXCEPTION") {
      return c.json(
        {
          ok: false,
          error: "국세청 조회에 실패했습니다. 잠시 후 다시 시도해 주세요.",
          code: nts.reason,
          statusCode: nts.statusCode,
          statusLabel: nts.statusLabel,
          source: nts.source
        },
        503
      );
    }

    if (nts.reason === "NTS_API_HTTP_ERROR") {
      return c.json(
        {
          ok: false,
          error: "국세청 API 응답 오류입니다. 잠시 후 다시 시도해 주세요.",
          code: nts.reason,
          statusCode: nts.statusCode,
          statusLabel: nts.statusLabel,
          source: nts.source
        },
        502
      );
    }

    if (!nts.ok || nts.statusCode !== "01") {
      return c.json(
        {
          ok: false,
          error: INVALID_BIZ_MSG,
          code: nts.reason || "NOT_CONTINUING_BUSINESS",
          statusCode: nts.statusCode,
          statusLabel: nts.statusLabel,
          matched: nts.matched,
          source: nts.source
        },
        400
      );
    }

    if (!nts.matched) {
      return c.json(
        {
          ok: false,
          error: "대표자명 또는 개업일이 국세청 정보와 일치하지 않습니다. 다시 확인해 주세요.",
          code: "FIELD_MISMATCH",
          statusCode: nts.statusCode,
          statusLabel: nts.statusLabel,
          matched: false,
          source: nts.source
        },
        400
      );
    }

    return c.json({
      ok: true,
      message: "인증되었습니다.",
      statusCode: nts.statusCode,
      statusLabel: nts.statusLabel,
      matched: true,
      source: nts.source,
      ntsCompanyName: nts.ntsCompanyName || null,
      ntsOpenDate: nts.ntsOpenDate || null,
      ntsRepresentativeName: nts.ntsRepresentativeName || null
    });
  } catch (e) {
    return c.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "국세청 조회 중 오류가 발생했습니다.",
        code: "NTS_VERIFY_EXCEPTION"
      },
      500
    );
  }
});

identityRoutes.post("/portone/complete", async (c) => {
  try {
    const body = await c.req.json<{
      impUid?: string;
      isBusinessMember?: boolean;
      requestDigitalCard?: boolean;
      membershipKind?: string;
      membershipTier?: string;
      billingCycle?: string;
      referralCode?: string | null;
      /** 관리자 마스터 기기 등록용(본인인증 완료 시 서버가 번호 일치 시 upsert) */
      adminDeviceKey?: string;
      desiredPublicHandle?: string | null;
      businessRegistrationNo?: string | null;
      businessJobTitle?: string | null;
      businessRepresentativeName?: string | null;
      businessOpenDate?: string | null;
      companyName?: string | null;
      businessDeclaresNoJobTitle?: boolean;
      /** 일반 가입: 신규 계정 시 필수(8자 이상). 관리자 기기 경로는 생략 가능 */
      password?: string | null;
      /** 클라이언트 TERMS_VERSION — 가입 플로우 약관 동의 서버 저장 */
      termsVersion?: string | null;
      groupSignup?: {
        companyName?: string;
        masterDisplayNumber?: string;
        carrier?: string;
        companyContactType?: string;
        repExtensionMain?: string;
        repExtensionNo?: string;
        plannedLineCount?: number;
        lines?: Array<{
          lineKind?: string;
          realCliPhone?: string;
          assigneeName?: string;
          assigneeTitle?: string;
          extensionNo?: string;
          useMasterDisplayNumber?: boolean;
        }>;
      } | null;
      digitalCardDoc?: {
        kind?: string;
        fileName?: string;
        issuedAt?: string;
        dataUrl?: string;
      } | null;
      businessEmail?: string | null;
      emailVerificationToken?: string | null;
    }>();
    const impUid = body?.impUid?.trim();
    if (!impUid) {
      return c.json({ error: "impUid 가 필요합니다." }, 400);
    }
    const isBusinessMember = Boolean(body?.isBusinessMember);
    const requestDigitalCard = Boolean(body?.requestDigitalCard);
    const membershipKind = body?.membershipKind ?? body?.membershipTier;
    const result = await completePortoneIdentity({
      impUid,
      isBusinessMember,
      requestDigitalCard,
      membershipKind,
      membershipTier: body?.membershipTier,
      billingCycle: body?.billingCycle,
      referralCode: body?.referralCode,
      adminDeviceKey: body?.adminDeviceKey,
      desiredPublicHandle: body?.desiredPublicHandle,
      businessRegistrationNo: body?.businessRegistrationNo,
      businessJobTitle: body?.businessJobTitle,
      businessDeclaresNoJobTitle: Boolean(body?.businessDeclaresNoJobTitle),
      businessRepresentativeName: body?.businessRepresentativeName,
      businessOpenDate: body?.businessOpenDate,
      companyName: body?.companyName,
      passwordPlain: body?.password,
      groupSignup: body?.groupSignup
        ? {
            companyName: String(body.groupSignup.companyName || "").trim(),
            masterDisplayNumber: String(body.groupSignup.masterDisplayNumber || "").trim(),
            carrier: body.groupSignup.carrier === "KT" ? "KT" : "LGUPLUS",
            companyContactType:
              body.groupSignup.companyContactType === "rep_mobile" ||
              body.groupSignup.companyContactType === "rep_extension"
                ? body.groupSignup.companyContactType
                : "company_rep",
            repExtensionMain: body.groupSignup.repExtensionMain
              ? String(body.groupSignup.repExtensionMain).trim()
              : undefined,
            repExtensionNo: body.groupSignup.repExtensionNo
              ? String(body.groupSignup.repExtensionNo).trim()
              : undefined,
            plannedLineCount: Math.floor(Number(body.groupSignup.plannedLineCount) || 0) || undefined,
            lines: (body.groupSignup.lines || []).map((row) => ({
              lineKind: row.lineKind === "mobile" ? "mobile" : "extension",
              realCliPhone: String(row.realCliPhone || "").trim(),
              assigneeName: String(row.assigneeName || "").trim(),
              assigneeTitle: row.assigneeTitle ? String(row.assigneeTitle).trim() : undefined,
            extensionNo: row.extensionNo ? String(row.extensionNo).trim() : undefined,
            useMasterDisplayNumber: Boolean(row.useMasterDisplayNumber)
          }))
          }
        : null,
      digitalCardDoc: body?.digitalCardDoc
        ? {
            kind: String(body.digitalCardDoc.kind || ""),
            fileName: String(body.digitalCardDoc.fileName || ""),
            issuedAt: String(body.digitalCardDoc.issuedAt || ""),
            dataUrl: body.digitalCardDoc.dataUrl
          }
        : null,
      businessEmail: body?.businessEmail ? String(body.businessEmail).trim() : null,
      emailVerificationToken: body?.emailVerificationToken
        ? String(body.emailVerificationToken).trim()
        : null
    });

    const termsVersion = String(body?.termsVersion ?? "").trim().slice(0, 64);
    if (termsVersion) {
      await prisma.user.update({
        where: { id: result.userId },
        data: { termsVersionAccepted: termsVersion, termsAcceptedAt: new Date() }
      });
    }

    const tokens = await issueTokenPair(result.userId, c.req);
    return c.json({
      userId: result.userId,
      legalName: result.legalName,
      accountStatus: result.accountStatus,
      alreadyExisted: result.alreadyExisted,
      identityMatchedByCi: result.identityMatchedByCi,
      phoneE164: result.phoneE164,
      birthDate: result.birthDate,
      gender: result.gender,
      publicHandle: result.publicHandle,
      businessJobTitle: result.businessJobTitle ?? null,
      digitalCard: result.digitalCard,
      membershipKind: result.membershipKind,
      activityTier: result.activityTier,
      isDiscounted: result.isDiscounted,
      requiresParentalConsent: result.requiresParentalConsent ?? false,
      parentalConsentAt: result.parentalConsentAt ?? null,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessExpiresInSec: tokens.accessExpiresInSec,
      ...(termsVersion ? { termsVersionAccepted: termsVersion } : {})
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    const code = (e as Error & { code?: string }).code;
    const statusCode = (e as Error & { statusCode?: number }).statusCode;
    const status =
      statusCode === 403
        ? 403
        : msg.includes("포트원") || msg.includes("토큰") || msg.includes("본인인증 정보")
          ? 502
          : 400;
    return c.json({ error: msg, code: code || "IDENTITY_COMPLETE_FAILED" }, status);
  }
});
