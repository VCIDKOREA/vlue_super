import { prisma } from "../../db/client.js";
import { normalizeDesiredPublicHandle } from "../../lib/publicHandle.js";
import {
  isReservedId,
  RESERVED_ID_MESSAGE,
  VIRTUAL_ID_CONFLICT_MESSAGE
} from "@vlue/shared/signup/reservedIds";
import {
  buildFullVirtualEmail,
  deriveVirtualPrefixFromHandle,
  isValidEmailShape,
  normalizeBusinessEmail
} from "./signupEmailProvision.js";
import { suggestHandleBaseFromEmail } from "./emailDomainClassification.js";
import { findMappingByFullVirtualEmail } from "./userEmailMappingsStore.js";

export type VirtualEmailIdCheckResult = {
  available: boolean;
  normalized: string | null;
  suggestedPrefix: string | null;
  fullVirtualEmail: string | null;
  needsCustom: boolean;
  reason: string | null;
  code: "RESERVED" | "INVALID_FORMAT" | "TAKEN" | "OK" | "EMAIL_TAKEN" | null;
};

export function suggestPrefixFromBusinessEmail(emailRaw: string): string | null {
  const base = suggestHandleBaseFromEmail(emailRaw);
  if (!base) return null;
  return deriveVirtualPrefixFromHandle(base) || null;
}
async function isVirtualIdTaken(normalized: string): Promise<boolean> {
  const full = buildFullVirtualEmail(normalized);
  const [handleClash, mappingClash] = await Promise.all([
    prisma.user.findFirst({ where: { publicHandle: normalized }, select: { id: true } }),
    findMappingByFullVirtualEmail(full)
  ]);
  return Boolean(handleClash || mappingClash);
}

export async function checkVirtualEmailIdAvailability(
  virtualIdRaw: string
): Promise<VirtualEmailIdCheckResult> {
  if (isReservedId(virtualIdRaw)) {
    return {
      available: false,
      normalized: null,
      suggestedPrefix: null,
      fullVirtualEmail: null,
      needsCustom: true,
      reason: RESERVED_ID_MESSAGE,
      code: "RESERVED"
    };
  }

  const normalized = normalizeDesiredPublicHandle(virtualIdRaw);
  if (!normalized) {
    return {
      available: false,
      normalized: null,
      suggestedPrefix: null,
      fullVirtualEmail: null,
      needsCustom: true,
      reason:
        "영문 소문자로 시작, 3~20자(소문자·숫자·_), 숫자 1자 이상 포함이어야 합니다.",
      code: "INVALID_FORMAT"
    };
  }

  if (await isVirtualIdTaken(normalized)) {
    return {
      available: false,
      normalized,
      suggestedPrefix: normalized,
      fullVirtualEmail: buildFullVirtualEmail(normalized),
      needsCustom: true,
      reason: VIRTUAL_ID_CONFLICT_MESSAGE,
      code: "TAKEN"
    };
  }

  return {
    available: true,
    normalized,
    suggestedPrefix: normalized,
    fullVirtualEmail: buildFullVirtualEmail(normalized),
    needsCustom: false,
    reason: null,
    code: "OK"
  };
}

export async function previewBusinessVirtualEmail(
  emailRaw: string
): Promise<VirtualEmailIdCheckResult> {
  const email = normalizeBusinessEmail(emailRaw);
  if (!isValidEmailShape(email)) {
    return {
      available: false,
      normalized: null,
      suggestedPrefix: null,
      fullVirtualEmail: null,
      needsCustom: false,
      reason: "유효한 이메일 주소를 입력해 주세요.",
      code: "INVALID_FORMAT"
    };
  }

  const emailTaken = await prisma.user.findFirst({
    where: { email },
    select: { id: true }
  });
  if (emailTaken) {
    return {
      available: false,
      normalized: null,
      suggestedPrefix: null,
      fullVirtualEmail: null,
      needsCustom: false,
      reason: "이미 가입된 이메일입니다. 로그인해 주세요.",
      code: "EMAIL_TAKEN"
    };
  }

  const suggested = suggestPrefixFromBusinessEmail(email);
  if (!suggested) {
    return {
      available: false,
      normalized: null,
      suggestedPrefix: null,
      fullVirtualEmail: null,
      needsCustom: true,
      reason: VIRTUAL_ID_CONFLICT_MESSAGE,
      code: "INVALID_FORMAT"
    };
  }

  return checkVirtualEmailIdAvailability(suggested);
}

export async function assertVirtualEmailIdForSignup(virtualIdRaw: string): Promise<string> {
  const result = await checkVirtualEmailIdAvailability(virtualIdRaw);
  if (!result.available || !result.normalized) {
    throw new Error(result.reason || VIRTUAL_ID_CONFLICT_MESSAGE);
  }
  return result.normalized;
}

export async function assertSignupLoginIdNotReserved(loginIdRaw: string): Promise<void> {
  if (isReservedId(loginIdRaw)) {
    throw new Error(RESERVED_ID_MESSAGE);
  }
}
