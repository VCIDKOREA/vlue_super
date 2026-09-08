import { prisma } from "../../db/client.js";
import { normalizeToE164KR } from "../../lib/phoneE164.js";

/** 서로 다른 인증 계정 신고 누적 임계값 — 도달 시 under_review */
export const DCC_REPORT_THRESHOLD = 3;
/** 소명 유예 (시간) */
export const DCC_APPEAL_GRACE_HOURS = 48;
/** 상습 허위 신고 페널티 — 최근 N건 반려 시 신고 제한 */
export const REPORTER_PENALTY_REJECT_THRESHOLD = 5;

let initialized = false;

export async function ensureDccModerationTable() {
  if (initialized) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS dcc_moderation_states (
      user_id UUID PRIMARY KEY,
      status VARCHAR(32) NOT NULL DEFAULT 'clear',
      report_count INT NOT NULL DEFAULT 0,
      under_review_at TIMESTAMPTZ,
      grace_ends_at TIMESTAMPTZ,
      appeal_submitted_at TIMESTAMPTZ,
      appeal_note TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS dcc_reporter_penalties (
      reporter_id UUID PRIMARY KEY,
      false_report_count INT NOT NULL DEFAULT 0,
      report_blocked_until TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  initialized = true;
}

export type DccModerationDto = {
  status: "clear" | "under_review" | "grace" | "restricted";
  reportCount: number;
  underReviewAt: string | null;
  graceEndsAt: string | null;
  viewerBanner: string;
};

function bannerFor(status: string, graceEndsAt: Date | null): string {
  if (status === "under_review") {
    return "검토 중인 프로필입니다. 신고가 접수되어 운영진이 확인 중입니다.";
  }
  if (status === "grace") {
    const until = graceEndsAt ? graceEndsAt.toISOString() : "";
    return until
      ? `소명 기간이 부여되었습니다. ${until} 전까지 소명 자료를 제출해 주세요.`
      : "48시간 이내 소명 자료를 제출해 주세요.";
  }
  if (status === "restricted") {
    return "이용이 제한된 프로필입니다. 고객센터에 문의해 주세요.";
  }
  return "";
}

export async function getDccModerationForUser(userId: string): Promise<DccModerationDto> {
  await ensureDccModerationTable();
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      status: string;
      report_count: number;
      under_review_at: Date | null;
      grace_ends_at: Date | null;
    }>
  >(
    `SELECT status, report_count, under_review_at, grace_ends_at FROM dcc_moderation_states WHERE user_id = $1::uuid LIMIT 1;`,
    userId
  );
  const row = rows[0];
  if (!row) {
    return {
      status: "clear",
      reportCount: 0,
      underReviewAt: null,
      graceEndsAt: null,
      viewerBanner: ""
    };
  }
  let status = String(row.status || "clear") as DccModerationDto["status"];
  if (status === "grace" && row.grace_ends_at && row.grace_ends_at.getTime() < Date.now()) {
    status = "restricted";
  }
  return {
    status,
    reportCount: Number(row.report_count) || 0,
    underReviewAt: row.under_review_at?.toISOString?.() || null,
    graceEndsAt: row.grace_ends_at?.toISOString?.() || null,
    viewerBanner: bannerFor(status, row.grace_ends_at)
  };
}

export async function assertReporterCanFile(reporterId: string) {
  await ensureDccModerationTable();
  const rows = await prisma.$queryRawUnsafe<
    Array<{ report_blocked_until: Date | null; false_report_count: number }>
  >(
    `SELECT report_blocked_until, false_report_count FROM dcc_reporter_penalties WHERE reporter_id = $1::uuid LIMIT 1;`,
    reporterId
  );
  const until = rows[0]?.report_blocked_until;
  if (until && until.getTime() > Date.now()) {
    const err = new Error("허위·보복성 신고로 신고 권한이 일시 제한되었습니다.");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
}

/** 피신고자(번호 소유 유저)에 대해 서로 다른 신고자 수 집계 후 임계값 처리 */
export async function applyReportThresholdForPhone(phoneRaw: string) {
  await ensureDccModerationTable();
  const e164 = normalizeToE164KR(phoneRaw);
  if (!e164) return null;

  const owner = await prisma.user.findFirst({
    where: { phoneE164: e164 },
    select: { id: true }
  });
  if (!owner) return null;

  const distinct = await prisma.letteringPhoneReport.groupBy({
    by: ["reporterId"],
    where: { phoneE164: e164 },
    _count: { _all: true }
  });
  const uniqueReporters = distinct.length;

  if (uniqueReporters < DCC_REPORT_THRESHOLD) {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO dcc_moderation_states (user_id, status, report_count, updated_at)
        VALUES ($1::uuid, 'clear', $2, NOW())
        ON CONFLICT (user_id) DO UPDATE
        SET report_count = $2, updated_at = NOW()
        WHERE dcc_moderation_states.status = 'clear';
      `,
      owner.id,
      uniqueReporters
    );
    return { userId: owner.id, uniqueReporters, status: "clear" as const };
  }

  const graceEnds = new Date(Date.now() + DCC_APPEAL_GRACE_HOURS * 60 * 60 * 1000);
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO dcc_moderation_states (
        user_id, status, report_count, under_review_at, grace_ends_at, updated_at
      )
      VALUES ($1::uuid, 'under_review', $2, NOW(), $3::timestamptz, NOW())
      ON CONFLICT (user_id) DO UPDATE
      SET status = CASE
            WHEN dcc_moderation_states.status IN ('restricted') THEN dcc_moderation_states.status
            ELSE 'under_review'
          END,
          report_count = $2,
          under_review_at = COALESCE(dcc_moderation_states.under_review_at, NOW()),
          grace_ends_at = COALESCE(dcc_moderation_states.grace_ends_at, $3::timestamptz),
          updated_at = NOW();
    `,
    owner.id,
    uniqueReporters,
    graceEnds.toISOString()
  );

  /* 스냅샷에 검토 중 플래그 — 뷰어 배너용 */
  const card = await prisma.digitalCard.findUnique({
    where: { userId: owner.id },
    select: { exportSnapshotJson: true }
  });
  if (card) {
    const prev =
      card.exportSnapshotJson && typeof card.exportSnapshotJson === "object"
        ? (card.exportSnapshotJson as Record<string, unknown>)
        : {};
    await prisma.digitalCard.update({
      where: { userId: owner.id },
      data: {
        exportSnapshotJson: {
          ...prev,
          moderationStatus: "under_review",
          moderationGraceEndsAt: graceEnds.toISOString()
        }
      }
    });
  }

  return { userId: owner.id, uniqueReporters, status: "under_review" as const };
}

export async function startGracePeriod(userId: string) {
  await ensureDccModerationTable();
  const graceEnds = new Date(Date.now() + DCC_APPEAL_GRACE_HOURS * 60 * 60 * 1000);
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO dcc_moderation_states (user_id, status, grace_ends_at, under_review_at, updated_at)
      VALUES ($1::uuid, 'grace', $2::timestamptz, NOW(), NOW())
      ON CONFLICT (user_id) DO UPDATE
      SET status = 'grace', grace_ends_at = $2::timestamptz, updated_at = NOW();
    `,
    userId,
    graceEnds.toISOString()
  );
  return getDccModerationForUser(userId);
}

export async function submitAppeal(userId: string, note: string) {
  await ensureDccModerationTable();
  await prisma.$executeRawUnsafe(
    `
      UPDATE dcc_moderation_states
      SET appeal_note = $2, appeal_submitted_at = NOW(), updated_at = NOW()
      WHERE user_id = $1::uuid;
    `,
    userId,
    String(note || "").trim().slice(0, 2000)
  );
  return getDccModerationForUser(userId);
}
