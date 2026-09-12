import { createHash, randomInt } from "node:crypto";
import { prisma } from "../../db/client.js";
import { hashPassword } from "../../lib/passwordHash.js";
import { normalizeDesiredPublicHandle } from "../../lib/publicHandle.js";
import { isValidMemberPassword, MEMBER_PASSWORD_INVALID_MESSAGE } from "../../lib/memberPasswordRules.js";
import { normalizeToE164KR } from "../../lib/phoneE164.js";
import { verifyNtsBusinessStatus } from "../onboarding/ntsBusinessVerifyService.js";
import { buildEnterpriseDccApprovalAlimtalk } from "../../lib/alimtalkTemplate.js";
import { sendCallEndAlimtalk } from "../alimtalk/alimtalkSender.js";
import {
  consumeVerifiedEmailTicket,
  resolveUserNotifyEmail,
  sendEmailAuthCode,
  verifyEmailAuthCode,
  maskEmail
} from "../email/emailAuthCodeService.js";
import { isValidEmailShape, normalizeBusinessEmail } from "../email/signupEmailProvision.js";

export type EnterpriseDccStatus =
  | "draft"
  | "biz_verified"
  | "awaiting_related_otp"
  | "awaiting_owner_approval"
  | "related_verified"
  | "docs_submitted"
  | "details_ready"
  | "awaiting_security_gate"
  | "security_verified"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "paid";

type OtpChallenge = {
  hash: string;
  relatedPartyUserId: string;
  expiresAt: number;
  code?: string;
};

const otpByAppId = new Map<string, OtpChallenge>();
let tableReady: Promise<void> | null = null;

function digitsOnly(raw: string) {
  return String(raw || "").replace(/\D/g, "");
}

function hashOtp(appId: string, partyId: string, otp: string) {
  return createHash("sha256").update(`${appId}:${partyId}:${otp}`, "utf8").digest("hex");
}

function exposeDevOtp() {
  return process.env.NODE_ENV !== "production" || process.env.ENTERPRISE_DCC_EXPOSE_OTP === "1";
}

/** migrate 없이 테이블 보장 */
export function ensureEnterpriseDccTable() {
  if (!tableReady) {
    tableReady = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "enterprise_dcc_applications" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "applicant_user_id" UUID NOT NULL,
          "business_registration_no" VARCHAR(20) NOT NULL,
          "company_name_locked" VARCHAR(200) NOT NULL DEFAULT '',
          "nts_status_code" VARCHAR(8),
          "nts_verified_at" TIMESTAMPTZ(6),
          "related_party_user_id" UUID,
          "related_party_verified_at" TIMESTAMPTZ(6),
          "department" VARCHAR(120),
          "contact_name" VARCHAR(120),
          "dcc_outbound_phone" VARCHAR(32),
          "manage_login_id" VARCHAR(32),
          "manage_password_hash" VARCHAR(256),
          "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
          "admin_note" TEXT,
          "reviewed_at" TIMESTAMPTZ(6),
          "reviewed_by_user_id" UUID,
          "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS "enterprise_dcc_applications_applicant_idx"
          ON "enterprise_dcc_applications"("applicant_user_id", "created_at" DESC);
        CREATE INDEX IF NOT EXISTS "enterprise_dcc_applications_bno_idx"
          ON "enterprise_dcc_applications"("business_registration_no");
        CREATE INDEX IF NOT EXISTS "enterprise_dcc_applications_status_idx"
          ON "enterprise_dcc_applications"("status", "created_at" DESC);
      `);
      /* 기존 테이블 호환 — 컬럼 추가 */
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "enterprise_dcc_applications"
          ADD COLUMN IF NOT EXISTS "manage_login_id" VARCHAR(32),
          ADD COLUMN IF NOT EXISTS "manage_password_hash" VARCHAR(256),
          ADD COLUMN IF NOT EXISTS "dcc_contact_email" VARCHAR(254),
          ADD COLUMN IF NOT EXISTS "scenario" VARCHAR(32),
          ADD COLUMN IF NOT EXISTS "workplace_address" TEXT,
          ADD COLUMN IF NOT EXISTS "workplace_lat" DOUBLE PRECISION,
          ADD COLUMN IF NOT EXISTS "workplace_lng" DOUBLE PRECISION,
          ADD COLUMN IF NOT EXISTS "docs_json" JSONB,
          ADD COLUMN IF NOT EXISTS "security_attested_at" TIMESTAMPTZ(6),
          ADD COLUMN IF NOT EXISTS "owner_reject_reason" TEXT;
      `);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "dcc_create_bans" (
          "user_id" UUID PRIMARY KEY,
          "reason" TEXT NOT NULL DEFAULT '',
          "source_application_id" UUID,
          "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    })()
      .then(() => undefined)
      .catch((e) => {
        tableReady = null;
        console.warn("[enterprise-dcc] ensure table failed", e);
      });
  }
  return tableReady;
}

type AppRow = {
  id: string;
  applicant_user_id: string;
  business_registration_no: string;
  company_name_locked: string;
  nts_status_code: string | null;
  nts_verified_at: Date | null;
  related_party_user_id: string | null;
  related_party_verified_at: Date | null;
  department: string | null;
  contact_name: string | null;
  dcc_outbound_phone: string | null;
  dcc_contact_email: string | null;
  manage_login_id: string | null;
  manage_password_hash: string | null;
  status: string;
  admin_note: string | null;
  reviewed_at: Date | null;
  reviewed_by_user_id: string | null;
  scenario?: string | null;
  workplace_address?: string | null;
  workplace_lat?: number | null;
  workplace_lng?: number | null;
  docs_json?: unknown;
  security_attested_at?: Date | null;
  owner_reject_reason?: string | null;
  created_at: Date;
  updated_at: Date;
};

