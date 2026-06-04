type PcSession = {
  sessionToken: string;
  userId: string;
  deviceLabel: string;
  createdAt: string;
};

type RemoteJob = {
  id: string;
  userId: string;
  type: "print" | "fax";
  targetLine: string;
  sourceAssetId: string;
  status: "queued" | "blocked";
  reason?: string;
  createdAt: string;
};

const sessions = new Map<string, PcSession>();
const jobs = new Map<string, RemoteJob>();

function parseWhitelist(): string[] {
  return (process.env.COMPANY_LINE_WHITELIST || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function openPcAgentSession(userId: string, deviceLabel: string) {
  const token = crypto.randomUUID().replace(/-/g, "");
  const row: PcSession = {
    sessionToken: token,
    userId,
    deviceLabel,
    createdAt: new Date().toISOString()
  };
  sessions.set(token, row);
  return row;
}

export function createRemoteJob(input: {
  userId: string;
  type: "print" | "fax";
  targetLine: string;
  sourceAssetId: string;
}) {
  const whitelist = parseWhitelist();
  const allowed = whitelist.length === 0 || whitelist.includes(input.targetLine);
  const row: RemoteJob = {
    id: crypto.randomUUID(),
    userId: input.userId,
    type: input.type,
    targetLine: input.targetLine,
    sourceAssetId: input.sourceAssetId,
    status: allowed ? "queued" : "blocked",
    reason: allowed ? undefined : "WHITELIST_BLOCKED",
    createdAt: new Date().toISOString()
  };
  jobs.set(row.id, row);
  return row;
}

export function getRemoteJob(jobId: string) {
  return jobs.get(jobId) || null;
}

