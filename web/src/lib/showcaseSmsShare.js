/**
 * 본인 VLUE 쇼케이스를 지인 번호로 문자 전달할 때 쓰는 링크·본문
 */

import { buildPublicShowcaseUrl } from "./vlueViralLinks.js";
import { readLetteringFixedIdentity } from "./letteringBizcardStorage.js";
import { toKoreaNationalDigits } from "./letteringPhoneMatch.js";

export function buildShowcaseSmsBody(ownerPhone = "") {
  const url = buildPublicShowcaseUrl(ownerPhone);
  return [
    "[VLUE]",
    "인증 디지털 쇼케이스입니다.",
    "공식 주소 m.vlue.kr",
    "",
    url
  ].join("\n");
}

export function ownerShowcasePhone() {
  return String(readLetteringFixedIdentity().phone || "").trim();
}

/**
 * 기본 문자 앱을 열고 수신자·본문을 미리 채운다. 전송은 사용자가 한 번 누른다.
 * @param {string} toPhone
 */
export function openShowcaseSmsCompose(toPhone) {
  const to = toKoreaNationalDigits(toPhone) || String(toPhone || "").replace(/\D/g, "");
  const body = buildShowcaseSmsBody(ownerShowcasePhone());
  if (!to) return { ok: false, error: "수신 번호가 없습니다." };

  try {
    if (typeof window !== "undefined" && typeof window.Android?.openShowcaseSms === "function") {
      window.Android.openShowcaseSms(to);
      return { ok: true, channel: "android_bridge" };
    }
    if (typeof window !== "undefined" && typeof window.VlueLettering?.openShowcaseSms === "function") {
      window.VlueLettering.openShowcaseSms(to);
      return { ok: true, channel: "vlue_lettering" };
    }
  } catch {
    /* fall through to sms: URI */
  }

  const encoded = encodeURIComponent(body);
  const href = /iPhone|iPad|iPod/i.test(typeof navigator !== "undefined" ? navigator.userAgent : "")
    ? `sms:${to}&body=${encoded}`
    : `sms:${to}?body=${encoded}`;
  if (typeof window !== "undefined") {
    window.location.href = href;
  }
  return { ok: true, channel: "sms_uri" };
}

export function syncMemberIdentityToNative() {
  if (typeof window === "undefined") return;
  const phone = ownerShowcasePhone();
  try {
    window.Android?.syncMemberPhone?.(phone);
  } catch {
    /* ignore */
  }
  try {
    window.VlueLettering?.syncMemberPhone?.(phone);
  } catch {
    /* ignore */
  }
}
