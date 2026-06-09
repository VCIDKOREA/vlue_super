package kr.vlue.calloverlay.family.ocr

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import android.util.Log
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/** Google ML Kit — POS 빌지·매출전표 온디바이스 OCR */
object PosBillMlKitOcr {
    private const val TAG = "PosBillMlKitOcr"

    suspend fun recognizeFromDataUrl(dataUrl: String): String {
        val bitmap = decodeDataUrl(dataUrl) ?: return ""
        return recognizeBitmap(bitmap)
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
