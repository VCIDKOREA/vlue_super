/**
 * 계정 전환 시 이전 계정 로컬 프로필·명함·쇼케이스 잔여 제거.
 * remember-login · 기기 토큰은 기본 유지.
 *
 * IMPORTANT:
 * - 일반 로그아웃/같은 계정 재로그인은 content 를 지우면 안 됨 (서버 hydrate 실패 시 영구 유실).
 * - 다른 userId 로 로그인할 때만 full wipe.
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
  "vlue_device_avatar_scrub_brand_v5",
  "vlue_push_welcome_dismissed_v1",
  /** 마지막 로컬 콘텐츠 소유자 — 로그아웃 후에도 유지해 같은 계정 재로그인 시 wipe 방지 */
  "vlue_last_local_user_id"
]);

/** 쇼케이스·DCC·아바타 등 — 로그아웃해도 지우면 안 되는 키 */
const CONTENT_KEYS = new Set([
  "vlue_lettering_bizcard_v1",
  "vlue_lettering_logo_data_v1",
  "vlue_lettering_photo_data_v1",
  "vlue_lettering_cover_data_v1",
  "vlue_showcase_style_v1",
  "vlue_showcase_live_style_v1",
  "vlue_showcase_style_meta_v1",
  "vlue_showcase_live_source_v1",
  "vlue_digital_card_active",
  "vlue_digital_card_id",
  "vlue_dcc_broadcast_on",
  "vlue_avatar_primary",
  "vlue_avatar_chat",
  "vlue_avatar_feed",
  "vlue_avatar_card",
  "vlue_avatar_unify_photo_v1",
  "vlue_feed_nickname",
  "myCardOrganization",
  "myCardDisplayName",
  "myCardPhone",
  "membershipTier",
  "vcid",
  "vlue_membership_kind",
  "vlue_membership_tier",
  "vlue_company_locked",
  "vlue_mycase_live_broadcast_v1"
]);

const SESSION_IDENTITY_KEYS = [
  "vlue_server_user_id",
  "vlue_member_handle",
  "vlue_legal_name",
  "vlue_phone_e164",
  "vlue_account_status",
  "vlue_enterprise_role",
  "vlue_line_type",
  "vlue_social_login_provider",
  "vlue_birth_ymd",
  "vlue_auth_paid_at",
  "vlue_family_ward_role"
];

const EXTRA_ACCOUNT_KEYS = [
  ...SESSION_IDENTITY_KEYS,
  ...CONTENT_KEYS,
  "vlue_company_locked"
];

export function rememberLocalContentUserId(userId) {
  const id = String(userId || "").trim();
  if (!id) return;
  try {
    localStorage.setItem("vlue_last_local_user_id", id);
  } catch {
    /* ignore */
  }
}

export function readLastLocalContentUserId() {
  try {
    return String(localStorage.getItem("vlue_last_local_user_id") || "").trim();
  } catch {
    return "";
  }
}

/** 다른 계정으로 로그인할 때만 true — 같으면 콘텐츠 wipe 금지 */
export function shouldWipeLocalContentForUser(nextUserId) {
  const next = String(nextUserId || "").trim();
  if (!next) return false;
  const prev = readLastLocalContentUserId();
  if (!prev) return false;
  return prev !== next;
}

function dispatchContentCleared() {
  try {
    window.dispatchEvent(new Event("vlue-avatar-changed"));
    window.dispatchEvent(new Event("vlue-lettering-bizcard-changed"));
    window.dispatchEvent(new CustomEvent("vlue-digital-card-changed"));
    window.dispatchEvent(new CustomEvent("vlue-showcase-style-changed"));
  } catch {
    /* ignore */
  }
}

/**
 * 세션만 정리 — 쇼케이스/DCC/아바타 유지 (일반 로그아웃)
 * @param {{ keepRememberLogin?: boolean, keepOnboarding?: boolean }} [opts]
 */
export function clearSessionScopedLocalStorage(opts = {}) {
  const keepRemember = opts.keepRememberLogin !== false;
  const keepOnboarding = opts.keepOnboarding !== false;
  try {
    SESSION_IDENTITY_KEYS.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    });
    Object.keys(localStorage).forEach((k) => {
      if (!k.startsWith("vlue_")) return;
      if (CONTENT_KEYS.has(k)) return;
      if (keepRemember && REMEMBER_KEYS.has(k)) return;
      if (KEEP_DEVICE_KEYS.has(k)) return;
      if (k.startsWith("vlue_push_welcome_dismissed_v1")) return;
      if (keepOnboarding && k === "vlue_onboarding_complete_v1") return;
      /* access/refresh tokens are cleared elsewhere */
      if (k === "vlue_access_token" || k === "vlue_refresh_token") return;
      if (k === "vlue_logged_in" || k === "vlue_marketing_logged_in") return;
      try {
        localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    });
  } catch {
    /* ignore */
  }
}

/**
 * @param {{ keepRememberLogin?: boolean, keepOnboarding?: boolean, mode?: 'full'|'session' }} [opts]
 * mode=session: 로그아웃용 (콘텐츠 보존)
 * mode=full: 계정 전환·탈퇴·강제로그아웃 (콘텐츠 포함 삭제)
 */
export function clearAccountScopedLocalStorage(opts = {}) {
  const mode = opts.mode === "session" ? "session" : "full";
  if (mode === "session") {
    clearSessionScopedLocalStorage(opts);
    return;
  }

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
      if (k.startsWith("vlue_push_welcome_dismissed_v1")) return;
      if (keepOnboarding && k === "vlue_onboarding_complete_v1") return;
      try {
        localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    });

    dispatchContentCleared();
  } catch {
    /* ignore */
  }
}

/**
 * 로그인 직전 로컬 정리 — 같은 계정이면 콘텐츠 보존, 다른 계정이면 full wipe.
 * @param {string} nextUserId
 * @param {{ keepRememberLogin?: boolean, keepOnboarding?: boolean }} [opts]
 */
export function clearLocalStorageForLogin(nextUserId, opts = {}) {
  const id = String(nextUserId || "").trim();
  if (shouldWipeLocalContentForUser(id)) {
    clearAccountScopedLocalStorage({ ...opts, mode: "full" });
  } else {
    clearAccountScopedLocalStorage({ ...opts, mode: "session" });
  }
  if (id) rememberLocalContentUserId(id);
}
