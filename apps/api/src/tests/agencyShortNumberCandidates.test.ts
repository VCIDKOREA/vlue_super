import assert from "node:assert/strict";
import { agencyShortNumberCandidates } from "../services/agency/nationalAgencyDcpService.js";

function run() {
  assert.deepEqual(agencyShortNumberCandidates("01080144666"), []);
  assert.deepEqual(agencyShortNumberCandidates("+821080144666"), []);
  assert.ok(agencyShortNumberCandidates("112").includes("112"));
  assert.ok(agencyShortNumberCandidates("1332").includes("1332"));
  assert.ok(agencyShortNumberCandidates("+82112").includes("112"));
  console.log("agencyShortNumberCandidates.test.ts OK");
}

run();
