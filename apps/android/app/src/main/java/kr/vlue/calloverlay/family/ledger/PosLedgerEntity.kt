package kr.vlue.calloverlay.family.ledger

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "pos_ledger_entries")
data class PosLedgerEntity(
    @PrimaryKey val id: String,
    val saleDate: String,
    val totalKrw: Long,
    val cardKrw: Long,
    val cashKrw: Long,
    val vatKrw: Long,
    val rawOcrCipher: ByteArray,
    val logHash: String,
    val prevLogHash: String?,
    val createdAt: String
)
