import assert from "node:assert/strict";
import { buildGeneralScanResult, WIFI_SCAN_LIMIT } from "./deviceScan.js";
import { BLE_SCOPE, buildHomeGuardResult, emptyHomeGuardSnapshot, readObserverPayload } from "./homeGuardModel.js";
import { evaluateInstitutionalGate, INSTITUTION_CHECKS, runInstitutionalScan } from "./institutionGate.js";
import { normalizeSpaceRecord } from "./spaceRecords.js";
import { buildTofResult, classifyDepthTracks, decideTofMeasure, depthSettingsAreReal, describeTofEnvironment } from "./tofSupport.js";

const generalEmpty = buildGeneralScanResult({ probe: { bluetooth: { requestDevice: false }, currentLink: { type: "wifi" } } });
assert.equal(generalEmpty.observed.length, 0);
assert.equal(generalEmpty.outcome, "unsupported");
assert.equal(generalEmpty.limits.includes(WIFI_SCAN_LIMIT), true);
assert.equal(JSON.stringify(generalEmpty).includes("탐색 성공"), false);
assert.equal(JSON.stringify(generalEmpty).includes("탐색 완료"), false);
assert.match(generalEmpty.limits.join(" "), /주변 장치 목록이 아닙니다/);

const generalPicked = buildGeneralScanResult({
  probe: { bluetooth: { requestDevice: true } },
  picked: { name: "Desk Lamp", id: "abc" }
});
assert.equal(generalPicked.outcome, "observed");
assert.match(generalPicked.observed[0].value, /Desk Lamp/);
assert.match(generalPicked.observed[0].value, /전체 목록이 아닙니다/);

const generalCancel = buildGeneralScanResult({
  probe: { bluetooth: { requestDevice: true } },
  errorName: "NotFoundError"
});
assert.equal(generalCancel.outcome, "unmeasurable");
assert.equal(generalCancel.observed.length, 0);
assert.match(generalCancel.limits[0], /탐색 성공으로 보지 않습니다/);

const locked = runInstitutionalScan(null, "2026-01-01T00:00:00.000Z");
assert.equal(locked.blocked, true);
assert.equal(locked.result.outcome, "locked");
assert.equal(locked.result.observed.length, 0);
assert.equal(locked.result.limits.length, INSTITUTION_CHECKS.length);
assert.equal(JSON.stringify(locked.result).includes("검증 완료로 보지 않습니다"), true);

const missingEvidence = evaluateInstitutionalGate({
  checks: INSTITUTION_CHECKS.map((item) => ({ id: item.id, state: "verified", evidence: "" }))
});
assert.equal(missingEvidence.allowed, false);

const oneUnmet = evaluateInstitutionalGate({
  checks: INSTITUTION_CHECKS.map((item, index) => (
    index === 2
      ? { id: item.id, state: "unmet", reason: "지정 장소 밖입니다." }
      : { id: item.id, state: "verified", evidence: "서버 기록" }
  ))
});
assert.equal(oneUnmet.allowed, false);
assert.equal(oneUnmet.checks.find((check) => check.id === "place").reason, "지정 장소 밖입니다.");

const opened = runInstitutionalScan({
  checks: INSTITUTION_CHECKS.map((item) => ({ id: item.id, state: "verified", evidence: "서버 기록" }))
});
assert.equal(opened.blocked, false);
assert.equal(opened.result.observed.length, 0);
assert.equal(opened.result.outcome, "unmeasurable");