function mapApp(row: AppRow) {
  return {
    id: row.id,
    applicantUserId: row.applicant_user_id,
    businessRegistrationNo: row.business_registration_no,
    companyNameLocked: row.company_name_locked,
    ntsStatusCode: row.nts_status_code,
    ntsVerifiedAt: row.nts_verified_at,
    relatedPartyUserId: row.related_party_user_id,
    relatedPartyVerifiedAt: row.related_party_verified_at,
    department: row.department,
    contactName: row.contact_name,
    dccOutboundPhone: row.dcc_outbound_phone,
    dccContactEmail: row.dcc_contact_email,
    manageLoginId: row.manage_login_id || "",
    hasManagePassword: Boolean(row.manage_password_hash),
    status: row.status as EnterpriseDccStatus,
    adminNote: row.admin_note,
    reviewedAt: row.reviewed_at,
    reviewedByUserId: row.reviewed_by_user_id,
    scenario: row.scenario || null,
    workplaceAddress: row.workplace_address || "",
    workplaceLat: row.workplace_lat ?? null,
    workplaceLng: row.workplace_lng ?? null,
    docs: row.docs_json && typeof row.docs_json === "object" ? row.docs_json : null,
    securityAttestedAt: row.security_attested_at || null,
    ownerRejectReason: row.owner_reject_reason || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function getApp(id: string): Promise<AppRow | null> {
  const rows = await prisma.$queryRawUnsafe<AppRow[]>(
    `SELECT * FROM enterprise_dcc_applications WHERE id = $1::uuid LIMIT 1`,
    id
  );
  return rows[0] || null;
}

async function touchUpdated(id: string) {
  await prisma.$executeRawUnsafe(
    `UPDATE enterprise_dcc_applications SET updated_at = NOW() WHERE id = $1::uuid`,
    id
  );
}

/** 동일 사업자번호로 이미 등록된 관계자(사업자 프로필·디지털명함 보유) */
export async function listRelatedPartiesForBizNo(businessRegistrationNo: string) {
  await ensureEnterpriseDccTable();
  const bno = digitsOnly(businessRegistrationNo);
  if (bno.length !== 10) return { parties: [], lockedCompanyName: "" };

  const profiles = await prisma.userBusinessProfile.findMany({
    where: {
      isBusiness: true,
      businessRegistrationNo: { not: null }
    },
    select: {
      userId: true,
      companyName: true,
      jobTitle: true,
      businessRegistrationNo: true,
      user: {
        select: {
          id: true,
          legalName: true,
          publicHandle: true,
          phoneE164: true,
          status: true,
          accountStatus: true,
          digitalCard: { select: { id: true } }
        }
      }
    },
    take: 200
  });

  const parties = await Promise.all(
    profiles
      .filter((p) => digitsOnly(String(p.businessRegistrationNo || "")) === bno)
      .filter((p) => p.user?.status !== "DELETED")
      .map(async (p) => {
        const phone = String(p.user.phoneE164 || "");
        const masked =
          phone.length >= 4
            ? `${phone.slice(0, Math.max(0, phone.length - 4)).replace(/\d/g, "*")}${phone.slice(-4)}`
            : "";
        const notifyEmail = await resolveUserNotifyEmail(p.userId);
        return {
          userId: p.userId,
          legalName: String(p.user.legalName || "").trim() || "관계자",
          publicHandle: String(p.user.publicHandle || "").trim(),
          jobTitle: String(p.jobTitle || "").trim(),
          companyName: String(p.companyName || "").trim(),
          hasDigitalCard: Boolean(p.user.digitalCard),
          phoneMasked: masked,
          emailMasked: notifyEmail ? maskEmail(notifyEmail) : ""
        };
      })
  );

  const lockedCompanyName =
    parties.map((p) => p.companyName).find((n) => n) ||
    (
      await prisma.$queryRawUnsafe<Array<{ company_name_locked: string }>>(
        `SELECT company_name_locked FROM enterprise_dcc_applications
         WHERE regexp_replace(business_registration_no, '\\D', '', 'g') = $1
           AND company_name_locked <> ''
           AND status IN ('approved', 'paid', 'pending_approval')
         ORDER BY updated_at DESC LIMIT 1`,
        bno
      )
    )[0]?.company_name_locked ||
    "";

  return { parties, lockedCompanyName: String(lockedCompanyName || "").trim() };
}

/**
 * 1~2단계: 신청 시작 + 사업자번호 공식 검증
 */
export async function verifyBusinessAndStartApplication(input: {
  applicantUserId: string;
  businessRegistrationNo: string;
  representativeName: string;
  openDate: string;
  /** 최초 사업자(관계자 없음)일 때만 — 상호 제안 */
  proposedCompanyName?: string;
}) {
  await ensureEnterpriseDccTable();
  const applicantUserId = String(input.applicantUserId || "").trim();
  const bno = digitsOnly(input.businessRegistrationNo);
  const rep = String(input.representativeName || "").trim();
  const openDate = digitsOnly(input.openDate);

  if (!applicantUserId) throw new Error("로그인이 필요합니다.");
  if (await isDccCreateBanned(applicantUserId)) {
    throw new Error("DCC 생성 권한이 영구 차단된 계정입니다. 고객지원에 문의해 주세요.");
  }
  if (bno.length !== 10) throw new Error("사업자등록번호 10자리를 입력해 주세요.");
  if (!rep) throw new Error("대표자 성명을 입력해 주세요.");
  if (openDate.length !== 8) throw new Error("개업연월일(YYYYMMDD)을 입력해 주세요.");

  const nts = await verifyNtsBusinessStatus({
    businessRegistrationNo: bno,
    representativeName: rep,
    openDate
  });
  if (!nts.ok) {
    const reason =
      nts.reason === "NOT_CONTINUING_BUSINESS"
        ? "계속사업자가 아닙니다."
        : nts.reason === "FIELD_MISMATCH"
          ? "대표자명·개업일과 사업자 정보가 일치하지 않습니다."
          : nts.reason === "CLOSED_BUSINESS"
            ? "폐업된 사업자번호입니다."
            : "사업자번호 검증에 실패했습니다.";
    throw new Error(reason);
  }

  const { parties, lockedCompanyName } = await listRelatedPartiesForBizNo(bno);
  let companyName = lockedCompanyName;
  if (!companyName) {
    companyName = String(input.proposedCompanyName || "").trim();
    if (!companyName) {
      throw new Error(
        parties.length
          ? "등록된 상호를 찾을 수 없습니다. 고객지원에 문의해 주세요."
          : "최초 사업자 등록이므로 상호(회사명)를 입력해 주세요. 승인 후 고정됩니다."
      );
    }
  }

  const existing = await prisma.$queryRawUnsafe<AppRow[]>(
    `SELECT * FROM enterprise_dcc_applications
     WHERE applicant_user_id = $1::uuid
       AND regexp_replace(business_registration_no, '\\D', '', 'g') = $2
       AND status NOT IN ('rejected', 'paid')
     ORDER BY created_at DESC LIMIT 1`,
    applicantUserId,
    bno
  );

  let appId = existing[0]?.id;
  if (appId) {
    await prisma.$executeRawUnsafe(
      `UPDATE enterprise_dcc_applications SET
         company_name_locked = $2,
         nts_status_code = $3,
         nts_verified_at = NOW(),
         status = 'biz_verified',
         related_party_user_id = NULL,
         related_party_verified_at = NULL,
         updated_at = NOW()
       WHERE id = $1::uuid`,
      appId,
      companyName.slice(0, 200),
      nts.statusCode
    );
  } else {
    const inserted = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO enterprise_dcc_applications
         (id, applicant_user_id, business_registration_no, company_name_locked,
          nts_status_code, nts_verified_at, status, created_at, updated_at)
       VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4, NOW(), 'biz_verified', NOW(), NOW())
       RETURNING id`,
      applicantUserId,
      bno,
      companyName.slice(0, 200),
      nts.statusCode
    );
    appId = inserted[0]?.id;
  }

  const app = appId ? await getApp(appId) : null;
  return {
    application: app ? mapApp(app) : null,
    nts: { statusCode: nts.statusCode, statusLabel: nts.statusLabel, source: nts.source },
    relatedParties: parties,
    companyNameLocked: companyName,
    isFirstRegistrant: parties.length === 0,
    nextStep: parties.length === 0 ? "details" : "select_related_party"
  };
}

export async function sendRelatedPartyOtp(input: {
  applicationId: string;
  applicantUserId: string;
  relatedPartyUserId: string;
}) {
  await ensureEnterpriseDccTable();
  const app = await getApp(input.applicationId);
  if (!app || app.applicant_user_id !== input.applicantUserId) {
    throw new Error("신청 정보를 찾을 수 없습니다.");
  }
  if (!["biz_verified", "awaiting_related_otp", "related_verified"].includes(app.status)) {
    throw new Error("사업자 인증을 먼저 완료해 주세요.");
  }

  const { parties } = await listRelatedPartiesForBizNo(app.business_registration_no);
  const party = parties.find((p) => p.userId === input.relatedPartyUserId);
  if (!party) {
    throw new Error("해당 사업자의 등록된 관계자만 선택할 수 있습니다.");
  }

  const partyEmail = await resolveUserNotifyEmail(party.userId);
  if (!partyEmail) {
    throw new Error("관계자의 등록 이메일이 없습니다. 관계자가 이메일을 등록한 뒤 다시 시도해 주세요.");
  }

  const sent = await sendEmailAuthCode({
    purpose: "enterprise_dcc_party",
    emailRaw: partyEmail
  });

  await prisma.$executeRawUnsafe(
    `UPDATE enterprise_dcc_applications SET
       related_party_user_id = $2::uuid,
       status = 'awaiting_related_otp',
       updated_at = NOW()
     WHERE id = $1::uuid`,
    app.id,
    party.userId
  );

  return {
    ok: true,
    sentTo: {
      userId: party.userId,
      legalName: party.legalName,
      phoneMasked: party.phoneMasked,
      emailMasked: sent.maskedEmail || maskEmail(partyEmail)
    },
    expiresInSec: sent.expiresInSec,
    ...(sent.devCode ? { devOtp: sent.devCode } : {})
  };
}

export async function verifyRelatedPartyOtp(input: {
  applicationId: string;
  applicantUserId: string;
  otp: string;
}) {
  await ensureEnterpriseDccTable();
  const app = await getApp(input.applicationId);
  if (!app || app.applicant_user_id !== input.applicantUserId) {
    throw new Error("신청 정보를 찾을 수 없습니다.");
  }
  if (!app.related_party_user_id) {
    throw new Error("인증번호를 먼저 발송해 주세요.");
  }

  const partyEmail = await resolveUserNotifyEmail(app.related_party_user_id);
  if (!partyEmail) {
    throw new Error("관계자 이메일을 확인하지 못했습니다. 다시 발송해 주세요.");
  }

  const otp = String(input.otp || "").trim();
  await verifyEmailAuthCode({
    purpose: "enterprise_dcc_party",
    emailRaw: partyEmail,
    codeRaw: otp
  });

  await prisma.$executeRawUnsafe(
    `UPDATE enterprise_dcc_applications SET
       related_party_verified_at = NOW(),
       status = 'related_verified',
       updated_at = NOW()
     WHERE id = $1::uuid`,
    app.id
  );
  const next = await getApp(app.id);
  return { ok: true, application: next ? mapApp(next) : null, nextStep: "details" };
}

/**
 * 5단계: 상호 고정 + 부서·담당자·DCC 발신번호
 * 최초 사업자(관계자 없음)는 OTP 없이 details 진입 가능
 */
export async function saveEnterpriseDccDetails(input: {
  applicationId: string;
  applicantUserId: string;
  department: string;
  contactName: string;
  contactEmail: string;
  emailVerifyToken: string;
  dccOutboundPhone: string;
  manageLoginId: string;
  managePassword: string;
}) {
  await ensureEnterpriseDccTable();
  const app = await getApp(input.applicationId);
  if (!app || app.applicant_user_id !== input.applicantUserId) {
    throw new Error("신청 정보를 찾을 수 없습니다.");
  }

  const { parties } = await listRelatedPartiesForBizNo(app.business_registration_no);
  const needsOtp = parties.length > 0;
  const allowed = needsOtp
    ? ["related_verified", "docs_submitted", "details_ready", "pending_approval", "security_verified", "awaiting_security_gate"].includes(app.status)
    : ["biz_verified", "related_verified", "docs_submitted", "details_ready", "pending_approval", "security_verified", "awaiting_security_gate"].includes(app.status);
  if (!allowed) {
    throw new Error(needsOtp ? "관계자 인증을 먼저 완료해 주세요." : "사업자 인증을 먼저 완료해 주세요.");
  }
  if (!String(app.company_name_locked || "").trim()) {
    throw new Error("상호가 고정되지 않았습니다. 사업자 인증부터 다시 진행해 주세요.");
  }

  const department = String(input.department || "").trim().slice(0, 120);
  const contactName = String(input.contactName || "").trim().slice(0, 120);
  const contactEmail = normalizeBusinessEmail(input.contactEmail);
  const dccOutboundPhone = digitsOnly(input.dccOutboundPhone);
  if (!department) throw new Error("부서 이름을 입력해 주세요.");
  if (!contactName) throw new Error("담당자 이름을 입력해 주세요.");
  if (!isValidEmailShape(contactEmail)) {
    throw new Error("DCC 담당 이메일을 올바르게 입력하고 인증해 주세요.");
  }
  await consumeVerifiedEmailTicket(String(input.emailVerifyToken || ""), {
    purpose: "dcc_email",
    email: contactEmail,
    userId: input.applicantUserId
  });
  if (!dccOutboundPhone || dccOutboundPhone.length < 8) {
    throw new Error("DCC 발신 전화번호를 입력해 주세요.");
  }

  const manageLoginId = normalizeDesiredPublicHandle(input.manageLoginId);
  if (!manageLoginId) throw new Error("관리용 아이디를 입력해 주세요. (영문·숫자·밑줄 3~20자)");
  if (!isValidMemberPassword(input.managePassword)) {
    throw new Error(MEMBER_PASSWORD_INVALID_MESSAGE);
  }

  const clash = await prisma.user.findFirst({
    where: {
      publicHandle: manageLoginId,
      NOT: { id: input.applicantUserId }
    },
    select: { id: true }
  });
  if (clash) throw new Error("이미 사용 중인 관리 아이디입니다. 다른 아이디를 입력해 주세요.");

  const managePasswordHash = await hashPassword(String(input.managePassword));

  await prisma.$executeRawUnsafe(
    `UPDATE enterprise_dcc_applications SET
       department = $2,
       contact_name = $3,
       dcc_outbound_phone = $4,
       dcc_contact_email = $5,
       manage_login_id = $6,
       manage_password_hash = $7,
       status = 'details_ready',
       updated_at = NOW()
     WHERE id = $1::uuid`,
    app.id,
    department,
    contactName,
    dccOutboundPhone,
    contactEmail,
    manageLoginId,
    managePasswordHash
  );
  const next = await getApp(app.id);
  return { ok: true, application: next ? mapApp(next) : null, nextStep: "security_gate" };
}

/** 6단계: 승인 대기 제출 — 위치·보안 인증 완료 필수 */
export async function submitEnterpriseDccForApproval(input: {
  applicationId: string;
  applicantUserId: string;
}) {
  await ensureEnterpriseDccTable();
  if (await isDccCreateBanned(input.applicantUserId)) {
    throw new Error("DCC 생성 권한이 영구 차단된 계정입니다.");
  }
  const app = await getApp(input.applicationId);
  if (!app || app.applicant_user_id !== input.applicantUserId) {
    throw new Error("신청 정보를 찾을 수 없습니다.");
  }
  if (app.status !== "security_verified" && app.status !== "pending_approval") {
    throw new Error("위치·보안 환경 인증을 먼저 완료해 주세요.");
  }
  if (!app.security_attested_at && app.status !== "pending_approval") {
    throw new Error("위치 인증이 필요합니다.");
  }
  await prisma.$executeRawUnsafe(
    `UPDATE enterprise_dcc_applications SET status = 'pending_approval', updated_at = NOW() WHERE id = $1::uuid`,
    app.id
  );
  const next = await getApp(app.id);
  return { ok: true, application: next ? mapApp(next) : null, nextStep: "await_approval" };
}

export async function getMyEnterpriseDccApplication(applicantUserId: string) {
  await ensureEnterpriseDccTable();
  const rows = await prisma.$queryRawUnsafe<AppRow[]>(
    `SELECT * FROM enterprise_dcc_applications
     WHERE applicant_user_id = $1::uuid
     ORDER BY created_at DESC LIMIT 1`,
    applicantUserId
  );
  return rows[0] ? mapApp(rows[0]) : null;
}

export async function listPendingEnterpriseDccApplications(limit = 50) {
  await ensureEnterpriseDccTable();
  const rows = await prisma.$queryRawUnsafe<AppRow[]>(
    `SELECT * FROM enterprise_dcc_applications
     WHERE status = 'pending_approval'
     ORDER BY created_at ASC
     LIMIT $1`,
    Math.min(100, Math.max(1, limit))
  );
  return rows.map(mapApp);
}

/**
 * 6~7단계: 관리자 승인 → 프로필·디지털명함 반영 → 결제 진입 가능
 */
export async function reviewEnterpriseDccApplication(input: {
  applicationId: string;
  reviewerUserId: string;
  action: "approve" | "reject";
  adminNote?: string;
}) {
  await ensureEnterpriseDccTable();
  const app = await getApp(input.applicationId);
  if (!app) throw new Error("신청 없음");
  if (app.status !== "pending_approval") throw new Error("승인 대기 상태가 아닙니다.");

  if (input.action === "reject") {
    await prisma.$executeRawUnsafe(
      `UPDATE enterprise_dcc_applications SET
         status = 'rejected',
         admin_note = $2,
         reviewed_at = NOW(),
         reviewed_by_user_id = $3::uuid,
         updated_at = NOW()
       WHERE id = $1::uuid`,
      app.id,
      String(input.adminNote || "").slice(0, 500),
      input.reviewerUserId
    );
    return { ok: true, status: "rejected" as const };
  }

  const bno = digitsOnly(app.business_registration_no);
  const companyName = String(app.company_name_locked || "").trim();
  const jobTitle = String(app.department || "").trim();
  const manageLoginId = String(app.manage_login_id || "").trim().toLowerCase();
  const managePasswordHash = String(app.manage_password_hash || "").trim();

  if (!manageLoginId || !managePasswordHash) {
    throw new Error("관리 아이디·비밀번호가 신청서에 없습니다. 상세 입력을 다시 진행해 주세요.");
  }

  const handleClash = await prisma.user.findFirst({
    where: {
      publicHandle: manageLoginId,
      NOT: { id: app.applicant_user_id }
    },
    select: { id: true }
  });
  if (handleClash) {
    throw new Error("관리 아이디가 다른 계정과 충돌합니다. 신청자에게 아이디 변경을 요청해 주세요.");
  }

  const dccE164 = normalizeToE164KR(app.dcc_outbound_phone || "") || null;

  /* 해당 번호(DCC) 관리 계정 — 신청자 계정에 아이디·비밀번호 부여 */
  const phoneTaken =
    dccE164 &&
    (await prisma.user.findFirst({
      where: { phoneE164: dccE164, NOT: { id: app.applicant_user_id } },
      select: { id: true }
    }));

  await prisma.user.update({
    where: { id: app.applicant_user_id },
    data: {
      publicHandle: manageLoginId,
      passwordHash: managePasswordHash,
      ...(!phoneTaken && dccE164 ? { phoneE164: dccE164 } : {}),
      accountStatus: "active",
      status: "ACTIVE"
    }
  });

  await prisma.userBusinessProfile.upsert({
    where: { userId: app.applicant_user_id },
    create: {
      userId: app.applicant_user_id,
      isBusiness: true,
      businessRegistrationNo: bno,
      companyName,
      jobTitle
    },
    update: {
      isBusiness: true,
      businessRegistrationNo: bno,
      companyName,
      jobTitle
    }
  });

  const existingCard = await prisma.digitalCard.findUnique({
    where: { userId: app.applicant_user_id },
    select: { id: true }
  });
  if (!existingCard) {
    await prisma.digitalCard.create({
      data: {
        userId: app.applicant_user_id,
        membershipTierSnapshot: "pending_payment",
        exportSnapshotJson: {
          organization: companyName,
          department: app.department,
          name: app.contact_name,
          phone: app.dcc_outbound_phone,
          email: app.dcc_contact_email || "",
          companyLocked: true,
          enterpriseDccApplicationId: app.id,
          manageLoginId
        }
      }
    });
  } else {
    await prisma.digitalCard.update({
      where: { userId: app.applicant_user_id },
      data: {
        exportSnapshotJson: {
          organization: companyName,
          department: app.department,
          name: app.contact_name,
          phone: app.dcc_outbound_phone,
          email: app.dcc_contact_email || "",
          companyLocked: true,
          enterpriseDccApplicationId: app.id,
          manageLoginId
        }
      }
    });
  }

  await prisma.$executeRawUnsafe(
    `UPDATE enterprise_dcc_applications SET
       status = 'approved',
       admin_note = $2,
       reviewed_at = NOW(),
       reviewed_by_user_id = $3::uuid,
       updated_at = NOW()
     WHERE id = $1::uuid`,
    app.id,
    String(input.adminNote || "approved").slice(0, 500),
    input.reviewerUserId
  );

  await touchUpdated(app.id);

  /* 승인 안내 — 관계자 우선, 없으면 신청자 */
  let notifyPhone = "";
  let notifyLabel = "신청자";
  if (app.related_party_user_id) {
    const party = await prisma.user.findUnique({
      where: { id: app.related_party_user_id },
      select: { phoneE164: true, legalName: true }
    });
    notifyPhone = String(party?.phoneE164 || "").trim();
    notifyLabel = String(party?.legalName || "관계자").trim() || "관계자";
  }
  if (!notifyPhone) {
    const applicant = await prisma.user.findUnique({
      where: { id: app.applicant_user_id },
      select: { phoneE164: true }
    });
    notifyPhone = String(applicant?.phoneE164 || dccE164 || "").trim();
  }

  let notifyResult: { ok: boolean; mode?: string; error?: string } = { ok: false };
  if (notifyPhone) {
    try {
      const payload = buildEnterpriseDccApprovalAlimtalk({
        recipientPhoneE164: notifyPhone,
        appliedAt: app.created_at,
        manageLoginId
      });
      const sent = await sendCallEndAlimtalk(payload);
      notifyResult = { ok: true, mode: sent.mode };
      console.info(`[enterprise-dcc] approval notify to ${notifyLabel} ${notifyPhone} mode=${sent.mode}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "notify_failed";
      notifyResult = { ok: false, error: msg };
      console.warn("[enterprise-dcc] approval notify failed", e);
    }
  }

  return {
    ok: true,
    status: "approved" as const,
    nextStep: "payment",
    companyNameLocked: companyName,
    dccOutboundPhone: app.dcc_outbound_phone,
    manageLoginId,
    notify: notifyResult
  };
}

