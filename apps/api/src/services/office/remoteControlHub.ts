import { WebSocketServer, type WebSocket } from "ws";
import type { Server } from "node:http";
import { updateRemoteControlQueueStatus } from "./remoteControlQueue.js";

export type AgentHello = {
  type: "AGENT_HELLO";
  userId: string;
  deviceId: string;
  deviceLabel?: string;
  sessionToken?: string;
};

export type RemoteTriggerPayload = {
  type: "PRINT_EXECUTE" | "FAX_EXECUTE";
  jobId: string;
  fileUrl: string;
  fileName: string;
  targetLine: string;
  assetFileId: string;
};

type AgentConn = {
  ws: WebSocket;
  userId: string;
  deviceId: string;
  deviceLabel: string;
  connectedAt: string;
};

const agents = new Map<string, AgentConn>();

function agentKey(userId: string, deviceId: string) {
  return `${userId}::${deviceId}`;
}

export function listConnectedAgents(userId?: string) {
  const out: Array<Omit<AgentConn, "ws">> = [];
  for (const row of agents.values()) {
    if (userId && row.userId !== userId) continue;
    out.push({
      userId: row.userId,
      deviceId: row.deviceId,
      deviceLabel: row.deviceLabel,
      connectedAt: row.connectedAt
    });
  }
  return out;
}

export function dispatchRemoteTrigger(input: {
  userId: string;
  deviceId: string;
  payload: RemoteTriggerPayload;
}) {
  const key = agentKey(input.userId, input.deviceId);
  const agent = agents.get(key);
  if (!agent || agent.ws.readyState !== 1) {
    return { ok: false as const, error: "AGENT_OFFLINE" };
  }
  agent.ws.send(JSON.stringify(input.payload));
  return { ok: true as const };
}

export function attachOfficeAgentWebSocket(server: Server, path = "/api/office/ws/agent") {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const url = req.url || "";
    if (!url.startsWith(path)) return;
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws) => {
    let boundKey = "";

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(String(raw)) as {
          type: string;
          userId?: string;
          deviceId?: string;
          deviceLabel?: string;
          jobId?: string;
          error?: string;
        };
        if (msg.type === "JOB_DONE" && msg.jobId) {
          updateRemoteControlQueueStatus(msg.jobId, "completed").catch(() => undefined);
          return;
        }
        if (msg.type === "JOB_ERROR") {
          if (msg.jobId) {
            updateRemoteControlQueueStatus(msg.jobId, "failed", msg.error || "JOB_ERROR").catch(
              () => undefined
            );
          }
          return;
        }
        if (msg.type !== "AGENT_HELLO") return;
        const userId = String(msg.userId || "").trim();
        const deviceId = String(msg.deviceId || "").trim();
        if (!userId || !deviceId) {
          ws.send(JSON.stringify({ type: "AGENT_REJECT", reason: "INVALID_HELLO" }));
          ws.close();
          return;
        }
        boundKey = agentKey(userId, deviceId);
        agents.set(boundKey, {
          ws,
          userId,
          deviceId,
          deviceLabel: String(msg.deviceLabel || deviceId),
          connectedAt: new Date().toISOString()
        });
        ws.send(JSON.stringify({ type: "AGENT_READY", deviceId }));
      } catch {
        ws.send(JSON.stringify({ type: "AGENT_REJECT", reason: "BAD_JSON" }));
      }
    });

    ws.on("close", () => {
      if (boundKey) agents.delete(boundKey);
    });
  });

  return wss;
}
