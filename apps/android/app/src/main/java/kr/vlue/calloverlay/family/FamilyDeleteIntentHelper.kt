package kr.vlue.calloverlay.family

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings

/** ACTION_DELETE_PACKAGE — 사용자 확인 후 앱 제거 */
object FamilyDeleteIntentHelper {
    fun launchDeletePackage(context: Context, packageName: String): Boolean {
        val pkg = packageName.trim()
        if (pkg.isEmpty()) return false
        return try {
            val intent = Intent(Intent.ACTION_DELETE).apply {
                data = Uri.parse("package:$pkg")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            true
        } catch (_: Exception) {
            try {
                val fallback = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.parse("package:$pkg")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(fallback)
                true
            } catch (_: Exception) {
                false
            }
        }
    }
}
