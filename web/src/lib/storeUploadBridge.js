export const STORE_UPLOAD_OPEN = "vlue:store-upload-open";

export function requestStoreUpload() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(STORE_UPLOAD_OPEN));
}
