import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { isReservedId, RESERVED_ID_MESSAGE } from "@vlue/shared/signup/reservedIds";

/** @ 접두사 제거 후 소문자. 유효하면 슬러그만 반환, 아니면 null */
export function normalizeDesiredPublicHandle(raw: string | undefined | null): string | null {
  const s = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "");
  if (!s) return null;
  if (!/^[a-z][a-z0-9_]{2,19}$/.test(s)) return null;
  /** 로그인 ID 정책: 숫자 1자 이상 포함 */
  if (!/[0-9]/.test(s)) return null;
  return s;
}

/** 로그인·비밀번호 찾기용 — 가입 정책(숫자 필수)과 달리 기존 ID 조회를 허용 */
export function normalizeLoginPublicHandle(raw: string | undefined | null): string | null {
  const s = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "");
  if (!s) return null;
  if (!/^[a-z][a-z0-9_]{2,19}$/.test(s)) return null;
  return s;
}

export async function resolvePublicHandleForNewUser(
  prisma: PrismaClient,
  desired: string | null
): Promise<string> {
  if (desired) {
    if (isReservedId(desired)) {
      throw new Error(RESERVED_ID_MESSAGE);
    }
    const clash = await prisma.user.findFirst({ where: { publicHandle: desired }, select: { id: true } });
    if (clash) {
      throw new Error("이미 사용 중인 회원 ID입니다. 다른 ID를 입력해 주세요.");
    }
    return desired;
  }
  for (let i = 0; i < 10; i++) {
    const gen = `vlue${randomBytes(3).toString("hex")}`;
    const clash = await prisma.user.findFirst({ where: { publicHandle: gen }, select: { id: true } });
    if (!clash) return gen;
  }
  throw new Error("회원 ID 자동 발급에 실패했습니다. 잠시 후 다시 시도해 주세요.");
}

/** 기존 계정에 handle 이 없을 때만 설정(또는 클라이언트가 최초 1회 제안) */
export async function ensurePublicHandleForExistingUser(
  prisma: PrismaClient,
  userId: string,
  existingHandle: string | null | undefined,
  desired: string | null
): Promise<string> {
  if (existingHandle) return existingHandle;
  if (desired) {
    const clash = await prisma.user.findFirst({
      where: { publicHandle: desired, NOT: { id: userId } },
      select: { id: true }
    });
    if (clash) {
      throw new Error("이미 사용 중인 회원 ID입니다. 다른 ID를 입력해 주세요.");
    }
    await prisma.user.update({ where: { id: userId }, data: { publicHandle: desired } });
    return desired;
  }
  for (let i = 0; i < 10; i++) {
    const gen = `vlue${randomBytes(3).toString("hex")}`;
    const clash = await prisma.user.findFirst({ where: { publicHandle: gen }, select: { id: true } });
    if (!clash) {
      await prisma.user.update({ where: { id: userId }, data: { publicHandle: gen } });
      return gen;
    }
  }
  throw new Error("회원 ID를 설정할 수 없습니다. 잠시 후 다시 시도해 주세요.");
}

/** 소셜/자동 발급 임시 ID — 케이스함·소셜 진입 전 사용자 선택 @아이디로 교체 필요 */
export function isProvisionalAutoPublicHandle(handle: string | null | undefined): boolean {
  const s = String(handle || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "");
  return /^vlue[a-f0-9]{6}$/.test(s);
}

export function needsPublicHandleClaim(handle: string | null | undefined): boolean {
  const s = String(handle || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "");
  if (!s) return true;
  return isProvisionalAutoPublicHandle(s);
}

/**
 * 미설정·임시(vlue+hex) 핸들만 사용자 선택 @아이디로 확정.
 * 이미 확정된 핸들은 변경 불가.
 */
export async function claimPublicHandleForUser(
  prisma: PrismaClient,
  userId: string,
  desiredRaw: string
): Promise<{ publicHandle: string; claimed: boolean }> {
  const desired = normalizeDesiredPublicHandle(desiredRaw);
  if (!desired) {
    throw Object.assign(
      new Error("영문 소문자로 시작, 3~20자(소문자·숫자·_), 숫자 1자 이상 포함이어야 합니다."),
      { statusCode: 400 }
    );
  }
  if (isReservedId(desired)) {
    throw Object.assign(new Error(RESERVED_ID_MESSAGE), { statusCode: 400 });
  }
  if (isProvisionalAutoPublicHandle(desired)) {
    throw Object.assign(new Error("자동 발급 형식의 아이디는 사용할 수 없습니다. 다른 ID를 입력해 주세요."), {
      statusCode: 400
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, publicHandle: true }
  });
  if (!user) {
    throw Object.assign(new Error("회원을 찾을 수 없습니다."), { statusCode: 404 });
  }

  const current = String(user.publicHandle || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "");
  if (current && !isProvisionalAutoPublicHandle(current)) {
    if (current === desired) return { publicHandle: current, claimed: false };
    throw Object.assign(new Error("이미 설정된 회원 ID는 변경할 수 없습니다."), { statusCode: 409 });
  }

  const clash = await prisma.user.findFirst({
    where: { publicHandle: desired, NOT: { id: userId } },
    select: { id: true }
  });
  if (clash) {
    throw Object.assign(new Error("이미 사용 중인 회원 ID입니다. 다른 ID를 입력해 주세요."), {
      statusCode: 409
    });
  }

  await prisma.user.update({ where: { id: userId }, data: { publicHandle: desired } });
  return { publicHandle: desired, claimed: true };
}
