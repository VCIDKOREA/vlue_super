# External Beta Testing Setup

## Option A: Cloudflare Tunnel (recommended)
1. Install `cloudflared`.
2. Run web app: `npm run dev`
3. Expose local port:
   - `cloudflared tunnel --url http://localhost:5173`
4. Share the generated public URL with beta testers.

## Option B: ngrok
1. Install ngrok and authenticate once (`ngrok config add-authtoken <token>`).
2. Run web app: `npm run dev`
3. Expose local port:
   - `ngrok http 5173`
4. Share HTTPS forwarding URL.

## Test Account Rules
- Provide separate beta accounts (do not share admin account).
- Rotate test passwords weekly during closed beta.
- Revoke tokens after beta sessions (logout flow + refresh token invalidation).

## Beta Session Checklist
- Authentication: login, refresh, logout
- Chat reliability: send, read, reconnect, block guard
- Making flow: create/send/auto-upload/expiry behavior
- Feed visibility: uploaded content appears and expired content disappears
- UI quality: no clipped buttons, no dead taps, no demo-only copy
