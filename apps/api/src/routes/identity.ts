import { Hono } from "hono";
import { prisma } from "../db/client.js";
import { issueTokenPair } from "../services/authSessions.js";
import { completePortoneIdentity } from "../services/identityPortone.js";

export const identityRoutes = new Hono();

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
      signupTrack?: "business_email" | "vlue_id_only";
      businessEmail?: string | null;
      emailVerificationToken?: string | null;
      virtualEmailPrefix?: string | null;
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
      signupTrack:
        body?.signupTrack === "business_email" || body?.signupTrack === "vlue_id_only"
          ? body.signupTrack
          : null,
      businessEmail: body?.businessEmail ? String(body.businessEmail).trim() : null,
      emailVerificationToken: body?.emailVerificationToken
        ? String(body.emailVerificationToken).trim()
        : null,
      virtualEmailPrefix: body?.virtualEmailPrefix
        ? String(body.virtualEmailPrefix).trim()
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
