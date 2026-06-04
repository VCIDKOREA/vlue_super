import { prisma } from "../db/client.js";

/** 승인된 기기에 FCM 토큰 등록(로그인 deviceToken과 매칭) */
export async function registerUserDeviceFcmToken(
  userId: string,
  deviceToken: string,
  fcmToken: string
): Promise<{ ok: boolean; error?: string }> {
  const dt = String(deviceToken || "").trim();
  const ft = String(fcmToken || "").trim();
  if (!dt || !ft) return { ok: false, error: "deviceToken 및 fcmToken 필요" };
  if (ft.length < 20) return { ok: false, error: "fcmToken 형식이 올바르지 않습니다." };

  try {
    const device = await prisma.userDevice.findUnique({
      where: { userId_deviceToken: { userId, deviceToken: dt } },
      select: { id: true, isVerified: true }
    });
    if (!device) return { ok: false, error: "등록된 기기를 찾을 수 없습니다." };
    if (!device.isVerified) return { ok: false, error: "승인된 기기에서만 FCM 토큰을 등록할 수 있습니다." };

    await prisma.userDevice.update({
      where: { id: device.id },
      data: { fcmToken: ft }
    });
    return { ok: true };
  } catch (err) {
    console.warn("[fcm] register_token_failed", { userId, err });
    return { ok: false, error: "FCM 토큰 저장 실패" };
  }
}
