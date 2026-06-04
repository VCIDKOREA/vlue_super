import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const demoUserId = process.env.VLUE_DEMO_USER_ID || "00000000-0000-0000-0000-000000000001";

  await prisma.$executeRawUnsafe(`
    INSERT INTO user_vault_folders (id, owner_user_id, folder_name)
    VALUES (gen_random_uuid(), '${demoUserId}'::uuid, '개인 자료실')
    ON CONFLICT (owner_user_id, folder_name) DO NOTHING;
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO partnership_vault_items (id, owner_user_id, title, kind, payload_json)
    VALUES (
      gen_random_uuid(),
      '${demoUserId}'::uuid,
      '데모 소싱 상품',
      'product',
      '{"priceKrw":39000,"status":"draft"}'::jsonb
    )
    ON CONFLICT DO NOTHING;
  `);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

