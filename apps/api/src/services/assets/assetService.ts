import { resolveStorageProvider } from "../adapters/storageProvider.js";

export type AssetRecord = {
  id: string;
  userId: string;
  fileName: string;
  contentType: string;
  url: string;
  folderName: string;
  createdAt: string;
};

const assets = new Map<string, AssetRecord>();

export async function uploadScanAsset(input: {
  userId: string;
  fileName: string;
  contentType: string;
  contentBase64: string;
}) {
  const id = crypto.randomUUID();
  const key = `scan/${input.userId}/${id}-${input.fileName}`;
  const storage = resolveStorageProvider();
  const uploaded = await storage.upload({
    key,
    contentType: input.contentType,
    contentBase64: input.contentBase64
  });
  const row: AssetRecord = {
    id,
    userId: input.userId,
    fileName: input.fileName,
    contentType: input.contentType,
    url: uploaded.url,
    folderName: "개인 자료실",
    createdAt: new Date().toISOString()
  };
  assets.set(id, row);
  return row;
}

export function getAssetById(assetId: string) {
  return assets.get(assetId) || null;
}

