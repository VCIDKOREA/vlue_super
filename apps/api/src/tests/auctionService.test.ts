import { resolveAuctionStatus } from "../services/auction/auctionService.js";
import { matchesKeyword } from "../services/auction/auctionKeywordPushService.js";

function assert(cond: boolean, message: string) {
  if (!cond) throw new Error(message);
}

async function run() {
  const now = Date.now();
  const startsAt = new Date(now - 60_000);
  const endsAt = new Date(now + 60_000);

  assert(resolveAuctionStatus(startsAt, endsAt, "scheduled") === "live", "live during window");
  assert(resolveAuctionStatus(new Date(now + 60_000), endsAt, "scheduled") === "scheduled", "scheduled before start");
  assert(resolveAuctionStatus(startsAt, new Date(now - 1_000), "live") === "ended", "ended after window");
  assert(resolveAuctionStatus(startsAt, endsAt, "cancelled") === "cancelled", "cancelled preserved");
  assert(resolveAuctionStatus(startsAt, endsAt, "settled") === "settled", "settled preserved");

  const corpus = "아이패드 에어 6세대 전자기기";
  assert(matchesKeyword(corpus, "아이패드"), "single keyword match");
  assert(matchesKeyword(corpus, "아이패드 에어"), "multi token match");
  assert(!matchesKeyword(corpus, "갤럭시"), "no false positive");
  assert(!matchesKeyword(corpus, "a"), "short keyword ignored");

  console.log("auctionService.test.ts — ok");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
