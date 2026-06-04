import { apiUrl } from "./apiBase.js";
import { vlueAuthFetch, vlueAuthHeaders } from "./vlueAuthHeaders.js";
import {
  createGroupCalendarEvent as createGroupCalendarEventUnified,
  listGroupCalendarEvents
} from "./calendarApi.js";

/** @deprecated `calendarApi.createGroupCalendarEvent(groupId, body)` 사용 */
export async function createGroupCalendarEvent(payload) {
  const groupId = String(payload?.groupId || "").trim();
  if (!groupId) throw new Error("groupId is required");
  const { groupId: _g, ...body } = payload;
  return createGroupCalendarEventUnified(groupId, body);
}

export { listGroupCalendarEvents };

export async function uploadShopMediaCampaign({ files, title, shopId }) {
  const form = new FormData();
  if (title) form.append("title", title);
  if (shopId) form.append("shopId", shopId);
  files.forEach((file, i) => form.append(`image${i}`, file));
  const res = await vlueAuthFetch(apiUrl("/api/office/media/upload"), {
    method: "POST",
    headers: vlueAuthHeaders(),
    body: form
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}
