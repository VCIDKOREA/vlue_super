/**
 * 플랫폼 계정 역할 매핑 단위 테스트
 * 실행: npx tsx src/tests/platformAccountRoles.test.ts
 */
import assert from "node:assert/strict";
import {
  MasterCapability,
  denyAdminAccessReasonForUser,
  hasMasterCapability,
  isMasterSystemAdmin,
  isPlatformCeoHandle,
  listMasterCapabilities
} from "../services/admin/platformAccountRoles.js";
import { isSuperAdminUser } from "../services/admin/superAdminAuth.js";
import { isAdminConsoleUser } from "../services/admin/adminConsoleAuth.js";

function run() {
  const admin = {
    role: "admin" as const,
    publicHandle: "admin",
    phoneE164: "+821090009999",
    accountStatus: "active" as const,
    status: "ACTIVE" as const
  };
  const ceo = {
    role: "user" as const,
    publicHandle: "ceo",
    phoneE164: "+821090008882",
    accountStatus: "active" as const,
    status: "ACTIVE" as const
  };
  const paidUser = {
    role: "user" as const,
    publicHandle: "test_paid",
    phoneE164: "+821090000002",
    accountStatus: "active" as const,
    status: "ACTIVE" as const
  };

  assert.equal(isPlatformCeoHandle("ceo"), true);
  assert.equal(isPlatformCeoHandle("@CEO"), true);
  assert.equal(isMasterSystemAdmin(admin), true);
  assert.equal(isMasterSystemAdmin(ceo), false);
  assert.equal(isSuperAdminUser(admin), true);
  assert.equal(isSuperAdminUser(ceo), false);
  assert.equal(isAdminConsoleUser(admin), true);
  assert.equal(isAdminConsoleUser(ceo), false);
  assert.ok(denyAdminAccessReasonForUser(ceo));
  assert.equal(denyAdminAccessReasonForUser(admin), null);

  assert.equal(hasMasterCapability(admin, MasterCapability.MONITOR_ALIMTALK_LOGS), true);
  assert.equal(hasMasterCapability(admin, MasterCapability.MONITOR_PAYMENT_LOGS), true);
  assert.equal(hasMasterCapability(admin, MasterCapability.MANAGE_V1_RELEASE_SWITCH), true);
  assert.equal(hasMasterCapability(admin, MasterCapability.VIEW_ALL_SYSTEM_DATA), true);
  assert.equal(hasMasterCapability(ceo, MasterCapability.MONITOR_ALIMTALK_LOGS), false);
  assert.equal(hasMasterCapability(paidUser, MasterCapability.MANAGE_V1_RELEASE_SWITCH), false);
  assert.equal(listMasterCapabilities(admin).length, 4);
  assert.equal(listMasterCapabilities(ceo).length, 0);

  /* ceo 는 관리자 아님 — 서비스 Premium 전용 */
  assert.equal(ceo.role, "user");

  console.log("[platformAccountRoles] all assertions passed");
}

run();
