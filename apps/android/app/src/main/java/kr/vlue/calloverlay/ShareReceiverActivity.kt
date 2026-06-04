package kr.vlue.calloverlay

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

/**
 * Android 공유 시트 → VLUE 메모장
 */
class ShareReceiverActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        forwardShare(intent)
        finish()
    }

    private fun forwardShare(inIntent: Intent) {
        val launch = Intent(this, MainActivity::class.java).apply {
            action = Intent.ACTION_SEND
            type = inIntent.type
            putExtra(Intent.EXTRA_TEXT, inIntent.getStringExtra(Intent.EXTRA_TEXT))
            putExtra(Intent.EXTRA_SUBJECT, inIntent.getStringExtra(Intent.EXTRA_SUBJECT))
            inIntent.getParcelableExtra<android.net.Uri>(Intent.EXTRA_STREAM)?.let {
                putExtra(Intent.EXTRA_STREAM, it)
            }
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        startActivity(launch)
    }
}
