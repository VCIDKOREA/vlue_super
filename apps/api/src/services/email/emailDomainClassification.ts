/**
 * 이메일 도메인 분류 — 개인(프리메일) / 플랫폼(VLUE 가상메일) / 기업
 *
 * 기업 판정 규칙:
 * 1) 개인용 프리메일 블랙리스트 → personal
 * 2) VLUE 가상메일 도메인(VLUE_EMAIL_DOMAIN 및 하위) → platform
 * 3) 그 외 → company
 * 4) 회사 인증(is_company_verified) 대상:
 *    - company 전부, 또는
 *    - platform 이지만 COMPANY_EMAIL_DOMAIN_ALLOWLIST(기본: vlue.kr)에 포함된 경우
 *      → 사내 메일(@vlue.kr)을 기업 메일로 인정
 */

export type EmailDomainKind = "invalid" | "personal" | "platform" | "company";

/** 개인용 웹메일 — 기업 인증 불가 */
export const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "naver.com",
  "hanmail.net",
  "daum.net",
  "kakao.com",
  "nate.com",
  "hotmail.com",
  "outlook.com",
  "outlook.kr",
  "live.com",
  "msn.com",
  "yahoo.com",
  "yahoo.co.kr",
  "ymail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
  "zoho.com",
  "mail.com",
  "gmx.com",
  "gmx.net"
]);

export function normalizeBusinessEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}

export function isValidEmailShape(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeBusinessEmail(email));
}

export function extractEmailDomain(email: string): string {
  return normalizeBusinessEmail(email).split("@")[1] || "";
}

function parseDomainList(raw: string | undefined | null): string[] {
  return String(raw || "")
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
}

/** VLUE가 발급하는 가상 메일 apex (기본 vlue.kr) */
export function getPlatformEmailDomain(): string {
  return (process.env.VLUE_EMAIL_DOMAIN || "vlue.kr").trim().toLowerCase() || "vlue.kr";
}

/**
 * 기업 메일로 인정할 도메인 허용 목록.
 * 기본값에 플랫폼 도메인(vlue.kr)을 포함해 사내 메일이 기업으로 인식되게 함.
 * 추가 예: COMPANY_EMAIL_DOMAIN_ALLOWLIST=vlue.kr,vcidkorea.com
 */
export function getCompanyEmailDomainAllowlist(): Set<string> {
  const fromEnv = parseDomainList(process.env.COMPANY_EMAIL_DOMAIN_ALLOWLIST);
  const defaults = [getPlatformEmailDomain(), "vlue.kr"];
  return new Set([...defaults, ...fromEnv]);
}

function domainMatchesListed(domain: string, listed: Set<string>): boolean {
  const d = domain.toLowerCase();
  if (!d) return false;
  if (listed.has(d)) return true;
  for (const item of listed) {
    if (d === item || d.endsWith(`.${item}`)) return true;
  }
  return false;
}

export function isPersonalEmailDomain(emailOrDomain: string): boolean {
  const domain = emailOrDomain.includes("@")
    ? extractEmailDomain(emailOrDomain)
    : String(emailOrDomain || "")
        .trim()
        .toLowerCase();
  return domainMatchesListed(domain, PERSONAL_EMAIL_DOMAINS);
}

/** VLUE 가상메일 도메인(@vlue.kr, @brand.vlue.kr 등) */
export function isPlatformEmailDomain(emailOrDomain: string): boolean {
  const domain = emailOrDomain.includes("@")
    ? extractEmailDomain(emailOrDomain)
    : String(emailOrDomain || "")
        .trim()
        .toLowerCase();
  if (!domain) return false;
  const root = getPlatformEmailDomain();
  return domain === root || domain.endsWith(`.${root}`);
}

export function isDomainOnCompanyAllowlist(emailOrDomain: string): boolean {
  const domain = emailOrDomain.includes("@")
    ? extractEmailDomain(emailOrDomain)
    : String(emailOrDomain || "")
        .trim()
        .toLowerCase();
  return domainMatchesListed(domain, getCompanyEmailDomainAllowlist());
}

export function classifyEmailDomain(email: string): EmailDomainKind {
  const normalized = normalizeBusinessEmail(email);
  if (!isValidEmailShape(normalized)) return "invalid";
  const domain = extractEmailDomain(normalized);
  if (!domain) return "invalid";
  if (isPersonalEmailDomain(domain)) return "personal";
  if (isPlatformEmailDomain(domain)) return "platform";
  return "company";
}

/**
 * 기업 메일로 취급해 is_company_verified 부여 가능한지.
 * - 일반 커스텀 도메인(company) → true
 * - 사내/허용 목록 도메인(vlue.kr 등) → true (platform이어도 allowlist면 인정)
 * - gmail/naver 등 → false
 */
export function isCompanyEmailDomain(email: string): boolean {
  const kind = classifyEmailDomain(email);
  if (kind === "invalid" || kind === "personal") return false;
  if (kind === "company") return true;
  /* platform: 허용 목록에 있으면 사내 기업 메일로 인정 */
  return isDomainOnCompanyAllowlist(email);
}

/**
 * 비즈니스 메일(Track A / 회사 OTP)로 쓸 수 있는지 — 실패 시 한글 메시지 throw
 */
export function assertBusinessEmailEligible(emailRaw: string): string {
  const email = normalizeBusinessEmail(emailRaw);
  if (!isValidEmailShape(email)) {
    throw new Error("올바른 이메일 주소를 입력해 주세요.");
  }
  const kind = classifyEmailDomain(email);
  if (kind === "personal") {
    throw new Error(
      "개인용 메일(Gmail·네이버 등)은 기업 메일로 사용할 수 없습니다. 회사 도메인 메일을 입력해 주세요."
    );
  }
  if (kind === "platform" && !isDomainOnCompanyAllowlist(email)) {
    throw new Error(
      `@${getPlatformEmailDomain()} 가상메일 주소는 기업 메일로 등록할 수 없습니다. 회사 도메인 메일 또는 허용된 사내 도메인을 사용해 주세요.`
    );
  }
  if (!isCompanyEmailDomain(email)) {
    throw new Error("기업 메일로 인식되지 않는 도메인입니다. 관리자에게 도메인 허용 목록 등록을 요청해 주세요.");
  }
  return email;
}

/** 가상 ID 제안용 — 개인 메일은 로컬만, 기업/허용 도메인은 local_도메인첫마디 */
export function suggestHandleBaseFromEmail(emailRaw: string): string | null {
  const email = normalizeBusinessEmail(emailRaw);
  if (!isValidEmailShape(email)) return null;
  const [local, domain] = email.split("@");
  if (!local || !domain) return null;

  const base = isPersonalEmailDomain(domain)
    ? local.replace(/[^a-z0-9_]/g, "")
    : `${local}_${domain.split(".")[0]}`.replace(/[^a-z0-9_]/g, "");

  const trimmed = (base.length < 3 ? `${base}vl` : base).slice(0, 20);
  return trimmed || null;
}
