package kr.vlue.calloverlay.runtime

import android.content.Context
import android.util.Log
import kr.vlue.calloverlay.CardLookupRepository
import kr.vlue.calloverlay.LetteringIntegration
import kr.vlue.calloverlay.PublicDirectoryPhoneCache
import kr.vlue.calloverlay.family.ledger.VlueEncryptedDatabase
import java.util.concurrent.Executors

/**
 * 프로세스가 전화·부팅으로 새로 올라온 직후, 오버레이 전에 Context·캐시·DB 를 한 번 붙인다.
 * 디스크 파싱과 SQLCipher 오픈은 오버레이 기동을 막지 않도록 백그라운드에서 끝낸다.
 */
object ColdProcessBootstrap {
    private const val TAG = "VlueColdStart"
    private val lock = Any()
    private val heavy = Executors.newSingleThreadExecutor()

    @Volatile
    private var ready = false

    fun ensureReady(context: Context?) {
        val app = context?.applicationContext ?: return
        if (ready) return
        synchronized(lock) {
            if (ready) return
            try {
                System.loadLibrary("sqlcipher")
            } catch (t: Throwable) {
                Log.w(TAG, "sqlcipher load skipped", t)
            }
            try {
                LetteringIntegration.ensureLetteringArmedIfReady(app)
            } catch (t: Throwable) {
                Log.w(TAG, "lettering arm skipped", t)
            }
            try {
                CardLookupRepository.warm(app)
            } catch (t: Throwable) {
                Log.w(TAG, "card cache warm skipped", t)
            }
            heavy.execute {
                try {
                    PublicDirectoryPhoneCache.warm(app)
                } catch (t: Throwable) {
                    Log.w(TAG, "directory cache warm skipped", t)
                }
                try {
                    VlueEncryptedDatabase.get(app)
                } catch (t: Throwable) {
                    Log.w(TAG, "encrypted db warm skipped", t)
                }
            }
            ready = true
        }
    }
}
