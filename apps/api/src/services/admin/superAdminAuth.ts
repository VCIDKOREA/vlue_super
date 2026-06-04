import type { User } from "@prisma/client";

export function isSuperAdminUser(user: Pick<User, "role" | "publicHandle" | "phoneE164">): boolean {
  if (user.role === "admin") return true;

  const handle = String(user.publicHandle || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
  const allowHandles = String(process.env.SUPER_ADMIN_HANDLES || "")
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
  if (handle && allowHandles.includes(handle)) return true;

  const masterPhone = String(process.env.ADMIN_MASTER_PHONE_E164 || "").trim();
  if (masterPhone && user.phoneE164 === masterPhone) return true;

  return false;
}