export async function markEnterpriseDccPaid(applicationId: string, applicantUserId: string) {
  await ensureEnterpriseDccTable();
  const app = await getApp(applicationId);
  if (!app || app.applicant_user_id !== applicantUserId) throw new Error("신청 없음");
  if (app.status !== "approved" && app.status !== "paid") {
    throw new Error("승인 완료 후 결제할 수 있습니다.");
  }
  await prisma.$executeRawUnsafe(
    `UPDATE enterprise_dcc_applications SET status = 'paid', updated_at = NOW() WHERE id = $1::uuid`,
    app.id
  );
  await prisma.digitalCard.updateMany({
    where: { userId: applicantUserId },
    data: { membershipTierSnapshot: "paid" }
  });
  return { ok: true };
}

/** DCC 생성 영구 차단 여부 */
export async function isDccCreateBanned(userId: string): Promise<boolean> {
  await ensureEnterpriseDccTable();
  const rows = await prisma.$queryRawUnsafe<Array<{ user_id: string }>>(
    `SELECT user_id FROM dcc_create_bans WHERE user_id = $1::uuid LIMIT 1`,
    userId
  );
  return Boolean(rows[0]);
}

async function banDccCreate(userId: string, reason: string, applicationId?: string) {
  await ensureEnterpriseDccTable();
  await prisma.$executeRawUnsafe(
    `INSERT INTO dcc_create_bans (user_id, reason, source_application_id, created_at)
     VALUES ($1::uuid, $2, $3::uuid, NOW())
     ON CONFLICT (user_id) DO UPDATE SET reason = EXCLUDED.reason, source_application_id = EXCLUDED.source_application_id`,
    userId,
    String(reason || "owner_reject_impersonation").slice(0, 500),
    applicationId || null
  );
}

