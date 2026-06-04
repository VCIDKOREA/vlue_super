# 추천인 확인 API — 백엔드 패치 (모노레포 루트 `발구지`에서 적용)

Cursor가 `src` 폴더만 열려 있으면 `apps/api` 는 자동 수정되지 않습니다. 아래를 **프로젝트 루트**에서 직접 반영한 뒤 `npm run api:dev` 를 재시작하세요.

## 1) `apps/api/src/services/membership/signupMembership.ts` — 함수 추가 (`resolveReferralSponsor` 위에)

```ts
export async function verifyReferralCodeForSignup(referralCodeInput: string) {
  const code = String(referralCodeInput || "").trim();
  if (!code) return { valid: false as const, error: "추천인 코드를 입력해 주세요." };
  try {
    const ref = await resolveReferralSponsor(code);
    if (!ref.sponsorUserId) return { valid: false as const, error: "유효하지 않은 추천인 코드입니다." };
    const sponsor = await prisma.user.findUnique({
      where: { id: ref.sponsorUserId },
      select: { legalName: true, publicHandle: true }
    });
    const handle = sponsor?.publicHandle ? `@${sponsor.publicHandle}` : null;
    const name = String(sponsor?.legalName || "").trim();
    return {
      valid: true as const,
      referralCode: ref.referralCodeUsed,
      sponsorUserId: ref.sponsorUserId,
      sponsorDisplayName: name || handle || "VLUER 파트너",
      sponsorHandle: handle
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    return { valid: false as const, error: msg || "유효하지 않은 추천인 코드입니다." };
  }
}
```

## 2) `apps/api/src/routes/auth.ts`

import 추가:

```ts
import { verifyReferralCodeForSignup } from "../services/membership/signupMembership.js";
```

`authRoutes.get("/check-login-id"` **앞에** 추가:

```ts
authRoutes.get("/referral/verify", async (c) => {
  try {
    const code = c.req.query("code")?.trim() || "";
    const result = await verifyReferralCodeForSignup(code);
    if (!result.valid) return c.json({ valid: false, error: result.error }, 400);
    return c.json({
      valid: true,
      referralCode: result.referralCode,
      sponsorUserId: result.sponsorUserId,
      sponsorDisplayName: result.sponsorDisplayName,
      sponsorHandle: result.sponsorHandle
    });
  } catch (e) {
    return c.json({ valid: false, error: e instanceof Error ? e.message : "확인 실패" }, 400);
  }
});
```

## 3) `apps/api/src/routes/api.ts` — 없는 membership 라우트 제거

다음 두 줄을 **삭제** (파일이 없으면 API가 기동되지 않음):

```ts
import { membershipRoutes } from "./membership.js";
...
apiRoutes.route("/membership", membershipRoutes);
```

프론트는 `GET /api/auth/referral/verify?code=...` 를 호출합니다.

## 4) 연간 할인가

`membershipBmConstants.ts` 의 `PAID_ANNUAL_DISCOUNTED_KRW` 가 **198000** 인지 확인하세요.
