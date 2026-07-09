/**
 * VLUE 알림톡 Live(알리고) 일회성 발송 테스트
 *
 * 사용법 (apps/api 디렉터리):
 *   npm run test:alimtalk-live
 *   npm run test:alimtalk-live -- 01012345678
 *
 * 필수: apps/api/.env 에 KAKAO_ALIMTALK_ENABLED=true 및 알리고 키 4종
 */
import "../src/loadEnv.js";
import { buildCallEndAlimtalkPayload } from "../src/lib/alimtalkTemplate.js";
import { normalizeToE164KR } from "../src/lib/phoneE164.js";
import {
  ALIGO_ALIMTALK_SEND_PATH,
  AlimtalkSendError,
  buildAligoAlimtalkFormBody,
  getAlimtalkSendMode,
  getAligoSendEndpoint,
  parseAligoApiResponse,
  redactAligoFormForLog,
  sendCallEndAlimtalk,
  toProviderRecipientPhone
} from "../src/services/alimtalk/alimtalkSender.js";

function readAlimtalkConfig() {
  return {
    baseUrl: String(process.env.KAKAO_ALIMTALK_BASE_URL || "https://kakaoapi.aligo.in").replace(/\/$/, ""),
    apiKey: String(process.env.KAKAO_ALIMTALK_API_KEY || "").trim(),
    userId: String(process.env.KAKAO_ALIMTALK_USER_ID || "").trim(),
    senderKey: String(process.env.KAKAO_ALIMTALK_SENDER_KEY || "").trim(),
    senderPhone: String(process.env.KAKAO_ALIMTALK_SENDER_PHONE || "").trim(),
    token: String(process.env.KAKAO_ALIMTALK_TOKEN || "").trim(),
    testMode: String(process.env.KAKAO_ALIMTALK_TEST_MODE || "N").trim().toUpperCase() === "Y" ? "Y" : "N",
    provider: "aligo"
  };
}

function printEnvChecklist() {
  const keys = [
    "KAKAO_ALIMTALK_ENABLED=true",
    "KAKAO_ALIMTALK_BASE_URL=https://kakaoapi.aligo.in",
    "KAKAO_ALIMTALK_API_KEY",
    "KAKAO_ALIMTALK_USER_ID",
    "KAKAO_ALIMTALK_SENDER_KEY",
    "KAKAO_ALIMTALK_SENDER_PHONE",
    "KAKAO_ALIMTALK_CALL_END_TEMPLATE_ID",
    "VLUE_SHOWCASE_WEB_BASE",
    "VLUE_APP_DOWNLOAD_URL"
  ];
  console.log("\n[live-alimtalk] .env 체크리스트 (apps/api/.env):");
  for (const k of keys) console.log(`  - ${k}`);
  console.log("  - (선택) KAKAO_ALIMTALK_TOKEN");
  console.log("  - (선택) KAKAO_ALIMTALK_TEST_MODE=Y  ← 알리고 테스트 모드");
  console.log("  - (선택) TEST_ALIMTALK_RECEIVER=010xxxxxxxx\n");
}

