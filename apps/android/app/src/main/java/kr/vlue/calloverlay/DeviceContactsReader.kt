package kr.vlue.calloverlay

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.provider.CallLog
import android.provider.ContactsContract
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject

/** 디바이스 주소록 → 웹 하이브리드 판별용 JSON */
object DeviceContactsReader {
    private const val MAX_EXPORT = 5000

    fun findDisplayName(context: Context, rawPhone: String): String? {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CONTACTS)
            != PackageManager.PERMISSION_GRANTED
        ) {
            return null
        }
        if (ContactPhoneKeys.keys(rawPhone).isEmpty()) return null
        val projection = arrayOf(
            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
            ContactsContract.CommonDataKinds.Phone.NUMBER
        )
        context.contentResolver.query(
            ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
            projection,
            null,
            null,
            "${ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME} COLLATE LOCALIZED ASC"
        )?.use { cursor ->
            val nameIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
            val phoneIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
            while (cursor.moveToNext()) {
                val phone = cursor.getString(phoneIdx)?.trim().orEmpty()
                if (phone.isEmpty()) continue
                if (!ContactPhoneKeys.matches(rawPhone, phone)) continue
                val name = if (nameIdx >= 0) cursor.getString(nameIdx)?.trim().orEmpty() else ""
                if (name.isNotBlank()) return name
            }
        }
        return null
    }

    /**
     * 안심 팝업 승격용 표시 이름.
     * 주소록 조회 실패(권한·매칭) 시 CallLog CACHED_NAME 으로 폴백 — 통화목록에
     * 「재호(민성)」처럼 보이는데도 승격이 스킵되는 경우를 막는다.
     */
    fun resolveDisplayNameForSafeCare(context: Context, rawPhone: String): String? {
        findDisplayName(context, rawPhone)?.trim()?.takeIf { it.isNotBlank() }?.let { return it }
        return findCallLogCachedName(context, rawPhone)
    }

    fun findCallLogCachedName(context: Context, rawPhone: String): String? {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CALL_LOG)
            != PackageManager.PERMISSION_GRANTED
        ) {
            return null
        }
        if (ContactPhoneKeys.keys(rawPhone).isEmpty()) return null
        val projection = arrayOf(
            CallLog.Calls.NUMBER,
            CallLog.Calls.CACHED_NAME,
            CallLog.Calls.DATE
        )
        context.contentResolver.query(
            CallLog.Calls.CONTENT_URI,
            projection,
            null,
            null,
            "${CallLog.Calls.DATE} DESC"
        )?.use { cursor ->
            val phoneIdx = cursor.getColumnIndex(CallLog.Calls.NUMBER)
            val nameIdx = cursor.getColumnIndex(CallLog.Calls.CACHED_NAME)
            var scanned = 0
            while (cursor.moveToNext() && scanned < 400) {
                scanned++
                val phone = if (phoneIdx >= 0) cursor.getString(phoneIdx)?.trim().orEmpty() else ""
                if (phone.isEmpty() || !ContactPhoneKeys.matches(rawPhone, phone)) continue
                val name = if (nameIdx >= 0) cursor.getString(nameIdx)?.trim().orEmpty() else ""
                if (name.isNotBlank()) return name
            }
        }
        return null
    }

    /**
     * 주소록 저장 여부.
     * READ_CONTACTS 없으면 null(미확인) — 가족보호 장시간 알림은 서버에서 스킵.
     */
    fun isInContacts(context: Context, rawPhone: String): Boolean? {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CONTACTS)
            != PackageManager.PERMISSION_GRANTED
        ) {
            return null
        }
        if (ContactPhoneKeys.keys(rawPhone).isEmpty()) return false
        val projection = arrayOf(ContactsContract.CommonDataKinds.Phone.NUMBER)
        context.contentResolver.query(
            ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
            projection,
            null,
            null,
            null
        )?.use { cursor ->
            val phoneIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
            while (cursor.moveToNext()) {
                val phone = cursor.getString(phoneIdx)?.trim().orEmpty()
                if (phone.isEmpty()) continue
                if (ContactPhoneKeys.matches(rawPhone, phone)) return true
            }
        }
        return false
    }

    /**
     * 단말기 로컬 / Google / SIM 등 Phone MIME 이 있는 모든 연락처를 수집.
     * AccountType 으로 필터하지 않으며, 동일 번호(정규화)은 모바일 타입을 우선한다.
     */
    fun readAsJson(context: Context): String {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CONTACTS)
            != PackageManager.PERMISSION_GRANTED
        ) {
            return "[]"
        }
        data class Row(val name: String, val phone: String, val type: Int, val localKey: String)

        val bestByKey = LinkedHashMap<String, Row>()
        val projection = arrayOf(
            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
            ContactsContract.CommonDataKinds.Phone.NUMBER,
            ContactsContract.CommonDataKinds.Phone.TYPE,
            ContactsContract.CommonDataKinds.Phone.LABEL
        )
        context.contentResolver.query(
            ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
            projection,
            null,
            null,
            "${ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME} COLLATE LOCALIZED ASC"
        )?.use { cursor ->
            val nameIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
            val phoneIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
            val typeIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.TYPE)
            while (cursor.moveToNext()) {
                val phone = cursor.getString(phoneIdx)?.trim().orEmpty()
                if (phone.isEmpty()) continue
                val localKey = ContactPhoneKeys.localDigits(phone)
                if (localKey.length < 8) continue
                val name = if (nameIdx >= 0) cursor.getString(nameIdx)?.trim().orEmpty() else ""
                val type = if (typeIdx >= 0) cursor.getInt(typeIdx) else ContactsContract.CommonDataKinds.Phone.TYPE_OTHER
                val prev = bestByKey[localKey]
                val preferMobile = type == ContactsContract.CommonDataKinds.Phone.TYPE_MOBILE ||
                    type == ContactsContract.CommonDataKinds.Phone.TYPE_WORK_MOBILE
                val prevMobile = prev != null && (
                    prev.type == ContactsContract.CommonDataKinds.Phone.TYPE_MOBILE ||
                        prev.type == ContactsContract.CommonDataKinds.Phone.TYPE_WORK_MOBILE
                    )
                if (prev == null || (preferMobile && !prevMobile) || (prev.name.isBlank() && name.isNotBlank())) {
                    bestByKey[localKey] = Row(name, phone, type, localKey)
                }
                if (bestByKey.size >= MAX_EXPORT) break
            }
        }

        val out = JSONArray()
        for (row in bestByKey.values) {
            out.put(
                JSONObject()
                    .put("name", row.name)
                    .put("phone", row.phone)
                    .put("type", row.type)
                    .put("normalized", row.localKey)
            )
        }
        return out.toString()
    }
}
