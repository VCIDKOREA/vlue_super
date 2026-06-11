package kr.vlue.calloverlay.family.translate

import android.util.Log
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.TranslatorOptions
import kotlinx.coroutines.suspendCancellableCoroutine
import org.json.JSONObject
import kotlin.coroutines.resume

/** Google ML Kit Translation — 온디바이스 무료 */
object MlKitTranslate {
    private const val TAG = "MlKitTranslate"

    suspend fun translateJson(json: String): String {
        val o = try {
            JSONObject(json)
        } catch (e: Exception) {
            return emptyResult()
        }
        val text = o.optString("text", "").trim()
        val source = mapLang(o.optString("sourceLang", "ko"))
        val target = mapLang(o.optString("targetLang", "en"))
        if (text.isEmpty() || source == target) {
            return JSONObject()
                .put("translated", text)
                .put("confidence", if (text.isEmpty()) 0.0 else 1.0)
                .toString()
        }
        return translate(text, source, target)
    }

    private suspend fun translate(text: String, source: String, target: String): String =
        suspendCancellableCoroutine { cont ->
            val options = TranslatorOptions.Builder()
                .setSourceLanguage(source)
                .setTargetLanguage(target)
                .build()
            val translator = Translation.getClient(options)
            val conditions = DownloadConditions.Builder().build()
            translator.downloadModelIfNeeded(conditions)
                .addOnSuccessListener {
                    translator.translate(text)
                        .addOnSuccessListener { out ->
                            val translated = out.orEmpty().trim()
                            val confidence = estimateConfidence(text, translated)
                            translator.close()
                            cont.resume(
                                JSONObject()
                                    .put("translated", translated)
                                    .put("confidence", confidence)
                                    .toString()
                            )
                        }
                        .addOnFailureListener { e ->
                            Log.e(TAG, "translate failed", e)
                            translator.close()
                            cont.resume(emptyResult())
                        }
                }
                .addOnFailureListener { e ->
                    Log.e(TAG, "model download failed", e)
                    translator.close()
                    cont.resume(emptyResult())
                }
        }

    private fun mapLang(code: String): String = when (code.lowercase()) {
        "ko" -> TranslateLanguage.KOREAN
        "en" -> TranslateLanguage.ENGLISH
        "ja" -> TranslateLanguage.JAPANESE
        "zh" -> TranslateLanguage.CHINESE
        "vi" -> TranslateLanguage.VIETNAMESE
        else -> TranslateLanguage.ENGLISH
    }

    private fun estimateConfidence(src: String, out: String): Double {
        if (out.isEmpty()) return 0.0
        if (src == out) return 0.2
        val ratio = out.length.toDouble() / src.length.coerceAtLeast(1)
        return if (ratio < 0.2 || ratio > 4.0) 0.4 else 0.85
    }

    private fun emptyResult(): String =
        JSONObject().put("translated", "").put("confidence", 0.0).toString()
}
