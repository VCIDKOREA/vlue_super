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
            null
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

    fun readAsJson(context: Context): String {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CONTACTS)
            != PackageManager.PERMISSION_GRANTED
        ) {
            return "[]"
        }
        val out = JSONArray()
        val seen = HashSet<String>()
        val projection = arrayOf(
            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
            ContactsContract.CommonDataKinds.Phone.NUMBER
        )
        context.contentResolver.query(
            ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
            projection,
            null,
            null,
            null
        )?.use { cursor ->
            val nameIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
            val phoneIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
            while (cursor.moveToNext()) {
                val phone = cursor.getString(phoneIdx)?.trim().orEmpty()
                if (phone.isEmpty()) continue
                val digits = phone.filter { it.isDigit() }
                if (digits.length < 8 || !seen.add(digits)) continue
                val name = if (nameIdx >= 0) cursor.getString(nameIdx)?.trim().orEmpty() else ""
                out.put(
                    JSONObject()
                        .put("name", name)
                        .put("phone", phone)
                )
                if (out.length() >= 2000) break
            }
        }
        return out.toString()
    }
}
