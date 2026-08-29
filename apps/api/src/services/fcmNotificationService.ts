import { prisma } from "../db/client.js";

type FirebaseAdminModule = typeof import("firebase-admin");

let adminModule: FirebaseAdminModule | null | undefined;
let initAttempted = false;

/** Node ESM — firebase-admin(CJS)는 namespace.default 에 실제 모듈이 있음 */
function resolveFirebaseAdminModule(
  mod: FirebaseAdminModule & { default?: FirebaseAdminModule }
): FirebaseAdminModule {
  if (mod?.default && Array.isArray(mod.default.apps)) return mod.default;
  return mod;
}

function resolvePrivateKey(raw: string | undefined): string | undefined {
  let v = String(raw || "").trim();
  if (!v) return undefined;
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  if (v.includes("\\n")) {
    v = v.replace(/\\n/g, "\n");
  }
  return v;
}

export type FcmServerDiagnostics = {
  ready: boolean;
  reason:
    | "ready"
    | "disabled"
    | "missing_credentials"
    | "init_failed"
    | "not_configured";
  detail?: string;
};

let lastFcmInitError: string | null = null;

async function ensureFirebaseApp(): Promise<FirebaseAdminModule | null> {
  if (initAttempted) return adminModule ?? null;
  initAttempted = true;
  lastFcmInitError = null;

  try {
    const imported = await import("firebase-admin");
    const admin = resolveFirebaseAdminModule(
      imported as FirebaseAdminModule & { default?: FirebaseAdminModule }
    );
    adminModule = admin;

    if (Array.isArray(admin.apps) && admin.apps.length > 0) return admin;

    if (process.env.FCM_ENABLED === "0") {
      console.warn("[fcm] disabled via FCM_ENABLED=0");
      lastFcmInitError = "disabled";
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
    lastFcmInitError = "missing_credentials";
    adminModule = null;
    return null;
  } catch (err) {
    lastFcmInitError = err instanceof Error ? err.message : "init_failed";
    console.warn("[fcm] firebase_admin_init_failed", err);
    adminModule = null;
    return null;
  }
}

/** Railway 등에서 FCM Admin SDK 초기화 가능 여부 (환경 변수 존재만이 아니라 실제 init) */
export async function isFcmServerReady(): Promise<boolean> {
  const diag = await getFcmServerDiagnostics();
  return diag.ready;
}

export async function getFcmServerDiagnostics(): Promise<FcmServerDiagnostics> {
  if (process.env.FCM_ENABLED === "0") {
    return { ready: false, reason: "disabled", detail: "FCM_ENABLED=0" };
  }

  const hasEnv = Boolean(
    envTrim("FCM_PROJECT_ID", "FIREBASE_PROJECT_ID") &&
      envTrim("FCM_CLIENT_EMAIL", "FIREBASE_CLIENT_EMAIL") &&
      envTrim("FCM_PRIVATE_KEY", "FIREBASE_PRIVATE_KEY")
  );
  const gac = resolveGoogleCredential();
  const hasJson =
    Boolean(gac && "client_email" in gac && gac.client_email && gac.private_key) ||
    Boolean(gac && "path" in gac && gac.path);

  if (!hasEnv && !hasJson) {
    return {
      ready: false,
      reason: "missing_credentials",
      detail: "FCM_* 또는 GOOGLE_APPLICATION_CREDENTIALS(JSON) 필요"
    };
  }

  const admin = await ensureFirebaseApp();
  if (admin) {
    return { ready: true, reason: "ready" };
  }

  if (lastFcmInitError === "missing_credentials") {
    return { ready: false, reason: "missing_credentials", detail: lastFcmInitError };
  }

  return {
    ready: false,
    reason: lastFcmInitError ? "init_failed" : "not_configured",
    detail: lastFcmInitError || "Firebase Admin 초기화 실패 — FCM_PRIVATE_KEY 형식 확인"
  };
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

/** 사용자 등록 FCM 토큰 — 최근 갱신 기기 우선 */
export async function listFcmTokensForUser(protectorUserId: string): Promise<string[]> {
  try {
    const rows = await prisma.userDevice.findMany({
      where: {
        userId: protectorUserId,
        fcmToken: { not: null }
      },
      select: { fcmToken: true },
      orderBy: [{ isVerified: "desc" }, { updatedAt: "desc" }],
      take: 12
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

export async function listFcmTokensForUsers(userIds: string[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  if (!userIds.length) return out;
  try {
    const rows = await prisma.userDevice.findMany({
      where: {
        userId: { in: userIds },
        fcmToken: { not: null }
      },
      select: { userId: true, fcmToken: true, isVerified: true, updatedAt: true },
      orderBy: [{ isVerified: "desc" }, { updatedAt: "desc" }]
    });
    for (const row of rows) {
      const token = String(row.fcmToken || "").trim();
      if (token.length < 20) continue;
      const list = out.get(row.userId) || [];
      if (!list.includes(token)) list.push(token);
      out.set(row.userId, list);
    }
    for (const uid of userIds) {
      const list = out.get(uid) || [];
      out.set(uid, list.slice(0, 8));
    }
  } catch (err) {
    console.warn("[fcm] bulk_token_lookup_failed", { count: userIds.length, err });
  }
  return out;
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
    data.channel = channelId;

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
        : channelId === "showcase_social"
          ? "vlue_app_alerts"
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

/** 관리자 회원 그룹 알림 — 앱 알림 채널(vlue_app_alerts) */
export async function sendAdminBroadcastPushToUser(
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
    "vlue-admin-broadcast",
    "vlue_app_alerts"
  );
}

export type AdminBroadcastPushBatchResult = {
  ok: boolean;
  sent: number;
  failed: number;
  usersWithTokens: number;
  usersWithoutTokens: number;
  skipped: boolean;
  reason?: string;
};

/** 관리자 대량 알림 — 사용자별 토큰을 모아 멀티캐스트(최대 500토큰/회) */
export async function sendAdminBroadcastPushBatch(
  userIds: string[],
  title: string,
  body: string,
  dataPayload?: Record<string, unknown>
): Promise<AdminBroadcastPushBatchResult> {
  if (!userIds.length) {
    return {
      ok: true,
      sent: 0,
      failed: 0,
      usersWithTokens: 0,
      usersWithoutTokens: 0,
      skipped: true,
      reason: "no_users"
    };
  }

  const tokenMap = await listFcmTokensForUsers(userIds);
  let usersWithTokens = 0;
  let usersWithoutTokens = 0;
  const tokenOwners = new Map<string, string>();
  for (const userId of userIds) {
    const tokens = tokenMap.get(userId) || [];
    if (!tokens.length) {
      usersWithoutTokens += 1;
      continue;
    }
    usersWithTokens += 1;
    for (const token of tokens) {
      if (!tokenOwners.has(token)) tokenOwners.set(token, userId);
    }
  }

  const allTokens = [...tokenOwners.keys()];
  if (!allTokens.length) {
    return {
      ok: true,
      sent: 0,
      failed: 0,
      usersWithTokens: 0,
      usersWithoutTokens,
      skipped: true,
      reason: "no_tokens"
    };
  }

  const admin = await ensureFirebaseApp();
  if (!admin) {
    return {
      ok: true,
      sent: 0,
      failed: 0,
      usersWithTokens,
      usersWithoutTokens,
      skipped: true,
      reason: "fcm_not_configured"
    };
  }

  const messaging = admin.messaging();
  const type = String(dataPayload?.type || "vlue-admin-broadcast");
  const data = stringifyDataPayload(
    {
      ...dataPayload,
      type
    },
    title,
    body
  );
  data.channel = "vlue_app_alerts";

  let sent = 0;
  let failed = 0;
  const staleByUser = new Map<string, string[]>();

  for (let i = 0; i < allTokens.length; i += 500) {
    const chunk = allTokens.slice(i, i + 500);
    const message = {
      tokens: chunk,
      data,
      notification: { title, body },
      android: {
        priority: "high" as const,
        ttl: 86400 * 1000,
        notification: {
          channelId: "vlue_app_alerts",
          sound: "default",
          priority: "high" as const,
          defaultVibrateTimings: true
        }
      },
      apns: {
        headers: { "apns-priority": "10", "apns-push-type": "alert" },
        payload: { aps: { sound: "default", "content-available": 1 } }
      }
    };

    try {
      const res = await messaging.sendEachForMulticast(message);
      sent += res.successCount;
      failed += res.failureCount;
      res.responses.forEach((item: { success: boolean; error?: { code?: string } }, idx: number) => {
        if (item.success) return;
        const code = item.error?.code || "";
        if (code !== "messaging/registration-token-not-registered" && code !== "messaging/invalid-registration-token") {
          return;
        }
        const token = chunk[idx];
        const userId = tokenOwners.get(token);
        if (!userId) return;
        const list = staleByUser.get(userId) || [];
        list.push(token);
        staleByUser.set(userId, list);
      });
    } catch (err) {
      console.warn("[fcm] admin_broadcast_batch_failed", err);
      failed += chunk.length;
    }
  }

  for (const [userId, stale] of staleByUser.entries()) {
    if (!stale.length) continue;
    try {
      await prisma.userDevice.updateMany({
        where: { userId, fcmToken: { in: stale } },
        data: { fcmToken: null }
      });
    } catch {
      /* ignore */
    }
  }

  return {
    ok: true,
    sent,
    failed,
    usersWithTokens,
    usersWithoutTokens,
    skipped: false
  };
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
