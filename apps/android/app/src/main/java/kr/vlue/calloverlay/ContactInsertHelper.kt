package kr.vlue.calloverlay

import android.Manifest
import android.content.ContentProviderOperation
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.ContactsContract
import android.provider.ContactsContract.CommonDataKinds.Email
import android.provider.ContactsContract.CommonDataKinds.Note
import android.provider.ContactsContract.CommonDataKinds.Organization
import android.provider.ContactsContract.CommonDataKinds.Phone
import android.provider.ContactsContract.CommonDataKinds.StructuredName
import android.provider.ContactsContract.CommonDataKinds.StructuredPostal
import android.provider.ContactsContract.CommonDataKinds.Website
import android.provider.ContactsContract.Data
import android.provider.ContactsContract.RawContacts
import android.util.Log
import android.widget.Toast
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject

/** 명함 확인 후 기기 연락처에 표준 타입으로 저장 */
object ContactInsertHelper {
    const val VLUE_NOTE = "Saved via VLUÉ Secure Digital Card"
    const val REQ_WRITE_CONTACTS = 4106
    private const val TAG = "ContactInsert"

    @Volatile
    private var pendingJson: String? = null

    fun saveFromWeb(activity: MainActivity, json: String?) {
        val body = json?.trim().orEmpty()
        if (body.isEmpty()) {
            Toast.makeText(activity, "저장할 연락처 정보가 없습니다.", Toast.LENGTH_SHORT).show()
            return
        }
        if (ContextCompat.checkSelfPermission(activity, Manifest.permission.WRITE_CONTACTS) == PackageManager.PERMISSION_GRANTED) {
            if (!insertStructured(activity, body)) openInsert(activity, body)
            return
        }
        pendingJson = body
        ActivityCompat.requestPermissions(activity, arrayOf(Manifest.permission.WRITE_CONTACTS), REQ_WRITE_CONTACTS)
    }

    fun onWritePermissionResult(activity: MainActivity, granted: Boolean) {
        val json = pendingJson
        pendingJson = null
        if (json.isNullOrBlank()) return
        if (granted && insertStructured(activity, json)) return
        openInsert(activity, json)
    }

    fun insertStructured(context: Context, json: String?): Boolean {
        return try {
            val card = readCard(json)
            if (!card.hasAnything()) {
                Toast.makeText(context, "저장할 연락처 정보가 없습니다.", Toast.LENGTH_SHORT).show()
                return false
            }
            val ops = ArrayList<ContentProviderOperation>()
            val raw = 0
            ops.add(
                ContentProviderOperation.newInsert(RawContacts.CONTENT_URI)
                    .withValue(RawContacts.ACCOUNT_TYPE, null)
                    .withValue(RawContacts.ACCOUNT_NAME, null)
                    .build()
            )
            if (card.name.isNotEmpty()) {
                ops.add(
                    ContentProviderOperation.newInsert(Data.CONTENT_URI)
                        .withValueBackReference(Data.RAW_CONTACT_ID, raw)
                        .withValue(Data.MIMETYPE, StructuredName.CONTENT_ITEM_TYPE)
                        .withValue(StructuredName.DISPLAY_NAME, card.name)
                        .build()
                )
            }
            if (card.company.isNotEmpty() || card.department.isNotEmpty() || card.position.isNotEmpty()) {
                ops.add(
                    ContentProviderOperation.newInsert(Data.CONTENT_URI)
                        .withValueBackReference(Data.RAW_CONTACT_ID, raw)
                        .withValue(Data.MIMETYPE, Organization.CONTENT_ITEM_TYPE)
                        .withValue(Organization.COMPANY, card.company)
                        .withValue(Organization.DEPARTMENT, card.department)
                        .withValue(Organization.TITLE, card.position)
                        .withValue(Organization.TYPE, Organization.TYPE_WORK)
                        .build()
                )
            }
            addPhone(ops, raw, card.mobile, Phone.TYPE_MOBILE)
            addPhone(ops, raw, card.tel, Phone.TYPE_WORK)
            addPhone(ops, raw, card.fax, Phone.TYPE_FAX_WORK)
            if (card.email.isNotEmpty()) {
                ops.add(
                    ContentProviderOperation.newInsert(Data.CONTENT_URI)
                        .withValueBackReference(Data.RAW_CONTACT_ID, raw)
                        .withValue(Data.MIMETYPE, Email.CONTENT_ITEM_TYPE)
                        .withValue(Email.ADDRESS, card.email)
                        .withValue(Email.TYPE, Email.TYPE_WORK)
                        .build()
                )
            }
            if (card.address.isNotEmpty()) {
                ops.add(
                    ContentProviderOperation.newInsert(Data.CONTENT_URI)
                        .withValueBackReference(Data.RAW_CONTACT_ID, raw)
                        .withValue(Data.MIMETYPE, StructuredPostal.CONTENT_ITEM_TYPE)
                        .withValue(StructuredPostal.FORMATTED_ADDRESS, card.address)
                        .withValue(StructuredPostal.TYPE, StructuredPostal.TYPE_WORK)
                        .build()
                )
            }
            if (card.website.isNotEmpty()) {
                ops.add(
                    ContentProviderOperation.newInsert(Data.CONTENT_URI)
                        .withValueBackReference(Data.RAW_CONTACT_ID, raw)
                        .withValue(Data.MIMETYPE, Website.CONTENT_ITEM_TYPE)
                        .withValue(Website.URL, card.website)
                        .withValue(Website.TYPE, Website.TYPE_WORK)
                        .build()
                )
            }
            ops.add(
                ContentProviderOperation.newInsert(Data.CONTENT_URI)
                    .withValueBackReference(Data.RAW_CONTACT_ID, raw)
                    .withValue(Data.MIMETYPE, Note.CONTENT_ITEM_TYPE)
                    .withValue(Note.NOTE, card.note)
                    .build()
            )
            context.contentResolver.applyBatch(ContactsContract.AUTHORITY, ops)
            Toast.makeText(context, "명함을 연락처에 저장했습니다.", Toast.LENGTH_SHORT).show()
            true
        } catch (e: Exception) {
            Log.e(TAG, "insertStructured failed", e)
            false
        }
    }

