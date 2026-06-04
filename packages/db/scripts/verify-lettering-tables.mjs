import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const blockCols = await prisma.$queryRaw`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'lettering_phone_blocks'
    ORDER BY ordinal_position
  `;
  const reportCols = await prisma.$queryRaw`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'lettering_phone_reports'
    ORDER BY ordinal_position
  `;
  const fks = await prisma.$queryRaw`
    SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name IN ('lettering_phone_blocks', 'lettering_phone_reports')
  `;

  console.log("lettering_phone_blocks columns:", blockCols);
  console.log("lettering_phone_reports columns:", reportCols);
  console.log("foreign keys:", fks);

  const blockCount = await prisma.letteringPhoneBlock.count();
  const reportCount = await prisma.letteringPhoneReport.count();
  console.log(`rows: blocks=${blockCount} reports=${reportCount}`);
  console.log("OK — lettering tables verified");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
