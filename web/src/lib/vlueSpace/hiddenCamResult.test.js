import assert from "node:assert/strict";
import { buildHiddenCamResult } from "./hiddenCamResult.js";

const empty = buildHiddenCamResult({ config: { palette: "THERMAL_IRON" }, reading: { live: false }, cameraError: "" });
assert.equal(empty.observed.length, 0);
assert.match(empty.limits[0], /측정값을 만들지 않았습니다/);

const seen = buildHiddenCamResult({
  config: { palette: "NVG_PHOSPHOR" },
  reading: { live: true, hotspot: { nx: 0.62, ny: 0.4 }, rejected: "" }
});
assert.equal(seen.limits.length, 0);
assert.match(seen.observed[1].value, /가로 62%/);
assert.match(seen.observed[1].value, /단정하지 않습니다/);

const detailed = buildHiddenCamResult({
  config: { palette: "THERMAL_IRON" },
  reading: {
    live: true,
    hotspot: { nx: 0.2, ny: 0.3 },
    candidates: [
      {
        nx: 0.2,
        ny: 0.3,
        width: 8,
        height: 8,
        pixelArea: 50,
        aspect: 1,
        circularity: 0.8,
        boundary: "compact",
        centerContrast: 90
      }
    ],
    tracks: [{ status: "sustained", durationMs: 900, space: "screen" }],
    rejectedWide: 1,
    limited: false
  }
});
assert.match(detailed.observed.map((item) => item.label).join(" "), /광학 반사 후보/);
assert.match(detailed.observed.map((item) => item.label).join(" "), /지속 관찰/);
assert.match(detailed.observed.map((item) => item.value).join(" "), /화면 좌표/);
assert.match(detailed.review[0], /렌즈 여부를 판별할 수 없습니다/);
assert.equal(/몰래카메라 발견|카메라 확정|해킹 장치 발견/.test(JSON.stringify(detailed)), false);

const stale = buildHiddenCamResult({
  reading: { live: false, candidates: [{ nx: 0.4, ny: 0.4, pixelArea: 12 }], hotspot: { nx: 0.4, ny: 0.4 } }
});
assert.equal(stale.observed.length, 0);
assert.match(stale.limits[0], /측정값을 만들지 않았습니다/);

const flashSeen = buildHiddenCamResult({
  config: { palette: "THERMAL_IRON" },
  reading: {
    live: true,
    hotspot: { nx: 0.5, ny: 0.5 },
    flash: {
      status: "observed",
      off: { at: "2026-11-21T00:00:00.000Z", sampleCount: 2, candidates: [{ nx: 0.4 }] },
      on: { at: "2026-11-21T00:00:01.000Z", sampleCount: 2, candidates: [{ nx: 0.4 }] },
      pairs: [{ status: "increased", deltaMaxLuma: 40, deltaArea: 4 }]
    }
  }
});
assert.match(JSON.stringify(flashSeen.observed), /조명 반응 관찰/);
assert.match(JSON.stringify(flashSeen.observed), /광학 반사 후보 변화/);
assert.match(flashSeen.review.join(" "), /추가 확인이 필요한 후보/);
assert.equal(flashSeen.flash.pairs[0].status, "increased");
assert.equal(/몰래카메라 발견|렌즈 확정|카메라 탐지 성공|적외선 카메라 확인/.test(JSON.stringify(flashSeen)), false);

const flashBlind = buildHiddenCamResult({
  reading: {
    live: false,
    flash: { status: "observed", pairs: [{ status: "increased", deltaMaxLuma: 30, deltaArea: 2 }] }
  }
});
assert.equal(flashBlind.observed.length, 0);
assert.equal(flashBlind.flash, undefined);

const flashMissing = buildHiddenCamResult({
  config: { palette: "THERMAL_IRON" },
  reading: { live: true, hotspot: { nx: 0.2, ny: 0.2 }, flash: { status: "unsupported", reason: "이 카메라는 토치를 지원하지 않습니다. 조명 비교 불가." } }
});
assert.match(flashMissing.limits.join(" "), /조명 비교 불가/);

console.log("hiddenCamResult.test.js OK");
