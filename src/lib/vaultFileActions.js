import { fetchOfficeAgents, postOfficeRemoteControl } from "./vlueOfficeApi.js";

function readUserId() {
  try {
    return localStorage.getItem("vlue_server_user_id")?.trim() || "";
  } catch {
    return "";
  }
}

/** 저장 파일 공유 — Web Share API 또는 링크 복사 */
export async function shareVaultFile(file) {
  const url = String(file?.fileUrl || "").trim();
  const title = String(file?.name || "VLUE 문서").trim();
  if (!url) throw new Error("공유할 파일이 없습니다.");

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, url });
      return { ok: true, method: "share" };
    } catch (e) {
      if (e?.name === "AbortError") return { ok: false, cancelled: true };
    }
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return { ok: true, method: "clipboard" };
  }

  window.open(url, "_blank", "noopener,noreferrer");
  return { ok: true, method: "open" };
}

/** PC VLUE 연결 확인 후 인쇄·팩스 요청 */
export async function remoteVaultFile(file, action) {
  const assetFileId = String(file?.id || "").trim();
  if (!assetFileId) throw new Error("저장된 파일만 인쇄·팩스할 수 있습니다.");

  const agentData = await fetchOfficeAgents();
  const agents = agentData.agents || [];
  if (agents.length === 0) {
    throw new Error("PC VLUE가 로그인되어 있지 않습니다. PC에서 VLUE를 켜고 복합기를 연결해 주세요.");
  }

  const deviceId = agents[0]?.deviceId || readUserId() || "local-pc";
  return postOfficeRemoteControl({
    assetFileId,
    deviceId,
    senderLineNumber: agents[0]?.senderLine || "",
    action: action === "fax" ? "fax" : "print"
  });
}