/**
 * 시나리오 A — 등록 기업 대표/관계자에게 승인 요청 푸시
 */
export async function requestOwnerApproval(input: {
  applicationId: string;
  applicantUserId: string;
  relatedPartyUserId: string;
  department?: string;
  contactName?: string;
  confirmAcknowledged?: boolean;
}) {
  await ensureEnterpriseDccTable();
  if (await isDccCreateBanned(input.applicantUserId)) {
    throw new Error("DCC 생성 권한이 영구 차단된 계정입니다. 고객지원에 문의해 주세요.");
  }
  if (!input.confirmAcknowledged) {
    throw new Error("대표자 인증 알림 전송에 동의해 주세요.");
  }
  const app = await getApp(input.applicationId);
  if (!app || app.applicant_user_id !== input.applicantUserId) {
    throw new Error("신청 정보를 찾을 수 없습니다.");
  }
  if (!["biz_verified", "awaiting_related_otp", "awaiting_owner_approval"].includes(app.status)) {
    throw new Error("사업자 인증을 먼저 완료해 주세요.");
  }

  const { parties } = await listRelatedPartiesForBizNo(app.business_registration_no);
  const party = parties.find((p) => p.userId === input.relatedPartyUserId);
  if (!party) throw new Error("등록된 기업 관계자만 선택할 수 있습니다. 임의 상호 입력은 불가합니다.");

  const applicant = await prisma.user.findUnique({
    where: { id: input.applicantUserId },
    select: { legalName: true, publicHandle: true }
  });
  const applicantName =
    String(input.contactName || applicant?.legalName || "").trim() || "신청자";
  const dept = String(input.department || app.department || "").trim() || "부서 미입력";
  const titleBody = `${app.company_name_locked || "회사"} 직장으로 인증 요청이 왔습니다.`;
  const body = `[${applicantName}]님께서 [${dept}]으로 대표자 인증을 요청하였습니다. 승인하시겠습니까? (거절 / 승인)`;

  await prisma.$executeRawUnsafe(
    `UPDATE enterprise_dcc_applications SET
       related_party_user_id = $2::uuid,
       department = COALESCE(NULLIF($3, ''), department),
       contact_name = COALESCE(NULLIF($4, ''), contact_name),
       scenario = 'owner_registered',
       status = 'awaiting_owner_approval',
       updated_at = NOW()
     WHERE id = $1::uuid`,
    app.id,
    party.userId,
    dept.slice(0, 120),
    applicantName.slice(0, 120)
  );

  let notificationId = "";
  try {
    const { ssePublish } = await import("../../realtime/sseHub.js");
    const { sendShowcaseSocialPushToUser } = await import("../fcmNotificationService.js");
    const row = await prisma.ownerNotification.create({
      data: {
        ownerUserId: party.userId,
        actorUserId: input.applicantUserId,
        title: titleBody.slice(0, 120),
        body: body.slice(0, 4000),
        payloadJson: {
          type: "vlue-dcc-owner-approval",
          applicationId: app.id,
          companyName: app.company_name_locked,
          applicantUserId: input.applicantUserId,
          applicantName,
          department: dept
        }
      }
    });
    notificationId = row.id;
    ssePublish(party.userId, {
      type: "vlue-dcc-owner-approval",
      title: titleBody,
      body,
      applicationId: app.id,
      notificationId,
      at: new Date().toISOString()
    });
    void sendShowcaseSocialPushToUser(party.userId, titleBody, body.slice(0, 180), {
      type: "vlue-dcc-owner-approval",
      applicationId: app.id
    });
  } catch (e) {
    console.warn("[enterprise-dcc] owner approval notify failed", e);
  }

  const next = await getApp(app.id);
  return {
    ok: true,
    application: next ? mapApp(next) : null,
    sentTo: {
      userId: party.userId,
      legalName: party.legalName,
      phoneMasked: party.phoneMasked
    },
    confirmMessage: `선택하신 업체 대표자(예: ${maskLegalName(party.legalName)})에게 인증 알림을 전송합니다. 진행하시겠습니까?`,
    notificationId,
    nextStep: "await_owner"
  };
}

