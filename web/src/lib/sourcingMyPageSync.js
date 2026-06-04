import { addMyPagePost } from "./pageProfileStorage.js";
import { SHOP_OWNER_POSTED } from "./shopPushStorage.js";

export function buildMyPageCaptionFromSourcing(form) {
  const tags = (form.hashtags || []).map((t) => `#${String(t).replace(/^#+/, "")}`).join(" ");
  const parts = [form.title?.trim(), form.description?.trim(), tags].filter(Boolean);
  return parts.join("\n\n").slice(0, 2200);
}

/** @returns {{ ok: true } | { ok: false, reason: string }} */
export function publishSourcingToMyPage(form, { shopName = "VLUE PAGE", ownerKey = "" } = {}) {
  const caption = buildMyPageCaptionFromSourcing(form);
  let previewUrl = "";
  let type = "image";
  let videoUrl = "";

  if (form.listingType === "media_single" && form.mediaPrimary?.url) {
    previewUrl = form.mediaPrimary.url;
    type = form.mediaPrimary.type === "video" ? "video" : "image";
    if (type === "video") videoUrl = form.mediaPrimary.url;
  } else if (form.previews?.[0]) {
    previewUrl = form.previews[0];
    type = "image";
  } else if (form.inlineItem?.imageUrl) {
    previewUrl = form.inlineItem.imageUrl;
    type = "image";
  } else {
    return { ok: false, reason: "no_media" };
  }

  const post = {
    id: `mp-${Date.now()}`,
    previewUrl,
    caption,
    type,
    createdAt: new Date().toISOString(),
    linkedProductTitle: form.title?.trim() || "",
    source: "sourcing"
  };
  if (videoUrl) post.videoUrl = videoUrl;
  if (form.mediaPrimary?.posterUrl) post.posterUrl = form.mediaPrimary.posterUrl;

  addMyPagePost(post);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(SHOP_OWNER_POSTED, {
        detail: {
          ownerKey,
          title: caption.slice(0, 40) || form.title || "새 게시물",
          shopName,
          source: "sourcing"
        }
      })
    );
  }
  return { ok: true };
}
