package kr.vlue.calloverlay.family.bank

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

/**
 * 입출금 알림은 금융 API 없이 은행 푸시 문구만 파싱하면 오탐이 나서 제외했다.
 * 매니페스트 서비스 등록도 제거된 상태다. 클래스는 기존 참조가 있어도 아무 알림도 보내지 않는다.
 */
class FamilyBankNotificationListener : NotificationListenerService() {
    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        /* no-op */
    }
}
