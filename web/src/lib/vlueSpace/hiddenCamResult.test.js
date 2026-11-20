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

console.log("hiddenCamResult.test.js OK");
