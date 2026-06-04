import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import sharp from "sharp";
import { prisma } from "../../db/client.js";

let initialized = false;
const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads", "shop-media");

export async function ensureShopMediaCampaignsTable() {
  if (initialized) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS shop_media_campaigns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      shop_id VARCHAR(120),
      title VARCHAR(200),
      status VARCHAR(40) NOT NULL DEFAULT 'processing',
      source_image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
      video_url VARCHAR(1000),
      duration_sec INT NOT NULL DEFAULT 15,
      error_message VARCHAR(500),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS idx_shop_media_user_created ON shop_media_campaigns(user_id, created_at DESC);"
  );
  initialized = true;
}

function ffmpegPath() {
  return process.env.FFMPEG_PATH?.trim() || "ffmpeg";
}

function runFfmpeg(args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath(), args, { cwd, windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (c) => {
      stderr += String(c);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.slice(-400) || `ffmpeg exit ${code}`));
    });
  });
}

async function buildSlideFrames(imageBuffers: Buffer[], workDir: string, count: number) {
  const perSlideMs = Math.max(1, Math.floor(15000 / count));
  const fps = 1000 / perSlideMs;
  let idx = 0;
  for (const buf of imageBuffers) {
    const out = path.join(workDir, `frame_${String(idx).padStart(3, "0")}.jpg`);
    await sharp(buf)
      .resize(1080, 1920, { fit: "cover", position: "centre" })
      .jpeg({ quality: 88 })
      .toFile(out);
    idx += 1;
  }
  return { fps, frameCount: idx };
}

export async function createMediaCampaignFromUploads(input: {
  userId: string;
  shopId?: string;
  title?: string;
  files: Array<{ buffer: Buffer; name: string; mime?: string }>;
}) {
  await ensureShopMediaCampaignsTable();
  if (!input.files.length) throw new Error("FILES_REQUIRED");

  const campaignId = randomUUID();
  const workDir = path.join(UPLOAD_ROOT, campaignId);
  await mkdir(workDir, { recursive: true });

  const imageBuffers: Buffer[] = [];
  const sourceUrls: string[] = [];
  let i = 0;
  for (const file of input.files.slice(0, 12)) {
    const ext = path.extname(file.name || "") || ".jpg";
    const srcName = `source_${i}${ext}`;
    const srcPath = path.join(workDir, srcName);
    await writeFile(srcPath, file.buffer);
    sourceUrls.push(`/api/office/media/files/${campaignId}/${srcName}`);
    try {
      imageBuffers.push(await sharp(file.buffer).rotate().toBuffer());
    } catch {
      /* skip invalid */
    }
    i += 1;
  }

  if (!imageBuffers.length) throw new Error("NO_VALID_IMAGES");

  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `
      INSERT INTO shop_media_campaigns (id, user_id, shop_id, title, status, source_image_urls, duration_sec)
      VALUES ($1::uuid, $2::uuid, $3, $4, 'processing', $5::jsonb, 15)
      RETURNING id;
    `,
    campaignId,
    input.userId,
    input.shopId || null,
    (input.title || "15초 홍보 영상").slice(0, 200),
    JSON.stringify(sourceUrls)
  );

  const id = rows[0]?.id || campaignId;
  let videoUrl: string | null = null;
  let status = "ready";
  let errorMessage: string | null = null;

  try {
    const { fps } = await buildSlideFrames(imageBuffers, workDir, imageBuffers.length);
    const outFile = path.join(workDir, "promo_15s.mp4");
    await runFfmpeg(
      [
        "-y",
        "-framerate",
        String(fps),
        "-i",
        "frame_%03d.jpg",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-t",
        "15",
        "promo_15s.mp4"
      ],
      workDir
    );
    videoUrl = `/api/office/media/files/${id}/promo_15s.mp4`;
  } catch (e) {
    status = "ffmpeg_required";
    errorMessage = e instanceof Error ? e.message : "ffmpeg_failed";
    console.warn("[media-campaign] ffmpeg_failed", errorMessage);
  }

  await prisma.$executeRawUnsafe(
    `
      UPDATE shop_media_campaigns
      SET status = $2, video_url = $3, error_message = $4, updated_at = NOW()
      WHERE id = $1::uuid;
    `,
    id,
    status,
    videoUrl,
    errorMessage
  );

  return {
    id,
    status,
    videoUrl,
    sourceImageUrls: sourceUrls,
    durationSec: 15,
    errorMessage
  };
}

export async function getMediaCampaign(campaignId: string, userId: string) {
  await ensureShopMediaCampaignsTable();
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      title: string | null;
      status: string;
      source_image_urls: unknown;
      video_url: string | null;
      duration_sec: number;
      error_message: string | null;
      created_at: Date;
    }>
  >(
    `SELECT * FROM shop_media_campaigns WHERE id = $1::uuid AND user_id = $2::uuid LIMIT 1;`,
    campaignId,
    userId
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    sourceImageUrls: row.source_image_urls,
    videoUrl: row.video_url,
    durationSec: row.duration_sec,
    errorMessage: row.error_message,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  };
}

export async function resolveMediaFilePath(campaignId: string, fileName: string): Promise<string | null> {
  const safe = path.basename(fileName);
  if (!safe || safe.includes("..")) return null;
  const full = path.join(UPLOAD_ROOT, campaignId, safe);
  if (!full.startsWith(UPLOAD_ROOT)) return null;
  try {
    await readFile(full);
    return full;
  } catch {
    return null;
  }
}

export async function listMediaFilesInCampaign(campaignId: string) {
  const dir = path.join(UPLOAD_ROOT, campaignId);
  try {
    return await readdir(dir);
  } catch {
    return [];
  }
}
