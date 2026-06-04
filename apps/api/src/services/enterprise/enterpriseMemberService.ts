import { randomBytes } from "node:crypto";
import type { EnterpriseRole } from "@prisma/client";
import { prisma } from "../../db/client.js";
import { hashPassword } from "../../lib/passwordHash.js";
import { normalizeToE164KR } from "../../lib/phoneE164.js";
import { enforceUniqueLineRoles, normalizeCartLineRole } from "./enterpriseRoles.js";
import { ensureEnterpriseGroupChatIfReady } from "./enterpriseGroupChatBootstrap.js";

function generateInitialPassword() {
  return `${randomBytes(3).toString("hex")}${randomBytes(2).toString("hex").toUpperCase()}!`;
}

async function assertEditorCanManage(editorUserId: string) {
  const editor = await prisma.user.findUnique({
    where: { id: editorUserId },
    select: { id: true, enterpriseRole: true, enterpriseGroupId: true }
  });
  if (!editor || !["MASTER", "MANAGER"].includes(editor.enterpriseRole)) {
    throw new Error("계정 수정 권한이 없습니다. (대표·대리인)");
  }
  const masterId = editor.enterpriseRole === "MASTER" ? editor.id : editor.enterpriseGroupId;
  if (!masterId) throw new Error("기업 정보 없음");
  const ent = await prisma.b2BEnterpriseAccount.findFirst({
    where: { adminUserId: masterId },
    orderBy: { updatedAt: "desc" }
  });
  if (!ent) throw new Error("기업 계정 없음");
  return { editor, ent, masterId };
}

export async function listEnterpriseMembers(viewerUserId: string) {
  const { ent } = await assertEditorCanManage(viewerUserId);
  const lines = await prisma.b2BCartLine.findMany({
    where: { enterpriseId: ent.id },
    orderBy: { sortOrder: "asc" }
  });
  const creds = await prisma.enterpriseMemberCredential.findMany({
    where: { enterpriseId: ent.id }
  });
  const credMap = new Map(creds.map((c) => [c.userId, c]));

  const members = await Promise.all(
    lines.map(async (line) => {
      let user = line.linkedUserId
        ? await prisma.user.findUnique({
            where: { id: line.linkedUserId },
            select: {
              id: true,
              publicHandle: true,
              legalName: true,
              phoneE164: true,
              enterpriseRole: true,
              enterpriseDept: true,
              lineType: true
            }
          })
        : null;
      const cred = line.linkedUserId ? credMap.get(line.linkedUserId) : null;
      return {
        lineId: line.id,
        lineKind: line.lineKind,
        assigneeName: line.assigneeName,
        assigneeTitle: line.assigneeTitle,
        phoneE164: line.realCliPhoneE164,
        enterpriseRole: line.enterpriseRole,
        linkedUserId: line.linkedUserId,
        user,
        credential: cred
          ? {
              publicHandle: cred.publicHandle,
              initialPassword: cred.initialPassword
            }
          : null
      };
    })
  );

  const chatStatus = await ensureEnterpriseGroupChatIfReady(ent.id);

  return {
    enterpriseId: ent.id,
    companyName: ent.companyName,
    plannedLineCount: ent.plannedLineCount ?? lines.length,
    lineCount: lines.length,
    members,
    groupChat: chatStatus
  };
}

export type UpdateCartLineInput = {
  assigneeName?: string;
  assigneeTitle?: string;
  realCliPhone?: string;
  lineKind?: "mobile" | "extension";
  enterpriseRole?: string;
};

