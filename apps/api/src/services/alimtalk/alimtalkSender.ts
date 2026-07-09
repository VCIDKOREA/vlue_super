import type { AlimtalkButton, AlimtalkCallEndPayload } from "../../lib/alimtalkTemplate.js";
import { normalizeToE164KR } from "../../lib/phoneE164.js";

export const ALIGO_PRODUCTION_BASE_URL = "https://kakaoapi.aligo.in";
export const ALIGO_ALIMTALK_SEND_PATH = "/akv10/alimtalk/send/";

export type AlimtalkSendMode = "live" | "mock" | "disabled";

export type AlimtalkSendResult = {
  mode: AlimtalkSendMode;
  messageId: string;
  provider?: string;
  providerResponse?: unknown;
};

export class AlimtalkSendError extends Error {
  readonly status?: number;
  readonly body?: unknown;

  constructor(message: string, status?: number, body?: unknown) {
    super(message);
    this.name = "AlimtalkSendError";
    this.status = status;
    this.body = body;
  }
}

/** @returns live | mock | disabled — 미설정은 mock(안전 기본값) */
export function getAlimtalkSendMode(): AlimtalkSendMode {
  const v = String(process.env.KAKAO_ALIMTALK_ENABLED ?? "").trim().toLowerCase();
  if (v === "false" || v === "0" || v === "off" || v === "disabled") return "disabled";
  if (v === "true" || v === "1" || v === "on" || v === "live") return "live";
  return "mock";
}

function readAlimtalkConfig() {
  const baseUrl = String(process.env.KAKAO_ALIMTALK_BASE_URL || ALIGO_PRODUCTION_BASE_URL).replace(/\/$/, "");
  return {
    provider: String(process.env.KAKAO_ALIMTALK_PROVIDER || "aligo").toLowerCase(),
    baseUrl,
    apiKey: String(process.env.KAKAO_ALIMTALK_API_KEY || "").trim(),
    userId: String(process.env.KAKAO_ALIMTALK_USER_ID || "").trim(),
    senderKey: String(process.env.KAKAO_ALIMTALK_SENDER_KEY || "").trim(),
    senderPhone: String(process.env.KAKAO_ALIMTALK_SENDER_PHONE || "").trim(),
    token: String(process.env.KAKAO_ALIMTALK_TOKEN || "").trim(),
    testMode: String(process.env.KAKAO_ALIMTALK_TEST_MODE || "N").trim().toUpperCase() === "Y" ? "Y" : "N"
  };
}

export function getAligoSendEndpoint(cfg = readAlimtalkConfig()) {
  return `${cfg.baseUrl}${ALIGO_ALIMTALK_SEND_PATH}`;
}

function assertLiveConfig() {
  const cfg = readAlimtalkConfig();
  const missing: string[] = [];
  if (!cfg.apiKey) missing.push("KAKAO_ALIMTALK_API_KEY");
  if (!cfg.userId) missing.push("KAKAO_ALIMTALK_USER_ID");
  if (!cfg.senderKey) missing.push("KAKAO_ALIMTALK_SENDER_KEY");
  if (!cfg.senderPhone) missing.push("KAKAO_ALIMTALK_SENDER_PHONE");
  if (missing.length) {
    throw new AlimtalkSendError(`알림톡 live 발송 설정 누락: ${missing.join(", ")}`);
  }
  return cfg;
}

/** E.164 → 국내 대행사 수신번호 (01012345678) */
export function toProviderRecipientPhone(phoneE164: string): string {
  const e164 = normalizeToE164KR(phoneE164) || phoneE164;
  const digits = e164.replace(/\D/g, "");
  if (digits.startsWith("82")) return `0${digits.slice(2)}`;
  if (digits.startsWith("0")) return digits;
  return digits;
}

/** 알리고(Aligo) 알림톡 버튼 JSON */
export function mapButtonsToAligo(buttons: AlimtalkButton[]) {
  return {
    button: buttons.map((b) => ({
      name: b.name.replace(/^[^\w가-힣]+/u, "").slice(0, 14) || b.name.slice(0, 14),
      linkType: b.type,
      linkMo: b.url_mobile,
      linkPc: b.url_pc || b.url_mobile
    }))
  };
}

/**
 * VLUE 템플릿 → 알리고 akv10/alimtalk/send 요청 본문
 * peerPhone·쇼케이스 아웃링크는 buildCallEndAlimtalkPayload()에서 이미 바인딩됨
 */
export function mapCallEndPayloadToAligoRequest(payload: AlimtalkCallEndPayload) {
  const receiver = toProviderRecipientPhone(payload.recipientPhoneE164);
  return {
    receiver,
    tpl_code: payload.templateId,
    subject_1: "VLUE 안심 인증 알림",
    message_1: payload.body,
    button_1: JSON.stringify(mapButtonsToAligo(payload.buttons)),
    failover: "N"
  };
}

