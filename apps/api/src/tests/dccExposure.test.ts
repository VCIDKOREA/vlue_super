/**
 * DCC 검색·팔로우 노출 마스킹 단위 테스트
 * 실행: npx tsx src/tests/dccExposure.test.ts
 */
import assert from "node:assert/strict";
import {
  MASKED_KR_MOBILE,
  directoryFieldAllowed,
  extractKoreanAddressRegion,
  isDccExposureComplete,
  isMaskedPhoneDisplay,
  maskKrPhoneForDirectory,
  resolveDirectoryAddress,
  resolveDirectoryPhone
} from "../services/dcc/dccExposure.js";

function run() {
  assert.equal(isDccExposureComplete({
    phoneSearch: null,
    addressSearch: false,
    phoneFollow: true,
    addressFollow: true
  }), false);
  assert.equal(isDccExposureComplete({
    phoneSearch: false,
    addressSearch: false,
    phoneFollow: true,
    addressFollow: false
  }), true);

  assert.equal(maskKrPhoneForDirectory("+821049668746"), MASKED_KR_MOBILE);
  assert.equal(maskKrPhoneForDirectory("010-4966-8746"), MASKED_KR_MOBILE);
  assert.equal(maskKrPhoneForDirectory("02-1234-5678"), "02-****-****");
  assert.equal(maskKrPhoneForDirectory("031-123-4567"), "031-****-****");
  assert.equal(isMaskedPhoneDisplay(MASKED_KR_MOBILE), true);
  assert.equal(isMaskedPhoneDisplay("010-4966-8746"), false);

  assert.equal(
    extractKoreanAddressRegion("서울특별시 강남구 테헤란로 123 10층"),
    "서울특별시 강남구"
  );
  assert.equal(
    extractKoreanAddressRegion("경기도 성남시 분당구 정자로 1"),
    "경기도 성남시 분당구"
  );
  assert.equal(extractKoreanAddressRegion("부산광역시 해운대구 우동 1234"), "부산광역시 해운대구");
  assert.equal(extractKoreanAddressRegion(""), "");

  const hiddenPhone = resolveDirectoryPhone({
    rawPhone: "010-4966-8746",
    allowed: false,
    fullAccess: false
  });
  assert.equal(hiddenPhone.phone, MASKED_KR_MOBILE);
  assert.equal(hiddenPhone.phoneVisible, false);
  assert.equal(hiddenPhone.phoneDialEnabled, false);

  const shownPhone = resolveDirectoryPhone({
    rawPhone: "010-4966-8746",
    allowed: true,
    fullAccess: false
  });
  assert.equal(shownPhone.phone, "010-4966-8746");
  assert.equal(shownPhone.phoneDialEnabled, true);

  const friendPhone = resolveDirectoryPhone({
    rawPhone: "010-4966-8746",
    allowed: false,
    fullAccess: true
  });
  assert.equal(friendPhone.phone, "010-4966-8746");
  assert.equal(friendPhone.phoneDialEnabled, true);

  const regionAddr = resolveDirectoryAddress({
    rawAddress: "서울특별시 강남구 테헤란로 427",
    allowed: false,
    fullAccess: false
  });
  assert.equal(regionAddr.address, "서울특별시 강남구");
  assert.equal(regionAddr.addressVisible, false);

  const flags = {
    isPhoneSearchAllowed: false,
    isAddressSearchAllowed: false,
    isPhoneFollowersAllowed: true,
    isAddressFollowersAllowed: true
  };
  assert.equal(directoryFieldAllowed(flags, "phone", "search", true), false);
  assert.equal(directoryFieldAllowed(flags, "phone", "follow", true), true);
  assert.equal(directoryFieldAllowed(flags, "phone", "full", false), true);

  console.log("dccExposure.test.ts: ok");
}

run();
