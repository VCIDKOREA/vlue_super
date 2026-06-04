import { addVaultItem, ensureVaultTables } from "../vault/vaultService.js";
import { addAssetFilesFromUrls } from "../vault/assetFileService.js";

export type RegisterPageProductInput = {
  userId: string;
  title: string;
  priceKrw: number;
  description?: string;
  imageUrls?: string[];
  videoUrl?: string;
  mediaKind?: "gallery" | "image" | "video";
  listingType?: "photo_gallery" | "media_single";
  sourceUrl?: string;
  sourceType?: "inline" | "ai" | "crawl" | "vision";
  platform?: string;
  category?: string;
  draft?: Record<string, unknown> | null;
};

export async function registerPageProduct(input: RegisterPageProductInput) {
  const imageUrls = (input.imageUrls || []).filter(Boolean).slice(0, 10);
  const videoUrl = String(input.videoUrl || "").trim();
  const assets = imageUrls.length
    ? await addAssetFilesFromUrls(input.userId, imageUrls, "page-shopping")
    : [];
  const primaryImage = assets[0]?.file_url || imageUrls[0] || "";

  const payload = {
    commerceChannel: "page",
    shopMode: "PAGE",
    priceKrw: input.priceKrw,
    description: input.description || "",
    imageUrl: primaryImage,
    imageUrls: assets.map((a) => a.file_url).length ? assets.map((a) => a.file_url) : imageUrls,
    videoUrl: videoUrl || "",
    mediaKind: input.mediaKind || (videoUrl ? "video" : imageUrls.length ? "gallery" : "gallery"),
    listingType: input.listingType || "photo_gallery",
    assetFileIds: assets.map((a) => a.id),
    sourceUrl: input.sourceUrl || "",
    sourceType: input.sourceType || "ai",
    platform: input.platform || "store",
    category: input.category || "전체",
    draft: input.draft || null,
    feedVisible: true,
    registeredAt: new Date().toISOString()
  };

  const vault = await addVaultItem({
    userId: input.userId,
    title: input.title.trim(),
    kind: "product",
    payloadJson: payload
  });

  return { vault, assets, payload };
}

export async function listPageFeedProducts(limit = 120) {
  const { prisma } = await import("../../db/client.js");
  await ensureVaultTables();

  return prisma.$queryRawUnsafe<
    Array<{
      id: string;
      user_id: string;
      title: string;
      kind: string;
      payload_json: unknown;
      created_at: Date;
    }>
  >(
    `
      SELECT id, user_id, title, kind, payload_json, created_at
      FROM partnership_vault_items
      WHERE kind = 'product'
        AND (
          payload_json->>'commerceChannel' = 'page'
          OR payload_json->>'shopMode' = 'PAGE'
        )
      ORDER BY created_at DESC
      LIMIT $1;
    `,
    limit
  );
}