    fun openInsert(context: Context, json: String?) {
        try {
            val card = readCard(json)
            if (!card.hasAnything()) {
                Toast.makeText(context, "저장할 연락처 정보가 없습니다.", Toast.LENGTH_SHORT).show()
                return
            }
            val intent = Intent(ContactsContract.Intents.Insert.ACTION).apply {
                type = ContactsContract.RawContacts.CONTENT_TYPE
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                if (card.name.isNotEmpty()) putExtra(ContactsContract.Intents.Insert.NAME, card.name)
                if (card.company.isNotEmpty()) putExtra(ContactsContract.Intents.Insert.COMPANY, card.company)
                if (card.position.isNotEmpty()) putExtra(ContactsContract.Intents.Insert.JOB_TITLE, card.position)
                if (card.mobile.isNotEmpty()) {
                    putExtra(ContactsContract.Intents.Insert.PHONE, card.mobile)
                    putExtra(ContactsContract.Intents.Insert.PHONE_TYPE, Phone.TYPE_MOBILE)
                }
                if (card.tel.isNotEmpty()) {
                    putExtra(ContactsContract.Intents.Insert.SECONDARY_PHONE, card.tel)
                    putExtra(ContactsContract.Intents.Insert.SECONDARY_PHONE_TYPE, Phone.TYPE_WORK)
                }
                if (card.fax.isNotEmpty()) {
                    putExtra(ContactsContract.Intents.Insert.TERTIARY_PHONE, card.fax)
                    putExtra(ContactsContract.Intents.Insert.TERTIARY_PHONE_TYPE, Phone.TYPE_FAX_WORK)
                }
                if (card.email.isNotEmpty()) {
                    putExtra(ContactsContract.Intents.Insert.EMAIL, card.email)
                    putExtra(ContactsContract.Intents.Insert.EMAIL_TYPE, Email.TYPE_WORK)
                }
                if (card.address.isNotEmpty()) {
                    putExtra(ContactsContract.Intents.Insert.POSTAL, card.address)
                    putExtra(ContactsContract.Intents.Insert.POSTAL_TYPE, StructuredPostal.TYPE_WORK)
                }
                val note = listOf(card.note, card.department.takeIf { it.isNotEmpty() }?.let { "부서 $it" })
                    .filterNotNull()
                    .joinToString("\n")
                putExtra(ContactsContract.Intents.Insert.NOTES, note)
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

    private fun addPhone(ops: ArrayList<ContentProviderOperation>, raw: Int, number: String, type: Int) {
        if (number.isEmpty()) return
        ops.add(
            ContentProviderOperation.newInsert(Data.CONTENT_URI)
                .withValueBackReference(Data.RAW_CONTACT_ID, raw)
                .withValue(Data.MIMETYPE, Phone.CONTENT_ITEM_TYPE)
                .withValue(Phone.NUMBER, number)
                .withValue(Phone.TYPE, type)
                .build()
        )
    }

    private fun readCard(json: String?): Card {
        val obj = JSONObject(json ?: "{}")
        val trust = obj.optInt("trustScore", -1)
        val note = obj.optString("note").trim().ifEmpty {
            if (trust >= 0) "[VLUE 인증 스캔 명함 - 신뢰도 ${trust}점]" else VLUE_NOTE
        }
        return Card(
            name = obj.optString("name").trim(),
            company = first(obj, "company", "organization"),
            department = obj.optString("department").trim(),
            position = first(obj, "position", "title"),
            mobile = first(obj, "mobile", "phone"),
            tel = first(obj, "tel", "landline"),
            fax = obj.optString("fax").trim(),
            email = obj.optString("email").trim(),
            website = obj.optString("website").trim(),
            address = obj.optString("address").trim(),
            note = note
        )
    }

    private fun first(obj: JSONObject, vararg keys: String): String {
        for (key in keys) {
            val value = obj.optString(key).trim()
            if (value.isNotEmpty()) return value
        }
        return ""
    }

    private data class Card(
        val name: String,
        val company: String,
        val department: String,
        val position: String,
        val mobile: String,
        val tel: String,
        val fax: String,
        val email: String,
        val website: String,
        val address: String,
        val note: String
    ) {
        fun hasAnything(): Boolean {
            return name.isNotEmpty() || company.isNotEmpty() || mobile.isNotEmpty() || tel.isNotEmpty() || email.isNotEmpty()
        }
    }
}
