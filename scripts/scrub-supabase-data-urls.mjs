/**
 * 긴급: Postgres JSONB/TEXT 에 쌓인 data:image URL 을 제거해 Supabase egress 를 줄인다.
 *
 * 사용:
 *   cd apps/api && npx tsx ../../scripts/scrub-supabase-data-urls.mjs
 *
 * DATABASE_URL 환경변수 필요. dry-run 기본, --apply 로 실제 저장.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

function stripDataUrls(value, depth = 0) {
  if (depth > 14 || value == null) return { value, stripped: 0 };
  if (typeof value === "string") {
    if (/^\s*data:/i.test(value) || /^\s*blob:/i.test(value)) {
      return { value: null, stripped: 1 };
    }
    return { value, stripped: 0 };
  }
  if (Array.isArray(value)) {
    let stripped = 0;
    const next = value.map((item) => {
      const r = stripDataUrls(item, depth + 1);
      stripped += r.stripped;
      return r.value;
    });
    return { value: next, stripped };
  }
  if (typeof value === "object") {
    let stripped = 0;
    const next = {};
    for (const [k, v] of Object.entries(value)) {
      const r = stripDataUrls(v, depth + 1);
      stripped += r.stripped;
      next[k] = r.value;
    }
    return { value: next, stripped };
  }
  return { value, stripped: 0 };
}

async function main() {
  console.log(`[scrub-data-urls] mode=${APPLY ? "APPLY" : "dry-run"}`);

  let cardsTouched = 0;
  let cardsStripped = 0;
  const cards = await prisma.digitalCard.findMany({
    select: { userId: true, exportSnapshotJson: true }
  });
  for (const row of cards) {
    const raw = row.exportSnapshotJson;
    if (!raw || typeof raw !== "object") continue;
    const json = JSON.stringify(raw);
    if (!json.includes("data:")) continue;
    const { value, stripped } = stripDataUrls(raw);
    if (!stripped) continue;
    cardsTouched += 1;
    cardsStripped += stripped;
    if (APPLY) {
      await prisma.digitalCard.update({
        where: { userId: row.userId },
        data: { exportSnapshotJson: value }
      });
    }
  }
  console.log(`digital_cards: ${cardsTouched} rows, ${cardsStripped} data URLs`);

  let usersTouched = 0;
  let usersStripped = 0;
  const users = await prisma.user.findMany({
    select: {
      id: true,
      showcaseStyleJson: true,
      showcaseLiveStyleJson: true
    }
  });
  for (const row of users) {
    const patch = {};
    let stripped = 0;
    for (const key of ["showcaseStyleJson", "showcaseLiveStyleJson"]) {
      const raw = row[key];
      if (!raw || typeof raw !== "object") continue;
      if (!JSON.stringify(raw).includes("data:")) continue;
      const r = stripDataUrls(raw);
      if (!r.stripped) continue;
      stripped += r.stripped;
      patch[key] = r.value;
    }
    if (!stripped) continue;
    usersTouched += 1;
    usersStripped += stripped;
    if (APPLY) {
      await prisma.user.update({ where: { id: row.id }, data: patch });
    }
  }
  console.log(`users showcase JSON: ${usersTouched} rows, ${usersStripped} data URLs`);

  let casesTouched = 0;
  let casesStripped = 0;
  const cases = await prisma.showcaseCase.findMany({
    where: { deletedAt: null },
    select: { id: true, thumbnailUrl: true, payloadJson: true }
  });
  for (const row of cases) {
    const patch = {};
    let stripped = 0;
    if (typeof row.thumbnailUrl === "string" && /^\s*data:/i.test(row.thumbnailUrl)) {
      patch.thumbnailUrl = null;
      stripped += 1;
    }
    if (row.payloadJson && typeof row.payloadJson === "object") {
      const json = JSON.stringify(row.payloadJson);
      if (json.includes("data:")) {
        const r = stripDataUrls(row.payloadJson);
        if (r.stripped) {
          patch.payloadJson = r.value;
          stripped += r.stripped;
        }
      }
    }
    if (!stripped) continue;
    casesTouched += 1;
    casesStripped += stripped;
    if (APPLY) {
      await prisma.showcaseCase.update({ where: { id: row.id }, data: patch });
    }
  }
  console.log(`showcase_cases: ${casesTouched} rows, ${casesStripped} data URLs`);

  if (!APPLY) {
    console.log("\n실제 반영하려면: npx tsx scripts/scrub-supabase-data-urls.mjs --apply");
  } else {
    console.log("\n적용 완료. Supabase Usage 대시보드에서 Database egress 추이를 확인하세요.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
