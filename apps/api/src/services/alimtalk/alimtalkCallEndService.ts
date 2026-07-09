import { prisma } from "../../db/client.js";
import { normalizeToE164KR } from "../../lib/phoneE164.js";
import { buildCallEndAlimtalkPayload } from "../../lib/alimtalkTemplate.js";
import { AlimtalkSendError, getAlimtalkSendMode, sendCallEndAlimtalk } from "./alimtalkSender.js";

export type CallEndAlimtalkSkipReason =
  | "invalid_peer_phone"
  | "peer_is_vlue_member"
  | "peer_opted_out"
  | "daily_limit_reached"
  | "send_disabled";

export type CallEndAlimtalkResult = {
  ok: boolean;
  sent: boolean;
  skipped: boolean;
  reason?: CallEndAlimtalkSkipReason;
  peerPhoneE164?: string;
  payload?: ReturnType<typeof buildCallEndAlimtalkPayload>;
  providerMessageId?: string;
  log?: string[];
};

/** KST 당일 00:00:00 ~ 23:59:59.999 → UTC Date 범위 */
export function kstDayBoundsUtc(d = new Date()) {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth();
  const day = kst.getUTCDate();
  const kstOffsetMs = 9 * 60 * 60 * 1000;
  return {
    start: new Date(Date.UTC(y, m, day, 0, 0, 0, 0) - kstOffsetMs),
    end: new Date(Date.UTC(y, m, day, 23, 59, 59, 999) - kstOffsetMs)
  };
}

function mapCallDirection(direction?: "in" | "out") {
  return direction === "in" ? "inbound" : "outbound";
}

/** 테스트·개발 — 특정 번호의 발송 로그·수신거부 초기화 */
export async function resetAlimtalkCallEndTestData(phones: string[]) {
  const e164s = [...new Set(phones.map((p) => normalizeToE164KR(p)).filter(Boolean))] as string[];
  if (!e164s.length) return;
  await prisma.alimtalkSendLog.deleteMany({ where: { peerPhone: { in: e164s } } });
  await prisma.alimtalkOptOut.deleteMany({ where: { phone: { in: e164s } } });
}

export async function registerAlimtalkOptOut(peerPhoneE164: string) {
  const e164 = normalizeToE164KR(peerPhoneE164);
  if (!e164) return;
  await prisma.alimtalkOptOut.upsert({
    where: { phone: e164 },
    create: { phone: e164 },
    update: {}
  });
}

export async function isVlueMemberByPhone(phone: string): Promise<boolean> {
  const e164 = normalizeToE164KR(phone);
  if (!e164) return false;
  const u = await prisma.user.findFirst({
    where: { phoneE164: e164 },
    select: { id: true }
  });
  return Boolean(u);
}

async function isPeerOptedOut(peerPhoneE164: string): Promise<boolean> {
  const row = await prisma.alimtalkOptOut.findUnique({
    where: { phone: peerPhoneE164 },
    select: { id: true }
  });
  return Boolean(row);
}

async function hasSentToday(peerPhoneE164: string): Promise<boolean> {
  const { start, end } = kstDayBoundsUtc();
  const row = await prisma.alimtalkSendLog.findFirst({
    where: {
      peerPhone: peerPhoneE164,
      sentAt: { gte: start, lte: end }
    },
    select: { id: true }
  });
  return Boolean(row);
}

async function recordSend(peerPhoneE164: string, direction: string) {
  await prisma.alimtalkSendLog.create({
    data: {
      peerPhone: peerPhoneE164,
      direction
    }
  });
}

/**
 * 통화 종료 → 카카오 알림톡 (미가입자만, 1일 1회, 수신거부 차단)
 */
export async function processCallEndAlimtalk(
  _callerUserId: string,
  input: { peerPhone?: string; durationSec?: number; direction?: "in" | "out" }
): Promise<CallEndAlimtalkResult> {
  const log: string[] = [];
  const peerPhoneE164 = normalizeToE164KR(String(input.peerPhone || "").trim());
  const alimtalkDirection = mapCallDirection(input.direction);

  log.push(`[1] peer normalize → ${peerPhoneE164 || "(invalid)"}`);
  if (!peerPhoneE164) {
    return { ok: false, sent: false, skipped: true, reason: "invalid_peer_phone", log };
  }

  const sendMode = getAlimtalkSendMode();
  if (sendMode === "disabled") {
    log.push("[2] KAKAO_ALIMTALK_ENABLED=disabled → skip");
    return { ok: true, sent: false, skipped: true, reason: "send_disabled", peerPhoneE164, log };
  }

  const peerMember = await isVlueMemberByPhone(peerPhoneE164);
  log.push(`[2] VLUE 가입자 여부 → ${peerMember ? "가입" : "미가입"}`);
  if (peerMember) {
    log.push("[3] 미가입자만 발송 → 앱 내부 알림함으로 대체 (알림톡 생략)");
    return {
      ok: true,
      sent: false,
      skipped: true,
      reason: "peer_is_vlue_member",
      peerPhoneE164,
      log
    };
  }

  if (await isPeerOptedOut(peerPhoneE164)) {
    log.push("[3] 수신거부(블랙리스트) → 발송 차단");
    return {
      ok: true,
      sent: false,
      skipped: true,
      reason: "peer_opted_out",
      peerPhoneE164,
      log
    };
  }

  if (await hasSentToday(peerPhoneE164)) {
    log.push("[4] 당일 중복 발송 제한(1일 1회) → skip");
    return {
      ok: true,
      sent: false,
      skipped: true,
      reason: "daily_limit_reached",
      peerPhoneE164,
      log
    };
  }

  const payload = buildCallEndAlimtalkPayload(peerPhoneE164);
  log.push("[5] 알림톡 템플릿 조립 완료");

  try {
    const dispatched = await sendCallEndAlimtalk(payload);
    await recordSend(peerPhoneE164, alimtalkDirection);
    log.push(
      `[6] 발송 완료 mode=${dispatched.mode} provider=${dispatched.provider || "-"} id=${dispatched.messageId} · DB log saved`
    );

    return {
      ok: true,
      sent: true,
      skipped: false,
      peerPhoneE164,
      payload,
      providerMessageId: dispatched.messageId,
      log
    };
  } catch (e) {
    const msg = e instanceof AlimtalkSendError ? e.message : e instanceof Error ? e.message : "unknown";
    log.push(`[6] 발송 실패 → ${msg}`);
    return { ok: false, sent: false, skipped: true, peerPhoneE164, payload, log };
  }
}
