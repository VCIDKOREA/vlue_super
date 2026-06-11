import { runSearchVerify } from "../services/search/searchVerifyService.js";

function assert(cond: boolean, message: string) {
  if (!cond) throw new Error(message);
}

async function run() {
  const prevFetch = globalThis.fetch;

  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("openapi.naver.com")) {
      return new Response(
        JSON.stringify({
          items: [
            {
              title: "<b>구미세무서</b>",
              telephone: "054-468-2200",
              roadAddress: "경상북도 구미시 송정대로 73",
              address: "경북 구미시 송정동",
              category: "공공,사회기관>행정기관"
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

  process.env.NAVER_CLIENT_ID = "test-id";
  process.env.NAVER_CLIENT_SECRET = "test-secret";
  process.env.PUBLIC_DATA_SERVICE_KEY = "test-key";

  try {
    const result = await runSearchVerify("구미세무서");
    assert(result.status === "success", "expected success");
    if (result.status === "success") {
      assert(result.data.company_name.includes("구미세무서"), "company name");
      assert(result.data.telephone === "054-468-2200", "telephone");
      assert(result.data.business_status.includes("공공기관"), "public org fallback");
      assert(result.data.biz_item === "세무 행정", "biz item");
    }
  } finally {
    globalThis.fetch = prevFetch;
  }

  console.log("searchVerifyService.test.ts OK");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
