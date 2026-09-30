package kr.vlue.calloverlay

import android.provider.CallLog
import org.junit.Assert.assertEquals
import org.junit.Test

class DeviceCallLogReaderTest {
    @Test
    fun callTypeOf_splitsOutgoingIncomingMissed() {
        assertEquals("outgoing", DeviceCallLogReader.callTypeOf(CallLog.Calls.OUTGOING_TYPE))
        assertEquals("incoming", DeviceCallLogReader.callTypeOf(CallLog.Calls.INCOMING_TYPE))
        assertEquals("missed", DeviceCallLogReader.callTypeOf(CallLog.Calls.MISSED_TYPE))
        assertEquals("missed", DeviceCallLogReader.callTypeOf(CallLog.Calls.REJECTED_TYPE))
        assertEquals("missed", DeviceCallLogReader.callTypeOf(CallLog.Calls.BLOCKED_TYPE))
    }

    @Test
    fun callTypeOf_unknownTypeFallsBackToIncoming() {
        assertEquals("incoming", DeviceCallLogReader.callTypeOf(999))
    }
}
