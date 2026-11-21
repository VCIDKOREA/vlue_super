import assert from "node:assert/strict";
import { acceptStable, measureCandidates, measureHotspot, TRACK_LOST_MS, TRACK_SUSTAIN_MS, updateCandidateTracks } from "./analyzeFrame.js";

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

function paint(data, width, x, y, value) {
  if (x < 0 || y < 0 || x >= width) return;
  const i = (y * width + x) * 4;
  data[i] = data[i + 1] = data[i + 2] = value;
}

function disk(data, width, height, cx, cy, radius, value) {
  for (let y = cy - radius; y <= cy + radius; y += 1) {
    for (let x = cx - radius; x <= cx + radius; x += 1) {
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      if ((x - cx) ** 2 + (y - cy) ** 2 <= radius * radius) paint(data, width, x, y, value);
    }
  }
}

const many = frame(96, 72, (data, width) => {
  paint(data, width, 8, 8, 255);
  paint(data, width, 70, 16, 255);
  paint(data, width, 40, 60, 255);
});
const manyHit = measureCandidates(many, "high");
assert.equal(manyHit.candidates.length, 3);
assert.ok(manyHit.candidates.every((item) => item.space === "screen"));

const crowd = frame(96, 72, (data, width) => {
  for (let i = 0; i < 12; i += 1) paint(data, width, 4 + (i % 6) * 15, 6 + Math.floor(i / 6) * 30, 255);
});
const capped = measureCandidates(crowd, "high");
assert.equal(capped.candidates.length, 8);
assert.equal(capped.limited, true);

const mixed = frame(120, 90, (data, width) => {
  for (let y = 0; y < 40; y += 1) {
    for (let x = 0; x < 50; x += 1) paint(data, width, x, y, 255);
  }
  paint(data, width, 110, 80, 255);
});
const mixedHit = measureCandidates(mixed, "high");
assert.equal(mixedHit.candidates.length, 1);
assert.ok(mixedHit.candidates[0].pixelArea < 20);
assert.ok(mixedHit.rejectedWide >= 1);
assert.equal(mixedHit.rejected, "");
assert.ok(mixedHit.hotspot.nx > 0.8);

const edgeBar = frame(120, 90, (data, width) => {
  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < 4; y += 1) paint(data, width, x, y, 255);
  }
  paint(data, width, 60, 70, 255);
});
const edgeHit = measureCandidates(edgeBar, "high");
assert.equal(edgeHit.candidates.length, 1);
assert.equal(edgeHit.candidates[0].edgeTouch, false);

const noise = frame(96, 72, (data, width, height) => {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) paint(data, width, x, y, 48 + ((x * 13 + y * 7) % 15) - 7);
  }
});
assert.equal(measureCandidates(noise, "high").candidates.length, 0);

const round = frame(96, 72, (data, width, height) => disk(data, width, height, 48, 36, 9, 250));
const line = frame(96, 72, (data, width) => {
  for (let x = 8; x < 44; x += 1) paint(data, width, x, 12, 250);
});
const roundHit = measureCandidates(round, "high").candidates[0];
const lineHit = measureCandidates(line, "high").candidates[0];
assert.ok(roundHit);
assert.ok(lineHit);
for (const item of [roundHit, lineHit]) {
  assert.equal(typeof item.width, "number");
  assert.equal(typeof item.height, "number");
  assert.equal(typeof item.aspect, "number");
  assert.equal(typeof item.pixelArea, "number");
  assert.equal(typeof item.circularity, "number");
  assert.equal(typeof item.centerContrast, "number");
  assert.ok(item.boundary === "compact" || item.boundary === "elongated" || item.boundary === "irregular");
  assert.ok(item.centerContrast > 20);
}
assert.ok(roundHit.circularity > lineHit.circularity);
assert.ok(lineHit.aspect > 2);
assert.equal(roundHit.boundary, "compact");
assert.equal(lineHit.boundary, "elongated");

const blob = measureCandidates(small, "high").candidates[0];
let tracks = updateCandidateTracks(null, [blob], 1000);
assert.equal(tracks.tracks.length, 1);
assert.equal(tracks.tracks[0].status, "new");
const trackedId = tracks.tracks[0].id;
tracks = updateCandidateTracks(tracks, [blob], 1000 + TRACK_SUSTAIN_MS);
assert.equal(tracks.tracks[0].id, trackedId);
assert.ok(tracks.tracks[0].durationMs >= TRACK_SUSTAIN_MS);
assert.equal(tracks.tracks[0].status, "sustained");
assert.equal(tracks.tracks[0].space, "screen");
tracks = updateCandidateTracks(tracks, [], 1000 + TRACK_SUSTAIN_MS + TRACK_LOST_MS);
assert.equal(tracks.tracks.length, 0);
assert.equal(tracks.ended.length, 1);
assert.equal(tracks.ended[0].id, trackedId);
assert.equal(tracks.ended[0].status, "ended");

const shifted = frame(96, 72, (data, width, height) => {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) paint(data, width, x, y, 138 + ((x * 13 + y * 7) % 15) - 7);
  }
});
assert.equal(measureCandidates(shifted, "high").candidates.length, 0);
const dotted = frame(96, 72, (data, width, height) => {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) paint(data, width, x, y, 48 + ((x * 13 + y * 7) % 15) - 7);
  }
  paint(data, width, 60, 28, 255);
});
const lifted = frame(96, 72, (data, width, height) => {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) paint(data, width, x, y, 88 + ((x * 13 + y * 7) % 15) - 7);
  }
  paint(data, width, 60, 28, 255);
});
assert.equal(measureCandidates(dotted, "high").candidates.length, 1);
assert.equal(measureCandidates(lifted, "high").candidates.length, 1);

const absent = measureCandidates(null, "high");
assert.equal(absent.candidates.length, 0);
assert.equal(absent.hotspot, null);
assert.equal(measureCandidates({ data: new Uint8ClampedArray(0), width: 0, height: 0 }).candidates.length, 0);

console.log("analyzeFrame.test.js OK");
