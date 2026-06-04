import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";
import { normalizeLetteringBizcardTemplate } from "./letteringBizcardTemplates.js";

const DIGITAL_CARD_ID_KEY = "vlue_digital_card_id";

export function readStoredDigitalCardId() {
  try {
    return String(localStorage.getItem(DIGITAL_CARD_ID_KEY) || "").trim();
  } catch {
    return "";
  }
}

export function writeStoredDigitalCardId(cardId) {
  try {
    if (cardId) localStorage.setItem(DIGITAL_CARD_ID_KEY, String(cardId));
  } catch {
    /* ignore */
  }
}

/** 서버에서 디지털 명함 메타 (HTML 배포·검증·유효기간) */
export async function fetchDigitalCardMeta() {
  const cached = readStoredDigitalCardId();
  try {
    const res = await vlueAuthFetch(apiUrl("/api/cards/my-digital-card"), {
      headers: vlueAuthHeaders()
    });
    if (!res.ok) {
      return { cardId: cached || null, issuedAt: null, designTemplate: null, issued: false };
    }
    const data = await res.json();
    if (data?.cardId) writeStoredDigitalCardId(data.cardId);
    return {
      cardId: data?.cardId || cached || null,
      issuedAt: data?.issuedAt || null,
      designTemplate: data?.designTemplate || null,
      issued: Boolean(data?.issued)
    };
  } catch {
    return { cardId: cached || null, issuedAt: null, designTemplate: null, issued: false };
  }
}

/** 서버에서 디지털 명함 ID 확보 (HTML 배포·검증용) */
export async function ensureDigitalCardId() {
  const meta = await fetchDigitalCardMeta();
  return meta.cardId || null;
}

export async function syncDigitalCardDesignTemplate(templateId) {
  const tpl = normalizeLetteringBizcardTemplate(templateId);
  try {
    const res = await vlueAuthFetch(apiUrl("/api/cards/my-digital-card"), {
      method: "PATCH",
      headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ designTemplate: tpl })
    });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return { ok: true, designTemplate: data.designTemplate || tpl };
  } catch {
    return { ok: false };
  }
}

/** OG 썸네일·서버 렌더용 명함 스냅샷 동기화 */
export async function syncDigitalCardExportSnapshot(card) {
  try {
    const res = await vlueAuthFetch(apiUrl("/api/cards/my-digital-card"), {
      method: "PATCH",
      headers: { ...vlueAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        designTemplate: normalizeLetteringBizcardTemplate(card?.designTemplate),
        exportSnapshot: {
          organization: card.organization || "",
          name: card.name || card.displayName || "",
          title: card.title || "",
          department: card.department || "",
          phone: card.phone || "",
          email: card.email || "",
          address: card.address || "",
          website: card.website || "",
          logoUrl: card.logoUrl || "",
          designTemplate: normalizeLetteringBizcardTemplate(card?.designTemplate)
        }
      })
    });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    if (data?.cardId) writeStoredDigitalCardId(data.cardId);
    return { ok: true, cardId: data.cardId };
  } catch {
    return { ok: false };
  }
}
