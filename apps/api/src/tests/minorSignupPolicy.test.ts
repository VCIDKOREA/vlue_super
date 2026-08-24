import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeAgeFromBirthYmd,
  FAMILY_PROTECTION_MINOR_AGE_YEARS,
  isAdultForFamilyProtection,
  isAdultSignupAge,
  isMinorForFamilyProtection,
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

  it("returns null for invalid birth (caller decides — do not mark as minor)", () => {
    assert.equal(isMinorForParentalConsent("", asOf), null);
    assert.equal(isMinorForParentalConsent("1990", asOf), null);
    assert.equal(isAdultSignupAge("", asOf), false);
  });

  it(`keeps family protection child policy until under ${FAMILY_PROTECTION_MINOR_AGE_YEARS}`, () => {
    assert.equal(isMinorForFamilyProtection("20070603", asOf), true);
    assert.equal(isAdultForFamilyProtection("20070603", asOf), false);
  });

  it(`ends family protection child policy at ${FAMILY_PROTECTION_MINOR_AGE_YEARS}`, () => {
    assert.equal(isMinorForFamilyProtection("20070602", asOf), false);
    assert.equal(isAdultForFamilyProtection("20070602", asOf), true);
  });
});
