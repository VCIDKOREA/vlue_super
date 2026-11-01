import assert from "node:assert/strict";
import {
  alongRouteMeters,
  chaseLookAheadMeters,
  lerpHeading,
  liveGuideCue,
  lookAheadLatLng,
  matchGpsToRoute
} from "./vmapGuide.js";

const line = [
  [127.0, 37.0],
  [127.002, 37.0],
  [127.004, 37.0]
];

const onRoad = alongRouteMeters(line, 37.0, 127.001);
assert.ok(onRoad);
assert.ok(onRoad.distM < 2, `on-road dist ${onRoad.distM}`);
assert.ok(Math.abs(onRoad.lat - 37) < 0.00005);

const alley = matchGpsToRoute(line, 37.0009, 127.001, null);
assert.equal(alley.snapped, false, "building/alley jump must not snap");

const first = matchGpsToRoute(line, 37.0001, 127.001, null);
assert.equal(first.snapped, true, "near-road GPS snaps to the line");
assert.ok(Math.abs(first.lat - 37) < 0.0002);

const held = matchGpsToRoute(line, 37.0001, 127.0004, { ...first, traveled: first.traveled + 80, snapped: true });
assert.ok(held.traveled + 1 >= first.traveled, "map match does not slide backward on GPS noise");

const ahead = lookAheadLatLng(37.5, 127.0, 0, 100);
assert.ok(ahead.lat > 37.5, "heading 0 looks north");

const meters = chaseLookAheadMeters(37.5, 16.8, 800, 0.275);
assert.ok(meters > 28 && meters < 240);

assert.ok(Math.abs(lerpHeading(350, 10, 0.5) - 0) < 1, "heading lerp wraps");

const cue = liveGuideCue(
  [
    { instruction: "안내를 시작합니다", distanceM: 0 },
    { instruction: "직진", distanceM: 400 },
    { instruction: "우회전", distanceM: 300 },
    { instruction: "목적지 도착", distanceM: 40 }
  ],
  50
);
assert.equal(cue.instruction, "우회전");
assert.ok(cue.remainM > 250);

console.log("vmapGuide map-match ok");
