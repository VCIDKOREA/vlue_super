import { apiUrl } from "./apiBase.js";
import { isMaskedPhoneDisplay } from "./dccExposure.js";

/** vCard NOTE — DCC 연락처 저장 시그니처 */
export const VLUE_VCARD_NOTE = "Saved via VLUÉ Secure Digital Card";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function escVcf(s) {
  return String(s || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function asciiFilename(name) {
  const base = String(name || "contact")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\x20-\x7E]/g, "_");
  return base || "contact";
}

function scrubPlaceholder(value) {
  const s = String(value || "").trim();
  if (!s) return "";
  if (/입력할 수 있습니다\.?$/.test(s)) return "";
  return s;
}

/** DCC 앞면 카드 → vCard/네이티브 Insert 용 프로필 */
export function dccCardToContactProfile(card = {}) {
  const orgRaw = String(card.organization || card.companyName || "").trim();
  const organization = /^vlue$/i.test(orgRaw) ? "" : orgRaw;
  const name = String(card.legalName || card.name || card.displayName || "").trim();
  const title = String(card.title || card.jobTitle || "").trim();
  const department = String(card.department || "").trim();
  const phoneRaw = String(card.phone || card.landline || "").trim();
  const phone = isMaskedPhoneDisplay(phoneRaw) ? "" : phoneRaw;
  return {
    name,
    legalName: name,
    organization,
    title,
    department,
    phone,
    fax: scrubPlaceholder(card.fax),
    email: scrubPlaceholder(card.email),
    website: scrubPlaceholder(card.website || card.url),
    address: scrubPlaceholder(card.address)
  };
}

