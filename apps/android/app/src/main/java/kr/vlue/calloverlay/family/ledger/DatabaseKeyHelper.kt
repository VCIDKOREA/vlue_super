package kr.vlue.calloverlay.family.ledger

import android.content.Context
import android.util.Base64
import java.security.SecureRandom

/** SQLCipher passphrase — 기기별 32바이트 랜덤 키 (SharedPreferences 보관) */
object DatabaseKeyHelper {
    private const val PREFS = "vlue_db_crypto"
    private const val KEY_PASS = "sqlcipher_pass_b64"

    fun getOrCreatePassphrase(context: Context): ByteArray {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val existing = prefs.getString(KEY_PASS, null)
        if (!existing.isNullOrBlank()) {
            return Base64.decode(existing, Base64.NO_WRAP)
        }
        val pass = ByteArray(32).also { SecureRandom().nextBytes(it) }
        prefs.edit().putString(KEY_PASS, Base64.encodeToString(pass, Base64.NO_WRAP)).apply()
        return pass
    }
}
