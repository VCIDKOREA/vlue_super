#!/usr/bin/env node
/**
 * VLUE PC Print & Fax Remote Agent (Windows tray / background)
 * Env:
 *   VLUE_AGENT_WS_URL=ws://localhost:8788/api/office/ws/agent
 *   VLUE_AGENT_USER_ID=<uuid>
 *   VLUE_AGENT_DEVICE_ID=<pc-id>
 *   VLUE_AGENT_DEVICE_LABEL=Office-PC-01
 */
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import WebSocket from "ws";

const execFileAsync = promisify(execFile);

const WS_URL = process.env.VLUE_AGENT_WS_URL || "ws://localhost:8788/api/office/ws/agent";
const USER_ID = process.env.VLUE_AGENT_USER_ID || "";
const DEVICE_ID = process.env.VLUE_AGENT_DEVICE_ID || os.hostname();
const DEVICE_LABEL = process.env.VLUE_AGENT_DEVICE_LABEL || DEVICE_ID;

if (!USER_ID) {
  console.error("[vlue-pc-agent] VLUE_AGENT_USER_ID 가 필요합니다.");
  process.exit(1);
}

const spoolDir = path.join(os.tmpdir(), "vlue-pc-agent");
fs.mkdirSync(spoolDir, { recursive: true });

async function downloadPdf(fileUrl, fileName) {
  const safeName = String(fileName || "remote.pdf").replace(/[/\\?%*:|"<>]/g, "_");
  const target = path.join(spoolDir, `${Date.now()}-${safeName}`);
  const res = await fetch(fileUrl);
  if (!res.ok) throw new Error(`download failed ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(target, buf);
  return target;
}

/** Mock: OS 기본 프린터로 PDF 인쇄 */
async function mockPrintPdf(localPath) {
  if (process.platform === "win32") {
    const ps = `Start-Process -FilePath '${localPath.replace(/'/g, "''")}' -Verb Print`;
    await execFileAsync("powershell.exe", ["-NoProfile", "-Command", ps], { windowsHide: true });
    return { method: "ShellExecute-Print", path: localPath };
  }
  await execFileAsync("lp", [localPath]);
  return { method: "lp", path: localPath };
}

async function mockFaxPdf(localPath, targetLine) {
  console.log(`[vlue-pc-agent] FAX mock → ${targetLine} :: ${localPath}`);
  return { method: "fax-mock", path: localPath, targetLine };
}

function connect() {
  const ws = new WebSocket(WS_URL);

  ws.on("open", () => {
    console.log(`[vlue-pc-agent] connected ${WS_URL}`);
    ws.send(
      JSON.stringify({
        type: "AGENT_HELLO",
        userId: USER_ID,
        deviceId: DEVICE_ID,
        deviceLabel: DEVICE_LABEL
      })
    );
  });

  ws.on("message", async (raw) => {
    try {
      const msg = JSON.parse(String(raw));
      if (msg.type === "AGENT_READY") {
        console.log("[vlue-pc-agent] ready", msg.deviceId);
        return;
      }
      if (msg.type === "PRINT_EXECUTE" || msg.type === "FAX_EXECUTE") {
        console.log("[vlue-pc-agent] job", msg.jobId, msg.fileName);
        const local = await downloadPdf(msg.fileUrl, msg.fileName);
        const result =
          msg.type === "FAX_EXECUTE"
            ? await mockFaxPdf(local, msg.targetLine)
            : await mockPrintPdf(local);
        ws.send(JSON.stringify({ type: "JOB_DONE", jobId: msg.jobId, result }));
      }
    } catch (e) {
      console.error("[vlue-pc-agent] job error", e);
      ws.send(JSON.stringify({ type: "JOB_ERROR", jobId: msg.jobId, error: e instanceof Error ? e.message : String(e) }));
    }
  });

  ws.on("close", () => {
    console.warn("[vlue-pc-agent] disconnected — reconnect in 3s");
    setTimeout(connect, 3000);
  });

  ws.on("error", (e) => {
    console.error("[vlue-pc-agent] socket error", e.message);
  });
}

console.log(`[vlue-pc-agent] device=${DEVICE_ID} user=${USER_ID}`);
connect();
