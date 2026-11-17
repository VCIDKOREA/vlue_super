import assert from "node:assert/strict";
import { formatKrPhone, normalizeBizcardFields } from "../services/bizcard/bizcardStructuredParse.js";
import { decideBizcardTrust } from "../services/bizcard/bizcardTrustScore.js";

assert.equal(formatKrPhone("01012345678"), "010-1234-5678");
assert.equal(formatKrPhone("02 1234 5678"), "02-1234-5678");
assert.equal(formatKrPhone("1588-1234"), "1588-1234");

const card = normalizeBizcardFields({
  name: "홍 길 동",
  company: "(주)블루",
  department: null,
  position: "대표이사",
  mobile: "01012345678",
  tel: "0212345678",
  fax: null,
  email: "a@vlue.kr",
  address: "06234 서울특별시 강남구 테헤란로 1",
  website: "www.vlue.kr"
});
assert.equal(card.name, "홍길동");
assert.equal(card.company, "(주)블루");
assert.equal(card.mobile, "010-1234-5678");
assert.equal(card.tel, "02-1234-5678");
assert.equal(card.address, "서울특별시 강남구 테헤란로 1");
assert.equal(card.website, "vlue.kr");

const verified = decideBizcardTrust({
  dbPhone: true,
  dbName: true,
  dbAddress: true,
  placeName: true,
  placePhone: true,
  placeAddress: true,
  publicStore: true
});
assert.equal(verified.badge, "DB 검증 완료");
assert.ok(verified.score >= 80);

const place = decideBizcardTrust({
  dbPhone: false,
  dbName: false,
  dbAddress: false,
  placeName: true,
  placePhone: true,
  placeAddress: false,
  publicStore: false
});
assert.equal(place.badge, "위치 실존 확인");

const unknown = decideBizcardTrust({
  dbPhone: false,
  dbName: false,
  dbAddress: false,
  placeName: false,
  placePhone: false,
  placeAddress: false,
  publicStore: false
});
assert.equal(unknown.badge, "미확인");

console.log("bizcardTrust.test.ts OK");
