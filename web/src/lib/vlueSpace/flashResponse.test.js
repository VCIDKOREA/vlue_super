import assert from "node:assert/strict";
import { measureCandidates } from "./analyzeFrame.js";
import { normalizeSpaceRecord } from "./spaceRecords.js";
import {
  applyTorch,
  buildFlashReport,
  classifyBrightness,
  compareFlashPhases,
  createFlashGate,
  finishFlashSample,
  matchFlashCandidate,
  readTorchSupport,
  shutdownVideo,
  summarizeFlashSamples,
  tryBeginFlashSample
} from "./flashResponse.js";

function track(caps, apply) {
  return {
    getCapabilities: () => caps,
    applyConstraints: apply || (async () => {})
  };
}

function spot(nx, ny, maxLuma, meanLuma, extra = {}) {
  return {
    nx,
    ny,
    width: 20,
    height: 20,
    pixelArea: 280,
    maxLuma,
    meanLuma,
    centerContrast: maxLuma - meanLuma,
    aspect: 1,
    circularity: 0.8,
    boundary: "compact",
    ...extra
  };
}

const supported = readTorchSupport(track({ torch: true }));
assert.equal(supported.supported, true);
assert.equal(supported.controllable, true);

const missingApi = readTorchSupport({});
assert.equal(missingApi.supported, false);
assert.match(missingApi.reason, /조명 비교 불가/);
const noTorch = readTorchSupport(track({ torch: false }));
assert.equal(noTorch.supported, false);
assert.match(noTorch.reason, /지원하지 않습니다/);

const calls = [];
const live = track({ torch: true }, async (constraint) => {
  calls.push(constraint);
});
const on = await applyTorch(live, true);
const off = await applyTorch(live, false);
assert.equal(on.ok, true);
assert.equal(on.applied, true);
assert.equal(off.ok, true);
assert.equal(off.applied, false);
assert.deepEqual(calls[0], { advanced: [{ torch: true }] });
assert.deepEqual(calls[1], { advanced: [{ torch: false }] });

const denied = track({ torch: true }, async () => {
  const err = new Error("denied");
  err.name = "NotAllowedError";
  throw err;
});
const failed = await applyTorch(denied, true);
assert.equal(failed.ok, false);
assert.equal(failed.applied, null);
assert.equal(failed.assumedOff, false);
assert.match(failed.reason, /확인하지 못했습니다/);

const same = spot(0.4, 0.42, 90, 70);
const paired = matchFlashCandidate(same, [spot(0.41, 0.42, 150, 120)]);
assert.equal(paired.status, "matched");
const pairs = compareFlashPhases({ candidates: [same] }, { candidates: [spot(0.41, 0.42, 150, 120)] });
assert.equal(pairs[0].status, "increased");
assert.equal(pairs[0].match, "matched");
assert.ok(pairs[0].deltaMaxLuma > 0);
assert.equal(typeof pairs[0].deltaArea, "number");

const dimmer = compareFlashPhases({ candidates: [spot(0.3, 0.3, 180, 150)] }, { candidates: [spot(0.3, 0.3, 100, 80)] });
assert.equal(dimmer[0].status, "decreased");
assert.ok(dimmer[0].deltaMaxLuma < 0);

const still = classifyBrightness(spot(0.2, 0.2, 100, 90), spot(0.2, 0.2, 106, 94));
assert.equal(still.status, "unchanged");

const lost = compareFlashPhases({ candidates: [spot(0.2, 0.2, 140, 100)] }, { candidates: [spot(0.86, 0.8, 200, 160)] });
assert.equal(lost[0].status, "unmatched");
assert.equal(lost[1].status, "unmatched");

const ambiguous = matchFlashCandidate(spot(0.4, 0.4, 100, 80), [spot(0.39, 0.4, 130, 100), spot(0.41, 0.4, 128, 99)]);
assert.equal(ambiguous.status, "uncertain");

const gate = createFlashGate();
gate.active = true;
gate.phase = "settle";
assert.equal(tryBeginFlashSample(gate), false);
gate.phase = "off";
assert.equal(tryBeginFlashSample(gate), true);
assert.equal(tryBeginFlashSample(gate), false);
finishFlashSample(gate);
assert.equal(tryBeginFlashSample(gate), true);

const events = [];
const closing = track({ torch: true }, async (constraint) => {
  events.push(constraint.advanced[0].torch ? "on" : "off");
});
const left = await shutdownVideo(closing, () => events.push("stop"));
assert.equal(left.torch.applied, false);
assert.deepEqual(events, ["off", "stop"]);

const brokenEvents = [];
const broken = track({ torch: true }, async () => {
  brokenEvents.push("torch");
  throw new Error("still-on");
});
const cleaned = await shutdownVideo(broken, () => brokenEvents.push("stop"));
assert.equal(cleaned.stopped, true);
assert.equal(cleaned.torch.ok, false);
assert.equal(cleaned.torch.assumedOff, false);
assert.deepEqual(brokenEvents, ["torch", "stop"]);

const summary = summarizeFlashSamples([
  { at: "2026-11-21T00:00:00.000Z", candidates: [spot(0.4, 0.4, 80, 60)] },
  { at: "2026-11-21T00:00:00.400Z", candidates: [spot(0.41, 0.4, 100, 70)] }
]);
assert.equal(summary.sampleCount, 2);
assert.equal(summary.candidates.length, 1);
assert.equal(summary.candidates[0].space, "screen");

const unsupported = buildFlashReport({ support: missingApi });
assert.equal(unsupported.status, "unsupported");
assert.equal(unsupported.pairs.length, 0);

const legacy = normalizeSpaceRecord({
  id: "old-flash",
  moduleId: "hidden-cam",
  observed: [{ label: "고휘도 집중점", value: "가로 10%" }],
  flash: unsupported
});
assert.equal(legacy.observed[0].value, "가로 10%");
assert.equal(legacy.flash.status, "unsupported");

function frame(width, height, paint) {
  const data = new Uint8ClampedArray(width * height * 4);
  data.fill(40);
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  paint(data, width, height);
  return { data, width, height };
}
const dot = frame(96, 72, (data, width) => {
  const i = (28 * width + 60) * 4;
  data[i] = data[i + 1] = data[i + 2] = 250;
});
const stillThere = measureCandidates(dot, "high");
assert.ok(stillThere.hotspot);
assert.ok(stillThere.hotspot.area < 0.08);
assert.ok(stillThere.candidates.length >= 1);

console.log("flashResponse.test.js OK");
