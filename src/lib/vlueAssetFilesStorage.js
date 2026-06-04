export const ASSET_FILES_CHANGED = "vlue-files-updated";
export const OFFICE_EMAIL_INBOX_CHANGED = "vlue-office-email-inbox";
export const OFFICE_PPT_TASKS_CHANGED = "vlue-office-ppt-tasks";

export function emitAssetFilesChanged() {
  window.dispatchEvent(new Event(ASSET_FILES_CHANGED));
}

export function emitOfficeEmailInboxChanged() {
  window.dispatchEvent(new Event(OFFICE_EMAIL_INBOX_CHANGED));
}

export function emitOfficePptTasksChanged() {
  window.dispatchEvent(new Event(OFFICE_PPT_TASKS_CHANGED));
}

/**
 * API asset_files → Wallet UI shape
 * @param {Array<{ id, fileName, fileUrl, contentType, createdAt }>} files
 */
export function mapOfficeFilesForUi(files) {
  return (files || []).map((f) => ({
    id: f.id,
    name: f.fileName || f.file_name || "문서.pdf",
    fileUrl: f.fileUrl || f.file_url || "",
    contentType: f.contentType || f.content_type || "application/pdf",
    createdAt: f.createdAt || f.created_at || ""
  }));
}
