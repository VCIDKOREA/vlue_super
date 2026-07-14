import UIKit
import WebKit
import AVFoundation
import CallKit

/// Live Activity / 전면 풀케이스 — WKWebView `#lettering-overlay`
final class LetteringOverlayPresenter: NSObject, WKScriptMessageHandler {
    static let shared = LetteringOverlayPresenter()
    private var window: UIWindow?
    private var webView: WKWebView?
    private var collapsedForSystemCall = false
    private var lastPhone = ""
    private var lastVerified = false
    private var lastOutgoing = false

    func present(phone: String, verified: Bool, outgoing: Bool) {
        guard LetteringPrefs.isEnabled else { return }
        lastPhone = phone
        lastVerified = verified
        lastOutgoing = outgoing
        dismiss()

        let scene = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first { $0.activationState == .foregroundActive || $0.activationState == .foregroundInactive }
            ?? UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
        guard let scene else { return }

        let win = UIWindow(windowScene: scene)
        win.windowLevel = .statusBar + 1
        win.backgroundColor = .black

        let config = WKWebViewConfiguration()
        let userContent = config.userContentController
        userContent.add(self, name: "vlueLetteringNative")
        userContent.add(VlueLetteringBlockHandler(), name: "vlueLetteringBlock")
        userContent.add(VlueLetteringOpenCertHandler(), name: "vlueLetteringOpenCert")
        userContent.add(VlueLetteringSettingsHandler(), name: "vlueLetteringSettings")

        let bridge = """
        window.VlueLettering = window.VlueLettering || {};
        window.VlueLettering.endCallKeepOverlay = function(){
          window.webkit.messageHandlers.vlueLetteringNative.postMessage({type:'endCallKeepOverlay'});
        };
        window.VlueLettering.endCallOnly = window.VlueLettering.endCallKeepOverlay;
        window.VlueLettering.endCall = function(){
          window.webkit.messageHandlers.vlueLetteringNative.postMessage({type:'endCall'});
        };
        window.VlueLettering.revealSystemCallUi = function(){
          window.webkit.messageHandlers.vlueLetteringNative.postMessage({type:'revealSystemCallUi'});
        };
        window.VlueLettering.restoreShowcaseOverlay = function(){
          window.webkit.messageHandlers.vlueLetteringNative.postMessage({type:'restoreShowcaseOverlay'});
        };
        window.VlueLettering.setSpeakerphoneOn = function(v){
          window.webkit.messageHandlers.vlueLetteringNative.postMessage({type:'speaker', on: String(v)==='1'||v===true});
        };
        window.VlueLettering.setMicrophoneMute = function(v){
          window.webkit.messageHandlers.vlueLetteringNative.postMessage({type:'mute', on: String(v)==='1'||v===true});
        };
        window.VlueLettering.dismissOverlay = function(){
          window.webkit.messageHandlers.vlueLetteringNative.postMessage({type:'dismiss'});
        };
        """
        userContent.addUserScript(WKUserScript(source: bridge, injectionTime: .atDocumentStart, forMainFrameOnly: true))

        let wv = WKWebView(frame: .zero, configuration: config)
        let enc = phone.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? phone
        let dir = outgoing ? "outgoing" : "incoming"
        let ver = verified ? "1" : "0"
        let base = Bundle.main.object(forInfoDictionaryKey: "VLUEWebBaseURL") as? String ?? "https://www.vlue.kr"
        if let url = URL(string: "\(base)/#lettering-overlay?incoming=\(enc)&platform=ios&direction=\(dir)&verified=\(ver)&native=1") {
            wv.load(URLRequest(url: url))
        }

        let root = UIViewController()
        root.view.backgroundColor = .black
        wv.translatesAutoresizingMaskIntoConstraints = false
        root.view.addSubview(wv)
        NSLayoutConstraint.activate([
            wv.topAnchor.constraint(equalTo: root.view.topAnchor),
            wv.leadingAnchor.constraint(equalTo: root.view.leadingAnchor),
            wv.trailingAnchor.constraint(equalTo: root.view.trailingAnchor),
            wv.bottomAnchor.constraint(equalTo: root.view.bottomAnchor)
        ])

        let pan = UIPanGestureRecognizer(target: self, action: #selector(handlePan(_:)))
        root.view.addGestureRecognizer(pan)

        root.view.alpha = 0
        win.rootViewController = root
        win.makeKeyAndVisible()

        UIView.animate(withDuration: 0.32, delay: 0, options: .curveEaseOut) {
            root.view.alpha = 1
        }

        window = win
        webView = wv
        collapsedForSystemCall = false
    }

    @objc private func handlePan(_ gesture: UIPanGestureRecognizer) {
        guard let view = gesture.view else { return }
        let t = gesture.translation(in: view)
        if gesture.state == .ended {
            if t.y < -80 {
                revealSystemCallUi()
            } else if t.y > 80 && collapsedForSystemCall {
                restoreShowcaseOverlay()
            }
        }
    }

    func revealSystemCallUi() {
        guard let win = window else { return }
        collapsedForSystemCall = true
        UIView.animate(withDuration: 0.28) {
            win.transform = CGAffineTransform(translationX: 0, y: -UIScreen.main.bounds.height * 0.92)
            win.alpha = 0.15
        }
    }

    func restoreShowcaseOverlay() {
        guard let win = window else { return }
        collapsedForSystemCall = false
        UIView.animate(withDuration: 0.28) {
            win.transform = .identity
            win.alpha = 1
        }
    }

    func dismiss() {
        guard let root = window?.rootViewController else {
            window = nil
            webView = nil
            return
        }
        UIView.animate(withDuration: 0.26, animations: {
            root.view.alpha = 0
        }, completion: { _ in
            self.window?.isHidden = true
            self.window = nil
            self.webView = nil
        })
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "vlueLetteringNative",
              let body = message.body as? [String: Any],
              let type = body["type"] as? String else { return }

        switch type {
        case "endCallKeepOverlay":
            /* CXEndCallAction requires CXProvider for app-owned calls — PSTN는 순정 UI에 위임 */
            revealSystemCallUi()
        case "endCall", "dismiss":
            dismiss()
        case "revealSystemCallUi":
            revealSystemCallUi()
        case "restoreShowcaseOverlay":
            restoreShowcaseOverlay()
        case "speaker":
            let on = body["on"] as? Bool ?? false
            try? AVAudioSession.sharedInstance().setCategory(.playAndRecord, options: on ? [.defaultToSpeaker] : [])
            try? AVAudioSession.sharedInstance().overrideOutputAudioPort(on ? .speaker : .none)
        case "mute":
            /* 마이크 뮤트는 CallKit CXSetMutedCallAction 필요 — PSTN 제약 */
            break
        default:
            break
        }
    }
}
