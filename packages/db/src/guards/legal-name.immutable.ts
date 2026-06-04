/**
 * VLUE 실명(`User.legalName`) 불변 가드 — 애플리케이션 레벨
 *
 * 원칙:
 * 1) legal_name 은 Portone 본인인증 완료 시 **최초 1회만** 설정한다.
 * 2) `legalNameLockedAt` 이 채워진 뒤에는 어떤 API·배치에서도 `legalName` 을 변경하지 않는다.
 * 3) Prisma `update({ data: { legalName: ... } })` 를 직접 호출하지 말고, 반드시 이 모듈의
 *    `applyInitialLegalName` 또는 서비스 단일 진입점만 사용한다.
 * 4) 관리자도 실명 변경 불가(정책 예외 시 별도 법적 프로세스 + 감사 로그 테이블 — 스키마 외).
 *
 * DB 추가 방어(권장, 마이그레이션에서 정의):
 * - BEFORE UPDATE ON users ... IF OLD.legal_name IS NOT NULL AND NEW.legal_name IS DISTINCT FROM OLD.legal_name THEN RAISE EXCEPTION ...
 */

import type { AccountStatus, Prisma, User } from "@prisma/client";

export class LegalNameImmutableError extends Error {
  constructor(message = "legal_name is immutable after lock") {
    super(message);
    this.name = "LegalNameImmutableError";
  }
}

/** 이미 잠긴 사용자인지 */
export function isLegalNameLocked(user: Pick<User, "legalName" | "legalNameLockedAt">): boolean {
  return user.legalNameLockedAt != null && user.legalName != null && user.legalName.length > 0;
}

/**
 * 본인인증 직후 최초 설정용. 이미 실명이 잠긴 경우 호출 금지.
 * 트랜잭션 내에서 호출하는 것을 권장.
 *
 * @alias 서비스 레이어에서 `applyInitialLegalName` 이름으로 래핑해도 됨.
 */
export function buildInitialLegalNameData(params: {
  legalName: string;
  portoneIdentityId?: string | null;
  identityVerifiedAt?: Date;
  /** 일반 회원: active — 사업자 승인 큐: pending_approval */
  accountStatus?: Extract<AccountStatus, "active" | "pending_approval">;
  /** 사업자 pending_approval 진입 시각(관리자 모니터링용)
   */
  pendingApprovalAt?: Date | null;
}): Pick<
  Prisma.UserUpdateInput,
  | "legalName"
  | "legalNameLockedAt"
  | "identityVerified"
  | "identityVerifiedAt"
  | "portoneIdentityId"
  | "accountStatus"
  | "pendingApprovalAt"
> {
  const trimmed = params.legalName.trim();
  if (!trimmed) {
    throw new Error("legalName must be non-empty on first set");
  }
  const now = params.identityVerifiedAt ?? new Date();
  const status = params.accountStatus ?? "active";
  return {
    legalName: trimmed,
    legalNameLockedAt: now,
    identityVerified: true,
    identityVerifiedAt: now,
    portoneIdentityId: params.portoneIdentityId ?? undefined,
    accountStatus: status,
    pendingApprovalAt: params.pendingApprovalAt ?? (status === "pending_approval" ? now : null)
  };
}

/** 스키마 주석의 용어와 맞춘 별칭 */
export const applyInitialLegalName = buildInitialLegalNameData;

/**
 * Prisma update data 에서 실명 필드가 실수로 들어오지 않도록 제거한다.
 * 공통 `sanitizeUserUpdateInput` 에서 사용.
 */
export function stripMutableLegalNameFields<T extends Prisma.UserUpdateInput>(data: T): T {
  const { legalName: _l, legalNameLockedAt: _a, ...rest } = data;
  void _l;
  void _a;
  return rest as T;
}

/**
 * 업데이트 전 검사. 이미 잠긴 상태인데 payload 에 legalName 이 오면 예외.
 */
export function assertLegalNameNotOverwritten(existing: User, incoming: Prisma.UserUpdateInput): void {
  if (!isLegalNameLocked(existing)) return;
  if (incoming.legalName !== undefined) {
    throw new LegalNameImmutableError();
  }
  if (incoming.legalNameLockedAt !== undefined) {
    throw new LegalNameImmutableError("legal_name_locked_at must not be reassigned");
  }
}
