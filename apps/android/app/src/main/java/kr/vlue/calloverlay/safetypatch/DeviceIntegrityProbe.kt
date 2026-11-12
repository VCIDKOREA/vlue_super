package kr.vlue.calloverlay.safetypatch

import android.content.Context
import android.os.Build
import kr.vlue.calloverlay.LetteringPermissionHelper
import org.json.JSONObject
import java.io.File

/**
 * 안심패치 시점의 설치원·에뮬레이터·루팅 징후.
 * 탐지만 하고, 권한 상승이나 우회는 하지 않는다.
 */
object DeviceIntegrityProbe {
    const val PLAY_STORE = "com.android.vending"

    data class Verdict(
        val installerPackageName: String?,
        val playStoreInstall: Boolean,
        val emulator: Boolean,
        val rooted: Boolean
    ) {
        val clean: Boolean get() = playStoreInstall && !emulator && !rooted

        fun toJson(): JSONObject = JSONObject().apply {
            put("installerPackageName", installerPackageName ?: JSONObject.NULL)
            put("playStoreInstall", playStoreInstall)
            put("emulator", emulator)
            put("rooted", rooted)
        }
    }

    fun inspect(context: Context): Verdict {
        val installer = LetteringPermissionHelper.installerPackage(context)
        return classify(
            installer = installer,
            fingerprint = Build.FINGERPRINT.orEmpty(),
            model = Build.MODEL.orEmpty(),
            manufacturer = Build.MANUFACTURER.orEmpty(),
            brand = Build.BRAND.orEmpty(),
            device = Build.DEVICE.orEmpty(),
            hardware = Build.HARDWARE.orEmpty(),
            product = Build.PRODUCT.orEmpty(),
            tags = Build.TAGS.orEmpty(),
            suPresent = suBinaryPresent() || magiskPresent(),
            emulatorHint = qemuProperty()
        )
    }

    fun classify(
        installer: String?,
        fingerprint: String,
        model: String,
        manufacturer: String,
        brand: String,
        device: String,
        hardware: String,
        product: String,
        tags: String,
        suPresent: Boolean,
        emulatorHint: Boolean = false
    ): Verdict {
        val installerName = installer?.trim()?.ifBlank { null }
        val play = installerName.equals(PLAY_STORE, ignoreCase = true)
        return Verdict(
            installerPackageName = installerName,
            playStoreInstall = play,
            emulator = emulatorHint || looksLikeEmulator(
                fingerprint, model, manufacturer, brand, device, hardware, product
            ),
            rooted = suPresent || tags.contains("test-keys", ignoreCase = true)
        )
    }

    internal fun looksLikeEmulator(
        fingerprint: String,
        model: String,
        manufacturer: String,
        brand: String,
        device: String,
        hardware: String,
        product: String
    ): Boolean {
        val fp = fingerprint.lowercase()
        val mdl = model.lowercase()
        val maker = manufacturer.lowercase()
        val br = brand.lowercase()
        val dev = device.lowercase()
        val hw = hardware.lowercase()
        val prod = product.lowercase()
        if (fp.startsWith("generic") || fp.startsWith("unknown")) return true
        if (mdl.contains("google_sdk") || mdl.contains("emulator") || mdl.contains("android sdk built for")) return true
        if (maker.contains("genymotion")) return true
        if (br.startsWith("generic") && dev.startsWith("generic")) return true
        if (hw == "goldfish" || hw == "ranchu" || hw.contains("vbox") || hw.contains("nox")) return true
        if (prod == "sdk" || prod == "google_sdk" || prod == "sdk_x86" || prod == "vbox86p" ||
            prod.contains("sdk_gphone") || prod.contains("emulator") || prod.contains("simulator")
        ) {
            return true
        }
        return false
    }

    private fun suBinaryPresent(): Boolean {
        val paths = arrayOf(
            "/system/bin/su",
            "/system/xbin/su",
            "/sbin/su",
            "/system/app/Superuser.apk",
            "/system/bin/.ext/su",
            "/data/local/su",
            "/data/local/bin/su",
            "/data/local/xbin/su"
        )
        return paths.any { path ->
            try {
                File(path).exists()
            } catch (_: Throwable) {
                false
            }
        }
    }

    private fun magiskPresent(): Boolean {
        val paths = arrayOf("/sbin/.magisk", "/data/adb/magisk", "/data/adb/modules")
        return paths.any { path ->
            try {
                File(path).exists()
            } catch (_: Throwable) {
                false
            }
        }
    }

    private fun qemuProperty(): Boolean {
        return try {
            val clazz = Class.forName("android.os.SystemProperties")
            val get = clazz.getMethod("get", String::class.java)
            val qemu = get.invoke(null, "ro.kernel.qemu") as? String
            qemu == "1"
        } catch (_: Throwable) {
            false
        }
    }
}
