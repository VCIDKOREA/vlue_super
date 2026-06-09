import Foundation
import WebKit

/// 웹 → 네이티브: `webkit.messageHandlers.VlueFamilyBridgeNative.postMessage({ action })`
final class VlueFamilyBridgeMessageHandler: NSObject, WKScriptMessageHandler {
    weak var webView: WKWebView?

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard message.name == VlueFamilyBridge.messageHandlerName else { return }

        let dict = message.body as? [String: Any]
        let action = (dict?["action"] as? String) ?? (message.body as? String) ?? ""

        switch action {
        case "ping":
            NSLog("[VlueFamilyBridgeNative] ping → ok (iOS shell)")

        case "scanRemoteControlAppsNow":
            NSLog("[VlueFamilyBridgeNative] scanRemoteControlAppsNow — iOS에서는 타 앱 설치 목록 조회 불가")

        case "reportLastCallFromLog":
            NSLog("[VlueFamilyBridgeNative] reportLastCallFromLog — iOS에서는 통화 기록 접근 불가")

        case "runPosBillOcr":
            let dataUrl = (dict?["dataUrl"] as? String) ?? ""
            DispatchQueue.global(qos: .userInitiated).async { [weak self] in
                let text = PosBillVisionOcr.recognizeFromDataUrl(dataUrl)
                DispatchQueue.main.async {
                    guard let webView = self?.webView else { return }
                    VlueFamilyBridge.dispatchPosOcrResult(on: webView, text: text)
                }
            }

        case "wipePosScanCache":
            NSLog("[VlueFamilyBridgeNative] wipePosScanCache — iOS no-op (웹 메모리 wipe만)")

        case "setSensitiveScreenSecure":
            NSLog("[VlueFamilyBridgeNative] setSensitiveScreenSecure flag=%@", String(describing: dict?["flag"]))

        default:
            NSLog(
                "[VlueFamilyBridgeNative] unknown action=%@ body=%@",
                action,
                String(describing: message.body)
            )
        }
    }
}