function maskLegalName(name: string) {
  const n = String(name || "").trim();
  if (n.length <= 1) return "*";
  if (n.length === 2) return `${n[0]}*`;
  return `${n[0]}*${n.slice(-1)}`;
}

/** 대표자 — 대기 중인 DCC 승인 요청 */
export async function listOwnerPendingDccApprovals(ownerUserId: string) {
  await ensureEnterpriseDccTable();
  const rows = await prisma.$queryRawUnsafe<AppRow[]>(
    `SELECT * FROM enterprise_dcc_applications
     WHERE related_party_user_id = $1::uuid
       AND status = 'awaiting_owner_approval'
     ORDER BY updated_at DESC
     LIMIT 40`,
    ownerUserId
  );
  return {
    items: await Promise.all(
      rows.map(async (r) => {
        const applicant = await prisma.user.findUnique({
          where: { id: r.applicant_user_id },
          select: { legalName: true, publicHandle: true }
        });
        return {
          ...mapApp(r),
          applicantName: String(applicant?.legalName || r.contact_name || "신청자").trim(),
          applicantHandle: String(applicant?.publicHandle || "").trim()
        };
      })
    )
  };
}

/**
 * 대표자 승인/거절.
 * 거절 + 사칭 신고 시 신청자 DCC 생성 영구 차단.
 */
