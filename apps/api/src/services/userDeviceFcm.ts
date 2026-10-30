import { prisma } from "../db/client.js";

/**
 * 동일 FCM 토큰을 가진 다른 사용자의 기기에서 토큰을 제거.
 * 계정 전환 시 이전 사용자에게 알림이 가는 버그 방지.
 * - FCM 토큰은 앱 설치에 종속되므로, 기기에서 계정 A→B 전환 시 동일 토큰.
 * - A 로그아웃·B 로그인 후에도 A의 UserDevice에 토큰이 남아있으면,
 *   A 대상 푸시가 B가 사용 중인 기기에 도착한다.
 */
async function clearFcmTokenFromOtherUsers(
  currentUserId: string,
  fcmToken: string
): Promise<number> {
  if (!fcmToken || fcmToken.length < 20) return 0;
  try {
    const result = await prisma.userDevice.updateMany({
      where: {
        fcmToken,
        userId: { not: currentUserId }
      },
      data: { fcmToken: null }
    });
    if (result.count > 0) {
      console.info("[fcm] cleared_token_from_other_users", {
        currentUserId,
        clearedCount: result.count,
        tokenPrefix: fcmToken.slice(0, 12)
      });
    }
    return result.count;
  } catch (err) {
    console.warn("[fcm] clear_token_from_others_failed", { currentUserId, err });
    return 0;
  }
}

/** 승인된 기기에 FCM 토큰 등록(로그인 deviceToken과 매칭) */
export async function registerUserDeviceFcmToken(
  userId: string,
  deviceToken: string,
  fcmToken: string,
  opts?: { platform?: string | null }
): Promise<{ ok: boolean; error?: string }> {
  const dt = String(deviceToken || "").trim();
  const ft = String(fcmToken || "").trim();
  if (!dt || !ft) return { ok: false, error: "deviceToken 및 fcmToken 필요" };
  if (ft.length < 20) return { ok: false, error: "fcmToken 형식이 올바르지 않습니다." };

  try {
    /* 계정 전환 시 이전 사용자의 기기에서 동일 FCM 토큰 제거 */
    await clearFcmTokenFromOtherUsers(userId, ft);

    let device = await prisma.userDevice.findUnique({
      where: { userId_deviceToken: { userId, deviceToken: dt } },
      select: { id: true, isVerified: true, platform: true }
    });

    if (!device && String(opts?.platform || "").toLowerCase() === "app") {
      device = await prisma.userDevice.findFirst({
        where: { userId, platform: "app", isVerified: true },
        orderBy: { updatedAt: "desc" },
        select: { id: true, isVerified: true, platform: true }
      });
    }

    const platform = String(opts?.platform || "").toLowerCase();

    if (!device && platform === "app") {
      device = await prisma.userDevice.create({
        data: {
          userId,
          deviceToken: dt,
          isVerified: true,
          verifiedAt: new Date(),
          platform: "app",
          label: "Android 앱",
          clientKind: "mobile"
        },
        select: { id: true, isVerified: true, platform: true }
      });
    }

    if (!device && platform === "web") {
      device = await prisma.userDevice.upsert({
        where: { userId_deviceToken: { userId, deviceToken: dt } },
        create: {
          userId,
          deviceToken: dt,
          isVerified: true,
          verifiedAt: new Date(),
          platform: "web",
          label: "웹",
          clientKind: "mobile"
        },
        update: {
          isVerified: true,
          verifiedAt: new Date()
        },
        select: { id: true, isVerified: true, platform: true }
      });
    }

    if (!device) return { ok: false, error: "등록된 기기를 찾을 수 없습니다." };
    if (!device.isVerified && platform !== "app" && platform !== "web") {
      return { ok: false, error: "승인된 기기에서만 FCM 토큰을 등록할 수 있습니다." };
    }

    await prisma.userDevice.update({
      where: { id: device.id },
      data: {
        fcmToken: ft,
        ...(device.isVerified
          ? {}
          : {
              isVerified: true,
              verifiedAt: new Date(),
              platform: device.platform || "app",
              label: device.platform === "app" ? "Android 앱" : "Android 앱"
            })
      }
    });
    return { ok: true };
  } catch (err) {
    console.warn("[fcm] register_token_failed", { userId, err });
    return { ok: false, error: "FCM 토큰 저장 실패" };
  }
}

/**
 * 로그아웃 시 사용자의 모든 기기에서 FCM 토큰 제거.
 * - 기기 전환·계정 전환 시 이전 사용자에게 알림이 가는 것을 방지
 * - 앱에서 로그아웃 시 호출
 */
export async function clearUserFcmTokens(
  userId: string,
  opts?: { deviceToken?: string | null }
): Promise<{ ok: boolean; cleared: number }> {
  if (!userId) return { ok: false, cleared: 0 };
  try {
    const where: { userId: string; deviceToken?: string } = { userId };
    if (opts?.deviceToken) {
      where.deviceToken = String(opts.deviceToken).trim();
    }
    const result = await prisma.userDevice.updateMany({
      where,
      data: { fcmToken: null }
    });
    console.info("[fcm] user_tokens_cleared", {
      userId,
      deviceToken: opts?.deviceToken || "all",
      cleared: result.count
    });
    return { ok: true, cleared: result.count };
  } catch (err) {
    console.warn("[fcm] clear_user_tokens_failed", { userId, err });
    return { ok: false, cleared: 0 };
  }
}
