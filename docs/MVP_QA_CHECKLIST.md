# MVP QA Checklist

## Core E2E (P0)
- Login with valid account, then refresh page and confirm session remains active.
- Force access token expiry and verify automatic refresh (`/api/auth/refresh`) succeeds.
- Open DM room, send/receive message, confirm read state updates on both sides.
- Block a user, verify send/read APIs are rejected for blocked pair.
- Create Making asset, save to locker, send to audience, confirm chat promo card is rendered.
- Enable auto feed upload and verify post is created through `/api/feed/posts`.
- Set short expiry time, wait for expiry, then verify expired post is removed by server-side cleanup.

## Regression Sweep (P1)
- Confirm no blocking `alert()` appears in chat menus, friend request modal, or feed actions.
- Confirm placeholders and notices do not expose `준비 중` for primary user flows.
- Confirm toast/notice wording is consistent for success/failure in chat, making, and feed screens.

## Release Gate
- Frontend build passes: `npm run build`
- API typecheck passes: `npm run typecheck -w @vlue/api`
- Smoke run with API dev server + web dev server on fresh login path.