export async function reviewOwnerDccApproval(input: {
  applicationId: string;
  ownerUserId: string;
  action: "approve" | "reject";
  rejectReason?: string;
  reportImpersonation?: boolean;
}) {
  await ensureEnterpriseDccTable();
  const app = await getApp(input.applicationId);
  if (!app || app.related_party_user_id !== input.ownerUserId) {
    throw new Error("승인 권한이 없거나 신청을 찾을 수 없습니다.");
  }
  if (app.status !== "awaiting_owner_approval") {
    throw new Error("이미 처리된 요청입니다.");
  }

  if (input.action === "approve") {
    await prisma.$executeRawUnsafe(
      `UPDATE enterprise_dcc_applications SET
         related_party_verified_at = NOW(),
         status = 'related_verified',
         updated_at = NOW()
       WHERE id = $1::uuid`,
      app.id
    );
    const next = await getApp(app.id);
    try {
      const { ssePublish } = await import("../../realtime/sseHub.js");
      ssePublish(app.applicant_user_id, {
        type: "vlue-dcc-owner-approved",
        applicationId: app.id,
        title: "대표자 인증 승인",
        body: "대표자가 DCC 직장 인증을 승인했습니다. 위치·보안 인증을 진행해 주세요.",
        at: new Date().toISOString()
      });
    } catch {
      /* ignore */
    }
    return { ok: true, status: "related_verified" as const, application: next ? mapApp(next) : null, nextStep: "details" };
  }

  const reason = String(input.rejectReason || "").trim().slice(0, 500);
  await prisma.$executeRawUnsafe(
    `UPDATE enterprise_dcc_applications SET
       status = 'rejected',
       owner_reject_reason = $2,
       admin_note = $3,
       reviewed_at = NOW(),
       reviewed_by_user_id = $4::uuid,
       updated_at = NOW()
     WHERE id = $1::uuid`,
    app.id,
    reason || "owner_rejected",
    input.reportImpersonation ? `impersonation_report:${reason || "사칭 신고"}` : `owner_reject:${reason || "거절"}`,
    input.ownerUserId
  );

  if (input.reportImpersonation) {
    await banDccCreate(
      app.applicant_user_id,
      reason || "대표자 거절·사칭 신고",
      app.id
    );
  }

  try {
    const { ssePublish } = await import("../../realtime/sseHub.js");
    ssePublish(app.applicant_user_id, {
      type: "vlue-dcc-owner-rejected",
      applicationId: app.id,
      title: "대표자 인증 거절",
      body: input.reportImpersonation
        ? "대표자가 거절하고 사칭 신고를 접수했습니다. DCC 생성 권한이 차단될 수 있습니다."
        : "대표자가 직장 인증 요청을 거절했습니다.",
      at: new Date().toISOString()
    });
  } catch {
    /* ignore */
  }

  return {
    ok: true,
    status: "rejected" as const,
    banned: Boolean(input.reportImpersonation),
    nextStep: "done"
  };
}

