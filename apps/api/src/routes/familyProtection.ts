import { Hono } from "hono";
import { handleFamilyProtectionRouteError } from "../lib/familyProtectionRouteError.js";
import { requireUserHeader } from "../middleware/cardGate.js";
import {
  acceptProtectionLink,
  createProtectionLink,
  listFamilyProtection,
  lookupFamilyInviteCandidates,
  parseFamilyRelation,
  recordWardHeartbeat,
  recordWardMissedCall,
  rejectProtectionLink,
  reportWardRiskySite,
  revokeProtectionLink,
  runMinorAdultProtectionExpiryChecks,
  runElderProtectionChecks,
  updateProtectionSettings
} from "../services/familyProtection/familyProtectionEngine.js";
import { recordWardCallEvent, reportWardRemoteControlApp } from "../services/familyProtection/familyProtectionElderEvents.js";
import {
  listBankConsentsForUser,
  recordChildBankTransaction,
  requestChildBankConsent,
  respondChildBankConsent
} from "../services/familyProtection/familyProtectionChildBank.js";
import { mapAgentPayloadToChildBankTransaction } from "../services/familyProtection/bankingAgentAdapter.js";
import { verifyOpenBankingWebhookSecret } from "../services/familyProtection/openbankingWebhookAuth.js";
import { getFamilyCircleOverview } from "../services/familyProtection/familyProtectionCircle.js";
import { GOVERNMENT_HOTLINES } from "../lib/governmentHotlines.js";
import { REMOTE_CONTROL_APPS } from "../lib/remoteControlApps.js";

export const familyProtectionRoutes = new Hono();

familyProtectionRoutes.get("/lookup", requireUserHeader, async (c) => {
  try {
    const me = c.get("vlueUserId") as string;
    const q = String(c.req.query("q") || c.req.query("query") || "").trim();
    const result = await lookupFamilyInviteCandidates(me, q);
    if ("error" in result && result.error) {
      return c.json({ error: result.error }, 400);
    }
    return c.json(result);
  } catch (err) {
    return handleFamilyProtectionRouteError(c, "/lookup", err);
  }
});

familyProtectionRoutes.get("/links", requireUserHeader, async (c) => {
  try {
    const me = c.get("vlueUserId") as string;
    return c.json(await listFamilyProtection(me));
  } catch (err) {
    return handleFamilyProtectionRouteError(c, "/links", err);
  }
});

familyProtectionRoutes.patch("/settings", requireUserHeader, async (c) => {
  try {
    const me = c.get("vlueUserId") as string;
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await updateProtectionSettings(me, body);
    return c.json(result);
  } catch (err) {
    return handleFamilyProtectionRouteError(c, "/settings", err);
  }
});

async function handleFamilyInvite(c: import("hono").Context) {
  const me = c.get("vlueUserId") as string;
  const body = (await c.req.json().catch(() => ({}))) as {
    wardHandle?: string;
    wardRole?: string;
    familyRelation?: string;
    guardianImpUid?: string;
  };
  const familyRelation = parseFamilyRelation(body.familyRelation || body.wardRole);
  const result = await createProtectionLink(
    me,
    String(body.wardHandle || ""),
    familyRelation,
    body.guardianImpUid
  );
  if ("error" in result && result.error) {
    return c.json({ error: result.error, code: result.code ?? "FAMILY_INVITE_FAILED" }, 400);
  }
  return c.json(result);
}

familyProtectionRoutes.post("/links", requireUserHeader, async (c) => {
  try {
    return await handleFamilyInvite(c);
  } catch (err) {
    return handleFamilyProtectionRouteError(c, "/links", err);
  }
});

familyProtectionRoutes.post("/links/:linkId/accept", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId") as string;
  const linkId = String(c.req.param("linkId") || "");
  if (!linkId) return c.json({ error: "linkId 필요" }, 400);
  const result = await acceptProtectionLink(me, linkId);
  if ("error" in result && result.error) return c.json({ error: result.error }, 400);
  return c.json(result);
});

