# VLUE MVP Launch + Admin Console Plan

This document is the execution guide for MVP launch and internal admin console.

---

## 1) Launch Decision

- **MVP launch is feasible**, but only after all P0 items are completed.
- Current codebase includes many core blocks (chat, cards, onboarding, device-based admin), but several production-critical areas are still demo-like or weakly protected.

---

## 2) Priority Checklist

## P0 (must-have before launch)

1. **Auth hardening**
   - JWT access/refresh flow
   - Logout + token invalidation
   - Password reset endpoints
2. **Signup completion**
   - Terms version consent persistence
   - Identity verification status finalization
3. **Chat reliability**
   - Read receipts
   - Resync endpoint for missed messages
   - Blocked-user server guard
4. **VLUE Voice baseline**
   - Signaling start/answer/end APIs
   - TURN server integration
   - Call failure code mapping
5. **Tier-based card broadcasting**
   - Force tier-dependent card payload on server
   - Validate UI receives tier + template metadata
6. **Notification baseline**
   - Device token register/unregister
   - Incoming-call push path
7. **Ops baseline**
   - Error tracking
   - Structured logs
   - Health checks + incident runbook

## P1 (right after launch)

1. Better search/filter UX for users and reports
2. Advanced ringtone/alert settings
3. Bulk admin operations
4. Quality dashboard for voice session metrics
5. Abuse heuristics automation

---

## 3) 2-Week / 4-Week Delivery Plan

## Week 1 (Core safety)

- Day 1-2: JWT + middleware migration
- Day 3: Signup/identity/terms completion
- Day 4: Chat read + sync + block guard
- Day 5: Voice signaling + TURN wiring

## Week 2 (Release-ready)

- Day 6: Tier card broadcast end-to-end QA
- Day 7: Push token + send flow
- Day 8: Logging + health + alerting
- Day 9: Security and regression pass
- Day 10: Internal beta + hotfixes

## Week 3-4 (MVP+ stabilization)

- Admin UX refinement, bulk actions
- Voice quality telemetry and dashboard
- Performance tuning and failover playbook
- Payment/upgrade real integration (if in release scope)

---

## 4) Admin Console MVP Scope

Start small with 5 pages only:

1. **Dashboard**
   - signups, DAU, call success rate, error rate
2. **User Management**
   - search, status change, identity status
3. **Tier & Access**
   - free/standard/premium update
   - card member grant/revoke
4. **Card Verification**
   - pending approvals, approve/reject
5. **Reports**
   - abuse report queue, resolution status

---

## 5) Admin Security Rules (non-negotiable)

1. Separate admin auth/session from user auth
2. RBAC roles:
   - `SUPER_ADMIN`
   - `OPS_ADMIN`
   - `CS_ADMIN`
3. Every write action must create an audit log entry
4. Rate limit + brute force protection for admin auth
5. Prefer IP allowlist or VPN for admin endpoints in production

---

## 6) Required API Draft (minimum set)

## Auth

- `POST /api/admin/auth/login`
- `GET /api/admin/auth/me`
- `POST /api/admin/auth/logout`

## Users

- `GET /api/admin/users`
- `PATCH /api/admin/users/:id/status`
- `PATCH /api/admin/users/:id/tier`

## Cards

- `GET /api/admin/cards`
- `PATCH /api/admin/cards/:id/verify`
- `POST /api/admin/cards/:id/members`
- `DELETE /api/admin/cards/:id/members/:userId`

## Reports

- `GET /api/admin/reports`
- `PATCH /api/admin/reports/:id/resolve`

## Audit

- `GET /api/admin/audit-logs`

---

## 7) What the founder/team must prepare

## Product/Policy

- Terms of service and privacy policy finalized
- Voice data handling policy (retention, consent)
- Location data policy and opt-out text

## Infra/Accounts

- Production DB project and backups
- Push provider setup (FCM/APNs as needed)
- TURN server provision
- Error/monitoring tools configured

## Operations

- Tier policy table and business rules
- Admin SOP for approve/reject/escalation
- Incident response owner and on-call flow

---

## 8) Codebase-specific immediate next steps

1. Keep existing `/api/admin` device-authorization flow for gatekeeping
2. Add new operational routes under a separate namespace (recommended):
   - `/api/admin-console/*`
3. Implement admin console pages in current app only for internal users first
4. Release with feature flags:
   - `voice_live_enabled`
   - `admin_console_enabled`
   - `card_lookup_strict_mode`

---

## 9) Go/No-Go Gate for MVP

Go only if all are true:

- P0 checklist complete
- Tier-based card broadcast verified on real flows
- Voice call success rate and reconnect behavior acceptable
- Admin can resolve reports and card approvals without developer intervention
- Monitoring and rollback paths tested

