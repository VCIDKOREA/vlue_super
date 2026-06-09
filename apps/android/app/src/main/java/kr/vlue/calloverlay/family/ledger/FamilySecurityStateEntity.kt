package kr.vlue.calloverlay.family.ledger

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "family_security_state")
data class FamilySecurityStateEntity(
    @PrimaryKey val userId: String,
    val batteryPercent: Int,
    val isCharging: Boolean,
    val securityHealth: String,
    val openThreatCount: Int,
    val lastBankActivityMasked: String?,
    val logHash: String,
    val updatedAt: String
)
