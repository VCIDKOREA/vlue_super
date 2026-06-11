package kr.vlue.calloverlay.family.translate

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

@Dao
interface TranslationCacheDao {
    @Query("SELECT translatedText FROM translation_cache WHERE cacheKey = :key LIMIT 1")
    suspend fun findTranslated(key: String): String?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(row: TranslationCacheEntity)
}
