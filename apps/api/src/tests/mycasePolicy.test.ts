/**
 * 마이케이스 송출 정책 단위 테스트
 * 실행: npx tsx src/tests/mycasePolicy.test.ts
 */
import assert from "node:assert/strict";
import {
  computeCooldown,
  maxMainSlotsForTier,
  MYCASE_FREE_CHANGE_COOLDOWN_MS,
  MYCASE_FREE_MAX_MAIN_SLOTS,
  MYCASE_PRO_MAX_MAIN_SLOTS
} from "../services/mycase/mycasePolicy.js";

function run() {
  assert.equal(maxMainSlotsForTier("free"), MYCASE_FREE_MAX_MAIN_SLOTS);
  assert.equal(maxMainSlotsForTier("pro"), MYCASE_PRO_MAX_MAIN_SLOTS);

  const pro = computeCooldown("pro", new Date());
  assert.equal(pro.canChangeBroadcast, true);
  assert.equal(pro.cooldownRemainingMs, 0);

  const now = new Date("2026-07-21T12:00:00Z");
  const changed = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const blocked = computeCooldown("free", changed, now);
  assert.equal(blocked.canChangeBroadcast, false);
  assert.ok(blocked.cooldownRemainingMs > 0);
  assert.ok(blocked.nextChangeAt);

  const old = new Date(now.getTime() - MYCASE_FREE_CHANGE_COOLDOWN_MS - 1000);
  const ok = computeCooldown("free", old, now);
  assert.equal(ok.canChangeBroadcast, true);
  assert.equal(ok.cooldownRemainingMs, 0);

  console.log("mycasePolicy.test.ts: ok");
}

run();
