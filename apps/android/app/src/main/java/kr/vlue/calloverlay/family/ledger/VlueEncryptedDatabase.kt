package kr.vlue.calloverlay.family.ledger

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import net.zetetic.database.sqlcipher.SupportFactory

@Database(
    entities = [PosLedgerEntity::class, FamilySecurityStateEntity::class],
    version = 1,
    exportSchema = false
)
abstract class VlueEncryptedDatabase : RoomDatabase() {
    abstract fun posLedgerDao(): PosLedgerDao
    abstract fun familySecurityStateDao(): FamilySecurityStateDao

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
