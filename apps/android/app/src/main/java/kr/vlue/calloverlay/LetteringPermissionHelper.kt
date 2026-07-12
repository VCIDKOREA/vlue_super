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
                Manifest.permission.READ_CONTACTS,
                Manifest.permission.CAMERA,
                Manifest.permission.ACCESS_COARSE_LOCATION,
                Manifest.permission.ACCESS_FINE_LOCATION
            )
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                base.add(Manifest.permission.READ_MEDIA_IMAGES)
            } else {
                base.add(Manifest.permission.READ_EXTERNAL_STORAGE)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                base.add(Manifest.permission.ANSWER_PHONE_CALLS)
            }
            return base.toTypedArray()
        }

    fun hasPermission(context: Context, permission: String): Boolean =
        ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED

    fun hasPhonePermissions(context: Context): Boolean =
        REQUIRED.all { hasPermission(context, it) }

    fun canDrawOverlays(context: Context): Boolean =
        Settings.canDrawOverlays(context)

    fun allGranted(context: Context): Boolean =
        hasPhonePermissions(context) && canDrawOverlays(context)

    fun hasContacts(context: Context): Boolean =
        hasPermission(context, Manifest.permission.READ_CONTACTS)

    fun hasCamera(context: Context): Boolean =
        hasPermission(context, Manifest.permission.CAMERA)

    fun hasPhotos(context: Context): Boolean =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            hasPermission(context, Manifest.permission.READ_MEDIA_IMAGES)
        } else {
            hasPermission(context, Manifest.permission.READ_EXTERNAL_STORAGE)
        }

    fun hasLocation(context: Context): Boolean =
        hasPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ||
            hasPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION)

    /** 웹 모달 결과 표시용 */
    fun statusJson(context: Context): String {
        val o = org.json.JSONObject()
        o.put("contacts", hasContacts(context))
        o.put("camera", hasCamera(context))
        o.put("photos", hasPhotos(context))
        o.put("location", hasLocation(context))
        o.put("overlay", canDrawOverlays(context))
        o.put("allRuntime", hasPhonePermissions(context))
        return o.toString()
    }

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
