import type { BizcardClassicSnapshot } from "./bizcardClassicSpec.js";
import { getVluePublicOrigin } from "./bizcardPublicUrls.js";

const VLUE_VIRAL_NOTE =
  "https://www.vlue.kr (위조 불가능한 디지털 인증명함 VLUE에서 발급됨)";

function escVcf(s: string) {
  return String(s || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** vCard 3.0 — 주소록 즉시 저장 */
export function buildBizcardVcf(snapshot: BizcardClassicSnapshot, cardId: string) {
  const name = snapshot.name || "VLUE";
  const org = snapshot.organization || "";
  const title = [snapshot.title, snapshot.department].filter(Boolean).join(" · ");
  const phone = (snapshot.phone || "").replace(/\s/g, "");
  const email = snapshot.email || "";
  const web = (snapshot.website || "").replace(/^https?:\/\//i, "");
  const origin = getVluePublicOrigin();
  const photoUrl = `${origin}/api/v1/card/thumb/${encodeURIComponent(cardId)}.png`;

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "CHARSET=UTF-8",
    `FN:${escVcf(name)}`,
    `N:${escVcf(name)};;;;`,
    org ? `ORG:${escVcf(org)}` : "",
    title ? `TITLE:${escVcf(title)}` : "",
    phone ? `TEL;TYPE=CELL:${phone}` : "",
    email ? `EMAIL;TYPE=INTERNET:${escVcf(email)}` : "",
    web ? `URL:${escVcf(web.startsWith("http") ? web : `https://${web}`)}` : "",
    `URL;TYPE=VLUE:${origin}`,
    `NOTE:${escVcf(VLUE_VIRAL_NOTE)}`,
    `SOURCE:${escVcf(`VLUE Card ${cardId}`)}`,
    `PHOTO;VALUE=URI:${photoUrl}`,
    "END:VCARD"
  ].filter(Boolean);

  return `${lines.join("\r\n")}\r\n`;
}
