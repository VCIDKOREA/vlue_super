import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chainLogHash } from "../security/securityGateway.js";

export type CrossSecurityThreatKind =
  | "dangerous_permission_app"
  | "vlue_app_uninstalled"
  | "remote_control_app";

export type CrossSecurityIncidentStatus = "open" | "resolved" | "dismissed";

export type CrossSecurityIncident = {
  id: string;
  wardUserId: string;
  reporterUserId: string;
  threatKind: CrossSecurityThreatKind;
  packageName?: string;
  appLabel?: string;
  status: CrossSecurityIncidentStatus;
  resolvedByUserId?: string;
  resolvedAt?: string;
  logHash: string;
  prevLogHash?: string;
  createdAt: string;
  updatedAt: string;
};

type Store = { incidents: CrossSecurityIncident[] };

function storePath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../../../../data/family_cross_security_incidents.json");
}

async function readStore(): Promise<Store> {
  try {
    const text = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(text) as Store;
    return { incidents: Array.isArray(parsed.incidents) ? parsed.incidents : [] };
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") return { incidents: [] };
    throw err;
  }
}

async function writeStore(store: Store) {
  const p = storePath();
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function lastHash(store: Store): string | undefined {
  const last = store.incidents[store.incidents.length - 1];
  return last?.logHash;
}

export async function listIncidentsForUser(userId: string): Promise<CrossSecurityIncident[]> {
  const store = await readStore();
  return store.incidents.filter(
    (i) => i.wardUserId === userId || i.reporterUserId === userId || i.resolvedByUserId === userId
  );
}

export async function createCrossSecurityIncident(input: {
  wardUserId: string;
  reporterUserId: string;
  threatKind: CrossSecurityThreatKind;
  packageName?: string;
  appLabel?: string;
}): Promise<CrossSecurityIncident> {
  const store = await readStore();
  const now = new Date().toISOString();
  const prevLogHash = lastHash(store);
  const body = {
    wardUserId: input.wardUserId,
    reporterUserId: input.reporterUserId,
    threatKind: input.threatKind,
    packageName: input.packageName || null,
    appLabel: input.appLabel || null,
    status: "open" as const,
    createdAt: now
  };
  const row: CrossSecurityIncident = {
    id: `fcs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    wardUserId: input.wardUserId,
    reporterUserId: input.reporterUserId,
    threatKind: input.threatKind,
    packageName: input.packageName,
    appLabel: input.appLabel,
    status: "open",
    logHash: chainLogHash(prevLogHash, body),
    prevLogHash,
    createdAt: now,
    updatedAt: now
  };
  store.incidents.push(row);
  await writeStore(store);
  return row;
}

export async function resolveCrossSecurityIncident(
  incidentId: string,
  resolverUserId: string
): Promise<CrossSecurityIncident> {
  const store = await readStore();
  const row = store.incidents.find((i) => i.id === incidentId);
  if (!row) throw new Error("인시던트를 찾을 수 없습니다.");
  const now = new Date().toISOString();
  row.status = "resolved";
  row.resolvedByUserId = resolverUserId;
  row.resolvedAt = now;
  row.updatedAt = now;
  row.logHash = chainLogHash(row.prevLogHash, {
    id: row.id,
    status: row.status,
    resolvedByUserId: resolverUserId,
    resolvedAt: now
  });
  await writeStore(store);
  return row;
}
