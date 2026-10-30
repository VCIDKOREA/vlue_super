import assert from "node:assert/strict";
import {
  buildOverlayShowcaseStyleFromRow,
  buildOverlayShowcaseStyleStubFromJson,
  type OverlayShowcaseStyleRow
} from "../lib/overlayLookupLite.js";

function row(partial: Partial<OverlayShowcaseStyleRow>): OverlayShowcaseStyleRow {
  return {
    include_digital_card: null,
    show_broadcast_name: null,
    has_pages: null,
    has_gallery: null,
    has_bgm: null,
    bgm: null,
    ...partial
  };
}

function run() {
  // 미설정(null) → includeDigitalCard 키를 절대 주입하지 않는다.
  // (false 로 주입하면 네이티브/웹이 "명시 송출 OFF" 로 오인 → 안심팝업 버그)
  const missing = buildOverlayShowcaseStyleFromRow(
    row({ include_digital_card: null, has_pages: true })
  ) as Record<string, unknown>;
  assert.ok(missing);
  assert.equal("includeDigitalCard" in missing, false, "missing key must not be injected");
  assert.deepEqual(missing.pages, [{ type: "image" }], "content stub signals media");

  // 명시 true → 그대로 전달
  const on = buildOverlayShowcaseStyleFromRow(
    row({ include_digital_card: true })
  ) as Record<string, unknown>;
  assert.equal(on.includeDigitalCard, true);

  // 명시 false → 그대로 전달 (실제 송출 OFF)
  const off = buildOverlayShowcaseStyleFromRow(
    row({ include_digital_card: false })
  ) as Record<string, unknown>;
  assert.equal(off.includeDigitalCard, false);

  // 콘텐츠 없음 → pages 스텁 없음
  const empty = buildOverlayShowcaseStyleFromRow(row({})) as Record<string, unknown>;
  assert.equal("pages" in empty, false);

  // gallery / bgm 만 있어도 스텁 생성
  const galleryOnly = buildOverlayShowcaseStyleFromRow(
    row({ has_gallery: true })
  ) as Record<string, unknown>;
  assert.deepEqual(galleryOnly.pages, [{ type: "image" }]);
  const bgmOnly = buildOverlayShowcaseStyleFromRow(
    row({ has_bgm: true })
  ) as Record<string, unknown>;
  assert.deepEqual(bgmOnly.pages, [{ type: "image" }]);

  // showBroadcastName 기본 true, 명시 false 는 false
  assert.equal(
    (buildOverlayShowcaseStyleFromRow(row({})) as Record<string, unknown>).showBroadcastName,
    true
  );
  assert.equal(
    (
      buildOverlayShowcaseStyleFromRow(
        row({ show_broadcast_name: false })
      ) as Record<string, unknown>
    ).showBroadcastName,
    false
  );

  // 원시 bgm 객체는 그대로 포함, 배열/널은 제외
  const withBgm = buildOverlayShowcaseStyleFromRow(
    row({ has_bgm: true, bgm: { audioUrl: "https://x/a.wav" } })
  ) as Record<string, unknown>;
  assert.deepEqual(withBgm.bgm, { audioUrl: "https://x/a.wav" });

  // null row → null
  assert.equal(buildOverlayShowcaseStyleFromRow(null), null);
  assert.equal(buildOverlayShowcaseStyleFromRow(undefined), null);

  // --- 멀티프로필 라우팅 (buildOverlayShowcaseStyleStubFromJson) ---
  // 라우팅 에이전트가 쇼케이스를 설정했지만 includeDigitalCard 키 없음 → 주입 금지 + 콘텐츠 스텁
  const agentMissing = buildOverlayShowcaseStyleStubFromJson({
    pages: [{ type: "rich_custom", gallery: { photos: [{ url: "https://x/a.jpg" }] } }]
  }) as Record<string, unknown>;
  assert.ok(agentMissing);
  assert.equal("includeDigitalCard" in agentMissing, false);
  assert.deepEqual(agentMissing.pages, [{ type: "image" }]);

  // 명시 송출 OFF 보존
  const agentOff = buildOverlayShowcaseStyleStubFromJson({
    includeDigitalCard: false,
    pages: [{ type: "image", imageUrl: "https://x/a.jpg" }]
  }) as Record<string, unknown>;
  assert.equal(agentOff.includeDigitalCard, false);

  // gallery photos → 스텁
  const agentGallery = buildOverlayShowcaseStyleStubFromJson({
    gallery: { photos: [{ url: "https://x/a.jpg" }] }
  }) as Record<string, unknown>;
  assert.deepEqual(agentGallery.pages, [{ type: "image" }]);

  // bgm audioUrl → 스텁 + 원시 bgm 포함
  const agentBgm = buildOverlayShowcaseStyleStubFromJson({
    bgm: { audioUrl: "https://x/a.wav" }
  }) as Record<string, unknown>;
  assert.deepEqual(agentBgm.pages, [{ type: "image" }]);
  assert.deepEqual(agentBgm.bgm, { audioUrl: "https://x/a.wav" });

  // 콘텐츠 없음 → pages 스텁 없음
  const agentEmpty = buildOverlayShowcaseStyleStubFromJson({
    includeDigitalCard: true
  }) as Record<string, unknown>;
  assert.equal("pages" in agentEmpty, false);
  assert.equal(agentEmpty.includeDigitalCard, true);

  // 비객체 → null
  assert.equal(buildOverlayShowcaseStyleStubFromJson(null), null);
  assert.equal(buildOverlayShowcaseStyleStubFromJson([]), null);
  assert.equal(buildOverlayShowcaseStyleStubFromJson("x"), null);

  console.log("overlayShowcaseStyleLite.test.ts OK");
}

run();
