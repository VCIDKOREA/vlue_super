import { Hono } from "hono";
import { randomBytes, randomUUID } from "node:crypto";
import { prisma } from "../db/client.js";
import { resolveRequestUserId } from "../lib/authContext.js";
import { normalizeDesiredPublicHandle, normalizeLoginPublicHandle } from "../lib/publicHandle.js";
import { hashPassword, verifyPassword } from "../lib/passwordHash.js";
import { isValidMemberPassword, MEMBER_PASSWORD_INVALID_MESSAGE } from "../lib/memberPasswordRules.js";
import {
  hashOpaqueToken,
  issueTokenPair,
  refreshWithToken,
  revokeRefreshToken,
  revokeAllRefreshForUser
} from "../services/authSessions.js";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  approvePendingDevice,
  generateDeviceToken,
  listPendingDevicesForApprover,
  loginWithCredentials
} from "../services/authService.js";
import { completeSocialLogin } from "../services/socialAuthService.js";
import { resolveReferralSponsor } from "../services/membership/signupMembership.js";
import {
  AccountWithdrawalError,
  withdrawUserAccount
} from "../services/auth/accountWithdrawalService.js";
import {
  approveParentalConsentByGuardianSession,
  approveParentalConsentWithGuardianPass,
  listPendingParentalConsentsForGuardian,
  ParentalConsentError,
  requestParentalConsentToGuardian
} from "../services/auth/parentalConsentService.js";
import { PARENTAL_CONSENT_PENDING_LOGIN_MESSAGE } from "@vlue/shared/policy/minor-signup";
import {
  sendSignupEmailOtp,
  verifySignupEmailOtp
} from "../services/email/signupEmailVerifyService.js";

export const authRoutes = new Hono();

const RESET_TTL_MS = 60 * 60 * 1000;

authRoutes.get("/check-login-id", async (c) => {
  try {
    const raw = c.req.query("loginId");
    const normalized = normalizeDesiredPublicHandle(raw);
    if (!normalized) {
      return c.json(
        {
          available: false,
          normalized: null,
          reason: "영문 소문자로 시작, 3~20자(소문자·숫자·_), 숫자 1자 이상 포함이어야 합니다."
        },
        200
      );
    }
    const clash = await prisma.user.findFirst({
      where: { publicHandle: normalized },
      select: { id: true }
    });
    return c.json({
      available: !clash,
      normalized,
      reason: clash ? "이미 사용 중인 아이디입니다." : null
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ available: false, normalized: null, reason: msg }, 500);
  }
});

