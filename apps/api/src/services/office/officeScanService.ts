import { ingestVaultBuffer, sanitizeVaultFileName } from "./officeVaultIngest.js";

const VAULT_FOLDER = "개인 자료실";

export async function uploadOfficeScanPdf(input: {
  userId: string;
  fileName: string;
  buffer: Buffer;
}) {
  const fileName = sanitizeVaultFileName(input.fileName, "scan.pdf");
  if (!fileName.toLowerCase().endsWith(".pdf")) {
    throw new Error("PDF format required");
  }

  const row = await ingestVaultBuffer({
    userId: input.userId,
    fileName,
    buffer: input.buffer,
    contentType: "application/pdf"
  });

  return {
    id: row.id,
    ownerUserId: input.userId,
    fileName: row.fileName,
    fileUrl: row.fileUrl,
    objectKey: row.objectKey,
    folderName: VAULT_FOLDER,
    contentType: row.contentType,
    fileSize: row.fileSize,
    createdAt: row.createdAt
  };
}