package kr.vlue.calloverlay

import android.content.Context
import android.util.Log
import java.security.MessageDigest

/**
 * 통화 오버레이 진단 전용. 상태 머신을 바꾸지 않고 Logcat 태그 VlueOverlayDebug 로만 남긴다.
 * adb logcat -s VlueOverlayDebug:I
 */
object OverlayDebugLog {
    const val TAG = "VlueOverlayDebug"
    private const val CHUNK = 3000

    fun console(level: String, message: String, source: String, line: Int) {
        raw("JS_$level", "$source:$line $message")
    }

    fun jsError(kind: String, detail: String) {
        raw("JS_UNCAUGHT", "$kind $detail")
    }

    fun asset(message: String) {
        raw("ASSET", message)
    }

    fun bridgeIn(method: String, payload: String) {
        raw("BRIDGE_IN", "$method $payload")
    }

    fun bridgeOut(channel: String, payload: String) {
        raw("BRIDGE_OUT", "$channel $payload")
    }

    fun page(message: String) {
        raw("PAGE", message)
    }

    /** APK assets/vlue-overlay 를 직접 열어 엔트리·JS 파일명·바이트·SHA-256 을 남긴다. */
    fun auditBundledAssets(context: Context) {
        try {
            val html = context.applicationContext.assets.open("vlue-overlay/overlay.html").use { it.readBytes() }
            val htmlText = html.toString(Charsets.UTF_8)
            val script = Regex("""src="([^"]+\.js)"""").find(htmlText)?.groupValues?.getOrNull(1).orEmpty()
            val css = Regex("""href="([^"]+\.css)"""").find(htmlText)?.groupValues?.getOrNull(1).orEmpty()
            asset(
                "AUDIT entry=vlue-overlay/overlay.html bytes=${html.size} sha256=${sha256(html)} " +
                    "script=$script css=$css"
            )
            for (urlPath in listOf(script, css)) {
                if (urlPath.isBlank()) continue
                val rel = urlPath.removePrefix("/vlue-overlay/").removePrefix("vlue-overlay/")
                val bytes = context.applicationContext.assets.open("vlue-overlay/$rel").use { it.readBytes() }
                asset("AUDIT file=vlue-overlay/$rel bytes=${bytes.size} sha256=${sha256(bytes)}")
            }
            val names = context.applicationContext.assets.list("vlue-overlay/assets")?.joinToString(",").orEmpty()
            asset("AUDIT dir=vlue-overlay/assets files=$names")
        } catch (e: Exception) {
            asset("AUDIT FAILED ${e.javaClass.simpleName}: ${e.message}")
        }
    }

    fun sha256(bytes: ByteArray): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(bytes)
        return digest.joinToString("") { "%02x".format(it) }
    }

    private fun raw(channel: String, body: String) {
        val text = body.replace("\n", "\\n")
        if (text.length <= CHUNK) {
            Log.i(TAG, "$channel ${text.length} $text")
            return
        }
        val parts = (text.length + CHUNK - 1) / CHUNK
        var offset = 0
        var index = 1
        while (offset < text.length) {
            val end = (offset + CHUNK).coerceAtMost(text.length)
            Log.i(TAG, "$channel [$index/$parts] ${text.substring(offset, end)}")
            offset = end
            index++
        }
    }
}