/** 시나리오 B — 중소기업 증빙 서류 */
export async function saveEnterpriseDccDocuments(input: {
  applicationId: string;
  applicantUserId: string;
  businessRegistrationNo?: string;
  documents: Array<{ kind: string; url: string; fileName?: string }>;
  workplaceAddress?: string;
}) {
  await ensureEnterpriseDccTable();
  if (await isDccCreateBanned(input.applicantUserId)) {
    throw new Error("DCC 생성 권한이 영구 차단된 계정입니다.");
  }
  const app = await getApp(input.applicationId);
  if (!app || app.applicant_user_id !== input.applicantUserId) {
    throw new Error("신청 정보를 찾을 수 없습니다.");
  }
  const required = new Set([
    "employment_certificate",
    "insurance_enrollment",
    "tax_clearance"
  ]);
  const docs = (input.documents || [])
    .map((d) => ({
      kind: String(d.kind || "").trim(),
      url: String(d.url || "").trim(),
      fileName: String(d.fileName || "").trim()
    }))
    .filter((d) => d.kind && d.url);
  const kinds = new Set(docs.map((d) => d.kind));
  for (const k of required) {
    if (!kinds.has(k)) {
      throw new Error(
        "재직증명서·4대보험 가입자 가입내역 확인서·납세증명서를 모두 업로드해 주세요."
      );
    }
  }
  const addr = String(input.workplaceAddress || app.workplace_address || "").trim();
  let lat = app.workplace_lat;
  let lng = app.workplace_lng;
  if (addr && (lat == null || lng == null)) {
    try {
      const { geocodeDccAddress } = await import("../../integrations/kakao/kakaoAddressGeocode.js");
      const point = await geocodeDccAddress(addr);
      lat = point?.lat ?? null;
      lng = point?.lng ?? null;
    } catch {
      /* geocode optional at upload; security gate retries */
    }
  }
  await prisma.$executeRawUnsafe(
    `UPDATE enterprise_dcc_applications SET
       docs_json = $2::jsonb,
       workplace_address = COALESCE(NULLIF($3, ''), workplace_address),
       workplace_lat = COALESCE($4, workplace_lat),
       workplace_lng = COALESCE($5, workplace_lng),
       scenario = 'sme_docs',
       status = 'docs_submitted',
       updated_at = NOW()
     WHERE id = $1::uuid`,
    app.id,
    JSON.stringify({ items: docs, uploadedAt: new Date().toISOString() }),
    addr.slice(0, 500),
    lat,
    lng
  );
  const next = await getApp(app.id);
  return { ok: true, application: next ? mapApp(next) : null, nextStep: "details" };
}

