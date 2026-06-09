import Foundation
import WebKit

/// Android `VlueFamilyBridge` 와 동일한 웹 계약.
/// iOS 정책상 CallLog·타 앱·알림 파싱 불가 — OCR(Vision)은 지원.
enum VlueFamilyBridge {
    static let messageHandlerName = "VlueFamilyBridgeNative"

    // MARK: - 웹뷰 주입 (didFinish)

    static let injectionScript: String = """
    (function(){
      var g = window;
      var prev = g.VlueFamilyBridge || {};
      var caps = {
        callLog: false,
        remoteAppScan: false,
        missedCallDetection: false,
        phoneState: false,
        bankNotificationParsing: false,
        dangerousAppScan: false,
        posOcr: true,
        familyStateShare: 'limited'
      };
      function post(action, extra) {
        try {
          var body = Object.assign({ action: action }, extra || {});
          g.webkit.messageHandlers.\(messageHandlerName).postMessage(body);
        } catch (e) {}
      }
      g.VlueFamilyBridge = Object.assign({}, prev, {
        __nativeReady: true,
        __iosShell: true,
        platform: 'ios',
        capabilities: caps,
        nativeFeatureUnavailable: function(feature) {
          console.warn('[VLUE iOS] unavailable:', feature);
        }
      });
      g.VlueFamilyBridgeNative = Object.assign({}, g.VlueFamilyBridgeNative || {}, {
        ping: function() { post('ping'); return 'ok'; },
        scanRemoteControlAppsNow: function() { post('scanRemoteControlAppsNow'); },
        reportLastCallFromLog: function() { post('reportLastCallFromLog'); },
        runPosBillOcr: function(dataUrl) { post('runPosBillOcr', { dataUrl: String(dataUrl || '') }); },
        wipePosScanCache: function() { post('wipePosScanCache'); },
        setSensitiveScreenSecure: function(flag) { post('setSensitiveScreenSecure', { flag: String(flag) }); }
      });
      if (!g.VlueFamilyBridge.__injectedLog) {
        g.VlueFamilyBridge.__injectedLog = true;
        console.info('[VLUE] iOS VlueFamilyBridge attached — OCR enabled, notification/app scan disabled');
      }
    })();
    """

    static func inject(into webView: WKWebView) {
        webView.evaluateJavaScript(injectionScript) { _, error in
            if let error {
                NSLog("[VlueFamilyBridge] inject failed: %@", String(describing: error))
            }
        }
    }

    static func dispatchPosOcrResult(on webView: WKWebView, text: String) {
        let quoted = jsQuote(text)
        let script =
            "window.VlueFamilyBridge&&window.VlueFamilyBridge.onPosOcrResult&&" +
            "window.VlueFamilyBridge.onPosOcrResult(\(quoted));"
        webView.evaluateJavaScript(script) { _, error in
            if let error {
                NSLog("[VlueFamilyBridge] onPosOcrResult failed: %@", String(describing: error))
            }
        }
    }

    private static func jsQuote(_ s: String) -> String {
        let escaped = s
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "\"", with: "\\\"")
            .replacingOccurrences(of: "\n", with: "\\n")
        return "\"\(escaped)\""
    }

    // MARK: - Android 호환 디스패처 (iOS에서는 no-op + 로그)

    static func dispatchCallEnded(
        on webView: WKWebView,
        phone: String,
        durationSec: Int,
        direction: String,
        peerIsVlueMember: Bool = false
    ) {
        NSLog(
            "[VlueFamilyBridge] onCallEnded skipped on iOS (CallLog unavailable) phone=%@",
            phone
        )
        _ = webView
        _ = durationSec
        _ = direction
        _ = peerIsVlueMember
    }

    static func dispatchMissedCall(on webView: WKWebView) {
        NSLog("[VlueFamilyBridge] onMissedCall skipped on iOS")
        _ = webView
    }

    static func dispatchRemoteAppDetected(on webView: WKWebView, packageName: String) {
        NSLog(
            "[VlueFamilyBridge] onRemoteAppDetected skipped on iOS (package query unavailable) pkg=%@",
            packageName
        )
        _ = webView
    }

    static func evaluateBridgeSelfTest(on webView: WKWebView) {
        let script = """
        (function(){
          var b = window.VlueFamilyBridge;
          return JSON.stringify({
            platform: b && b.platform,
            ios: !!(b && b.__iosShell),
            caps: b && b.capabilities
          });
        })();
        """
        webView.evaluateJavaScript(script) { result, _ in
            NSLog("[VlueFamilyBridge] selfTest: %@", String(describing: result))
        }
    }
}
