import Foundation
import WebKit

/// Android `VlueFamilyBridge` 와 동일한 웹 계약.
/// iOS 정책상 CallLog·타 앱 패키지 조회 불가 — 네이티브→웹 이벤트는 발생시키지 않습니다.
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
        phoneState: false
      };
      g.VlueFamilyBridge = Object.assign({}, prev, {
        __nativeReady: true,
        __iosShell: true,
        platform: 'ios',
        capabilities: caps,
        nativeFeatureUnavailable: function(feature) {
          console.warn('[VLUE iOS] unavailable:', feature);
        }
      });
      g.VlueFamilyBridgeNative = {
        ping: function() {
          try {
            g.webkit.messageHandlers.\(messageHandlerName).postMessage({ action: 'ping' });
          } catch (e) {}
          return 'ok';
        },
        scanRemoteControlAppsNow: function() {
          try {
            g.webkit.messageHandlers.\(messageHandlerName).postMessage({ action: 'scanRemoteControlAppsNow' });
          } catch (e) {}
        },
        reportLastCallFromLog: function() {
          try {
            g.webkit.messageHandlers.\(messageHandlerName).postMessage({ action: 'reportLastCallFromLog' });
          } catch (e) {}
        }
      };
      if (!g.VlueFamilyBridge.__injectedLog) {
        g.VlueFamilyBridge.__injectedLog = true;
        console.info('[VLUE] iOS VlueFamilyBridge attached — call log & remote app scan disabled');
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

    /// 디버그용 — 웹 핸들러 연결 확인 (실제 통화 이벤트 없음)
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
