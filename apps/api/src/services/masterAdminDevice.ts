import { prisma } from "../db/client.js";
import { normalizeKrPhone } from "../integrations/portone/iamportCert.js";

/**
 * 기획자(마스터) 휴대폰: 본인인증 번호가 ADMIN_MASTER_PHONE_E164 와 일치하고
 * 클라이언트가 adminDeviceKey 를 넘기면 해당 기기를 마스터·승인 완료로 등록.
 */
export async function upsertMasterAdminDeviceIfEligible(params: {
  userId: string;
  phoneE164ForCheck: string | null | undefined;
  adminDeviceKey?: string | null | undefined;
}): Promise<void> {
  const masterPhone = process.env.ADMIN_MASTER_PHONE_E164?.trim();
  const key = params.adminDeviceKey?.trim();
  if (!masterPhone || !key || key.length > 80) return;

  const want = normalizeKrPhone(masterPhone);
  const got = normalizeKrPhone(params.phoneE164ForCheck ?? undefined);
  if (!want || !got || want !== got) return;

  await prisma.adminDevice.upsert({
    where: { deviceKey: key },
    create: {
      deviceKey: key,
      userId: params.userId,
      isMaster: true,
      isAuthorized: true,
      authCode: null,
      authCodeExpiresAt: null
    },
    update: {
      userId: params.userId,
      isMaster: true,
      isAuthorized: true,
      authCode: null,
      authCodeExpiresAt: null
    }
  });
}
