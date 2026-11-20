import assert from "node:assert/strict";
import { acceptStable, measureHotspot } from "./analyzeFrame.js";

function frame(width, height, paint) {
  const data = new Uint8ClampedArray(width * height * 4);
  data.fill(40);
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  paint(data, width, height);
  return { data, width, height };
}

function dot(data, width, x, y) {
  const i = (y * width + x) * 4;
  data[i] = data[i + 1] = data[i + 2] = 250;
}

const small = frame(96, 72, (data, width) => dot(data, width, 60, 28));
const hit = measureHotspot(small, "high");
assert.ok(hit.hotspot, "small bright point stays");
assert.ok(hit.hotspot.area < 0.08);

const wide = frame(96, 72, (data) => {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i + 1] = data[i + 2] = 240;
  }
});
const rejected = measureHotspot(wide, "high");
assert.equal(rejected.hotspot, null);

const held = acceptStable({ streak: 7, point: hit.hotspot }, hit.hotspot, "zoom_verified", 1);
assert.equal(held.locked, false);
assert.equal(held.needZoom, true);
const zoomed = acceptStable({ streak: 7, point: hit.hotspot }, hit.hotspot, "zoom_verified", 2);
assert.equal(zoomed.locked, true);

console.log("analyzeFrame.test.js OK");
