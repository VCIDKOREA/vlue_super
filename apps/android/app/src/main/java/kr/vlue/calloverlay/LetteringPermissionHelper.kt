package kr.vlue.calloverlay

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

object LetteringPermissionHelper {
    val REQUIRED: Array<String>
        get() {
            val base = mutableListOf(
                Manifest.permission.READ_PHONE_STATE,
                Manifest.permission.READ_CALL_LOG,
                Manifest.permission.READ_CONTACTS
            )
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                base.add(Manifest.permission.ANSWER_PHONE_CALLS)
            }
            return base.toTypedArray()
        }

    fun hasPhonePermissions(context: Context): Boolean =
        REQUIRED.all {
            ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED
        }

    fun canDrawOverlays(context: Context): Boolean =
        Settings.canDrawOverlays(context)

    fun allGranted(context: Context): Boolean =
        hasPhonePermissions(context) && canDrawOverlays(context)

    fun requestPhonePermissions(activity: Activity, requestCode: Int) {
        ActivityCompat.requestPermissions(activity, REQUIRED, requestCode)
    }

    fun openOverlaySettings(activity: Activity) {
        val intent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:${activity.packageName}")
        )
        activity.startActivity(intent)
    }

    fun openAppSettings(activity: Activity) {
        activity.startActivity(
            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:${activity.packageName}")
            }
        )
    }
}
