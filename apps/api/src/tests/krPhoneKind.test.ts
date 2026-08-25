import assert from "node:assert/strict";
import { classifyKrPhoneKind, krPhoneKindLabel } from "../lib/krPhoneKind.js";

function run() {
  assert.equal(classifyKrPhoneKind("010-8014-4666"), "mobile");
  assert.equal(classifyKrPhoneKind("+82 10-8014-4666"), "mobile");
  assert.equal(classifyKrPhoneKind("1588-1234"), "representative");
  assert.equal(classifyKrPhoneKind("080-123-4567"), "representative");
  assert.equal(classifyKrPhoneKind("02-1234-5678"), "landline");
  assert.equal(classifyKrPhoneKind("031-123-4567"), "landline");
  assert.equal(krPhoneKindLabel("mobile"), "휴대폰번호");
  assert.equal(krPhoneKindLabel("representative"), "대표번호");
  assert.equal(krPhoneKindLabel("landline"), "일반내선");
  console.log("krPhoneKind.test.ts OK");
}

run();