const emptyGuard = buildHomeGuardResult({ payload: null });
assert.equal(emptyGuard.outcome, "unlinked");
assert.equal(emptyGuard.received, false);
assert.equal(emptyGuard.snapshot.peer, null);
assert.equal(emptyGuard.snapshot.bytesIn, null);
assert.equal(JSON.stringify(emptyGuard.snapshot).includes("192.168"), false);
assert.equal(JSON.stringify(emptyGuard).includes("감시 중"), false);
assert.equal(JSON.stringify(emptyGuard).includes("정상"), false);
assert.match(emptyGuard.limits.join(" "), new RegExp(BLE_SCOPE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.deepEqual(emptyHomeGuardSnapshot().connection, null);

const invalidGuard = readObserverPayload({ bytesIn: 10, peer: "1.2.3.4", valid: false });
assert.equal(invalidGuard.received, true);
assert.equal(invalidGuard.valid, false);
assert.equal(invalidGuard.snapshot.bytesIn, null);
assert.equal(invalidGuard.snapshot.peer, null);

const validGuard = buildHomeGuardResult({
  payload: {
    valid: true,
    source: "router-log",
    collection: "router-api",
    peer: "camera.local",
    bytesIn: 12,
    bytesOut: 3,
    receivedAt: "2026-01-01T00:00:00.000Z"
  }
});
assert.equal(validGuard.outcome, "observed");
assert.equal(validGuard.valid, true);
assert.match(validGuard.observed.map((item) => item.value).join(" "), /camera.local/);
assert.equal(JSON.stringify(validGuard).includes("위험 점수"), false);

const bleOnly = buildHomeGuardResult({ payload: null, bleDevice: { name: "Cam", id: "1" } });
assert.equal(bleOnly.outcome, "unlinked");
assert.match(bleOnly.observed[0].value, /24시간 통신 감시가 아닙니다/);
assert.equal(bleOnly.snapshot.bytesOut, null);

const unknownTof = describeTofEnvironment({ hasNavigator: true, hasMedia: false, canQueryConstraints: false, constraints: null });
assert.equal(unknownTof.support, "unknown");
assert.equal(unknownTof.headline, "지원 여부 확인 불가");
assert.equal(decideTofMeasure({ support: "unknown", frames: [{ millimeters: 10 }] }).enter, false);

const unsupportedTof = describeTofEnvironment({
  hasNavigator: true,
  hasMedia: true,
  canQueryConstraints: true,
  constraints: { width: true }
});
assert.equal(unsupportedTof.support, "unsupported");
const blockedMeasure = buildTofResult({ support: "unsupported", frames: [{ millimeters: 10 }] });
assert.equal(blockedMeasure.enterMeasure, false);
assert.equal(blockedMeasure.outcome, "unsupported");
assert.equal(blockedMeasure.observed.length, 0);

const advertised = describeTofEnvironment({
  hasNavigator: true,
  hasMedia: true,
  canQueryConstraints: true,
  constraints: { depthNear: true }
});
assert.equal(advertised.support, "advertised");
assert.equal(advertised.dataReceived, false);
const noFrame = buildTofResult({ support: "advertised", frames: [] });
assert.equal(noFrame.enterMeasure, false);
assert.equal(noFrame.outcome, "unmeasurable");
assert.equal(JSON.stringify(noFrame).includes("mm"), false);

const measured = buildTofResult({ support: "advertised", frames: [{ millimeters: 840 }] });
assert.equal(measured.enterMeasure, true);
assert.match(measured.observed[0].value, /840 mm/);

assert.equal(depthSettingsAreReal({ depth: true }), true);
assert.equal(depthSettingsAreReal({ width: 640 }), false);
assert.equal(classifyDepthTracks([{ settings: { width: 640 } }, { settings: { depthNear: 0 } }]).accept, true);
assert.equal(classifyDepthTracks([{ getSettings: () => ({ width: 1280, height: 720 }) }]).colorOnly, true);

const legacy = normalizeSpaceRecord({
  id: "old-1",
  moduleId: "hidden-cam",
  at: "2026-01-01T00:00:00.000Z",
  observed: [{ label: "광학 프리뷰", value: "받은 프레임" }],
  review: [],
  limits: [],
  actions: ["최종 확인은 사용자가 합니다."]
});
assert.equal(legacy.moduleId, "hidden-cam");
assert.equal(legacy.outcome, undefined);
assert.equal(legacy.observed[0].label, "광학 프리뷰");
const partial = normalizeSpaceRecord({ id: "old-2", moduleId: "hidden-cam", observed: [{ label: "고휘도 집중점", value: "가로 10%" }] });
assert.deepEqual(partial.review, []);
assert.equal(partial.observed[0].value, "가로 10%");

console.log("phase2.test.js OK");
