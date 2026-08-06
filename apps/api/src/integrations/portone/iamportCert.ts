/**
 * 포트원(구 아임포트) 휴대폰 본인인증 조회 API.
 * @see https://developers.portone.io (레거시 엔드포인트 api.iamport.kr 사용)
 *
 * 환경변수: PORTONE_API_KEY → imp_key, PORTONE_API_SECRET → imp_secret
 *
 * KG이니시스 테스트 MID(MIIasTest) 는 CI(unique_key)를 주지 않음.
 * PORTONE_TEST_MODE=true 일 때만 DI(unique_in_site) 또는 전화+실명 합성키로 통과.
 */
import { createHash } from "node:crypto";

const IAMPORT_HOST = "https://api.iamport.kr";

export function isPortoneTestMode(): boolean {
  const raw = String(process.env.PORTONE_TEST_MODE || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

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
  /** 사이트별 DI — 테스트 MID에서 CI 대신 올 수 있음 */
  unique_in_site?: string;
  name?: string;
  phone?: string;
  birth?: string | number;
  gender?: string;
  certified_at?: number;
}

/** YYYYMMDD (8자리) */
export function parseBirthDateYmd(birth: string | number | undefined | null): string | null {
  if (birth == null || birth === "") return null;
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
  /** CI 원문(또는 테스트 폴백 키) — DB 저장 금지, 해시만 */
  ciUniqueKey: string;
  certified: boolean;
  /** true면 CI 대신 DI/합성키 사용 (테스트 전용) */
  usedTestIdentityFallback?: boolean;
};

/**
 * CI가 없을 때 테스트 전용 식별키.
 * 접두사로 실 CI 해시와 충돌하지 않게 함.
 */
export function resolveTestIdentityFallbackKey(payload: IamportCertificationPayload, impUid: string): string | null {
  const di = String(payload.unique_in_site || "").trim();
  if (di) return `portone_di:${di}`;

  const legalName = String(payload.name || "").trim();
  const phoneE164 = normalizeKrPhone(payload.phone);
  if (legalName && phoneE164) {
    return `portone_test:${phoneE164}:${legalName}`;
  }

  const uid = String(impUid || payload.imp_uid || "").trim();
  if (uid && legalName) {
    return `portone_test_imp:${uid}:${legalName}`;
  }
  return null;
}

/** 포트원 V1 인증 조회 응답 → 앱·DB용 필드 */
export function parseIamportCertification(
  impUid: string,
  payload: IamportCertificationPayload,
  opts: { allowTestCiFallback?: boolean } = {}
): ParsedIamportIdentity {
  if (!payload.certified) {
    throw new Error("본인인증이 완료되지 않은 건입니다.");
  }
  const legalName = String(payload.name || "").trim();
  if (!legalName) {
    throw new Error("인증 응답에 실명(name)이 없습니다.");
  }

  let ciUniqueKey = String(payload.unique_key || "").trim();
  let usedTestIdentityFallback = false;

  if (!ciUniqueKey) {
    const allowFallback = opts.allowTestCiFallback ?? isPortoneTestMode();
    if (!allowFallback) {
      throw new Error(
        "인증 응답에 CI(unique_key)가 없습니다. KG이니시스 테스트 MID는 CI를 제공하지 않습니다. 실연동 채널 또는 PORTONE_TEST_MODE=true(테스트 폴백)가 필요합니다."
      );
    }
    const fallback = resolveTestIdentityFallbackKey(payload, impUid);
    if (!fallback) {
      throw new Error(
        "테스트 모드인데 CI·DI·전화번호가 모두 없어 본인인증을 완료할 수 없습니다."
      );
    }
    ciUniqueKey = fallback;
    usedTestIdentityFallback = true;
    console.warn("[iamportCert] PORTONE_TEST_MODE: CI 없음 → 테스트 폴백 키 사용", {
      impUid,
      fallbackKind: fallback.startsWith("portone_di:") ? "di" : "synthetic"
    });
  }

  return {
    impUid,
    legalName,
    phoneE164: normalizeKrPhone(payload.phone),
    birthDate: parseBirthDateYmd(payload.birth),
    gender: parseGenderCode(payload.gender),
    ciUniqueKey,
    certified: true,
    usedTestIdentityFallback
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
  return parseIamportCertification(impUid, raw, { allowTestCiFallback: isPortoneTestMode() });
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