familyProtectionRoutes.post("/links/:linkId/reject", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId") as string;
  const linkId = String(c.req.param("linkId") || "");
  if (!linkId) return c.json({ error: "linkId 필요" }, 400);
  const result = await rejectProtectionLink(me, linkId);
  if ("error" in result && result.error) return c.json({ error: result.error }, 400);
  return c.json(result);
});

familyProtectionRoutes.get("/circle", requireUserHeader, async (c) => {
  try {
    const me = c.get("vlueUserId") as string;
    return c.json(await getFamilyCircleOverview(me));
  } catch (err) {
    return handleFamilyProtectionRouteError(c, "/circle", err);
  }
});

familyProtectionRoutes.post("/links/:linkId/revoke", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId") as string;
  const linkId = String(c.req.param("linkId") || "");
  if (!linkId) return c.json({ error: "linkId 필요" }, 400);
  const result = await revokeProtectionLink(me, linkId);
  if ("error" in result && result.error) return c.json({ error: result.error }, 400);
  return c.json(result);
});

/** 앱 실행·포그라운드 복귀 시 1회 (주기 하트비트 없음) */
familyProtectionRoutes.post("/presence/heartbeat", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId") as string;
  return c.json(await recordWardHeartbeat(me));
});

/** 노부모 기기 — 부재중 전화 1건 (네이티브 통화앱 연동) */
familyProtectionRoutes.post("/presence/missed-call", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId") as string;
  return c.json(await recordWardMissedCall(me));
});

familyProtectionRoutes.post("/ward/risky-site", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId") as string;
  const body = (await c.req.json().catch(() => ({}))) as { url?: string; referrer?: string };
  if (!body.url?.trim()) return c.json({ error: "url 필요" }, 400);
  return c.json(await reportWardRiskySite(me, body.url.trim(), body.referrer));
});

/** 네이티브 셸·웹훅 통화 알림 (alias) */
function normalizeCallEventBody(body: {
  phone?: string;
  durationSec?: number;
  direction?: string;
  peerIsVlueMember?: boolean;
}): {
  phone?: string;
  durationSec?: number;
  direction?: "out" | "in";
  peerIsVlueMember?: boolean;
} {
  const direction = body.direction === "out" || body.direction === "in" ? body.direction : undefined;
  return {
    phone: body.phone,
    durationSec: body.durationSec,
    direction,
    peerIsVlueMember: body.peerIsVlueMember
  };
}

familyProtectionRoutes.post("/alert/call", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId") as string;
  const body = normalizeCallEventBody(
    (await c.req.json().catch(() => ({}))) as {
      phone?: string;
      durationSec?: number;
      direction?: string;
      peerIsVlueMember?: boolean;
    }
  );
  try {
    const result = await recordWardCallEvent(me, body);
    return c.json({ ...result, isAccountAgreed: undefined });
  } catch (err) {
    return handleFamilyProtectionRouteError(c, "/alert/call", err);
  }
});

/** 노부모 — 통화 종료 (네이티브 CallLog) · 정부기관 번호 자동 분류 */
familyProtectionRoutes.post("/ward/call-event", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId") as string;
  const body = normalizeCallEventBody(
    (await c.req.json().catch(() => ({}))) as {
      phone?: string;
      durationSec?: number;
      direction?: string;
      peerIsVlueMember?: boolean;
    }
  );
  try {
    return c.json(await recordWardCallEvent(me, body));
  } catch (err) {
    return handleFamilyProtectionRouteError(c, "/ward/call-event", err);
  }
});

/** 노부모 — 원격제어 앱 (TeamViewer 등) */
familyProtectionRoutes.post("/ward/remote-app", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId") as string;
  const body = (await c.req.json().catch(() => ({}))) as { packageId?: string; appLabel?: string };
  const raw = body.packageId || body.appLabel || "";
  if (!raw.trim()) return c.json({ error: "packageId 또는 appLabel 필요" }, 400);
  try {
    return c.json(await reportWardRemoteControlApp(me, raw.trim()));
  } catch (err) {
    return handleFamilyProtectionRouteError(c, "/ward/remote-app", err);
  }
});