/** 알리고 form-urlencoded 본문 — akv10/alimtalk/send 필수 파라미터 */
export function buildAligoAlimtalkFormBody(
  payload: AlimtalkCallEndPayload,
  cfg: ReturnType<typeof readAlimtalkConfig>
) {
  const mapped = mapCallEndPayloadToAligoRequest(payload);
  const fields: Record<string, string> = {
    apikey: cfg.apiKey,
    userid: cfg.userId,
    senderkey: cfg.senderKey,
    sender: cfg.senderPhone.replace(/\D/g, ""),
    tpl_code: mapped.tpl_code,
    receiver_1: mapped.receiver,
    subject_1: mapped.subject_1,
    message_1: mapped.message_1,
    button_1: mapped.button_1,
    failover: mapped.failover
  };
  if (cfg.token) fields.token = cfg.token;
  if (cfg.testMode === "Y") fields.testMode = "Y";
  return new URLSearchParams(fields);
}

export type AligoParsedResponse = {
  ok: boolean;
  httpStatus: number;
  code: number | string;
  message: string;
  messageId?: string;
  info?: Record<string, unknown>;
  raw: unknown;
};

/** 알리고 JSON 응답 안전 파싱 — code 0 = 성공 */
export function parseAligoApiResponse(raw: unknown, httpStatus: number): AligoParsedResponse {
  const body =
    raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const code = body.code ?? body.result_code ?? "unknown";
  const codeNum = Number(code);
  const ok =
    httpStatus >= 200 &&
    httpStatus < 300 &&
    (codeNum === 0 || code === 0 || code === "0");
  const info =
    body.info && typeof body.info === "object" && !Array.isArray(body.info)
      ? (body.info as Record<string, unknown>)
      : undefined;
  const mid = info?.mid;

  return {
    ok,
    httpStatus,
    code: typeof code === "string" || typeof code === "number" ? code : String(code),
    message: String(body.message ?? ""),
    messageId: mid != null ? String(mid) : undefined,
    info,
    raw
  };
}

/** 로그용 — apikey 등 민감값 마스킹 */
export function redactAligoFormForLog(form: URLSearchParams) {
  const safe: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (key === "apikey" || key === "token") {
      safe[key] = value ? `${value.slice(0, 4)}***` : "";
      continue;
    }
    safe[key] = key === "message_1" ? `${value.slice(0, 80)}…` : value;
  }
  return safe;
}

function logMockDispatch(payload: AlimtalkCallEndPayload, providerRequest?: Record<string, unknown>) {
  console.info("[alimtalk:sender] mock dispatch", {
    mode: "mock",
    templateId: payload.templateId,
    to: payload.recipientPhoneE164,
    recipientLocal: toProviderRecipientPhone(payload.recipientPhoneE164),
    bodyPreview: payload.body.slice(0, 120),
    buttons: payload.buttons.map((b) => ({ name: b.name, url: b.url_mobile })),
    optOutKey: payload.optOutKey,
    providerRequest
  });
}

async function postAligoAlimtalk(
  payload: AlimtalkCallEndPayload,
  cfg: ReturnType<typeof readAlimtalkConfig>
): Promise<AlimtalkSendResult> {
  const endpoint = getAligoSendEndpoint(cfg);
  const body = buildAligoAlimtalkFormBody(payload, cfg);

  if (process.env.ALIMTALK_LIVE_DEBUG === "1") {
    console.info("[alimtalk:sender] live request", {
      endpoint,
      form: redactAligoFormForLog(body)
    });
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      Accept: "application/json"
    },
    body
  });

  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* plain text response */
  }

  const result = parseAligoApiResponse(parsed, res.status);

  if (!res.ok) {
    throw new AlimtalkSendError(`알리고 API HTTP ${res.status}`, res.status, result);
  }

  if (!result.ok) {
    throw new AlimtalkSendError(result.message || "알리고 API 발송 실패", res.status, result);
  }

  const messageId = result.messageId || `alimtalk-aligo-${Date.now()}`;

  return {
    mode: "live",
    messageId,
    provider: "aligo",
    providerResponse: result
  };
}

/**
 * 통화 종료 알림톡 발송 — KAKAO_ALIMTALK_ENABLED 스위치
 * - disabled: 호출 전 차단(상위 서비스)
 * - mock / 미설정: console.info
 * - live (true): 대행사 REST API POST
 */
export async function sendCallEndAlimtalk(payload: AlimtalkCallEndPayload): Promise<AlimtalkSendResult> {
  const mode = getAlimtalkSendMode();

  if (mode === "disabled") {
    throw new AlimtalkSendError("KAKAO_ALIMTALK_ENABLED=disabled");
  }

  if (mode === "mock") {
    const providerRequest = mapCallEndPayloadToAligoRequest(payload);
    logMockDispatch(payload, providerRequest);
    return {
      mode: "mock",
      messageId: `alimtalk-mock-${Date.now()}`,
      provider: "mock"
    };
  }

  const cfg = assertLiveConfig();
  if (cfg.provider === "aligo") {
    return postAligoAlimtalk(payload, cfg);
  }

  throw new AlimtalkSendError(`지원하지 않는 KAKAO_ALIMTALK_PROVIDER: ${cfg.provider}`);
}
