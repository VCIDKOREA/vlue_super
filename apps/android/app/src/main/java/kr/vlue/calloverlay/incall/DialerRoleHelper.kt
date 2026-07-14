package kr.vlue.calloverlay.incall

import android.app.Activity
import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.telecom.TelecomManager
import androidx.activity.result.ActivityResultLauncher

/** ROLE_DIALER — InCallService DTMF/종료 제어에 필요 */
object DialerRoleHelper {
    const val REQUEST_DIALER_ROLE = 48101

    fun isDefaultDialer(context: Context): Boolean {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val rm = context.getSystemService(RoleManager::class.java) ?: return false
                rm.isRoleHeld(RoleManager.ROLE_DIALER)
            } else {
                val telecom = context.getSystemService(TelecomManager::class.java) ?: return false
                @Suppress("DEPRECATION")
                telecom.defaultDialerPackage == context.packageName
            }
        } catch (_: Exception) {
            false
        }
    }

    fun isDialerRoleAvailable(context: Context): Boolean {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val rm = context.getSystemService(RoleManager::class.java) ?: return false
                rm.isRoleAvailable(RoleManager.ROLE_DIALER)
            } else {
                true
            }
        } catch (_: Exception) {
            false
        }
    }

    /** Activity.startActivityForResult 방식 */
    fun requestDefaultDialer(activity: Activity) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val rm = activity.getSystemService(RoleManager::class.java) ?: return
                if (!rm.isRoleAvailable(RoleManager.ROLE_DIALER) || rm.isRoleHeld(RoleManager.ROLE_DIALER)) {
                    return
                }
                activity.startActivityForResult(
                    rm.createRequestRoleIntent(RoleManager.ROLE_DIALER),
                    REQUEST_DIALER_ROLE
                )
            } else {
                val intent = Intent(TelecomManager.ACTION_CHANGE_DEFAULT_DIALER).apply {
                    putExtra(TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME, activity.packageName)
                }
                activity.startActivity(intent)
            }
        } catch (_: Exception) {
            /* ignore */
        }
    }

    fun requestDefaultDialer(launcher: ActivityResultLauncher<Intent>, context: Context) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val rm = context.getSystemService(RoleManager::class.java) ?: return
                if (!rm.isRoleAvailable(RoleManager.ROLE_DIALER) || rm.isRoleHeld(RoleManager.ROLE_DIALER)) {
                    return
                }
                launcher.launch(rm.createRequestRoleIntent(RoleManager.ROLE_DIALER))
            } else if (context is Activity) {
                requestDefaultDialer(context)
            }
        } catch (_: Exception) {
            /* ignore */
        }
    }
}
