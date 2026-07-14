package kr.vlue.calloverlay.incall

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.telecom.TelecomManager
import androidx.appcompat.app.AppCompatActivity
import kr.vlue.calloverlay.MainActivity

/**
 * 기본 전화앱 역할용 다이얼 트램펄린 — tel: URI를 시스템으로 넘기고 메인으로 복귀.
 * (자체 키패드는 오버레이 웹 DTMF로 담당)
 */
class DialerTrampolineActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val data: Uri? = intent?.data
        val number = when {
            data != null && data.scheme.equals("tel", true) -> data.schemeSpecificPart
            intent?.action == Intent.ACTION_DIAL || intent?.action == Intent.ACTION_VIEW ->
                intent?.data?.schemeSpecificPart
            else -> intent?.getStringExtra(Intent.EXTRA_PHONE_NUMBER)
        }.orEmpty()

        if (number.isNotBlank()) {
            try {
                val telecom = getSystemService(TelecomManager::class.java)
                val uri = Uri.fromParts("tel", number, null)
                val callIntent = Intent(Intent.ACTION_CALL, uri).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                /* PLACE_CALL 권한 없으면 다이얼 화면만 */
                try {
                    telecom?.placeCall(uri, null)
                } catch (_: SecurityException) {
                    startActivity(Intent(Intent.ACTION_DIAL, uri))
                } catch (_: Exception) {
                    startActivity(Intent(Intent.ACTION_DIAL, uri))
                }
            } catch (_: Exception) {
                startActivity(Intent(Intent.ACTION_DIAL, Uri.fromParts("tel", number, null)))
            }
        }

        startActivity(
            Intent(this, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            }
        )
        finish()
    }
}
