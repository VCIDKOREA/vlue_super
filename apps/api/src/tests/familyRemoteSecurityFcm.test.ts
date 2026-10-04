import assert from "node:assert/strict";
import {
  fcmMessageRemoteForceQuit,
  fcmMessageRemoteNormalDeleted,
  fcmMessageRemoteSecurityStage1,
  fcmMessageRemoteSessionDeleted
} from "../services/familyProtection/familyProtectionFcmPush.js";

function run() {
  const stage1 = fcmMessageRemoteSecurityStage1("이슬기");
  assert.ok(stage1.title.includes("원격 제어 감지"));
  assert.ok(stage1.body.includes("이슬기"));
  assert.ok(stage1.body.includes("즉시 전화로 확인해 주세요"));
  assert.equal(stage1.data.kind, "remote_security_stage1");
  assert.equal(stage1.data.openLocation, "1");
  assert.equal(stage1.data.lastKnownLocation, "1");

  const forceQuit = fcmMessageRemoteForceQuit("이종근", "AnyDesk");
  assert.ok(forceQuit.body.includes("AnyDesk"));
  assert.ok(forceQuit.body.includes("강제 종료"));
  assert.equal(forceQuit.data.stage, "2");

  const remoteDeleted = fcmMessageRemoteSessionDeleted("이슬기", "TeamViewer");
  const normalDeleted = fcmMessageRemoteNormalDeleted("이슬기");
  assert.ok(remoteDeleted.body.includes("TeamViewer"));
  assert.ok(remoteDeleted.body.includes("삭제되었습니다"));
  assert.equal(normalDeleted.body, "이슬기 님의 기기에서 VLUÉ 앱이 삭제되었습니다.");
  assert.ok(!normalDeleted.body.includes("TeamViewer"));

  console.log("familyRemoteSecurityFcm.test.ts OK");
}

run();