/** 경로 A 가입 — 이메일 인증번호 발송 */
authRoutes.post("/signup-email/send", async (c) => {
  try {
    const body = await c.req.json<{ email?: string }>();
    const result = await sendSignupEmailOtp(String(body?.email || ""));
    return c.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});

/** 경로 A 가입 — 이메일 인증번호 확인 → 일회용 토큰 */
authRoutes.post("/signup-email/verify", async (c) => {
  try {
    const body = await c.req.json<{ email?: string; code?: string }>();
    const token = verifySignupEmailOtp(String(body?.email || ""), String(body?.code || ""));
    return c.json({ ok: true, token });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});

authRoutes.post("/login", async (c) => {
  try {
    const body = await c.req.json<{ loginId?: string; password?: string; deviceToken?: string }>();
    const loginId = normalizeLoginPublicHandle(body?.loginId);
    const password = String(body?.password ?? "");
    if (!loginId || !password) {
      return c.json({ error: "아이디와 비밀번호를 입력해 주세요." }, 400);
    }
    const result = await loginWithCredentials(loginId, password, body?.deviceToken, c);
    if (result.status === "device_pending") {
      return c.json(
        {
          status: "device_pending",
          deviceToken: result.deviceToken,
          pendingDeviceId: result.pendingDeviceId,
          message: result.message
        },
        403
      );
    }
    return c.json({
      status: "ok",
      userId: result.userId,
      legalName: result.legalName,
      publicHandle: result.publicHandle,
      accountStatus: result.accountStatus,
      phoneE164: result.phoneE164,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      accessExpiresInSec: result.accessExpiresInSec,
      enterpriseRole: result.enterpriseRole,
      lineType: result.lineType,
      deviceToken: (result as { deviceToken?: string }).deviceToken
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    const status = (e as Error & { statusCode?: number }).statusCode === 403 ? 403 : 400;
    return c.json({ error: msg }, status);
  }
});

authRoutes.post("/social-login", async (c) => {
  try {
    const body = await c.req.json<{
      socialToken?: string;
      provider?: string;
      email?: string;
      nickname?: string;
    }>();
    const result = await completeSocialLogin(body, { header: (n) => c.req.header(n) });
    return c.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    const lower = msg.toLowerCase();
    const status =
      lower.includes("토큰") || lower.includes("token") || lower.includes("만료") || lower.includes("유효하지")
        ? 401
        : lower.includes("지원하지") || lower.includes("provider")
          ? 400
          : 400;
    return c.json({ error: msg }, status);
  }
});

authRoutes.post("/refresh", async (c) => {
  try {
    const body = await c.req.json<{ refreshToken?: string }>();
    const rt = String(body?.refreshToken ?? "").trim();
    if (!rt) return c.json({ error: "refreshToken 필요" }, 400);
    const pair = await refreshWithToken(rt, c.req);
    if (!pair) return c.json({ error: "세션이 만료되었거나 이미 무효화되었습니다." }, 401);
    return c.json(pair);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});

authRoutes.post("/logout", async (c) => {
  try {
    let logoutBody: { refreshToken?: string | null } = {};
    try {
      logoutBody = await c.req.json<{ refreshToken?: string | null }>();
    } catch {
      logoutBody = {};
    }
    const rt = String(logoutBody.refreshToken ?? "").trim();
    let revokedOne = false;
    if (rt) revokedOne = await revokeRefreshToken(rt);

    const uid = await resolveRequestUserId(c);
    let revokedAll = 0;
    if ("refreshToken" in logoutBody && !rt && uid) {
      revokedAll = await revokeAllRefreshForUser(uid);
    }
    return c.json({
      ok: true,
      revokedSession: revokedOne,
      ...(revokedAll ? { revokedAllSessions: revokedAll } : {})
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});

authRoutes.post("/logout-all", async (c) => {
  try {
    const uid = await resolveRequestUserId(c);
    if (!uid) return c.json({ error: "인증 필요" }, 401);
    const n = await revokeAllRefreshForUser(uid);
    return c.json({ ok: true, revokedSessions: n });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});

/** 회원 탈퇴 — PII 파기·구독 해지·세션 무효화 */
authRoutes.post("/account/withdraw", async (c) => {
  try {
    const uid = await resolveRequestUserId(c);
    if (!uid) return c.json({ error: "인증 필요" }, 401);

    let body: { confirm?: boolean } = {};
    try {
      body = await c.req.json<{ confirm?: boolean }>();
    } catch {
      body = {};
    }
    if (!body.confirm) {
      return c.json({ error: "confirm: true 가 필요합니다." }, 400);
    }

    await withdrawUserAccount(uid);
    return c.json({ ok: true });
  } catch (e) {
    if (e instanceof AccountWithdrawalError) {
      return c.json({ error: e.message, code: e.code }, e.statusCode as 400 | 403 | 404 | 409);
    }
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 500);
  }
});

/** 만 14세 미만 — 부모 VLUE 아이디로 승인 요청 푸시 (자녀 세션) */
authRoutes.post("/parental-consent/request", async (c) => {
  try {
    const uid = await resolveRequestUserId(c);
    if (!uid) return c.json({ error: "인증 필요" }, 401);
    const body = await c.req.json<{ guardianHandle?: string }>();
    const guardianHandle = String(body?.guardianHandle ?? "").trim();
    const result = await requestParentalConsentToGuardian(uid, guardianHandle);
    return c.json(result);
  } catch (e) {
    if (e instanceof ParentalConsentError) {
      return c.json({ error: e.message, code: e.code }, e.statusCode as 400 | 403 | 404 | 409);
    }
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 500);
  }
});

/** 보호자 앱 — 승인 대기 자녀 목록 */
authRoutes.get("/parental-consent/pending", requireUserHeader, async (c) => {
  try {
    const guardianUserId = c.get("vlueUserId") as string;
    return c.json(await listPendingParentalConsentsForGuardian(guardianUserId));
  } catch (e) {
    if (e instanceof ParentalConsentError) {
      return c.json({ error: e.message, code: e.code }, e.statusCode as 400 | 403 | 404 | 409);
    }
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 500);
  }
});

/** 보호자 앱 — 부모 폰에서 PASS 승인 (보호자 JWT) */
authRoutes.post("/parental-consent/approve-guardian", requireUserHeader, async (c) => {
  try {
    const guardianUserId = c.get("vlueUserId") as string;
    const body = await c.req.json<{ wardUserId?: string; guardianImpUid?: string }>();
    const wardUserId = String(body?.wardUserId ?? "").trim();
    const guardianImpUid = String(body?.guardianImpUid ?? "").trim();
    if (!wardUserId) return c.json({ error: "자녀 계정 ID가 필요합니다." }, 400);
    if (!guardianImpUid) return c.json({ error: "보호자 본인인증(imp_uid)이 필요합니다." }, 400);
    const result = await approveParentalConsentByGuardianSession(
      guardianUserId,
      wardUserId,
      guardianImpUid
    );
    return c.json(result);
  } catch (e) {
    if (e instanceof ParentalConsentError) {
      return c.json({ error: e.message, code: e.code }, e.statusCode as 400 | 403 | 404 | 409);
    }
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 500);
  }
});

/** 만 14세 미만 — 법정대리인(부모) PASS 승인 (자녀 기기·같은 기기) */
authRoutes.post("/parental-consent/approve", async (c) => {
  try {
    const uid = await resolveRequestUserId(c);
    if (!uid) return c.json({ error: "인증 필요" }, 401);
    const body = await c.req.json<{ guardianImpUid?: string; wardUserId?: string }>();
    const guardianImpUid = String(body?.guardianImpUid ?? "").trim();
    const wardUserId = String(body?.wardUserId ?? uid).trim();
    if (!guardianImpUid) {
      return c.json({ error: "부모 본인인증(imp_uid)이 필요합니다." }, 400);
    }
    if (wardUserId !== uid) {
      return c.json({ error: "자녀 본인 계정으로만 부모 승인을 요청할 수 있습니다." }, 403);
    }
    const result = await approveParentalConsentWithGuardianPass(wardUserId, guardianImpUid);
    return c.json(result);
  } catch (e) {
    if (e instanceof ParentalConsentError) {
      return c.json({ error: e.message, code: e.code }, e.statusCode as 400 | 403 | 404 | 409);
    }
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 500);
  }
});

authRoutes.post("/password/forgot", async (c) => {
  try {
    const body = await c.req.json<{ loginId?: string }>();
    const loginId = normalizeLoginPublicHandle(body?.loginId);
    if (!loginId) return c.json({ error: "loginId 필요" }, 400);

    const user = await prisma.user.findFirst({
      where: { publicHandle: loginId },
      select: { id: true }
    });

    /** 사용자 존재 여부 노출 최소화: 항상 동일 메시지 */
    const vague = () =>
      c.json({
        ok: true,
        message: "등록된 계정이 있으면 비밀번호 재설정 절차가 진행됩니다."
      });

    if (!user) return vague();

    const raw = randomBytes(32).toString("base64url");
    const tokenHash = hashOpaqueToken(raw);
    const expiresAt = new Date(Date.now() + RESET_TTL_MS);
    await prisma.passwordResetToken.create({
      data: { id: randomUUID(), userId: user.id, tokenHash, expiresAt }
    });

    const allowReturn =
      process.env.PASSWORD_RESET_RETURN_TOKEN_DEBUG === "1" && process.env.NODE_ENV !== "production";
    if (allowReturn) {
      return c.json({ ok: true, resetToken: raw, expiresAt: expiresAt.toISOString(), debugOnly: true });
    }
    return vague();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});

authRoutes.post("/password/reset", async (c) => {
  try {
    const body = await c.req.json<{ resetToken?: string; newPassword?: string }>();
    const tok = String(body?.resetToken ?? "").trim();
    const np = String(body?.newPassword ?? "");
    if (!tok || !isValidMemberPassword(np)) {
      return c.json({ error: `토큰과 새 비밀번호가 필요합니다. ${MEMBER_PASSWORD_INVALID_MESSAGE}` }, 400);
    }

    const tokenHash = hashOpaqueToken(tok);
    const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    const now = new Date();
    if (!row || row.usedAt || row.expiresAt <= now) {
      return c.json({ error: "유효하지 않거나 만료된 재설정 링크입니다." }, 400);
    }

    const passwordHash = await hashPassword(np);
    await prisma.$transaction([
      prisma.passwordResetToken.update({
        where: { id: row.id },
        data: { usedAt: now }
      }),
      prisma.user.update({
        where: { id: row.userId },
        data: { passwordHash }
      }),
      prisma.authRefreshSession.updateMany({
        where: { userId: row.userId, revokedAt: null },
        data: { revokedAt: now }
      })
    ]);

    return c.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});

authRoutes.post("/password/change", async (c) => {
  try {
    const uid = await resolveRequestUserId(c);
    if (!uid) return c.json({ error: "인증 필요" }, 401);
    const body = await c.req.json<{ oldPassword?: string; newPassword?: string }>();
    const oldPw = String(body?.oldPassword ?? "");
    const newPw = String(body?.newPassword ?? "");
    if (!oldPw || !isValidMemberPassword(newPw)) {
      return c.json({ error: `기존·새 비밀번호를 확인해 주세요. ${MEMBER_PASSWORD_INVALID_MESSAGE}` }, 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: { passwordHash: true }
    });
    if (!user?.passwordHash) return c.json({ error: "비밀번호 로그인이 활성화되지 않은 계정입니다." }, 400);

    const ok = await verifyPassword(oldPw, user.passwordHash);
    if (!ok) return c.json({ error: "기존 비밀번호가 올바르지 않습니다." }, 403);

    const passwordHash = await hashPassword(newPw);
    const now = new Date();
    await prisma.$transaction([
      prisma.user.update({ where: { id: uid }, data: { passwordHash } }),
      prisma.authRefreshSession.updateMany({
        where: { userId: uid, revokedAt: null },
        data: { revokedAt: now }
      })
    ]);
    const pair = await issueTokenPair(uid, c.req);
    return c.json({ ok: true, ...pair });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});

authRoutes.post("/terms/accept", async (c) => {
  try {
    const uid = await resolveRequestUserId(c);
    if (!uid) return c.json({ error: "인증 필요" }, 401);
    const body = await c.req.json<{ termsVersion?: string }>();
    const termsVersion = String(body?.termsVersion ?? "").trim();
    if (!termsVersion || termsVersion.length > 64) {
      return c.json({ error: "유효한 termsVersion 필요" }, 400);
    }
    const now = new Date();
    await prisma.user.update({
      where: { id: uid },
      data: { termsVersionAccepted: termsVersion, termsAcceptedAt: now }
    });
    return c.json({ ok: true, termsVersionAccepted: termsVersion, termsAcceptedAt: now.toISOString() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});

/** 가입 화면 — 추천인 코드 확인(인증) · 스폰서 표시 */
/** 사후 추천인 — 다음 결제 주기부터 30% 할인 예약 */
authRoutes.post("/referral/apply-post-signup", async (c) => {
  try {
    const uid = await resolveRequestUserId(c);
    if (!uid) return c.json({ error: "인증 필요" }, 401);
    const body = (await c.req.json<{ referralCode?: string }>().catch(() => ({}))) as {
      referralCode?: string;
    };
    const { schedulePostReferralDiscount } = await import(
      "../services/membership/postReferralBilling.js"
    );
    const result = await schedulePostReferralDiscount(uid, String(body?.referralCode || ""));
    return c.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});

authRoutes.get("/referral/verify", async (c) => {
  try {
    const code = c.req.query("code")?.trim() || "";
    if (!code) {
      return c.json({ valid: false, error: "추천인 코드를 입력해 주세요." }, 400);
    }
    const ref = await resolveReferralSponsor(code);
    if (!ref.sponsorUserId) {
      return c.json({ valid: false, error: "유효하지 않은 추천인 정보입니다." });
    }
    const sponsor = await prisma.user.findUnique({
      where: { id: ref.sponsorUserId },
      select: { legalName: true, publicHandle: true }
    });
    const handle = sponsor?.publicHandle ? `@${sponsor.publicHandle}` : null;
    const name = String(sponsor?.legalName || "").trim();
    return c.json({
      valid: true,
      referralCode: ref.referralCodeUsed,
      channel: ref.channel,
      channelLabel: ref.channel === "friend" ? "지인 추천" : "홍보 추천",
      sponsorDisplayName: name || handle || "VLUE 회원",
      sponsorHandle: handle
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "유효하지 않은 추천인 코드입니다.";
    return c.json({ valid: false, error: msg }, 400);
  }
});

/** MVP: 등급 변경 신청 접수 — 승인은 운영/관리 채널에서 별도 처리 */
authRoutes.post("/membership-change/request", async (c) => {
  try {
    const uid = await resolveRequestUserId(c);
    if (!uid) return c.json({ error: "인증 필요" }, 401);
    let tierBody: { targetTier?: string; via?: string } = {};
    try {
      tierBody = await c.req.json<{ targetTier?: string; via?: string }>();
    } catch {
      tierBody = {};
    }
    const tier = String(tierBody.targetTier ?? "").trim().toLowerCase();
    if (!["free", "paid", "standard", "premium"].includes(tier)) {
      return c.json({ error: "targetTier 는 free|paid 중 하나여야 합니다." }, 400);
    }
    const normalized = tier === "standard" || tier === "premium" ? "paid" : tier;
    /** 실제 저장소 연동 전: 요청 로그만 verification_logs 또는 전용 테이블로 확장 가능 */
    try {
      await prisma.verificationLog.create({
        data: {
          id: randomUUID(),
          userId: uid,
          action: "tier_change_request",
          detail: { targetTier: normalized, via: tierBody.via ?? "app", at: new Date().toISOString() },
          outcome: "pending"
        }
      });
    } catch {
      /* 로그 테이블 제약 등은 무시하고 200 반환 */
    }
    return c.json({ ok: true, tierChangeTarget: normalized, tierChangeStatus: "pending" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});

/** 카카오 PC식 — 미승인 기기 목록 */
authRoutes.get("/devices/pending", requireUserHeader, async (c) => {
  try {
    const uid = c.get("vlueUserId") as string;
    const devices = await listPendingDevicesForApprover(uid);
    return c.json({ devices });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});

/** 승인된 기기에서 새 PC/기기 허용 */
authRoutes.post("/devices/:deviceId/approve", requireUserHeader, async (c) => {
  try {
    const uid = c.get("vlueUserId") as string;
    const device = await approvePendingDevice(uid, String(c.req.param("deviceId") || ""));
    return c.json({ ok: true, device });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 400);
  }
});

authRoutes.get("/devices/token/new", async (c) => {
  return c.json({ deviceToken: generateDeviceToken() });
});

/** 승인된 기기 — FCM 토큰 등록(가족 보호 실시간 푸시) */
authRoutes.post("/devices/fcm-token", requireUserHeader, async (c) => {
  try {
    const uid = c.get("vlueUserId") as string;
    const body = (await c.req.json().catch(() => ({}))) as {
      deviceToken?: string;
      fcmToken?: string;
    };
    const { registerUserDeviceFcmToken } = await import("../services/userDeviceFcm.js");
    const result = await registerUserDeviceFcmToken(
      uid,
      String(body.deviceToken || ""),
      String(body.fcmToken || "")
    );
    if (!result.ok) return c.json({ error: result.error }, 400);
    return c.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: msg }, 500);
  }
});

/** 네이버 OAuth 콜백 뼈대 — NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 설정 후 토큰 교환 확장 */
authRoutes.get("/callback/naver", async (c) => {
  const error = c.req.query("error");
  const errorDescription = c.req.query("error_description");
  if (error) {
    return c.json(
      {
        status: "error",
        provider: "naver",
        message:
          (errorDescription && String(errorDescription).trim()) ||
          (error === "access_denied" ? "네이버 로그인이 취소되었습니다." : `네이버 인증 오류: ${error}`)
      },
      400
    );
  }

  const code = c.req.query("code")?.trim() || "";
  const state = c.req.query("state")?.trim() || "";
  if (!code) {
    return c.json({ status: "error", provider: "naver", message: "네이버 인가 코드가 없습니다." }, 400);
  }

  const clientId = String(process.env.NAVER_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.NAVER_CLIENT_SECRET || "").trim();
  if (!clientId || !clientSecret) {
    return c.json(
      {
        status: "pending",
        provider: "naver",
        message: "네이버 OAuth 콜백 라우트가 준비되었습니다. NAVER_CLIENT_ID/SECRET 설정 후 토큰 교환을 연결하세요.",
        code_received: Boolean(code),
        state
      },
      501
    );
  }

  return c.json(
    {
      status: "pending",
      provider: "naver",
      message: "네이버 토큰 교환·VLUE 계정 연동 로직은 후속 단계에서 completeSocialLogin 과 연결됩니다.",
      code_received: true,
      state
    },
    501
  );
});
