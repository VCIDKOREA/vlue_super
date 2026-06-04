import { prisma } from "../../db/client.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** URL 파라미터 → DigitalCard.id (UUID·userId·publicHandle) */
export async function resolveDigitalCardIdParam(raw: string): Promise<string | null> {
  const key = String(raw || "").trim();
  if (!key) return null;

  if (UUID_RE.test(key)) {
    const byCard = await prisma.digitalCard.findUnique({
      where: { id: key },
      select: { id: true }
    });
    if (byCard) return byCard.id;

    const byUser = await prisma.digitalCard.findUnique({
      where: { userId: key },
      select: { id: true }
    });
    if (byUser) return byUser.id;

    return null;
  }

  const user = await prisma.user.findFirst({
    where: { publicHandle: key },
    select: { digitalCard: { select: { id: true } } }
  });
  return user?.digitalCard?.id ?? null;
}

export function isUuidLike(s: string): boolean {
  return UUID_RE.test(String(s || "").trim());
}
