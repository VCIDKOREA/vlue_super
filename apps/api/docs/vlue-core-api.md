# VLUE 5-core Backend API

## Domain Rename
- Legacy cart domain is preserved for compatibility.
- New canonical domain name is `Partnership Vault`.
- New endpoint namespace is `/api/vault/*`.

## Core Endpoints
- `POST /api/sourcing/vision-draft`
- `POST /api/sourcing/inline-import`
- `POST /api/groupbuy/campaigns`
- `POST /api/groupbuy/campaigns/:id/tick`
- `GET /api/groupbuy/campaigns/:id/tick`
- `POST /api/live/endpoints`
- `GET /api/live/embed/:platform/:streamId`
- `GET /api/vault/items`
- `POST /api/vault/items`
- `GET /api/vault/connections`
- `POST /api/vault/connections`
- `POST /api/assets/scan-upload`
- `POST /api/iot/pc-agent/session`
- `POST /api/iot/print-jobs`
- `POST /api/iot/fax-jobs`
- `POST /api/mail/accounts/provision`
- `POST /api/mail/send`
- `GET /api/office/excel/templates`
- `POST /api/office/excel/workbooks/generate`

## Adapter Strategy
- PG uses `PaymentProviderPort`, default implementation is `MockEscrowProvider`.
- SMTP uses `SmtpProviderPort`, default implementation is `MockSmtpProvider`.
- Storage uses `StorageProviderPort`, default implementation is `MockStorageProvider`.
- Real provider keys can be injected with envs without changing route contracts.

## Traffic-cost-zero Live Rule
- API stores only stream metadata and keys.
- API does not proxy media bytes.
- Live player should consume external RTMP/HLS/CDN directly.

## Auth Policy (VLUE Native Signup Only)
- 신규 가입: `POST /api/identity/portone/complete` (본인인증) — `signupMethod=vlue_native` 고정
- 소셜 신규 가입: **차단** (`completeSocialLogin` 은 연동된 계정만 로그인)
- 소셜 연동: `POST /api/v1/auth/social/link` (Bearer JWT + provider + socialToken)
- 소셜 로그인: `GET /api/v1/auth/kakao` → callback → 기존 `UserSocialLoginLink` 매핑 계정 JWT 발급
- DB: `user_social_login_links` (provider + providerUserId ↔ userId 1:1)

## Local Verification
1. `npm run dev` in `apps/api`.
2. Run `npm run test:core-smoke` in `apps/api`.
3. Subscribe to `GET /api/realtime/sse` and confirm `groupbuy.tick` events.
