/**
 * 포트원(구 아임포트) 휴대폰 본인인증 조회 API.
 * @see https://developers.portone.io (레거시 엔드포인트 api.iamport.kr 사용)
 *
 * 환경변수: PORTONE_API_KEY → imp_key, PORTONE_API_SECRET → imp_secret
 */
import { createHash } from "node:crypto";

const IAMPORT_HOST = "https://api.iamport.kr";

export async function getIamportAccessToken(impKey: string, impSecret: string): Promise<string> {
  const res = await fetch(`${IAMPORT_HOST}/users/getToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imp_key: impKey, imp_secret: impSecret })
  });
  const json = (await res.json()) as {
    code?: number;
    message?: string | null;
    response?: { access_token?: string };
  };
  if (json.code !== 0 || !json.response?.access_token) {
    throw new Error(json.message || "포트원 액세스 토큰 발급 실패");
  }
  return json.response.access_token;
}

/** imp_uid 로 인증 결과 조회 (실명·CI unique_key 등) */
export async function getIamportCertification(impUid: string, accessToken: string): Promise<IamportCertificationPayload> {
  const res = await fetch(`${IAMPORT_HOST}/certifications/${encodeURIComponent(impUid)}`, {
    headers: { Authorization: accessToken }
  });
  const json = (await res.json()) as {
    code?: number;
    message?: string | null;
    response?: IamportCertificationPayload;
  };
  if (json.code !== 0 || !json.response) {
    throw new Error(json.message || "본인인증 정보 조회 실패");
  }
  return json.response;
}

export interface IamportCertificationPayload {
  imp_uid?: string;
  certified?: boolean;
  /** 연계정보(CI) — 서버에 평문 저장하지 말고 해시만 저장 */
  unique_key?: string;
  name?: string;
  phone?: string;
  birth?: string;
  gender?: string;
  certified_at?: number;
}

/** YYYYMMDD (8자리) */
export function parseBirthDateYmd(birth: string | undefined | null): string | null {
  if (!birth) return null;
  const d = String(birth).replace(/\D/g, "");
  if (d.length === 8) return d;
  if (d.length === 6) {
    const yy = Number(d.slice(0, 2));
    const prefix = yy >= 50 ? "19" : "20";
    return `${prefix}${d}`;
  }
  return null;
}

/** M / F */
export function parseGenderCode(gender: string | undefined | null): string | null {
  if (!gender) return null;
  const g = String(gender).trim().toUpperCase();
  if (g === "M" || g === "MALE" || g === "1") return "M";
  if (g === "F" || g === "FEMALE" || g === "2") return "F";
  return null;
}

export type ParsedIamportIdentity = {
  impUid: string;
  legalName: string;
  phoneE164: string | undefined;
  birthDate: string | null;
  gender: string | null;
  /** CI 원문 — DB 저장 금지, 해시만 */
  ciUniqueKey: string;
  certified: boolean;
};

/** 포트원 V1 인증 조회 응답 → 앱·DB용 필드 */
export function parseIamportCertification(
  impUid: string,
  payload: IamportCertificationPayload
): ParsedIamportIdentity {
  if (!payload.certified) {
    throw new Error("본인인증이 완료되지 않은 건입니다.");
  }
  const ciUniqueKey = payload.unique_key?.trim();
  const legalName = payload.name?.trim();
  if (!ciUniqueKey || !legalName) {
    throw new Error("인증 응답에 CI(unique_key) 또는 실명(name)이 없습니다.");
  }
  return {
    impUid,
    legalName,
    phoneE164: normalizeKrPhone(payload.phone),
    birthDate: parseBirthDateYmd(payload.birth),
    gender: parseGenderCode(payload.gender),
    ciUniqueKey,
    certified: true
  };
}

/** imp_uid 로 토큰 발급 → 인증 결과 조회 (V1 E2E) */
export async function fetchAndParseIamportCertification(
  impUid: string,
  impKey: string,
  impSecret: string
): Promise<ParsedIamportIdentity> {
  const token = await getIamportAccessToken(impKey, impSecret);
  const raw = await getIamportCertification(impUid, token);
  return parseIamportCertification(impUid, raw);
}

/** Prisma `Bytes` 필드 저장용 (SHA-256) */
export function hashCiUniqueKey(uniqueKey: string): Buffer {
  return createHash("sha256").update(uniqueKey, "utf8").digest();
}

/** 숫자만 E.164 스타일로 (KR 기본 82) */
export function normalizeKrPhone(phone: string | undefined | null): string | undefined {
  if (!phone) return undefined;
  const d = phone.replace(/\D/g, "");
  if (d.length < 10) return undefined;
  if (d.startsWith("82")) return `+${d}`;
  if (d.startsWith("0")) return `+82${d.slice(1)}`;
  return `+${d}`;
}