familyProtectionRoutes.get("/catalog/government-hotlines", async (c) => {
  return c.json({ hotlines: GOVERNMENT_HOTLINES });
});

familyProtectionRoutes.get("/catalog/remote-control-apps", async (c) => {
  return c.json({ apps: REMOTE_CONTROL_APPS });
});

familyProtectionRoutes.post("/links/:linkId/bank-consent/request", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId") as string;
  const body = (await c.req.json().catch(() => ({}))) as {
    accountLabel?: string;
    bankCode?: string;
    accountMasked?: string;
  };
  const result = await requestChildBankConsent(me, String(c.req.param("linkId") || ""), body);
  if ("error" in result && result.error) return c.json({ error: result.error }, 400);
  return c.json(result);
});

familyProtectionRoutes.post("/links/:linkId/bank-consent/respond", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId") as string;
  const body = (await c.req.json().catch(() => ({}))) as { accept?: boolean };
  const result = await respondChildBankConsent(me, String(c.req.param("linkId") || ""), Boolean(body.accept));
  if ("error" in result && result.error) return c.json({ error: result.error }, 400);
  return c.json(result);
});

familyProtectionRoutes.post("/ward/bank-transaction", requireUserHeader, async (c) => {
  const me = c.get("vlueUserId") as string;
  const body = (await c.req.json().catch(() => ({}))) as {
    amountKrw?: number;
    direction?: string;
    counterpartyName?: string;
    counterpartyMasked?: string;
    isUnknownPayee?: boolean;
    source?: string;
    requireConsent?: boolean;
  };
  const result = await recordChildBankTransaction(me, {
    amountKrw: Number(body.amountKrw) || 0,
    direction: body.direction === "in" ? "in" : "out",
    counterpartyName: body.counterpartyName,
    counterpartyMasked: body.counterpartyMasked,
    isUnknownPayee: body.isUnknownPayee,
    source: body.source || "app",
    requireConsent: body.requireConsent !== false
  });
  if ("error" in result && result.error) return c.json({ error: result.error }, 400);
  return c.json(result);
});

/** 오픈뱅킹 웹훅 (3단계) — 시크릿 검증 → 어댑터 매핑 → 동의·임계치·화이트리스트 가드 */
familyProtectionRoutes.post("/webhook/openbanking/transaction", async (c) => {
  const auth = verifyOpenBankingWebhookSecret(c.req.header("X-OpenBanking-Webhook-Secret"));
  if (!auth.ok) {
    return c.json({ error: auth.error, code: auth.code }, auth.status);
  }

  const rawBody = await c.req.json().catch(() => null);
  const mapped = mapAgentPayloadToChildBankTransaction(rawBody);
  if (!mapped.ok) {
    return c.json({ error: mapped.error, code: "OPENBANKING_PAYLOAD_INVALID" }, 400);
  }

  const { tx, vendor } = mapped;
  const result = await recordChildBankTransaction(tx.wardUserId, {
    ...tx,
    source: "openbanking",
    requireConsent: true
  });

  if ("error" in result && result.error) {
    return c.json({ error: result.error, code: "OPENBANKING_RECORD_FAILED" }, 400);
  }

  return c.json({
    ...result,
    agentVendor: vendor,
    externalTransactionId: tx.externalTransactionId ?? null
  });
});

familyProtectionRoutes.post("/cron/check-elder", async (c) => {
  const secret = c.req.header("X-Family-Cron-Secret") || "";
  const expected = process.env.FAMILY_CRON_SECRET || "";
  if (expected && secret !== expected) {
    return c.json({ error: "unauthorized" }, 401);
  }
  return c.json(await runElderProtectionChecks());
});

familyProtectionRoutes.post("/cron/check-minor-adult-expiry", async (c) => {
  const secret = c.req.header("X-Family-Cron-Secret") || "";
  const expected = process.env.FAMILY_CRON_SECRET || "";
  if (expected && secret !== expected) {
    return c.json({ error: "unauthorized" }, 401);
  }
  return c.json(await runMinorAdultProtectionExpiryChecks());
});
