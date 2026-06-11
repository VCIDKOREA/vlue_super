package kr.vlue.calloverlay.family.ocr

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Rect
import android.util.Base64
import android.util.Log
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions
import kotlinx.coroutines.suspendCancellableCoroutine
import org.json.JSONArray
import org.json.JSONObject
import kotlin.coroutines.resume

/** Google ML Kit — POS 빌지·일반 문서 온디바이스 OCR */
object PosBillMlKitOcr {
    private const val TAG = "PosBillMlKitOcr"

    suspend fun recognizeFromDataUrl(dataUrl: String): String {
        val bitmap = decodeDataUrl(dataUrl) ?: return ""
        return recognizeBitmap(bitmap)
    }

    /** 라인 단위 bounding box 포함 JSON — 웹 Ctrl+F·부분 번역용 */
    suspend fun recognizeBlocksFromDataUrl(dataUrl: String): String {
        val bitmap = decodeDataUrl(dataUrl) ?: return emptyBlocksJson()
        return recognizeBlocksBitmap(bitmap)
    }

    private suspend fun recognizeBitmap(bitmap: Bitmap): String = suspendCancellableCoroutine { cont ->
        val image = InputImage.fromBitmap(bitmap, 0)
        val recognizer = TextRecognition.getClient(KoreanTextRecognizerOptions.Builder().build())
        recognizer.process(image)
            .addOnSuccessListener { result ->
                cont.resume(result.text.orEmpty().trim())
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "mlkit ocr failed", e)
                cont.resume("")
            }
    }

    private suspend fun recognizeBlocksBitmap(bitmap: Bitmap): String = suspendCancellableCoroutine { cont ->
        val image = InputImage.fromBitmap(bitmap, 0)
        val w = bitmap.width.coerceAtLeast(1)
        val h = bitmap.height.coerceAtLeast(1)
        val recognizer = TextRecognition.getClient(KoreanTextRecognizerOptions.Builder().build())
        recognizer.process(image)
            .addOnSuccessListener { result ->
                val blocks = JSONArray()
                var idx = 0
                for (block in result.textBlocks) {
                    for (line in block.lines) {
                        val text = line.text.orEmpty().trim()
                        if (text.isEmpty()) continue
                        val box = line.boundingBox ?: continue
                        blocks.put(
                            JSONObject()
                                .put("id", "line-$idx")
                                .put("text", text)
                                .put("box", boxToPct(box, w, h))
                        )
                        idx++
                    }
                }
                val payload = JSONObject()
                    .put("text", result.text.orEmpty().trim())
                    .put("blocks", blocks)
                    .put("imageWidth", w)
                    .put("imageHeight", h)
                cont.resume(payload.toString())
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "mlkit blocks ocr failed", e)
                cont.resume(emptyBlocksJson())
            }
    }

    private fun boxToPct(rect: Rect, imgW: Int, imgH: Int): JSONObject {
        val x = (rect.left.toFloat() / imgW) * 100f
        val y = (rect.top.toFloat() / imgH) * 100f
        val bw = (rect.width().toFloat() / imgW) * 100f
        val bh = (rect.height().toFloat() / imgH) * 100f
        return JSONObject()
            .put("x", x.toDouble())
            .put("y", y.toDouble())
            .put("w", bw.toDouble())
            .put("h", bh.toDouble())
    }

    private fun emptyBlocksJson(): String =
        JSONObject()
            .put("text", "")
            .put("blocks", JSONArray())
            .put("imageWidth", 0)
            .put("imageHeight", 0)
            .toString()

    private fun decodeDataUrl(dataUrl: String): Bitmap? {
        return try {
            val raw = dataUrl.trim()
            val comma = raw.indexOf(',')
            val b64 = if (comma >= 0) raw.substring(comma + 1) else raw
            val bytes = Base64.decode(b64, Base64.DEFAULT)
            BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
        } catch (e: Exception) {
            Log.e(TAG, "decode failed", e)
            null
        }
    }
}
