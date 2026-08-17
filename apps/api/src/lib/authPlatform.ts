import type { Context } from "hono";

export type AuthPlatform = "web" | "app";

const ANDROID_APP_UA = "VLUE-Android-App";

export function requestClientIp(req: { header: (n: string) => string | undefined }): string | null {
  const forwarded = req.header("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.header("x-real-ip")?.trim();
  const ip = forwarded || realIp || "";
  return ip ? ip.slice(0, 45) : null;
}

export function requestGeoLabel(req: { header: (n: string) => string | undefined }): string | null {
  const country = String(
    req.header("cf-ipcountry") || req.header("x-vercel-ip-country") || ""
  )
    .trim()
    .toUpperCase();
  const city = String(req.header("cf-ipcity") || req.header("x-vercel-ip-city") || "").trim();
  const parts = [city, country === "XX" ? "" : country].filter(Boolean);
  if (!parts.length) return null;
  return parts.join(", ").slice(0, 64);
}

export function isAndroidNativeApp(req: { header: (n: string) => string | undefined }): boolean {
  const ua = String(req.header("user-agent") || "");
  if (ua.includes(ANDROID_APP_UA)) return true;
  const platform = String(req.header("X-VLUE-Platform") || "").toLowerCase();
  return platform === "app" || platform === "android";
}

export function detectAuthPlatform(
  req: { header: (n: string) => string | undefined },
  bodyPlatform?: string | null
): AuthPlatform {
  const p = String(bodyPlatform || req.header("X-VLUE-Platform") || "")
    .trim()
    .toLowerCase();
  if (p === "app" || p === "android") return "app";
  if (p === "web") return "web";
  return isAndroidNativeApp(req) ? "app" : "web";
}

export function sessionClientKind(platform: AuthPlatform, c: Context): string {
  if (platform === "app") return "android_app";
  const hdr = String(c.req.header("X-VLUE-Client") || "").toLowerCase();
  if (hdr === "mobile" || hdr === "desktop") return hdr;
  const ua = String(c.req.header("user-agent") || "").toLowerCase();
  if (/iphone|ipad|android|mobile/.test(ua)) return "mobile";
  return "desktop";
}
