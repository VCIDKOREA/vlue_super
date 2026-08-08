package kr.vlue.calloverlay

import android.Manifest
import android.app.Activity
import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Process
import android.provider.Settings
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject

object LetteringPermissionHelper {
    /** 통화 빅푸시·쇼케이스에 필수 (카메라·위치와 분리) */
    val CALL_DETECT: Array<String>
        get() {
            val base = mutableListOf(
                Manifest.permission.READ_PHONE_STATE,
                Manifest.permission.READ_CALL_LOG,
                Manifest.permission.READ_CONTACTS
            )
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                base.add(Manifest.permission.ANSWER_PHONE_CALLS)
                base.add(Manifest.permission.CALL_PHONE)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                base.add(Manifest.permission.POST_NOTIFICATIONS)
            }
            return base.toTypedArray()
        }

    /** 명함·쇼케이스·검색용 — 통화 오버레이 게이트에 쓰지 않음 */
    val MEDIA_OPTIONAL: Array<String>
        get() {
            val base = mutableListOf(
                Manifest.permission.CAMERA,
                Manifest.permission.ACCESS_COARSE_LOCATION,
                Manifest.permission.ACCESS_FINE_LOCATION
            )
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                base.add(Manifest.permission.READ_MEDIA_IMAGES)
            } else {
                base.add(Manifest.permission.READ_EXTERNAL_STORAGE)
            }
            return base.toTypedArray()
        }

    /** 권한 요청 다이얼로그용 — 통화 필수 + 선택 미디어 */
    val REQUIRED: Array<String>
        get() = (CALL_DETECT.toList() + MEDIA_OPTIONAL.toList()).distinct().toTypedArray()

    fun hasPermission(context: Context, permission: String): Boolean =
        ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED

    fun hasCallDetectPermissions(context: Context): Boolean =
        CALL_DETECT.all { hasPermission(context, it) }

    /** @deprecated 이름 호환 — 통화 감지 권한만 검사 */
    fun hasPhonePermissions(context: Context): Boolean = hasCallDetectPermissions(context)

    /**
     * Overlay attach 허용 SoT — Settings.canDrawOverlays 만 사용 (캐시 없음).
     * Samsung 사이드로드 APK는 통화 중 일시적으로 false 가 될 수 있다
     * (SamsungRestrictOverlayProcessor).
     */
    fun canDrawOverlays(context: Context): Boolean =
        Settings.canDrawOverlays(context.applicationContext)

    /** AppOps OP_SYSTEM_ALERT_WINDOW — Settings 와 교차검증용 (쓰기/setMode 없음) */
    fun overlayAppOpsMode(context: Context): Int {
        return try {
            val app = context.applicationContext
            val ops = app.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager
                ?: return AppOpsManager.MODE_DEFAULT
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ops.unsafeCheckOpNoThrow(
                    AppOpsManager.OPSTR_SYSTEM_ALERT_WINDOW,
                    Process.myUid(),
                    app.packageName
                )
            } else {
                @Suppress("DEPRECATION")
                ops.checkOpNoThrow(
                    AppOpsManager.OPSTR_SYSTEM_ALERT_WINDOW,
                    Process.myUid(),
                    app.packageName
                )
            }
        } catch (_: Throwable) {
            AppOpsManager.MODE_DEFAULT
        }
    }

    fun overlayAppOpsModeName(context: Context): String =
        when (overlayAppOpsMode(context)) {
            AppOpsManager.MODE_ALLOWED -> "MODE_ALLOWED"
            AppOpsManager.MODE_IGNORED -> "MODE_IGNORED"
            AppOpsManager.MODE_ERRORED -> "MODE_ERRORED"
            AppOpsManager.MODE_DEFAULT -> "MODE_DEFAULT"
            else -> "MODE_OTHER(${overlayAppOpsMode(context)})"
        }

    /**
     * Play/Galaxy/ADB 가 아닌 설치원(My Files 등)이면 Samsung 통화 중 Overlay 일시 차단 대상.
     * 앱이 권한을 끄는 것이 아니라 OEM 정책이다.
     */
    fun installerPackage(context: Context): String? {
        val app = context.applicationContext
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                app.packageManager.getInstallSourceInfo(app.packageName).installingPackageName
            } else {
                @Suppress("DEPRECATION")
                app.packageManager.getInstallerPackageName(app.packageName)
            }
        } catch (_: Throwable) {
            null
        }
    }

    fun isOfficialOrAdbInstall(context: Context): Boolean {
        val installer = installerPackage(context)?.lowercase().orEmpty()
        if (installer.isEmpty()) {
            /* ADB / Studio 설치는 installer null 인 경우가 많음 — Samsung 문서상 ADB 는 허용 */
            return true
        }
        return installer == "com.android.vending" ||
            installer == "com.sec.android.app.samsungapps" ||
            installer == "com.android.shell" ||
            installer.contains("adb") ||
            installer == "com.google.android.packageinstaller" ||
            installer == "com.samsung.android.packageinstaller"
    }

    fun isLikelySamsungCallOverlayRestricted(context: Context): Boolean {
        if (canDrawOverlays(context)) return false
        val manufacturer = Build.MANUFACTURER.orEmpty().lowercase()
        if (!manufacturer.contains("samsung")) return false
        return !isOfficialOrAdbInstall(context)
    }

    /** attach 직전 최종 게이트 — false 면 WindowManager.addView 호출 금지 */
    fun mayAttachOverlay(context: Context): Boolean = canDrawOverlays(context)

    /** 실제 통화 오버레이 동작 가능 여부 */
    fun hasCallOverlayReady(context: Context): Boolean =
        hasCallDetectPermissions(context) && canDrawOverlays(context)

    fun allGranted(context: Context): Boolean = hasCallOverlayReady(context)

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

    /** 웹 모달 결과 표시용 — Settings + AppOps + installer 동시 노출 */
    fun statusJson(context: Context): String {
        val o = JSONObject()
        o.put("contacts", hasContacts(context))
        o.put("camera", hasCamera(context))
        o.put("photos", hasPhotos(context))
        o.put("location", hasLocation(context))
        o.put("overlay", canDrawOverlays(context))
        o.put("overlayAppOps", overlayAppOpsModeName(context))
        o.put("overlayInstaller", installerPackage(context) ?: "null")
        o.put("overlayOfficialOrAdbInstall", isOfficialOrAdbInstall(context))
        o.put("overlaySamsungCallRestrictLikely", isLikelySamsungCallOverlayRestricted(context))
        o.put("callDetect", hasCallDetectPermissions(context))
        o.put("callOverlayReady", hasCallOverlayReady(context))
        o.put("allRuntime", hasCallDetectPermissions(context))
        o.put("letteringEnabled", LetteringPrefs.isLetteringEnabled(context))
        o.put("defaultDialer", kr.vlue.calloverlay.incall.DialerRoleHelper.isDefaultDialer(context))
        o.put("inCallBound", kr.vlue.calloverlay.incall.VlueInCallController.isDefaultDialerBound())
        o.put("lastCallEvent", LetteringPrefs.getLastCallEvent(context))
        o.put("lastOverlayError", LetteringPrefs.getLastOverlayError(context))
        o.put("readPhoneState", hasPermission(context, Manifest.permission.READ_PHONE_STATE))
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            o.put("postNotifications", hasPermission(context, Manifest.permission.POST_NOTIFICATIONS))
        }
        return o.toString()
    }

    fun requestPhonePermissions(activity: Activity, requestCode: Int) {
        ActivityCompat.requestPermissions(activity, CALL_DETECT, requestCode)
    }

    fun requestAllPermissions(activity: Activity, requestCode: Int) {
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
