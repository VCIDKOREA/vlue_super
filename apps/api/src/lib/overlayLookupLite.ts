/**
 * Call-overlay / call-list: Shared Pooler egress 방어.
 * 전체 export_snapshot_json · showcase_*_json SELECT 금지 — JSON path 스칼라만.
 */
import { prisma } from "../db/client.js";
import { Prisma } from "@prisma/client";
import { isHttpMediaUrl } from "./mediaUrlGuard.js";

function httpOnly(url: string | null | undefined): string {
  const s = String(url || "").trim();
  return isHttpMediaUrl(s) ? s : "";
}

/** 오버레이용 쇼케이스 플래그 — pages/gallery 본문은 풀러로 보내지 않음 */
export async function loadOverlayShowcaseStyleLite(
  userId: string
): Promise<Record<string, unknown> | null> {
  const id = String(userId || "").trim();
  if (!id) return null;
  const rows = await prisma.$queryRaw<
    Array<{
      include_digital_card: boolean | null;
      show_broadcast_name: boolean | null;
      has_pages: boolean | null;
      has_gallery: boolean | null;
      has_bgm: boolean | null;
    }>
  >`
    SELECT
      COALESCE(
        (
          NULLIF(
            TRIM(
              COALESCE(showcase_live_style_json, showcase_style_json)->>'includeDigitalCard'
            ),
            ''
          )
        )::boolean,
        false
      ) AS include_digital_card,
      CASE
        WHEN COALESCE(showcase_live_style_json, showcase_style_json) ? 'showBroadcastName'
          THEN (
            COALESCE(showcase_live_style_json, showcase_style_json)->>'showBroadcastName'
          )::boolean
        ELSE true
      END AS show_broadcast_name,
      (
        jsonb_typeof(
          COALESCE(
            showcase_live_style_json->'pages',
            showcase_style_json->'pages',
            '[]'::jsonb
          )
        ) = 'array'
        AND jsonb_array_length(
          COALESCE(
            showcase_live_style_json->'pages',
            showcase_style_json->'pages',
            '[]'::jsonb
          )
        ) > 0
      ) AS has_pages,
      (
        jsonb_typeof(
          COALESCE(
            showcase_live_style_json->'gallery'->'photos',
            showcase_style_json->'gallery'->'photos',
            '[]'::jsonb
          )
        ) = 'array'
        AND jsonb_array_length(
          COALESCE(
            showcase_live_style_json->'gallery'->'photos',
            showcase_style_json->'gallery'->'photos',
            '[]'::jsonb
          )
        ) > 0
      ) AS has_gallery,
      (
        NULLIF(
          TRIM(
            COALESCE(
              showcase_live_style_json->'bgm'->>'audioUrl',
              showcase_style_json->'bgm'->>'audioUrl',
              ''
            )
          ),
          ''
        ) IS NOT NULL
      ) AS has_bgm
    FROM users
    WHERE id = ${id}::uuid
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  const style: Record<string, unknown> = {
    v: 2,
    includeDigitalCard: Boolean(row.include_digital_card),
    showBroadcastName: row.show_broadcast_name !== false
  };
  /*
   * 본문(pages)은 풀러로 안 보냄. 미디어 존재만 스텁으로 표시 —
   * 네이티브/웹 hasBroadcast 판정용. 실 미디어는 fetchPeerLiveStylePublic.
   */
  if (row.has_pages || row.has_gallery || row.has_bgm) {
    style.pages = [{ type: "image" }];
  }
  return style;
}

/** digital_cards.export_snapshot — name + https photoUrl 만 */
export async function loadExportNamePhotoLite(
  userId: string
): Promise<{ name: string; photoUrl: string } | null> {
  const id = String(userId || "").trim();
  if (!id) return null;
  const rows = await prisma.$queryRaw<
    Array<{ name: string | null; display_name: string | null; photo_url: string | null }>
  >`
    SELECT
      NULLIF(TRIM(export_snapshot_json->>'name'), '') AS name,
      NULLIF(TRIM(export_snapshot_json->>'displayName'), '') AS display_name,
      NULLIF(TRIM(export_snapshot_json->>'photoUrl'), '') AS photo_url
    FROM digital_cards
    WHERE user_id = ${id}::uuid
    LIMIT 1
  `;
  const s = rows[0];
  if (!s) return null;
  const name = String(s.name || s.display_name || "").trim();
  return { name, photoUrl: httpOnly(s.photo_url) };
}

/** 통화목록 배치 — 번호별 https 아바타 (전체 snapshot 금지) */
export async function loadExportPhotoUrlsByUserIds(
  userIds: string[]
): Promise<Map<string, string>> {
  const ids = [...new Set(userIds.map((u) => String(u || "").trim()).filter(Boolean))];
  const out = new Map<string, string>();
  if (!ids.length) return out;
  const rows = await prisma.$queryRaw<Array<{ user_id: string; photo_url: string | null }>>`
    SELECT
      user_id::text AS user_id,
      COALESCE(
        NULLIF(TRIM(photo_url), ''),
        NULLIF(TRIM(export_snapshot_json->>'photoUrl'), ''),
        NULLIF(TRIM(export_snapshot_json->>'avatarUrl'), ''),
        NULLIF(TRIM(export_snapshot_json->>'image_url'), ''),
        NULLIF(TRIM(export_snapshot_json->>'imageUrl'), '')
      ) AS photo_url
    FROM digital_cards
    WHERE user_id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))})
  `;
  for (const r of rows) {
    const url = httpOnly(r.photo_url);
    if (url) out.set(String(r.user_id), url);
  }
  return out;
}
