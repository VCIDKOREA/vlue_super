package kr.vlue.calloverlay

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log

/**
 * 기본 문자 앱을 열고 수신자·본문을 미리 채운다.
 * 기본 SMS 앱이 아니면 자동 발송은 불가 — 사용자가 전송 한 번이면 끝.
 */
object ShowcaseSmsComposer {
    private const val TAG = "ShowcaseSms"

    fun openPrefill(context: Context, toPhone: String, ownerPhone: String) {
        val to = ContactPhoneKeys.localDigits(toPhone)
        val body = ShowcaseShareLinks.smsBody(ownerPhone)
        if (to.isEmpty()) {
            Log.w(TAG, "openPrefill skipped — empty recipient")
            return
        }
        val uri = Uri.parse("smsto:$to")
        val intent = Intent(Intent.ACTION_SENDTO, uri).apply {
            putExtra("sms_body", body)
            putExtra("android.intent.extra.TEXT", body)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        try {
            context.startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "sms compose failed", e)
            try {
                val fallback = Intent(Intent.ACTION_VIEW, uri).apply {
                    putExtra("sms_body", body)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(fallback)
            } catch (e2: Exception) {
                Log.e(TAG, "sms fallback failed", e2)
            }
        }
    }
}
