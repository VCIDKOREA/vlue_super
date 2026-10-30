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

/** loadOverlayShowcaseStyleLite SQL 행 — includeDigitalCard 는 삼상태(null=미설정) */
export type OverlayShowcaseStyleRow = {
  include_digital_card: boolean | null;
  show_broadcast_name: boolean | null;
  has_pages: boolean | null;
  has_gallery: boolean | null;
  has_bgm: boolean | null;
  bgm: unknown;
};

/**
 * SQL 행 → 오버레이 쇼케이스 스타일 스텁 (순수 함수 · 테스트 대상).
 *
 * `includeDigitalCard` 는 ON/OFF/미설정 삼상태다. 저장 JSON 에 키가 없으면(null)
 * **절대 false 로 주입하지 않는다**. false 를 주입하면 네이티브
 * `VlueAuthMemberPopupPolicy` · 웹 `peerShowcaseContent` 가 "명시 송출 OFF" 로 오인해,
 * 쇼케이스 설정을 완료한 회원을 안심팝업(CENTER_AUTH_POPUP)으로 떨어뜨린다.
 * (CALL_OVERLAY_CONTRACT §3a rule 5: "missing `includeDigitalCard` key must not be treated as OFF")
 */
export function buildOverlayShowcaseStyleFromRow(
  row: OverlayShowcaseStyleRow | null | undefined
): Record<string, unknown> | null {
  if (!row) return null;
  const style: Record<string, unknown> = {
    v: 2,
    showBroadcastName: row.show_broadcast_name !== false
  };
  /* 명시된 true/false 만 전달. null(미설정) 은 키 자체를 생략한다. */
  if (row.include_digital_card === true || row.include_digital_card === false) {
    style.includeDigitalCard = row.include_digital_card;
  }
  /*
   * 본문(pages)은 풀러로 안 보냄. 미디어 존재만 스텁으로 표시 —
   * 네이티브/웹 hasBroadcast 판정용. 실 미디어는 fetchPeerLiveStylePublic.
   */
  if (row.has_pages || row.has_gallery || row.has_bgm) {
    style.pages = [{ type: "image" }];
  }
  if (row.bgm && typeof row.bgm === "object" && !Array.isArray(row.bgm)) {
    style.bgm = row.bgm;
  }
  return style;
}

/**
 * 이미 로드된 showcase JSON(라이브/편집 객체) → 오버레이 스텁.
 * 멀티프로필 라우팅처럼 SQL 행이 아닌 메모리 객체용. `buildOverlayShowcaseStyleFromRow`
 * 와 동일 계약 — includeDigitalCard 삼상태 보존 + 콘텐츠 스텁 `pages:[{type:"image"}]`.
 */
export function buildOverlayShowcaseStyleStubFromJson(
  live: unknown
): Record<string, unknown> | null {
  if (!live || typeof live !== "object" || Array.isArray(live)) return null;
  const s = live as Record<string, unknown>;
  const idc = s.includeDigitalCard;
  const gallery = s.gallery as { photos?: unknown } | undefined;
  const hasGallery =
    !!gallery &&
    typeof gallery === "object" &&
    Array.isArray(gallery.photos) &&
    gallery.photos.length > 0;
  const bgmObj =
    s.bgm && typeof s.bgm === "object" && !Array.isArray(s.bgm)
      ? (s.bgm as Record<string, unknown>)
      : null;
  const hasBgm =
    !!bgmObj &&
    (String(bgmObj.audioUrl || "").trim().length > 0 ||
      (Array.isArray(bgmObj.playlist) && bgmObj.playlist.length > 0));
  return buildOverlayShowcaseStyleFromRow({
    include_digital_card: idc === true || idc === false ? idc : null,
    show_broadcast_name: s.showBroadcastName === false ? false : true,
    has_pages: Array.isArray(s.pages) && s.pages.length > 0,
    has_gallery: hasGallery,
    has_bgm: hasBgm,
    bgm: bgmObj
  });
}

/** 오버레이용 쇼케이스 플래그 — pages/gallery 본문은 풀러로 보내지 않음 */
export async function loadOverlayShowcaseStyleLite(
  userId: string
): Promise<Record<string, unknown> | null> {
  const id = String(userId || "").trim();
  if (!id) return null;
  const rows = await prisma.$queryRaw<Array<OverlayShowcaseStyleRow>>`
    SELECT
      (
        NULLIF(
          TRIM(
            COALESCE(
              showcase_live_style_json->>'includeDigitalCard',
              showcase_style_json->>'includeDigitalCard'
            )
          ),
          ''
        )
      )::boolean AS include_digital_card,
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
        OR (
          jsonb_typeof(
            COALESCE(
              showcase_live_style_json->'bgm'->'playlist',
              showcase_style_json->'bgm'->'playlist',
              '[]'::jsonb
            )
          ) = 'array'
          AND jsonb_array_length(
            COALESCE(
              showcase_live_style_json->'bgm'->'playlist',
              showcase_style_json->'bgm'->'playlist',
              '[]'::jsonb
            )
          ) > 0
        )
      ) AS has_bgm,
      COALESCE(showcase_live_style_json->'bgm', showcase_style_json->'bgm') AS bgm
    FROM users
    WHERE id = ${id}::uuid
    LIMIT 1
  `;
  return buildOverlayShowcaseStyleFromRow(rows[0]);
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
