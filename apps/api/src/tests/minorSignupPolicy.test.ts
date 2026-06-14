import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeAgeFromBirthYmd,
  isAdultSignupAge,
  isMinorForParentalConsent,
  MIN_SIGNUP_AGE_YEARS
} from "@vlue/shared/policy/minor-signup";

describe("minorSignupPolicy", () => {
  const asOf = new Date("2026-06-02T12:00:00Z");

  it(`flags under ${MIN_SIGNUP_AGE_YEARS} as minor`, () => {
    assert.equal(isMinorForParentalConsent("20150603", asOf), true);
    assert.equal(isAdultSignupAge("20150603", asOf), false);
    assert.equal(computeAgeFromBirthYmd("20150603", asOf), 10);
  });

  it(`allows adult signup without parental flow`, () => {
    assert.equal(isMinorForParentalConsent("20120602", asOf), false);
    assert.equal(isAdultSignupAge("20120602", asOf), true);
    assert.equal(computeAgeFromBirthYmd("20120602", asOf), 14);
  });

  it("treats invalid birth as minor (conservative)", () => {
    assert.equal(isMinorForParentalConsent("", asOf), true);
    assert.equal(isMinorForParentalConsent("1990", asOf), true);
  });
});
