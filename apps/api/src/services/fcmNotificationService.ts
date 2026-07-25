import { prisma } from "../db/client.js";

type FirebaseAdminModule = typeof import("firebase-admin");

let adminModule: FirebaseAdminModule | null | undefined;
let initAttempted = false;

function resolvePrivateKey(raw: string | undefined): string | undefined {
  const v = String(raw || "").trim();
  if (!v) return undefined;
  return v.replace(/\\n/g, "\n");
}

async function ensureFirebaseApp(): Promise<FirebaseAdminModule | null> {
  if (initAttempted) return adminModule ?? null;
  initAttempted = true;

  try {
    const admin = await import("firebase-admin");
    adminModule = admin;

    if (admin.apps.length > 0) return admin;

    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
    if (credPath) {
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
      return admin;
    }

    const projectId = process.env.FCM_PROJECT_ID?.trim();
    const clientEmail = process.env.FCM_CLIENT_EMAIL?.trim();
    const privateKey = resolvePrivateKey(process.env.FCM_PRIVATE_KEY);
    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey })
      });
      return admin;
    }

    console.warn("[fcm] credentials_not_configured — push skipped");
    adminModule = null;
    return null;
  } catch (err) {
    console.warn("[fcm] firebase_admin_init_failed", err);
    adminModule = null;
    return null;
  }
}

function stringifyDataPayload(dataPayload?: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = { channel: "family_protection" };
  if (!dataPayload) return out;
  for (const [key, value] of Object.entries(dataPayload)) {
    if (value === undefined || value === null) continue;
    out[key] = typeof value === "string" ? value : JSON.stringify(value);
  }
  return out;
}

/** 보호자(가족 계정)의 등록된 FCM 토큰 목록 — 승인된 기기만 */
export async function listFcmTokensForUser(protectorUserId: string): Promise<string[]> {
  try {
    const rows = await prisma.userDevice.findMany({
      where: {
        userId: protectorUserId,
        isVerified: true,
        fcmToken: { not: null }
      },
      select: { fcmToken: true }
    });
    const tokens = rows
      .map((r) => String(r.fcmToken || "").trim())
      .filter((t) => t.length >= 20);
    return [...new Set(tokens)];
  } catch (err) {
    console.warn("[fcm] token_lookup_failed", { protectorUserId, err });
    return [];
  }
}

export type FamilyProtectionPushResult = {
  ok: boolean;
  sent: number;
  failed: number;
  skipped: boolean;
  reason?: string;
};

/**
 * 가족 보호 실시간 FCM — 실패해도 호출부 트랜잭션에 영향 없음(내부 try/catch).
 */
async function sendMulticastPush(
  userId: string,
  title: string,
  body: string,
  dataPayload: Record<string, unknown> | undefined,
  defaultType: string,
  channelId: string
): Promise<FamilyProtectionPushResult> {
  try {
    const tokens = await listFcmTokensForUser(userId);
    if (!tokens.length) {
      return { ok: true, sent: 0, failed: 0, skipped: true, reason: "no_tokens" };
    }

    const admin = await ensureFirebaseApp();
    if (!admin) {
      return { ok: true, sent: 0, failed: 0, skipped: true, reason: "fcm_not_configured" };
    }

    const messaging = admin.messaging();
    const data = stringifyDataPayload({
      ...dataPayload,
      type: String(dataPayload?.type || defaultType)
    });
    data.channel = channelId;

    const res = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data,
      android: { priority: "high", notification: { channelId } },
      apns: {
        headers: { "apns-priority": "10" },
        payload: { aps: { sound: "default", "content-available": 1 } }
      }
    });

    const stale: string[] = [];
    res.responses.forEach((item: { success: boolean; error?: { code?: string } }, idx: number) => {
      if (item.success) return;
      const code = item.error?.code || "";
      if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") {
        stale.push(tokens[idx]);
      }
    });

    if (stale.length) {
      try {
        await prisma.userDevice.updateMany({
          where: { userId, fcmToken: { in: stale } },
          data: { fcmToken: null }
        });
      } catch {
        /* ignore stale cleanup errors */
      }
    }

    if (res.failureCount > 0) {
      console.warn("[fcm] partial_failure", {
        userId,
        sent: res.successCount,
        failed: res.failureCount
      });
    }

    return {
      ok: true,
      sent: res.successCount,
      failed: res.failureCount,
      skipped: false
    };
  } catch (err) {
    console.warn("[fcm] send_push_failed", { userId, err });
    return { ok: false, sent: 0, failed: 0, skipped: false, reason: "send_error" };
  }
}

export async function sendFamilyProtectionPush(
  protectorUserId: string,
  title: string,
  body: string,
  dataPayload?: Record<string, unknown>
): Promise<FamilyProtectionPushResult> {
  return sendMulticastPush(
    protectorUserId,
    title,
    body,
    dataPayload,
    "vlue-family-protection-alert",
    "family_protection"
  );
}

/** 그룹 일정·오피스 알림 등 일반 FCM */
export async function sendOfficePushToUser(
  userId: string,
  title: string,
  body: string,
  dataPayload?: Record<string, unknown>
): Promise<FamilyProtectionPushResult> {
  return sendMulticastPush(
    userId,
    title,
    body,
    dataPayload,
    "vlue-office-push",
    "office_calendar"
  );
}

/** 쇼케이스 좋아요·댓글 등 소셜 FCM */
export async function sendShowcaseSocialPushToUser(
  userId: string,
  title: string,
  body: string,
  dataPayload?: Record<string, unknown>
): Promise<FamilyProtectionPushResult> {
  return sendMulticastPush(
    userId,
    title,
    body,
    dataPayload,
    "vlue-showcase-social",
    "showcase_social"
  );
}
