import { describe, expect, it } from "vitest";
import {
  normalizeSocialPhotoUrl,
  resolveDisplaySocialPhotoUrl,
  isAllowedSocialPhotoHost
} from "../lib/socialPhotoUrl.js";

describe("socialPhotoUrl", () => {
  it("upgrades kakao http to https", () => {
    expect(normalizeSocialPhotoUrl("http://k.kakaocdn.net/dn/abc/img.jpg")).toBe(
      "https://k.kakaocdn.net/dn/abc/img.jpg"
    );
  });

  it("allows known CDN hosts", () => {
    expect(isAllowedSocialPhotoHost("k.kakaocdn.net")).toBe(true);
    expect(isAllowedSocialPhotoHost("phinf.pstatic.net")).toBe(true);
    expect(isAllowedSocialPhotoHost("evil.example.com")).toBe(false);
  });

  it("rewrites display url through proxy", () => {
    const out = resolveDisplaySocialPhotoUrl("http://k.kakaocdn.net/dn/x.jpg");
    expect(out.startsWith("/api/app/social-avatar?u=")).toBe(true);
    expect(out).toContain(encodeURIComponent("https://k.kakaocdn.net/dn/x.jpg"));
  });
});
