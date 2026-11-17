import assert from "node:assert/strict";
import {
  claimsUnverifiedFamilyConnection,
  familyLinkSentence
} from "../services/safetyPatch/safetyPatchService.js";

assert.equal(familyLinkSentence(0), "연결된 가족이 없습니다.");
assert.equal(familyLinkSentence(2), "활성 가족 연결이 2건 있습니다.");
assert.equal(claimsUnverifiedFamilyConnection("이종근님은 현재 가족과 연결되어 있습니다."), true);
assert.equal(claimsUnverifiedFamilyConnection("이종근님은 연결된 가족이 없습니다."), false);

console.log("safetyPatchFamilyFact.test.ts OK");
