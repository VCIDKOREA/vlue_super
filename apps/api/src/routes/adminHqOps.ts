/**
 * 마스터 관리자(admin) 전용 운영 조회 API — UI 없음, 권한·데이터 매핑만.
 * GET 알림톡/결제 로그, V1 출시 스위치 조회·저장
 */
import { Hono } from "hono";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../db/client.js";
import { requireSuperAdminBearer, type HqUserVar } from "../middleware/superAdminGate.js";
import { requireMasterCapability } from "../middleware/masterCapabilityGate.js";
import {
  MasterCapability,
  listMasterCapabilities,
  PLATFORM_CEO_MEMBER,
  PLATFORM_MASTER_ADMIN
} from "../services/admin/platformAccountRoles.js";

type HqVars = { hqUser: HqUserVar };

const __dirname = dirname(fileURLToPath(import.meta.url));
const V1_SCOPE_PATH = resolve(__dirname, "../../data/v1-release-scope.json");

/** 프론트 v1ReleaseScope 와 대응되는 서버 측 스위치 기본값 */
const DEFAULT_V1_RELEASE_SCOPE = {
  updatedAt: null as string | null,
  updatedBy: null as string | null,
  web: {
    marketingFabChat: false,
    vlueStore: false,
    auction: false,
    aiExcel: false,
    vlueEmail: false
  },
  app: {
    chat: false,
    referralProgram: false,
    mypageShop: false,
    homeLegacyFeed: false
  }
};

async function readV1Scope() {
  try {
    const raw = await readFile(V1_SCOPE_PATH, "utf8");
    return { ...DEFAULT_V1_RELEASE_SCOPE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_V1_RELEASE_SCOPE };
  }
}

async function writeV1Scope(next: unknown, actorHandle: string) {
  const payload = {
    ...(typeof next === "object" && next ? next : {}),
    updatedAt: new Date().toISOString(),
    updatedBy: actorHandle
  };
  await mkdir(dirname(V1_SCOPE_PATH), { recursive: true });
  await writeFile(V1_SCOPE_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return payload;
}

export const adminHqOpsRoutes = new Hono<{ Variables: HqVars }>();

adminHqOpsRoutes.use("*", requireSuperAdminBearer);

adminHqOpsRoutes.get("/capabilities", async (c) => {
  const user = c.get("hqUser");
  return c.json({
    ok: true,
    masterAdmin: PLATFORM_MASTER_ADMIN,
    ceoMember: {
      handle: PLATFORM_CEO_MEMBER.handle,
      role: PLATFORM_CEO_MEMBER.role,
      membershipTier: PLATFORM_CEO_MEMBER.membershipTier,
      note: "서비스 Premium 회원 — HQ/콘솔 권한 없음"
    },
    capabilities: listMasterCapabilities(user)
  });
});

adminHqOpsRoutes.get(
  "/alimtalk-logs",
  requireMasterCapability(MasterCapability.MONITOR_ALIMTALK_LOGS),
  async (c) => {
    const limit = Math.min(200, Math.max(1, Number(c.req.query("limit") || 50)));
    const rows = await prisma.alimtalkSendLog.findMany({
      orderBy: { sentAt: "desc" },
      take: limit
    });
    return c.json({ ok: true, count: rows.length, logs: rows });
  }
);

adminHqOpsRoutes.get(
  "/payment-logs",
  requireMasterCapability(MasterCapability.MONITOR_PAYMENT_LOGS),
  async (c) => {
    const limit = Math.min(200, Math.max(1, Number(c.req.query("limit") || 50)));
    const rows = await prisma.subscriptionPayment.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        userId: true,
        amountKrw: true,
        status: true,
        createdAt: true,
        paidAt: true,
        impUid: true,
        portoneStatus: true,
        merchantUid: true
      }
    });
    return c.json({ ok: true, count: rows.length, logs: rows });
  }
);

adminHqOpsRoutes.get(
  "/v1-release-scope",
  requireMasterCapability(MasterCapability.MANAGE_V1_RELEASE_SWITCH),
  async (c) => {
    const scope = await readV1Scope();
    return c.json({ ok: true, scope });
  }
);

adminHqOpsRoutes.put(
  "/v1-release-scope",
  requireMasterCapability(MasterCapability.MANAGE_V1_RELEASE_SWITCH),
  async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const user = c.get("hqUser");
    const scope = await writeV1Scope(body?.scope ?? body, user.publicHandle || PLATFORM_MASTER_ADMIN.handle);
    return c.json({ ok: true, scope });
  }
);
