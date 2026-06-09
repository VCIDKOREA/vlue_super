package kr.vlue.calloverlay.family.ledger

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface FamilySecurityStateDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(row: FamilySecurityStateEntity)

    @Query("SELECT * FROM family_security_state ORDER BY updatedAt DESC")
    suspend fun listAll(): List<FamilySecurityStateEntity>
}
