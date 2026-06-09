import { prisma } from "../../db/client.js";
import { assertGatewayEnvelope } from "../security/securityGateway.js";
import {
  createCrossSecurityIncident,
  listIncidentsForUser,
  resolveCrossSecurityIncident,
  type CrossSecurityThreatKind
} from "./familyCrossSecurityStore.js";
import { pushFamilyProtectionFcmToGuardians, fcmMessageFamilyMalwareThreat } from "./familyCrossSecurityFcm.js";
import { notifyFamilyGuardian } from "./familyProtectionNotify.js";

async function familyGroupUserIds(wardUserId: string): Promise<string[]> {
  const links = await prisma.familyProtectionLink.findMany({
    where: {
      status: "active",
      OR: [{ wardUserId }, { guardianUserId: wardUserId }]
    },
    select: { guardianUserId: true, wardUserId: true }
  });
  const ids = new Set<string>();
  for (const l of links) {
    ids.add(l.guardianUserId);
    ids.add(l.wardUserId);
  }
  return [...ids];
}

export async function reportCrossFamilyThreat(
  reporterUserId: string,
  body: {
    wardUserId?: string;
    threatKind?: CrossSecurityThreatKind;
    packageName?: string;
    appLabel?: string;
  }
) {
  const env = assertGatewayEnvelope("family_cross_security", "report_threat", reporterUserId, body);
  const wardUserId = String(env.payload.wardUserId || reporterUserId);
  const threatKind = (env.payload.threatKind || "dangerous_permission_app") as CrossSecurityThreatKind;
  const packageName = String(env.payload.packageName || "").trim() || undefined;
  const appLabel = String(env.payload.appLabel || "").trim() || packageName;

  const incident = await createCrossSecurityIncident({
    wardUserId,
    reporterUserId,
    threatKind,
    packageName,
    appLabel
  });

  const groupIds = await familyGroupUserIds(wardUserId);
  const targets = groupIds.filter((id) => id !== reporterUserId);
  const fcm = fcmMessageFamilyMalwareThreat(threatKind, appLabel || packageName || "앱");

  for (const uid of targets) {
    await notifyFamilyGuardian(uid, wardUserId, "elder_remote_control_app", fcm.title, fcm.body, {
      incidentId: incident.id,
      threatKind,
      packageName,
      canDelete: Boolean(packageName),
      subkind: "family_cross_security"
    });
  }

  await pushFamilyProtectionFcmToGuardians(targets, fcm.title, fcm.body, {
    ...fcm.data,
    incidentId: incident.id,
    packageName: packageName || "",
    canDelete: packageName ? "1" : "0"
  });

  return { incident, notified: targets.length };
}

export async function getCrossFamilyDashboard(userId: string) {
  const incidents = await listIncidentsForUser(userId);
  const open = incidents.filter((i) => i.status === "open");
  const resolved = incidents.filter((i) => i.status === "resolved");
  return {
    openCount: open.length,
    resolvedCount: resolved.length,
    incidents: incidents.slice(-20).reverse()
  };
}

export async function confirmThreatResolved(userId: string, incidentId: string, packageRemoved?: boolean) {
  const env = assertGatewayEnvelope("family_cross_security", "resolve_threat", userId, {
    incidentId,
    packageRemoved: Boolean(packageRemoved)
  });
  const id = String(env.payload.incidentId || "");
  if (!id) throw new Error("incidentId가 필요합니다.");
  const incident = await resolveCrossSecurityIncident(id, userId);
  const groupIds = await familyGroupUserIds(incident.wardUserId);
  for (const uid of groupIds) {
    if (uid === userId) continue;
    await notifyFamilyGuardian(
      uid,
      incident.wardUserId,
      "elder_remote_control_app",
      "[해결] 가족 보안",
      `${incident.appLabel || incident.packageName || "위협"} — 가족 구성원이 조치 완료했습니다.`,
      { incidentId: id, status: "resolved", subkind: "family_cross_security" }
    );
  }
  return { incident };
}
