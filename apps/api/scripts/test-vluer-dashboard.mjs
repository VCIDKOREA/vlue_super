import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const user = await prisma.user.findFirst({ select: { id: true } });
console.log("user", user?.id);
if (user) {
  const profile = await prisma.userVluerProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {}
  });
  console.log("profile", profile.tierCode, profile.cumulativeB2bEnterprises);
  const n = await prisma.referralAttribution.count();
  console.log("attributions", n);
}
await prisma.$disconnect();
