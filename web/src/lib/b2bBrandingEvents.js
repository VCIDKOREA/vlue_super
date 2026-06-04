export const B2B_BRANDING_CHANGED_EVENT = "vlue-b2b-branding-changed";

export function notifyB2bBrandingChanged(detail = {}) {
  try {
    window.dispatchEvent(
      new CustomEvent(B2B_BRANDING_CHANGED_EVENT, { detail })
    );
  } catch {
    /* ignore */
  }
}
