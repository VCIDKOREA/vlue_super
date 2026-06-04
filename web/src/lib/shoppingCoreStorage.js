const CAMPAIGN_META_KEY = "vlue_groupbuy_campaign_meta_v1";
const ACTIVE_CAMPAIGN_KEY = "vlue_active_groupbuy_campaign_id";
export const VAULT_CHANGED = "vlue-vault-changed";

export function readCampaignMetaMap() {
  try {
    const raw = localStorage.getItem(CAMPAIGN_META_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeCampaignMeta(campaignId, meta) {
  const map = readCampaignMetaMap();
  map[campaignId] = { ...meta, updatedAt: new Date().toISOString() };
  localStorage.setItem(CAMPAIGN_META_KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent("vlue-groupbuy-meta-changed"));
}

export function readCampaignMeta(campaignId) {
  if (!campaignId) return null;
  return readCampaignMetaMap()[campaignId] || null;
}

export function getActiveCampaignId() {
  try {
    return localStorage.getItem(ACTIVE_CAMPAIGN_KEY) || "";
  } catch {
    return "";
  }
}

export function setActiveCampaignId(id) {
  try {
    if (id) localStorage.setItem(ACTIVE_CAMPAIGN_KEY, String(id));
    else localStorage.removeItem(ACTIVE_CAMPAIGN_KEY);
  } catch {
    /* ignore */
  }
}

export function parseVaultPayload(row) {
  const raw = row?.payload_json ?? row?.payloadJson;
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function emitVaultChanged() {
  window.dispatchEvent(new CustomEvent(VAULT_CHANGED));
}
