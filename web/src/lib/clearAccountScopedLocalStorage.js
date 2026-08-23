/**
 * 계정 전환 시 이전 계정 로컬 프로필·명함·쇼케이스 잔여 제거.
 * remember-login · 기기 토큰은 기본 유지.
 */

const REMEMBER_KEYS = new Set([
  "vlue_remember_login",
  "vlue_saved_login_id",
  "vlue_saved_login_password"
]);

/** 기기·잠금 등 계정과 무관하게 유지 */
const KEEP_DEVICE_KEYS = new Set([
  "vlue_device_token",
  "vlue_device_contacts_cache_v1",
  "vlue_app_lock_pin_v1",
  "vlue_app_lock_enabled_v1",
  "vlue_runtime_permissions_v1",
  "vlue_device_avatar_scrub_brand_v5"
]);

const EXTRA_ACCOUNT_KEYS = [
  "membershipTier",
  "vcid",
  "myCardOrganization",
  "myCardDisplayName",
  "myCardPhone",
  "vlue_social_login_provider",
  "vlue_lettering_bizcard_v1",
  "vlue_lettering_logo_data_v1",
  "vlue_lettering_photo_data_v1",
  "vlue_lettering_cover_data_v1",
  "vlue_showcase_style_v1",
  "vlue_showcase_live_style_v1",
  "vlue_showcase_style_meta_v1",
  "vlue_digital_card_active",
  "vlue_digital_card_id",
  "vlue_birth_ymd",
  "vlue_auth_paid_at",
  "vlue_family_ward_role",
  "vlue_avatar_primary",
  "vlue_avatar_chat",
  "vlue_avatar_feed",
  "vlue_avatar_card",
  "vlue_avatar_unify_photo_v1",
  "vlue_feed_nickname",
  "vlue_company_locked",
  "vlue_member_handle",
  "vlue_server_user_id",
  "vlue_legal_name",
  "vlue_phone_e164",
  "vlue_account_status",
  "vlue_enterprise_role",
  "vlue_line_type",
  "vlue_membership_kind",
  "vlue_membership_tier"
];

/**
 * @param {{ keepRememberLogin?: boolean, keepOnboarding?: boolean }} [opts]
 */
export function clearAccountScopedLocalStorage(opts = {}) {
  const keepRemember = opts.keepRememberLogin !== false;
  const keepOnboarding = opts.keepOnboarding !== false;

  try {
    EXTRA_ACCOUNT_KEYS.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    });

    Object.keys(localStorage).forEach((k) => {
      if (!k.startsWith("vlue_")) return;
      if (keepRemember && REMEMBER_KEYS.has(k)) return;
      if (KEEP_DEVICE_KEYS.has(k)) return;
      if (keepOnboarding && k === "vlue_onboarding_complete_v1") return;
      try {
        localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    });

    try {
      window.dispatchEvent(new Event("vlue-avatar-changed"));
      window.dispatchEvent(new Event("vlue-lettering-bizcard-changed"));
      window.dispatchEvent(new CustomEvent("vlue-digital-card-changed"));
    } catch {
      /* ignore */
    }
  } catch {
    /* ignore */
  }
}
