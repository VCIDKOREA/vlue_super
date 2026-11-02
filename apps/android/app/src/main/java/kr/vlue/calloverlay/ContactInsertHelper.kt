package kr.vlue.calloverlay

import android.content.Context
import android.content.Intent
import android.provider.ContactsContract
import android.util.Log
import android.widget.Toast
import org.json.JSONObject

/** DCC·명함 → 시스템 「새 연락처 추가」 Insert 인텐트 */
object ContactInsertHelper {
    const val VLUE_NOTE = "Saved via VLUÉ Secure Digital Card"
    private const val TAG = "ContactInsert"

    fun openInsert(context: Context, json: String?) {
        try {
            val obj = JSONObject(json ?: "{}")
            val name = obj.optString("name").trim()
            val org = obj.optString("organization").trim()
            val title = obj.optString("title").trim()
            val phone = obj.optString("phone").trim()
            val fax = obj.optString("fax").trim()
            val email = obj.optString("email").trim()
            val website = obj.optString("website").trim()
            val address = obj.optString("address").trim()
            if (name.isEmpty() && phone.isEmpty() && email.isEmpty() && org.isEmpty()) {
                Toast.makeText(context, "저장할 연락처 정보가 없습니다.", Toast.LENGTH_SHORT).show()
                return
            }
            val notes = listOf(VLUE_NOTE, website.takeIf { it.isNotEmpty() })
                .filterNotNull()
                .joinToString("\n")
            val intent = Intent(ContactsContract.Intents.Insert.ACTION).apply {
                type = ContactsContract.RawContacts.CONTENT_TYPE
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                if (name.isNotEmpty()) putExtra(ContactsContract.Intents.Insert.NAME, name)
                if (org.isNotEmpty()) putExtra(ContactsContract.Intents.Insert.COMPANY, org)
                if (title.isNotEmpty()) putExtra(ContactsContract.Intents.Insert.JOB_TITLE, title)
                if (phone.isNotEmpty()) {
                    putExtra(ContactsContract.Intents.Insert.PHONE, phone)
                    putExtra(
                        ContactsContract.Intents.Insert.PHONE_TYPE,
                        ContactsContract.CommonDataKinds.Phone.TYPE_MOBILE
                    )
                }
                if (fax.isNotEmpty()) {
                    putExtra(ContactsContract.Intents.Insert.SECONDARY_PHONE, fax)
                    putExtra(
                        ContactsContract.Intents.Insert.SECONDARY_PHONE_TYPE,
                        ContactsContract.CommonDataKinds.Phone.TYPE_FAX_WORK
                    )
                }
                if (email.isNotEmpty()) {
                    putExtra(ContactsContract.Intents.Insert.EMAIL, email)
                    putExtra(
                        ContactsContract.Intents.Insert.EMAIL_TYPE,
                        ContactsContract.CommonDataKinds.Email.TYPE_WORK
                    )
                }
                if (address.isNotEmpty()) {
                    putExtra(ContactsContract.Intents.Insert.POSTAL, address)
                    putExtra(
                        ContactsContract.Intents.Insert.POSTAL_TYPE,
                        ContactsContract.CommonDataKinds.StructuredPostal.TYPE_WORK
                    )
                }
                putExtra(ContactsContract.Intents.Insert.NOTES, notes)
            }
            context.startActivity(intent)
        } catch (e: Exception) {
            Log.e(TAG, "openInsert failed", e)
            Toast.makeText(context, "연락처 앱을 열 수 없습니다.", Toast.LENGTH_SHORT).show()
        }
    }

    fun shareVcf(context: Context, vcf: String?, filename: String?) {
        try {
            val body = vcf?.trim().orEmpty()
            if (body.isEmpty()) {
                Toast.makeText(context, "연락처 데이터가 비어 있습니다.", Toast.LENGTH_SHORT).show()
                return
            }
            val share = Intent(Intent.ACTION_SEND).apply {
                type = "text/x-vcard"
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                putExtra(Intent.EXTRA_TEXT, body)
                putExtra(Intent.EXTRA_SUBJECT, filename ?: "VLUÉ-contact.vcf")
            }
            context.startActivity(Intent.createChooser(share, "연락처 저장").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (e: Exception) {
            Log.e(TAG, "shareVcf failed", e)
            Toast.makeText(context, "연락처를 저장할 수 없습니다.", Toast.LENGTH_SHORT).show()
        }
    }
}
