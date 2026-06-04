#!/usr/bin/env sh
# Cloudflare Email Worker → VLUE POST /api/office/email-webhook
# VLUE_OFFICE_EMAIL_WEBHOOK_SECRET 미설정 시 시크릿 헤더 생략 가능(개발 전용)

API="${VLUE_API_URL:-http://localhost:8788}"
USER_ID="${VLUE_TEST_USER_ID:-YOUR-USER-UUID}"
SECRET="${VLUE_OFFICE_EMAIL_WEBHOOK_SECRET:-dev-secret}"

curl -sS -X POST "${API}/api/office/email-webhook" \
  -H "Content-Type: application/json" \
  -H "X-VLUE-Email-Webhook-Secret: ${SECRET}" \
  -d "{
    \"subject\": \"계약서 송부\",
    \"email\": \"partner@corp.com\",
    \"rcpt_to\": \"${USER_ID}@vlue.kr\",
    \"plain_body\": \"첨부 확인 부탁드립니다.\",
    \"attachments\": [{
      \"filename\": \"contract.pdf\",
      \"mimeType\": \"application/pdf\",
      \"content\": \"$(base64 -w0 ./sample.pdf 2>/dev/null || base64 ./sample.pdf)\"
    }]
  }"