export async function updateEnterpriseCartLine(
  editorUserId: string,
  lineId: string,
  input: UpdateCartLineInput
) {
  const { ent, masterId } = await assertEditorCanManage(editorUserId);
  const line = await prisma.b2BCartLine.findFirst({
    where: { id: lineId, enterpriseId: ent.id }
  });
  if (!line) throw new Error("회선을 찾을 수 없습니다.");

  const enterpriseRole = input.enterpriseRole
    ? normalizeCartLineRole(input.enterpriseRole)
    : line.enterpriseRole;
  if (input.enterpriseRole) {
    await enforceUniqueLineRoles(ent.id, lineId, enterpriseRole);
  }

  let phoneE164 = line.realCliPhoneE164;
  if (input.realCliPhone) {
    const e164 = normalizeToE164KR(input.realCliPhone);
    if (!e164) throw new Error("번호 형식을 확인해 주세요.");
    phoneE164 = e164;
  }

  const assigneeName = input.assigneeName !== undefined ? String(input.assigneeName).trim() : line.assigneeName;
  const assigneeTitle =
    input.assigneeTitle !== undefined ? String(input.assigneeTitle).trim() || null : line.assigneeTitle;
  const lineKind =
    input.lineKind === "mobile" ? "mobile" : input.lineKind === "extension" ? "extension" : line.lineKind;

  const updatedLine = await prisma.b2BCartLine.update({
    where: { id: lineId },
    data: {
      assigneeName,
      assigneeTitle,
      realCliPhoneE164: phoneE164,
      lineKind,
      enterpriseRole
    }
  });

  if (line.linkedUserId) {
    const lineType = lineKind === "mobile" ? "MOBILE" : "WIRED";
    await prisma.user.update({
      where: { id: line.linkedUserId },
      data: {
        legalName: assigneeName,
        phoneE164: phoneE164,
        enterpriseDept: assigneeTitle,
        enterpriseRole,
        lineType
      }
    });
    await prisma.enterpriseMemberCredential.updateMany({
      where: { enterpriseId: ent.id, userId: line.linkedUserId },
      data: {
        assigneeName,
        phoneE164,
        enterpriseRole,
        lineKind
      }
    });
  }

  const chatStatus = await ensureEnterpriseGroupChatIfReady(ent.id);

  return { line: updatedLine, groupChat: chatStatus, masterId };
}

export async function updateEnterpriseMemberAccount(
  editorUserId: string,
  targetUserId: string,
  input: {
    assigneeName?: string;
    enterpriseDept?: string;
    enterpriseRole?: EnterpriseRole | string;
    phone?: string;
    resetPassword?: boolean;
  }
) {
  const { ent, masterId } = await assertEditorCanManage(editorUserId);
  if (targetUserId === masterId) throw new Error("대표 계정은 이 화면에서 수정할 수 없습니다.");

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, enterpriseGroupId: true }
  });
  if (!target || target.enterpriseGroupId !== masterId) {
    throw new Error("같은 기업 소속 계정만 수정할 수 있습니다.");
  }

  const line = await prisma.b2BCartLine.findFirst({
    where: { enterpriseId: ent.id, linkedUserId: targetUserId }
  });

  let enterpriseRole: EnterpriseRole | undefined;
  if (input.enterpriseRole) {
    enterpriseRole = normalizeCartLineRole(String(input.enterpriseRole));
    if (line) await enforceUniqueLineRoles(ent.id, line.id, enterpriseRole);
  }

  const userData: Record<string, unknown> = {};
  if (input.assigneeName !== undefined) userData.legalName = String(input.assigneeName).trim();
  if (input.enterpriseDept !== undefined) userData.enterpriseDept = String(input.enterpriseDept).trim() || null;
  if (enterpriseRole) userData.enterpriseRole = enterpriseRole;
  if (input.phone) {
    const e164 = normalizeToE164KR(input.phone);
    if (!e164) throw new Error("번호 형식 오류");
    userData.phoneE164 = e164;
  }

  let newPassword: string | null = null;
  if (input.resetPassword) {
    newPassword = generateInitialPassword();
    userData.passwordHash = await hashPassword(newPassword);
  }

  const user = await prisma.user.update({
    where: { id: targetUserId },
    data: userData
  });

  if (line) {
    await prisma.b2BCartLine.update({
      where: { id: line.id },
      data: {
        ...(input.assigneeName !== undefined ? { assigneeName: String(input.assigneeName).trim() } : {}),
        ...(input.enterpriseDept !== undefined ? { assigneeTitle: String(input.enterpriseDept).trim() || null } : {}),
        ...(enterpriseRole ? { enterpriseRole } : {}),
        ...(input.phone && userData.phoneE164 ? { realCliPhoneE164: userData.phoneE164 as string } : {})
      }
    });
  }

  if (newPassword) {
    await prisma.enterpriseMemberCredential.updateMany({
      where: { enterpriseId: ent.id, userId: targetUserId },
      data: {
        initialPassword: newPassword,
        ...(input.assigneeName ? { assigneeName: String(input.assigneeName).trim() } : {})
      }
    });
  } else if (input.assigneeName) {
    await prisma.enterpriseMemberCredential.updateMany({
      where: { enterpriseId: ent.id, userId: targetUserId },
      data: { assigneeName: String(input.assigneeName).trim() }
    });
  }

  return { userId: user.id, newPassword };
}
