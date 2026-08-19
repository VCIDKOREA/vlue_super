/**
 * DCC 등록 주소 거리순 — 검색자 GPS 원점, 대상은 공개된 DCC 주소만.
 * 실행: npx tsx src/tests/dccAddressDistance.test.ts
 */
import assert from "node:assert/strict";
import {
  buildDistanceKmByUserId,
  haversineKm,
  isDccDistanceRankEligible,
  parseSearchOrigin,
  roundKm
} from "../services/dcc/dccAddressDistance.js";

function run() {
  assert.equal(parseSearchOrigin("37.5", "127.0")?.lat, 37.5);
  assert.equal(parseSearchOrigin("91", "127"), null);
  assert.equal(parseSearchOrigin("0", "0"), null);
  assert.equal(isDccDistanceRankEligible({ rawAddress: "", isAddressSearchAllowed: true }), false);
  assert.equal(
    isDccDistanceRankEligible({
      rawAddress: "서울특별시 강남구 테헤란로 427",
      isAddressSearchAllowed: false
    }),
    false
  );
  assert.equal(
    isDccDistanceRankEligible({
      rawAddress: "서울특별시 강남구 테헤란로 427",
      isAddressSearchAllowed: true
    }),
    true
  );

  const cityHall = { lat: 37.5665, lng: 126.978 };
  const gangnam = { lat: 37.4979, lng: 127.0276 };
  const km = haversineKm(cityHall, gangnam);
  assert.ok(km > 7 && km < 11, `expected ~8.5km, got ${km}`);
  assert.equal(roundKm(8.54), 8.5);

  const coords: Record<string, { lat: number; lng: number }> = {
    "서울특별시 강남구 강남대로 396": gangnam,
    "부산광역시 해운대구 달맞이길 30": { lat: 35.1631, lng: 129.1636 }
  };

  return buildDistanceKmByUserId({
    origin: cityHall,
    hits: [
      {
        userId: "hidden",
        rawAddress: "서울특별시 강남구 강남대로 396",
        isAddressSearchAllowed: false
      },
      {
        userId: "near",
        rawAddress: "서울특별시 강남구 강남대로 396",
        isAddressSearchAllowed: true
      },
      {
        userId: "far",
        rawAddress: "부산광역시 해운대구 달맞이길 30",
        isAddressSearchAllowed: true
      },
      {
        userId: "blank",
        rawAddress: "",
        isAddressSearchAllowed: true
      }
    ],
    geocode: async (addr) => coords[addr] || null
  }).then((out) => {
    assert.equal(out.originReady, true);
    assert.equal(out.byUserId.has("hidden"), false);
    assert.equal(out.byUserId.has("blank"), false);
    assert.ok(out.byUserId.has("near"));
    assert.ok(out.byUserId.has("far"));
    assert.ok(Number(out.byUserId.get("near")) < Number(out.byUserId.get("far")));
    return buildDistanceKmByUserId({
      origin: null,
      hits: [
        {
          userId: "near",
          rawAddress: "서울특별시 강남구 강남대로 396",
          isAddressSearchAllowed: true
        }
      ],
      geocode: async (addr) => coords[addr] || null
    });
  }).then((emptyOrigin) => {
    assert.equal(emptyOrigin.originReady, false);
    assert.equal(emptyOrigin.byUserId.size, 0);
    console.log("dccAddressDistance.test.ts: ok");
  });
}

void run();
