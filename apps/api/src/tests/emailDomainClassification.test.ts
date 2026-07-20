import assert from "node:assert/strict";
import {
  assertBusinessEmailEligible,
  classifyEmailDomain,
  isCompanyEmailDomain,
  isPersonalEmailDomain,
  isPlatformEmailDomain
} from "../services/email/emailDomainClassification.js";

function run() {
  assert.equal(classifyEmailDomain("a@gmail.com"), "personal");
  assert.equal(classifyEmailDomain("a@naver.com"), "personal");
  assert.equal(isPersonalEmailDomain("user@outlook.kr"), true);
  assert.equal(isCompanyEmailDomain("a@gmail.com"), false);

  assert.equal(classifyEmailDomain("ceo@vlue.kr"), "platform");
  assert.equal(isPlatformEmailDomain("support@vlue.kr"), true);
  assert.equal(isCompanyEmailDomain("ceo@vlue.kr"), true, "사내 @vlue.kr 는 기업 허용");

  assert.equal(classifyEmailDomain("name@samsung.com"), "company");
  assert.equal(isCompanyEmailDomain("name@samsung.com"), true);

  assert.equal(classifyEmailDomain("x@brand.vlue.kr"), "platform");
  assert.equal(isCompanyEmailDomain("x@brand.vlue.kr"), true);

  assert.equal(assertBusinessEmailEligible("hr@vlue.kr"), "hr@vlue.kr");
  assert.throws(() => assertBusinessEmailEligible("me@gmail.com"), /개인용 메일/);

  console.log("emailDomainClassification.test.ts OK");
}

run();
