import { runSearchVerify } from "../services/search/searchVerifyService.js";

function assert(cond: boolean, message: string) {
  if (!cond) throw new Error(message);
}

async function run() {
  const prevFetch = globalThis.fetch;

  process.env.NAVER_CLIENT_ID = "test-id";
  process.env.NAVER_CLIENT_SECRET = "test-secret";
  process.env.KAKAO_REST_API_KEY = "test-kakao";
  process.env.PUBLIC_DATA_SERVICE_KEY = "test-key";

  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("dapi.kakao.com")) {
      return new Response(
        JSON.stringify({
          documents: [
            {
              place_name: "구미세무서",
              phone: "054-468-2200",
              address_name: "경북 구미시 송정동",
              road_address_name: "경상북도 구미시 송정대로 73",
              category_name: "공공,사회기관 > 세무서",
              place_url: "https://place.map.kakao.com/gumi-tax",
              x: "128.39563",
              y: "36.3404"
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if (url.includes("openapi.naver.com")) {
      return new Response(
        JSON.stringify({
          items: [
            {
              title: "<b>구미세무서</b>",
              telephone: "",
              roadAddress: "경상북도 구미시 송정대로 73",
              address: "경북 구미시 송정동",
              category: "공공,사회기관>행정기관>세무서",
              mapx: "1283956300",
              mapy: "363404000",
              link: "https://map.naver.com/gumi-tax"
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if (url.includes("sbdcStoreInfoService") || url.includes("small_business")) {
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ data: [] }), { status: 200 });
  };

  try {
    const result = await runSearchVerify("구미세무서");
    assert(result.status === "success", "expected success");
    if (result.status === "success") {
      assert(result.data.is_registered === false, "unregistered by default");
      assert(result.data.kakao.telephone === "054-468-2200", "kakao telephone");
      assert(result.data.kakao.place_name.includes("구미세무서"), "kakao place");
      assert(result.data.naver.title.includes("구미세무서"), "naver title");
      assert(result.data.public.matched === true, "public institution matched");
      assert(result.data.public.business_status.includes("공공기관"), "public status");
      assert(result.data.public.fail_safe_message.length > 0, "public message");
      assert(result.data.vlue_auth.status_text.length > 0, "vlue status");
      assert(result.data.vlue_auth.safety_score >= 35, "vlue score");
    }
  } finally {
    globalThis.fetch = prevFetch;
  }

  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("dapi.kakao.com")) {
      return new Response(
        JSON.stringify({
          documents: [
            {
              place_name: "투썸플레이스 대구대곡점",
              phone: "053-999-8888",
              address_name: "대구 달서구 갈월동",
              road_address_name: "대구광역시 달서구 갈발로 24",
              category_name: "음식점 > 카페",
              place_url: "https://place.map.kakao.com/twosome",
              x: "128.55812",
              y: "35.85123"
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if (url.includes("openapi.naver.com")) {
      return new Response(
        JSON.stringify({
          items: [
            {
              title: "<b>투썸플레이스 대구대곡점</b>",
              telephone: "",
              roadAddress: "대구광역시 달서구 갈발로 24",
              address: "대구 달서구 갈월동",
              category: "음식점>카페,디저트>카페",
              mapx: "1285581200",
              mapy: "358512300",
              link: "https://map.naver.com/twosome-daegok"
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if (url.includes("sbdcStoreInfoService") || url.includes("small_business")) {
      return new Response(
        JSON.stringify({
          data: [
            {
              bizesNm: "투썸플레이스 대구대곡점",
              bizno: "1234567890",
              rdnmadr: "대구광역시 달서구 갈발로 24",
              telno: "053-111-2222",
              indsMclsNm: "카페"
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(JSON.stringify({ data: [] }), { status: 200 });
  };

  const cafe = await runSearchVerify("투썸플레이스 대곡");
  assert(cafe.status === "success", "cafe search success");
  if (cafe.status === "success") {
    assert(cafe.data.kakao.place_name.includes("대구대곡"), "kakao place");
    assert(cafe.data.public.matched === true, "public store matched");
    assert(cafe.data.public.business_number.includes("123"), "business number");
  }

  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("dapi.kakao.com")) {
      return new Response(JSON.stringify({ documents: [] }), { status: 200 });
    }
    if (url.includes("openapi.naver.com")) {
      return new Response(JSON.stringify({ items: [] }), { status: 200 });
    }
    return new Response(JSON.stringify({ data: [] }), { status: 200 });
  };

  const failResult = await runSearchVerify("없는가게zzzz");
  assert(failResult.status === "error", "no results error");

  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("dapi.kakao.com")) {
      return new Response(
        JSON.stringify({
          documents: [
            {
              place_name: "다다오피스",
              phone: "02-9876-5432",
              address_name: "서울 마포구",
              road_address_name: "서울특별시 마포구 월드컵북로 56길 19",
              category_name: "서비스,산업 > 사무실",
              place_url: "https://place.map.kakao.com/dada",
              x: "126.89",
              y: "37.56"
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if (url.includes("openapi.naver.com")) {
      return new Response(
        JSON.stringify({
          items: [
            {
              title: "<b>다다오피스</b>",
              telephone: "",
              roadAddress: "서울특별시 마포구 월드컵북로 56길 19",
              address: "서울 마포구",
              category: "서비스,산업>사무실",
              mapx: "1268900000",
              mapy: "375600000",
              link: "https://map.naver.com/dada"
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(JSON.stringify({ data: [] }), { status: 200 });
  };

  const partner = await runSearchVerify("다다오피스");
  assert(partner.status === "success", "partner search success");
  if (partner.status === "success") {
    assert(partner.data.is_registered === true, "registered partner");
    assert(partner.data.vlue_auth.safety_score >= 90, "premium safety score");
    assert(partner.data.vlue_auth.cert_number.includes("VLUE"), "cert number");
  }

  console.log("searchVerifyService.test.ts OK");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
