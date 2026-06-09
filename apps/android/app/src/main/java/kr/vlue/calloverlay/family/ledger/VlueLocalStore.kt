package kr.vlue.calloverlay.family.ledger

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.security.MessageDigest
import java.nio.charset.StandardCharsets

/** Room + SQLCipher 로컬 저장소 — POS 장부·가족 상태 */
object VlueLocalStore {
    private fun sha256Hex(input: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val bytes = digest.digest(input.toByteArray(StandardCharsets.UTF_8))
        return bytes.joinToString("") { "%02x".format(it) }
    }

    suspend fun savePosLedger(
        context: Context,
        saleDate: String,
        totalKrw: Long,
        cardKrw: Long,
        cashKrw: Long,
        vatKrw: Long,
        rawOcrText: String
    ) = withContext(Dispatchers.IO) {
        val db = VlueEncryptedDatabase.get(context)
        val dao = db.posLedgerDao()
        val now = java.time.Instant.now().toString()
        val prev = dao.listRecent(1).firstOrNull()
        val body = mapOf(
            "saleDate" to saleDate,
            "totalKrw" to totalKrw,
            "createdAt" to now
        )
        val logHash = sha256Hex("${prev?.logHash ?: "GENESIS"}:${body}")
        val cipher = rawOcrText.toByteArray(StandardCharsets.UTF_8)
        dao.insert(
            PosLedgerEntity(
                id = "pos_${System.currentTimeMillis()}",
                saleDate = saleDate,
                totalKrw = totalKrw,
                cardKrw = cardKrw,
                cashKrw = cashKrw,
                vatKrw = vatKrw,
                rawOcrCipher = cipher,
                logHash = logHash,
                prevLogHash = prev?.logHash,
                createdAt = now
            )
        )
    }

    /** STAFF 전송 완료 후 — 로컬 POS 이미지·장부 캐시 삭제 */
    suspend fun wipePosScanCache(context: Context) = withContext(Dispatchers.IO) {
        val db = VlueEncryptedDatabase.get(context)
        db.posLedgerDao().deleteAll()
    }

    suspend fun upsertSecurityState(
        context: Context,
        userId: String,
        batteryPercent: Int,
        isCharging: Boolean,
        securityHealth: String,
        openThreatCount: Int,
        lastBankActivityMasked: String?
    ) = withContext(Dispatchers.IO) {
        val db = VlueEncryptedDatabase.get(context)
        val dao = db.familySecurityStateDao()
        val now = java.time.Instant.now().toString()
        val prev = dao.listAll().find { it.userId == userId }
        val logHash = sha256Hex("${prev?.logHash ?: "GENESIS"}:bat=$batteryPercent")
        dao.upsert(
            FamilySecurityStateEntity(
                userId = userId,
                batteryPercent = batteryPercent,
                isCharging = isCharging,
                securityHealth = securityHealth,
                openThreatCount = openThreatCount,
                lastBankActivityMasked = lastBankActivityMasked,
                logHash = logHash,
                updatedAt = now
            )
        )
    }
}
