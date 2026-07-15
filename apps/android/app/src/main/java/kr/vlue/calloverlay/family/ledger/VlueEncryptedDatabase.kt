package kr.vlue.calloverlay.family.ledger

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import kr.vlue.calloverlay.family.translate.TranslationCacheEntity
import kr.vlue.calloverlay.family.translate.TranslationCacheDao
/** `android-database-sqlcipher` 4.5.x — 패키지는 net.sqlcipher (신규 sqlcipher-android 와 다름) */
import net.sqlcipher.database.SupportFactory

@Database(
    entities = [PosLedgerEntity::class, FamilySecurityStateEntity::class, TranslationCacheEntity::class],
    version = 2,
    exportSchema = false
)
abstract class VlueEncryptedDatabase : RoomDatabase() {
    abstract fun posLedgerDao(): PosLedgerDao
    abstract fun familySecurityStateDao(): FamilySecurityStateDao
    abstract fun translationCacheDao(): TranslationCacheDao

    companion object {
        @Volatile private var instance: VlueEncryptedDatabase? = null

        fun get(context: Context): VlueEncryptedDatabase {
            return instance ?: synchronized(this) {
                instance ?: build(context.applicationContext).also { instance = it }
            }
        }

        private fun build(context: Context): VlueEncryptedDatabase {
            val factory = SupportFactory(DatabaseKeyHelper.getOrCreatePassphrase(context))
            return Room.databaseBuilder(context, VlueEncryptedDatabase::class.java, "vlue_encrypted.db")
                .openHelperFactory(factory)
                .fallbackToDestructiveMigration()
                .build()
        }
    }
}
