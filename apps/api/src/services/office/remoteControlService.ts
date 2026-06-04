import { assertPaidLineAllowed } from "./companyLinesService.js";
import { dispatchRemoteTrigger, listConnectedAgents } from "./remoteControlHub.js";
import { getAssetFileById } from "../vault/assetFileService.js";
import {
  insertQueueRow,
  listRemoteControlQueue,
  updateRemoteControlQueueStatus,
  type RemoteControlAction
} from "./remoteControlQueue.js";

export type { RemoteControlAction };
export { listRemoteControlQueue, updateRemoteControlQueueStatus };

export async function submitRemoteControl(input: {
  userId: string;
  assetFileId: string;
  deviceId: string;
  senderLineNumber: string;
  action: RemoteControlAction;
}) {
  const lineCheck = await assertPaidLineAllowed(input.senderLineNumber);
  if (!lineCheck.allowed) {
    await insertQueueRow({
      userId: input.userId,
      assetFileId: input.assetFileId,
      deviceId: input.deviceId,
      senderLineNumber: input.senderLineNumber,
      action: input.action,
      status: "blocked",
      errorMessage: lineCheck.reason
    });
    return { ok: false as const, status: 403, error: lineCheck.reason || "FORBIDDEN" };
  }

  const asset = await getAssetFileById(input.userId, input.assetFileId);
  if (!asset) {
    await insertQueueRow({
      userId: input.userId,
      assetFileId: input.assetFileId,
      deviceId: input.deviceId,
      senderLineNumber: input.senderLineNumber,
      action: input.action,
      status: "failed",
      errorMessage: "ASSET_NOT_FOUND"
    });
    return { ok: false as const, status: 404, error: "ASSET_NOT_FOUND" };
  }

  const jobId = crypto.randomUUID();
  const pendingRow = await insertQueueRow({
    userId: input.userId,
    assetFileId: input.assetFileId,
    deviceId: input.deviceId,
    senderLineNumber: input.senderLineNumber,
    action: input.action,
    status: "pending",
    fileUrl: asset.file_url,
    fileName: asset.file_name
  });
  const queueJobId = pendingRow?.id || jobId;

  const triggerType = input.action === "fax" ? "FAX_EXECUTE" : "PRINT_EXECUTE";
  const dispatched = dispatchRemoteTrigger({
    userId: input.userId,
    deviceId: input.deviceId,
    payload: {
      type: triggerType,
      jobId: queueJobId,
      fileUrl: asset.file_url,
      fileName: asset.file_name,
      targetLine: input.senderLineNumber,
      assetFileId: asset.id
    }
  });

  if (!dispatched.ok) {
    await updateRemoteControlQueueStatus(queueJobId, "queued_offline", dispatched.error);
    return {
      ok: true as const,
      job: {
        id: queueJobId,
        status: "queued_offline",
        fileUrl: asset.file_url,
        fileName: asset.file_name,
        warning: "AGENT_OFFLINE"
      }
    };
  }

  await updateRemoteControlQueueStatus(queueJobId, "dispatched");

  return {
    ok: true as const,
    job: {
      id: queueJobId,
      status: "dispatched",
      fileUrl: asset.file_url,
      fileName: asset.file_name,
      companyName: lineCheck.companyName
    },
    agents: listConnectedAgents(input.userId)
  };
}