async function main() {
  const receiverRaw =
    process.argv[2] || process.env.TEST_ALIMTALK_RECEIVER || process.env.TEST_ALIMTALK_PHONE || "01090000003";

  const mode = getAlimtalkSendMode();
  if (mode !== "live") {
    console.error("[live-alimtalk] KAKAO_ALIMTALK_ENABLED 가 true/live 가 아닙니다. 현재:", mode);
    printEnvChecklist();
    process.exit(1);
  }

  const cfg = readAlimtalkConfig();
  const missing: string[] = [];
  if (!cfg.apiKey) missing.push("KAKAO_ALIMTALK_API_KEY");
  if (!cfg.userId) missing.push("KAKAO_ALIMTALK_USER_ID");
  if (!cfg.senderKey) missing.push("KAKAO_ALIMTALK_SENDER_KEY");
  if (!cfg.senderPhone) missing.push("KAKAO_ALIMTALK_SENDER_PHONE");
  if (missing.length) {
    console.error("[live-alimtalk] 누락된 환경변수:", missing.join(", "));
    printEnvChecklist();
    process.exit(1);
  }

  const peerE164 = normalizeToE164KR(receiverRaw);
  if (!peerE164) {
    console.error("[live-alimtalk] 유효하지 않은 수신 번호:", receiverRaw);
    process.exit(1);
  }

  const payload = buildCallEndAlimtalkPayload(peerE164);
  const endpoint = getAligoSendEndpoint(cfg);
  const form = buildAligoAlimtalkFormBody(payload, cfg);

  console.log("[live-alimtalk] ── 발송 준비 ──");
  console.log("  endpoint:", endpoint);
  console.log("  path:", ALIGO_ALIMTALK_SEND_PATH);
  console.log("  mode:", mode);
  console.log("  template:", payload.templateId);
  console.log("  receiver:", toProviderRecipientPhone(peerE164), `(${peerE164})`);
  console.log("  showcase button:", payload.buttons[0]?.url_mobile);
  console.log("  download button:", payload.buttons[1]?.url_mobile);
  console.log("  testMode:", cfg.testMode);
  console.log("  form (redacted):", JSON.stringify(redactAligoFormForLog(form), null, 2));

  if (endpoint !== "https://kakaoapi.aligo.in/akv10/alimtalk/send/") {
    console.warn("[live-alimtalk] ⚠ BASE_URL 이 프로덕션과 다릅니다:", endpoint);
  }

  const requiredKeys = [
    "apikey",
    "userid",
    "senderkey",
    "tpl_code",
    "sender",
    "receiver_1",
    "subject_1",
    "message_1",
    "button_1"
  ];
  const missingForm = requiredKeys.filter((k) => !form.get(k));
  if (missingForm.length) {
    console.error("[live-alimtalk] 폼 필수값 누락:", missingForm.join(", "));
    process.exit(1);
  }
  console.log("[live-alimtalk] 필수 폼 파라미터 9종 확인 OK");

  console.log("\n[live-alimtalk] ── 알리고 API 호출 ──\n");

  try {
    const result = await sendCallEndAlimtalk(payload);
    const parsed =
      result.providerResponse && typeof result.providerResponse === "object"
        ? parseAligoApiResponse(
            (result.providerResponse as { raw?: unknown }).raw ?? result.providerResponse,
            (result.providerResponse as { httpStatus?: number }).httpStatus ?? 200
          )
        : null;

    console.log("[live-alimtalk] ✅ 발송 요청 성공");
    console.log("  provider:", result.provider);
    console.log("  messageId:", result.messageId);
    if (parsed) {
      console.log("  aligo code:", parsed.code);
      console.log("  aligo message:", parsed.message);
      if (parsed.info) console.log("  aligo info:", JSON.stringify(parsed.info, null, 2));
    } else {
      console.log("  raw response:", JSON.stringify(result.providerResponse, null, 2));
    }
    console.log("\n[live-alimtalk] 수신 휴대폰에서 알림톡 도착 여부를 확인하세요.");
  } catch (e) {
    console.error("\n[live-alimtalk] ❌ 발송 실패");
    if (e instanceof AlimtalkSendError) {
      console.error("  error:", e.message);
      if (e.status) console.error("  httpStatus:", e.status);
      const body = e.body as { code?: unknown; message?: string; raw?: unknown } | undefined;
      if (body) {
        const parsed = parseAligoApiResponse(body.raw ?? body, e.status ?? 0);
        console.error("  aligo code:", parsed.code);
        console.error("  aligo message:", parsed.message || body.message);
        console.error("  detail:", JSON.stringify(body, null, 2));
      }
    } else if (e instanceof Error) {
      console.error("  error:", e.message);
    } else {
      console.error(e);
    }
    process.exit(1);
  }
}

main();
