const API_BASE = (process.env.API_BASE_URL || "http://localhost:8788").replace(/\/$/, "");
const USER_ID = process.env.VLUE_SMOKE_USER_ID || "00000000-0000-0000-0000-000000000001";

async function req(path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-VLUE-User-Id": USER_ID,
      ...(init?.headers || {})
    }
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(`${path} failed: ${res.status} ${JSON.stringify(data)}`);
  return data;
}

async function main() {
  await req("/api/sourcing/vision-draft", {
    method: "POST",
    body: JSON.stringify({ imageUrl: "https://example.com/sample.jpg", storeProfileId: "demo-store" })
  });

  await req("/api/sourcing/inline-import", {
    method: "POST",
    body: JSON.stringify({ url: "https://smartstore.naver.com/demo/products/1" })
  });

  const campaign = await req("/api/groupbuy/campaigns", {
    method: "POST",
    body: JSON.stringify({ title: "smoke-campaign", targetQty: 10, durationMinutes: 30 })
  });
  const id = String(((campaign.campaign as Record<string, unknown>) || {}).id || "");
  if (!id) throw new Error("campaign id missing");
  await req(`/api/groupbuy/campaigns/${id}/tick`, { method: "POST", body: JSON.stringify({ soldQtyDelta: 1 }) });

  const asset = await req("/api/assets/scan-upload", {
    method: "POST",
    body: JSON.stringify({
      fileName: "demo.txt",
      contentType: "text/plain",
      contentBase64: Buffer.from("hello").toString("base64")
    })
  });
  const assetId = String(((asset.asset as Record<string, unknown>) || {}).id || "");
  if (!assetId) throw new Error("asset id missing");

  const printJob = await req("/api/iot/print-jobs", {
    method: "POST",
    body: JSON.stringify({ targetLine: "070-1234-5678", sourceAssetId: assetId })
  });
  const status = String((((printJob.job as Record<string, unknown>) || {}).status as string) || "");
  if (!status) throw new Error("print job status missing");

  await req("/api/ai/chat", {
    method: "POST",
    body: JSON.stringify({ message: "가족보호 사용법 알려줘", history: [] })
  });

  const cal = await req("/api/office/calendar/events", {
    method: "POST",
    body: JSON.stringify({
      groupId: "demo-grp-smoke",
      title: "smoke-meeting",
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 3600000).toISOString(),
      memberUserIds: [USER_ID]
    })
  });
  if (!((cal.event as Record<string, unknown>) || {}).id) throw new Error("calendar event missing");

  await req("/api/office/calendar/events?groupId=demo-grp-smoke");

  console.log("[core-smoke] ok");
}

main().catch((e) => {
  console.error("[core-smoke] failed", e);
  process.exit(1);
});

