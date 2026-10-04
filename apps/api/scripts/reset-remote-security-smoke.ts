import { prisma } from "../src/db/client.js";

const userId = process.env.SMOKE_USER_ID || "13c75cbe-206b-4eed-82d2-a54c7bc80c9c";

await prisma.$executeRawUnsafe(
  `UPDATE family_remote_security_state
   SET is_remote_active = false,
       device_status = 'CONNECTED',
       stage2_reason = '',
       stage2_notified_at = NULL,
       updated_at = now()
   WHERE user_id = $1::uuid`,
  userId
);
await prisma.$executeRawUnsafe(
  `UPDATE location_presence
   SET online = true,
       connection_status = 'CONNECTED'
   WHERE user_id = $1::uuid`,
  userId
);
console.log("RESET_OK");
await prisma.$disconnect();
