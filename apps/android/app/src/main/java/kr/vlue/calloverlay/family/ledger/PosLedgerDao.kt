package kr.vlue.calloverlay.family.ledger

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface PosLedgerDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entry: PosLedgerEntity)

    @Query("SELECT * FROM pos_ledger_entries ORDER BY createdAt DESC LIMIT :limit")
    suspend fun listRecent(limit: Int): List<PosLedgerEntity>

    @Query("DELETE FROM pos_ledger_entries")
    suspend fun deleteAll()
}
