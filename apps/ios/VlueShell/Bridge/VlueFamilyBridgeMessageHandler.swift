import Foundation
import WebKit

/// 웹 → 네이티브: `webkit.messageHandlers.VlueFamilyBridgeNative.postMessage({ action })`
final class VlueFamilyBridgeMessageHandler: NSObject, WKScriptMessageHandler {
    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard message.name == VlueFamilyBridge.messageHandlerName else { return }

        let action: String
        if let dict = message.body as? [String: Any] {
            action = (dict["action"] as? String) ?? ""
        } else if let str = message.body as? String {
            action = str
        } else {
            action = ""
        }

        switch action {
        case "ping":
            NSLog("[VlueFamilyBridgeNative] ping → ok (iOS shell)")

        case "scanRemoteControlAppsNow":
            NSLog(
                """
                [VlueFamilyBridgeNative] scanRemoteControlAppsNow — \
                iOS에서는 QUERY_ALL_PACKAGES(타 앱 설치 목록) 조회가 불가합니다. \
                원격제어 앱 감지는 Android 셸에서만 동작합니다.
                """
            )

        case "reportLastCallFromLog":
            NSLog(
                """
                [VlueFamilyBridgeNative] reportLastCallFromLog — \
                iOS에서는 READ_CALL_LOG(통화 기록) 접근이 불가합니다. \
                통화·부재중 감지는 Android 셸에서만 동작합니다.
                """
            )

        default:
            NSLog(
                "[VlueFamilyBridgeNative] unknown action=%@ body=%@",
                action,
                String(describing: message.body)
            )
        }
    }
}
