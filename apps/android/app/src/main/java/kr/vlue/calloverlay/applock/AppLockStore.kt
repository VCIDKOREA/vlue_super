package kr.vlue.calloverlay.applock

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import java.security.MessageDigest
import java.security.SecureRandom

/**
 * PIN · 앱 잠금 설정 저장소.
 * - PIN 원문은 저장하지 않음 (salt + SHA-256)
 * - EncryptedSharedPreferences 로 추가 보호
 * - 향후: biometricEnabled / lastAuthAtMs (24h 강제) 확장용 키 예약
 */
object AppLockStore {
    private const val PREFS = "vlue_app_lock_v1"
    private const val KEY_PIN_HASH = "pin_hash"
    private const val KEY_PIN_SALT = "pin_salt"
    private const val KEY_LOCK_ENABLED = "app_lock_enabled"
    private const val KEY_FAIL_COUNT = "fail_count"
    private const val KEY_REQUIRES_RESET = "requires_identity_reset"
    /** 예약: 생체 사용 여부 (V2+) */
    private const val KEY_BIOMETRIC_ENABLED = "biometric_enabled"
    /** 예약: 마지막 성공 인증 시각 (24h 정책용) */
    private const val KEY_LAST_AUTH_AT_MS = "last_auth_at_ms"

    const val MAX_FAILS = 5
    const val PIN_LENGTH = 6

    @Volatile
    private var prefs: SharedPreferences? = null

    fun init(context: Context) {
        if (prefs != null) return
        synchronized(this) {
            if (prefs != null) return
            prefs = try {
                val masterKey = MasterKey.Builder(context.applicationContext)
                    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                    .build()
                EncryptedSharedPreferences.create(
                    context.applicationContext,
                    PREFS,
                    masterKey,
                    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
                )
            } catch (e: Exception) {
                // 암호화 prefs 실패 시 일반 prefs (기기 제한 환경) — 해시는 그대로
                context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            }
        }
    }

    private fun p(): SharedPreferences =
        prefs ?: throw IllegalStateException("AppLockStore.init() required")

    fun hasPin(): Boolean = !p().getString(KEY_PIN_HASH, null).isNullOrBlank()

    fun isAppLockEnabled(): Boolean = p().getBoolean(KEY_LOCK_ENABLED, false)

    fun setAppLockEnabled(enabled: Boolean) {
        p().edit().putBoolean(KEY_LOCK_ENABLED, enabled).apply()
    }

    fun getFailCount(): Int = p().getInt(KEY_FAIL_COUNT, 0)

    fun requiresIdentityReset(): Boolean = p().getBoolean(KEY_REQUIRES_RESET, false)

    fun setRequiresIdentityReset(value: Boolean) {
        p().edit().putBoolean(KEY_REQUIRES_RESET, value).apply()
    }

    fun isBiometricEnabled(): Boolean = p().getBoolean(KEY_BIOMETRIC_ENABLED, false)

    fun setBiometricEnabled(enabled: Boolean) {
        p().edit().putBoolean(KEY_BIOMETRIC_ENABLED, enabled).apply()
    }

    fun getLastAuthAtMs(): Long = p().getLong(KEY_LAST_AUTH_AT_MS, 0L)

    fun markAuthSuccessNow() {
        p().edit()
            .putLong(KEY_LAST_AUTH_AT_MS, System.currentTimeMillis())
            .putInt(KEY_FAIL_COUNT, 0)
            .apply()
    }

    fun setPin(pin: String) {
        require(pin.length == PIN_LENGTH && pin.all { it.isDigit() }) { "PIN must be 6 digits" }
        val salt = ByteArray(16).also { SecureRandom().nextBytes(it) }
        val hash = hashPin(pin, salt)
        p().edit()
            .putString(KEY_PIN_SALT, salt.toHex())
            .putString(KEY_PIN_HASH, hash)
            .putInt(KEY_FAIL_COUNT, 0)
            .putBoolean(KEY_REQUIRES_RESET, false)
            .apply()
    }

    fun verifyPin(pin: String): Boolean {
        if (pin.length != PIN_LENGTH) return false
        val saltHex = p().getString(KEY_PIN_SALT, null) ?: return false
        val expected = p().getString(KEY_PIN_HASH, null) ?: return false
        val salt = saltHex.fromHex() ?: return false
        return hashPin(pin, salt) == expected
    }

    fun recordFailure(): Int {
        val next = getFailCount() + 1
        val ed = p().edit().putInt(KEY_FAIL_COUNT, next)
        if (next >= MAX_FAILS) {
            ed.putBoolean(KEY_REQUIRES_RESET, true)
        }
        ed.apply()
        return next
    }

    fun clearFailures() {
        p().edit().putInt(KEY_FAIL_COUNT, 0).apply()
    }

    fun clearPinKeepLockFlag() {
        p().edit()
            .remove(KEY_PIN_HASH)
            .remove(KEY_PIN_SALT)
            .putInt(KEY_FAIL_COUNT, 0)
            .putBoolean(KEY_REQUIRES_RESET, false)
            .apply()
    }

    fun statusJson(): String {
        val o = org.json.JSONObject()
        o.put("hasPin", hasPin())
        o.put("appLockEnabled", isAppLockEnabled())
        o.put("failCount", getFailCount())
        o.put("maxFails", MAX_FAILS)
        o.put("requiresIdentityReset", requiresIdentityReset())
        o.put("biometricEnabled", isBiometricEnabled())
        o.put("lastAuthAtMs", getLastAuthAtMs())
        o.put("pinLength", PIN_LENGTH)
        o.put("native", true)
        o.put("version", 1)
        return o.toString()
    }

    private fun hashPin(pin: String, salt: ByteArray): String {
        val md = MessageDigest.getInstance("SHA-256")
        md.update(salt)
        md.update(pin.toByteArray(Charsets.UTF_8))
        return md.digest().toHex()
    }

    private fun ByteArray.toHex(): String = joinToString("") { "%02x".format(it) }

    private fun String.fromHex(): ByteArray? = try {
        chunked(2).map { it.toInt(16).toByte() }.toByteArray()
    } catch (_: Exception) {
        null
    }
}
