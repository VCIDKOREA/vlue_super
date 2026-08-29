import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const phoneHints = ["80144666", "01080144666", "+821080144666"];

try {
  const u = await p.user.findFirst({
    where: {
      OR: [
        { publicHandle: "ceo" },
        { phoneE164: { contains: "80144666" } }
      ]
    },
    select: { id: true, publicHandle: true, legalName: true, phoneE164: true }
  });
  console.log("user", u);
  if (!u) process.exit(0);

  const models = Object.keys(p).filter((k) => !k.startsWith("$") && !k.startsWith("_"));
  console.log(
    "models with card/showcase",
    models.filter((m) => /card|showcase|lettering|dcc/i.test(m))
  );

  for (const m of ["digitalBusinessCard", "vlueBusinessCard", "businessCard", "userShowcaseStyle", "showcaseStyle", "letteringBizcard"]) {
    if (!p[m]) continue;
    try {
      const row = await p[m].findFirst({ where: { userId: u.id } });
      console.log(m, row ? JSON.stringify(row).slice(0, 1200) : null);
    } catch (e) {
      console.log(m, "err", e.message);
    }
  }
} finally {
  await p.$disconnect();
}
