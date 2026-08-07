package kr.vlue.calloverlay.diagnostics

import android.content.Context
import android.os.Build
import android.provider.Settings
import kr.vlue.calloverlay.BuildConfig
import kr.vlue.calloverlay.LetteringPrefs
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID
import java.util.concurrent.atomic.AtomicReference

/** Active diagnostics session metadata (one call = one BIG_PUSH session). */
data class ActiveDiagnosticSession(
    val id: String,
    val feature: String,
    val sessionKey: String,
    val startedAtMs: Long,
    val deviceModel: String,
    val androidVersion: String,
    val appVersion: String,
    val deviceId: String,
    val userId: String?,
    val phoneMasked: String?
) {
    fun elapsedMs(now: Long = System.currentTimeMillis()): Int =
        (now - startedAtMs).coerceAtLeast(0).toInt()

    fun toSessionJson(status: String = "RUNNING", lastStep: Int = 0): JSONObject =
        JSONObject().apply {
            put("id", id)
            put("feature", feature)
            put("sessionKey", sessionKey)
            put("status", status)
            put("startedAt", startedAtMs)
            put("deviceModel", deviceModel)
            put("androidVersion", androidVersion)
            put("appVersion", appVersion)
            put("deviceId", deviceId)
            if (!userId.isNullOrBlank()) put("userId", userId)
            if (!phoneMasked.isNullOrBlank()) put("phoneMasked", phoneMasked)
            put("lastStep", lastStep)
        }
}

object DiagnosticsSessionStore {
    private val active = AtomicReference<ActiveDiagnosticSession?>(null)

    fun current(): ActiveDiagnosticSession? = active.get()

    fun ensureSession(
        context: Context,
        feature: String = DiagnosticsFeature.BIG_PUSH,
        phoneRaw: String? = null
    ): ActiveDiagnosticSession {
        active.get()?.let { return it }
        val app = context.applicationContext
        val now = System.currentTimeMillis()
        val key = SimpleDateFormat("yyyyMMdd-HHmmss", Locale.US).format(Date(now)) +
            "-" + UUID.randomUUID().toString().take(6)
        val deviceId = try {
            Settings.Secure.getString(app.contentResolver, Settings.Secure.ANDROID_ID) ?: "unknown"
        } catch (_: Exception) {
            "unknown"
        }
        val session = ActiveDiagnosticSession(
            id = UUID.randomUUID().toString(),
            feature = feature,
            sessionKey = key,
            startedAtMs = now,
            deviceModel = Build.MODEL ?: "unknown",
            androidVersion = "${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})",
            appVersion = BuildConfig.VERSION_NAME,
            deviceId = deviceId,
            userId = LetteringPrefs.getUserId(app),
            phoneMasked = maskPhone(phoneRaw)
        )
        if (active.compareAndSet(null, session)) {
            DiagnosticsEventQueue.enqueueSession(app, session)
        }
        return active.get() ?: session
    }

    fun updatePhoneMasked(phoneRaw: String?) {
        val cur = active.get() ?: return
        val masked = maskPhone(phoneRaw) ?: return
        active.compareAndSet(cur, cur.copy(phoneMasked = masked))
    }

    fun endSession(context: Context, status: String = "OK") {
        val cur = active.getAndSet(null) ?: return
        DiagnosticsEventQueue.enqueueSession(
            context.applicationContext,
            cur,
            status = status,
            endedAtMs = System.currentTimeMillis()
        )
        DiagnosticsEventQueue.flushAsync(context.applicationContext)
    }

    fun maskPhone(raw: String?): String? {
        if (raw.isNullOrBlank() || raw.equals("unknown", ignoreCase = true) || raw.equals("null", ignoreCase = true)) {
            return null
        }
        val digits = raw.filter { it.isDigit() }
        if (digits.length < 4) return "****"
        val last4 = digits.takeLast(4)
        val prefix = when {
            digits.length >= 10 -> digits.take(3)
            else -> digits.take(2)
        }
        return "$prefix****$last4"
    }
}
