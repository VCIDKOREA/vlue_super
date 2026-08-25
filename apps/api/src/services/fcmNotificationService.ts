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

    if (process.env.FCM_ENABLED === "0") {
      console.warn("[fcm] disabled via FCM_ENABLED=0");
      adminModule = null;
      return null;
    }

    const gac = resolveGoogleCredential();
    if (gac && "client_email" in gac && gac.client_email && gac.private_key) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: gac.project_id,
          clientEmail: gac.client_email,
          privateKey: resolvePrivateKey(gac.private_key)
        })
      });
      return admin;
    }

    const projectId = envTrim("FCM_PROJECT_ID", "FIREBASE_PROJECT_ID");
    const clientEmail = envTrim("FCM_CLIENT_EMAIL", "FIREBASE_CLIENT_EMAIL");
    const privateKey = resolvePrivateKey(
      envTrim("FCM_PRIVATE_KEY", "FIREBASE_PRIVATE_KEY")
    );
    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey })
      });
      return admin;
    }

    if (gac && "path" in gac && gac.path) {
      try {
        const { existsSync } = await import("node:fs");
        if (existsSync(gac.path)) {
          admin.initializeApp({ credential: admin.credential.applicationDefault() });
          return admin;
        }
        console.warn("[fcm] GOOGLE_APPLICATION_CREDENTIALS path missing", gac.path);
      } catch (err) {
        console.warn("[fcm] application_default_failed", err);
      }
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

function stringifyDataPayload(
  dataPayload: Record<string, unknown> | undefined,
  title: string,
  body: string
): Record<string, string> {
  const out: Record<string, string> = {
    channel: "family_protection",
    title: String(title || "").slice(0, 200),
    body: String(body || "").slice(0, 500)
  };
  if (!dataPayload) return out;
  for (const [key, value] of Object.entries(dataPayload)) {
    if (value === undefined || value === null) continue;
    out[key] = typeof value === "string" ? value : JSON.stringify(value);
  }
  return out;
}

function envTrim(...keys: string[]): string | undefined {
  for (const key of keys) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return undefined;
}

/** GOOGLE_APPLICATION_CREDENTIALS 가 파일 경로 또는 JSON 본문인 경우 모두 처리 */
function resolveGoogleCredential() {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (!raw) return null;
  if (raw.startsWith("{")) {
    try {
      return JSON.parse(raw) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
    } catch {
      return null;
    }
  }
  return { path: raw };
}

/** 보호자(가족 계정)의 등록된 FCM 토큰 목록 — 승인된 기기 우선, 없으면 토큰 있는 기기 */
export async function listFcmTokensForUser(protectorUserId: string): Promise<string[]> {
  try {
    const verified = await prisma.userDevice.findMany({
      where: {
        userId: protectorUserId,
        isVerified: true,
        fcmToken: { not: null }
      },
      select: { fcmToken: true }
    });
    let tokens = verified
      .map((r) => String(r.fcmToken || "").trim())
      .filter((t) => t.length >= 20);
    if (!tokens.length) {
      const any = await prisma.userDevice.findMany({
        where: {
          userId: protectorUserId,
          fcmToken: { not: null }
        },
        select: { fcmToken: true },
        orderBy: { updatedAt: "desc" },
        take: 8
      });
      tokens = any
        .map((r) => String(r.fcmToken || "").trim())
        .filter((t) => t.length >= 20);
    }
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
  channelId: string,
  opts?: { dataOnly?: boolean }
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
    const type = String(dataPayload?.type || defaultType);
    const data = stringifyDataPayload(
      {
        ...dataPayload,
        type
      },
      title,
      body
    );
    data.channel = "family_protection";

    /**
     * 가족 보호는 전부 data-only.
     * notification+data 혼합이면 백그라운드에서 OS가 한 줄 알림만 띄우고
     * onMessageReceived(커스텀 2~3줄·액션)가 실행되지 않음.
     */
    const dataOnly =
      Boolean(opts?.dataOnly) ||
      type.startsWith("vlue-family-protection") ||
      String(dataPayload?.channel || "") === "family_protection";

    const androidChannel =
      type === "vlue-family-protection-invite" || type.startsWith("vlue-family-protection")
        ? "family_protection_invite_v4"
        : channelId;

    const message: {
      tokens: string[];
      data: Record<string, string>;
      notification?: { title: string; body: string };
      android: Record<string, unknown>;
      apns: Record<string, unknown>;
    } = {
      tokens,
      data,
      android: {
        priority: "high",
        ttl: 86400 * 1000
      },
      apns: {
        headers: { "apns-priority": "10", "apns-push-type": dataOnly ? "background" : "alert" },
        payload: {
          aps: dataOnly
            ? { "content-available": 1, sound: "default" }
            : { sound: "default", "content-available": 1 }
        }
      }
    };

    if (!dataOnly) {
      message.notification = { title, body };
      message.android = {
        ...message.android,
        notification: {
          channelId: androidChannel,
          sound: "default",
          priority: "high",
          defaultVibrateTimings: true
        }
      };
    } else {
      /* data-only 도 Android 우선순위를 높여 백그라운드 전달 확률을 올림 */
      message.android = {
        ...message.android,
        priority: "high"
      };
    }

    const res = await messaging.sendEachForMulticast(message);

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
