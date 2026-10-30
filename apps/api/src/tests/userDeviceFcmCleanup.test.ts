/**
 * FCM 토큰 계정 전환 정리 테스트
 * - 동일 FCM 토큰을 가진 다른 사용자 기기에서 토큰 제거 확인
 * - 계정 A→B 전환 시 A에게 알림이 가는 버그 방지
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/* prisma mock */
const mockUpdateMany = vi.fn();
const mockFindUnique = vi.fn();
const mockFindFirst = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockUpsert = vi.fn();

vi.mock("../db/client.js", () => ({
  prisma: {
    userDevice: {
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      upsert: (...args: unknown[]) => mockUpsert(...args)
    }
  }
}));

import {
  registerUserDeviceFcmToken,
  clearUserFcmTokens
} from "../services/userDeviceFcm.js";

describe("FCM 토큰 계정 전환 정리", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    /* 기본 mock 설정 */
    mockUpdateMany.mockResolvedValue({ count: 0 });
    mockFindUnique.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: "dev-1", isVerified: true, platform: "app" });
    mockUpdate.mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("registerUserDeviceFcmToken", () => {
    it("다른 사용자의 동일 FCM 토큰을 제거한다", async () => {
      /* 이전 사용자(userA)가 동일 FCM 토큰 보유 시나리오 */
      mockUpdateMany.mockResolvedValueOnce({ count: 1 }); /* clearFcmTokenFromOtherUsers */
      mockFindUnique.mockResolvedValue(null);
      mockCreate.mockResolvedValue({ id: "dev-new", isVerified: true, platform: "app" });
      mockUpdate.mockResolvedValue({});

      const result = await registerUserDeviceFcmToken(
        "userB",
        "device-token-123",
        "fcm-token-ABCDEF123456789012345", /* 20자 이상 */
        { platform: "app" }
      );

      expect(result.ok).toBe(true);

      /* 다른 사용자(userA)의 동일 토큰 제거 호출 확인 */
      expect(mockUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            fcmToken: "fcm-token-ABCDEF123456789012345",
            userId: { not: "userB" }
          },
          data: { fcmToken: null }
        })
      );
    });

    it("짧은 FCM 토큰은 거부한다", async () => {
      const result = await registerUserDeviceFcmToken(
        "userA",
        "device-token",
        "short-token", /* 20자 미만 */
        { platform: "app" }
      );

      expect(result.ok).toBe(false);
      expect(result.error).toContain("fcmToken 형식");
    });

    it("deviceToken 또는 fcmToken 누락 시 거부한다", async () => {
      const result1 = await registerUserDeviceFcmToken("user", "", "fcm-valid-token-12345678", {});
      expect(result1.ok).toBe(false);

      const result2 = await registerUserDeviceFcmToken("user", "device", "", {});
      expect(result2.ok).toBe(false);
    });
  });

  describe("clearUserFcmTokens", () => {
    it("사용자의 모든 기기에서 FCM 토큰을 제거한다", async () => {
      mockUpdateMany.mockResolvedValue({ count: 2 });

      const result = await clearUserFcmTokens("userA");

      expect(result.ok).toBe(true);
      expect(result.cleared).toBe(2);
      expect(mockUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "userA" },
          data: { fcmToken: null }
        })
      );
    });

    it("특정 deviceToken만 지정하면 해당 기기만 제거한다", async () => {
      mockUpdateMany.mockResolvedValue({ count: 1 });

      const result = await clearUserFcmTokens("userA", { deviceToken: "device-123" });

      expect(result.ok).toBe(true);
      expect(result.cleared).toBe(1);
      expect(mockUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "userA", deviceToken: "device-123" },
          data: { fcmToken: null }
        })
      );
    });

    it("userId 누락 시 실패를 반환한다", async () => {
      const result = await clearUserFcmTokens("");

      expect(result.ok).toBe(false);
      expect(result.cleared).toBe(0);
    });
  });
});