/** 채팅·지갑·DCC 스냅샷 → vCard 3.0 */
export function buildLocalContactVcf(profile) {
  const name = String(profile.name || profile.legalName || "VLUÉ").trim() || "VLUÉ";
  const org = String(profile.organization || "").trim();
  const title = [profile.title, profile.department].filter(Boolean).join(" · ");
  const phone = String(profile.phone || profile.landline || "").replace(/\s/g, "");
  const fax = String(profile.fax || "").replace(/\s/g, "");
  const email = String(profile.email || "").trim();
  const website = String(profile.website || profile.url || "").trim();
  const address = String(profile.address || "").trim();
  const extra = String(profile.introBack || profile.backNote || "").trim();
  const note = extra ? `${VLUE_VCARD_NOTE}\n${extra}` : VLUE_VCARD_NOTE;

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escVcf(name)}`,
    `N:${escVcf(name)};;;;`,
    org ? `ORG:${escVcf(org)}` : "",
    title ? `TITLE:${escVcf(title)}` : "",
    phone ? `TEL;TYPE=CELL:${phone}` : "",
    fax ? `TEL;TYPE=FAX,WORK:${fax}` : "",
    email ? `EMAIL;TYPE=INTERNET:${escVcf(email)}` : "",
    website ? `URL:${escVcf(website)}` : "",
    address ? `ADR;TYPE=WORK:;;${escVcf(address)};;;;` : "",
    `NOTE:${escVcf(note)}`,
    "END:VCARD"
  ].filter(Boolean);

  return `${lines.join("\r\n")}\r\n`;
}

function parseFilenameFromDisposition(header) {
  if (!header) return "";
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (star) {
    try {
      return decodeURIComponent(star[1]);
    } catch {
      /* ignore */
    }
  }
  const plain = /filename="([^"]+)"/i.exec(header);
  return plain ? plain[1] : "";
}

async function fetchServerVcf(digitalCardId) {
  const url = apiUrl(`/api/v1/card/vcf/${encodeURIComponent(digitalCardId)}`);
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(res.status === 404 ? "not_found" : "fetch_failed");
    err.status = res.status;
    throw err;
  }
  const vcf = await res.text();
  const filename =
    parseFilenameFromDisposition(res.headers.get("Content-Disposition")) ||
    `VLUÉ-${asciiFilename(digitalCardId)}.vcf`;
  return { vcf, filename };
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function tryNativeContactBridge(vcf, filename, profile = {}) {
  const payload = { vcf, filename };
  try {
    if (window.webkit?.messageHandlers?.vlueSaveContact?.postMessage) {
      window.webkit.messageHandlers.vlueSaveContact.postMessage(payload);
      return true;
    }
    /* Android — 연락처 앱 Insert 인텐트 (권장) */
    const android = window.Android || window.VlueAndroid;
    if (android?.saveContactProfile) {
      android.saveContactProfile(
        JSON.stringify({
          name: profile.name || profile.legalName || "",
          organization: profile.organization || "",
          title: [profile.title, profile.department].filter(Boolean).join(" · "),
          phone: profile.phone || profile.landline || "",
          fax: profile.fax || "",
          email: profile.email || "",
          website: profile.website || "",
          address: profile.address || ""
        })
      );
      return true;
    }
    if (android?.saveContact) {
      android.saveContact(vcf, filename);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * 받은 명함 → 휴대폰 연락처 저장 (.vcf)
 * digitalCardId 있으면 서버 VCF, 없으면 로컬 생성
 */
export async function saveProfileToDeviceContacts(profile) {
  const p = profile && typeof profile === "object" ? profile : {};
  const digitalCardId = String(p.digitalCardId || p.digital_card_id || "").trim();

  let vcf;
  let filename;

  if (digitalCardId && UUID_RE.test(digitalCardId)) {
    try {
      const fetched = await fetchServerVcf(digitalCardId);
      vcf = fetched.vcf;
      filename = fetched.filename;
    } catch (e) {
      if (e?.status === 404) {
        return { ok: false, error: "서버에 등록된 디지털 명함이 없습니다. 지갑에 다시 저장해 주세요." };
      }
      vcf = buildLocalContactVcf(p);
      filename = `VLUÉ-${asciiFilename(p.name)}.vcf`;
    }
  } else {
    if (!p.name && !p.phone && !p.email) {
      return { ok: false, error: "저장할 연락처 정보가 없습니다." };
    }
    vcf = buildLocalContactVcf(p);
    filename = `VLUÉ-${asciiFilename(p.name)}.vcf`;
  }

  if (tryNativeContactBridge(vcf, filename, p)) {
    return { ok: true, method: "native" };
  }

  const blob = new Blob([vcf], { type: "text/vcard;charset=utf-8" });
  const file = new File([blob], filename, { type: "text/vcard" });

  try {
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: filename });
      return { ok: true, method: "share" };
    }
  } catch (e) {
    if (e?.name === "AbortError") return { ok: false, cancelled: true };
  }

  triggerDownload(blob, filename);
  return { ok: true, method: "download" };
}

/**
 * DCC 앞면 「연락처 저장」.
 * 로컬 vCard 3.0을 만들고, 앱 웹뷰면 순정 주소록 Insert, 아니면 .vcf 다운로드.
 */
export async function saveDccCardToDeviceContacts(card) {
  const p = dccCardToContactProfile(card || {});
  if (!p.name && !p.phone && !p.email && !p.organization) {
    return { ok: false, error: "저장할 연락처 정보가 없습니다." };
  }
  const vcf = buildLocalContactVcf(p);
  const filename = `VLUÉ-${asciiFilename(p.name || p.organization)}.vcf`;

  if (tryNativeContactBridge(vcf, filename, p)) {
    return { ok: true, method: "native" };
  }

  const blob = new Blob([vcf], { type: "text/vcard;charset=utf-8" });
  const file = new File([blob], filename, { type: "text/vcard" });

  try {
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: filename });
      return { ok: true, method: "share" };
    }
  } catch (e) {
    if (e?.name === "AbortError") return { ok: false, cancelled: true };
  }

  triggerDownload(blob, filename);
  return { ok: true, method: "download" };
}