/** 사업장 주소 저장 (위치 인증용) */
export async function saveEnterpriseWorkplace(input: {
  applicationId: string;
  applicantUserId: string;
  workplaceAddress: string;
  workplaceLat?: number | null;
  workplaceLng?: number | null;
}) {
  await ensureEnterpriseDccTable();
  const app = await getApp(input.applicationId);
  if (!app || app.applicant_user_id !== input.applicantUserId) {
    throw new Error("신청 정보를 찾을 수 없습니다.");
  }
  const addr = String(input.workplaceAddress || "").trim();
  if (!addr) throw new Error("사업장 주소를 입력해 주세요.");
  let lat = input.workplaceLat;
  let lng = input.workplaceLng;
  if (lat == null || lng == null) {
    const { geocodeDccAddress } = await import("../../integrations/kakao/kakaoAddressGeocode.js");
    const point = await geocodeDccAddress(addr);
    lat = point?.lat ?? null;
    lng = point?.lng ?? null;
  }
  await prisma.$executeRawUnsafe(
    `UPDATE enterprise_dcc_applications SET
       workplace_address = $2,
       workplace_lat = $3,
       workplace_lng = $4,
       updated_at = NOW()
     WHERE id = $1::uuid`,
    app.id,
    addr.slice(0, 500),
    lat,
    lng
  );
  const next = await getApp(app.id);
  return { ok: true, application: next ? mapApp(next) : null };
}

/** 최종 위치·보안 환경 검증 */
export async function attestEnterpriseDccSecurity(input: {
  applicationId: string;
  applicantUserId: string;
  lat: number;
  lng: number;
  networkType: string;
  vpnActive?: boolean;
  installedPackages?: string[];
}) {
  await ensureEnterpriseDccTable();
  if (await isDccCreateBanned(input.applicantUserId)) {
    throw new Error("DCC 생성 권한이 영구 차단된 계정입니다.");
  }
  const app = await getApp(input.applicationId);
  if (!app || app.applicant_user_id !== input.applicantUserId) {
    throw new Error("신청 정보를 찾을 수 없습니다.");
  }
  const allowed = new Set([
    "related_verified",
    "docs_submitted",
    "details_ready",
    "awaiting_security_gate",
    "security_verified"
  ]);
  if (!allowed.has(app.status)) {
    throw new Error("대표자 승인 또는 서류 제출 후 위치 인증을 진행할 수 있습니다.");
  }

  const { evaluateDccSecurityGate } = await import("../dcc/dccCreateSecurityGateService.js");
  const gate = await evaluateDccSecurityGate({
    lat: input.lat,
    lng: input.lng,
    networkType: input.networkType,
    vpnActive: input.vpnActive,
    installedPackages: input.installedPackages,
    workplaceAddress: app.workplace_address || undefined,
    workplaceLat: app.workplace_lat,
    workplaceLng: app.workplace_lng
  });

  if (!gate.canActivateButton) {
    return { ok: false, ...gate, application: mapApp(app) };
  }

  await prisma.$executeRawUnsafe(
    `UPDATE enterprise_dcc_applications SET
       security_attested_at = NOW(),
       status = 'security_verified',
       updated_at = NOW()
     WHERE id = $1::uuid`,
    app.id
  );
  const next = await getApp(app.id);
  return {
    ok: true,
    ...gate,
    application: next ? mapApp(next) : null,
    nextStep: "submit"
  };
}

