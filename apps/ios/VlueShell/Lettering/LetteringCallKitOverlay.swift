import CallKit
import UIKit
import WebKit
import AVFoundation

/// iOS 최종: CallKit CXCallObserver + 전면 WebView 쇼케이스 오버레이
/// (순정 전화 UI를 완전히 대체할 수는 없으나, 전면 풀케이스로 덮고 스와이프 업으로 순정 UI 노출)
enum LetteringShellBootstrap {
    static func start() {
        LetteringShellCallObserver.shared.start()
        NotificationCenter.default.addObserver(
            forName: .vlueLetteringShellCallActive,
            object: nil,
            queue: .main
        ) { note in
            let outgoing = note.userInfo?["outgoing"] as? Bool ?? false
            let phone = LetteringShellCallObserver.shared.lastKnownPeerPhone
            guard !phone.isEmpty else { return }
            LetteringShellOverlayPresenter.shared.present(
                phone: phone,
                verified: LetteringShellCallObserver.shared.lastKnownVerified,
                outgoing: outgoing
            )
        }
    }
}

extension Notification.Name {
    static let vlueLetteringShellCallActive = Notification.Name("vlueLetteringShellCallActive")
    static let vlueLetteringShellPeerHint = Notification.Name("vlueLetteringShellPeerHint")
}

final class LetteringShellCallObserver: NSObject, CXCallObserverDelegate {
    static let shared = LetteringShellCallObserver()
    private let observer = CXCallObserver()
    private var started = false
    private(set) var lastKnownPeerPhone: String = ""
    var lastKnownVerified: Bool = false

    func start() {
        guard !started else { return }
        observer.setDelegate(self, queue: nil)
        started = true
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(onHint(_:)),
            name: .vlueLetteringShellPeerHint,
            object: nil
        )
    }

    func injectPeer(phone: String, verified: Bool = false) {
        lastKnownPeerPhone = phone
        lastKnownVerified = verified
    }

    @objc private func onHint(_ note: Notification) {
        let phone = note.userInfo?["phone"] as? String ?? ""
        let verified = note.userInfo?["verified"] as? Bool ?? false
        if !phone.isEmpty { injectPeer(phone: phone, verified: verified) }
    }

    func callObserver(_ callObserver: CXCallObserver, callChanged call: CXCall) {
        if call.hasEnded {
            return
        }
        if call.isOutgoing || call.hasConnected || !call.hasEnded {
            NotificationCenter.default.post(
                name: .vlueLetteringShellCallActive,
                object: nil,
                userInfo: ["outgoing": call.isOutgoing]
            )
        }
    }
}

final class LetteringShellOverlayPresenter: NSObject, WKScriptMessageHandler {
    static let shared = LetteringShellOverlayPresenter()
    private var window: UIWindow?
    private var webView: WKWebView?
    private var collapsed = false

    func present(phone: String, verified: Bool, outgoing: Bool) {
        dismissImmediate()
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        guard let scene = scenes.first(where: {
            $0.activationState == .foregroundActive || $0.activationState == .foregroundInactive
        }) ?? scenes.first else { return }

        let win = UIWindow(windowScene: scene)
        win.windowLevel = .statusBar + 2
        win.backgroundColor = .black

        let config = WKWebViewConfiguration()
        config.userContentController.add(self, name: "vlueLetteringNative")
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
          window.webkit.messageHandlers.vlueLetteringNative.postMessage({type:'speaker', on:!!(v===true||v==='1')});
        };
        window.VlueLettering.setMicrophoneMute = function(){};
        window.VlueLettering.dismissOverlay = function(){
          window.webkit.messageHandlers.vlueLetteringNative.postMessage({type:'dismiss'});
        };
        window.VlueLettering.playDtmfTone = function(){ return false; };
        window.VlueLettering.stopDtmfTone = function(){};
        """
        config.userContentController.addUserScript(
            WKUserScript(source: bridge, injectionTime: .atDocumentStart, forMainFrameOnly: true)
        )

        let wv = WKWebView(frame: .zero, configuration: config)
        if let url = URL(string: VlueLetteringConfig.overlayURL(phone: phone, verified: verified, outgoing: outgoing)) {
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
        root.view.addGestureRecognizer(UIPanGestureRecognizer(target: self, action: #selector(onPan(_:))))

        win.rootViewController = root
        win.makeKeyAndVisible()
        root.view.alpha = 0
        UIView.animate(withDuration: 0.28) { root.view.alpha = 1 }

        window = win
        webView = wv
        collapsed = false
    }

    @objc private func onPan(_ g: UIPanGestureRecognizer) {
        guard g.state == .ended, let v = g.view else { return }
        let t = g.translation(in: v)
        if t.y < -80 { revealSystemCallUi() }
        else if t.y > 80 && collapsed { restoreShowcase() }
    }

    func revealSystemCallUi() {
        guard let win = window else { return }
        collapsed = true
        UIView.animate(withDuration: 0.28) {
            win.transform = CGAffineTransform(translationX: 0, y: -UIScreen.main.bounds.height * 0.92)
            win.alpha = 0.12
        }
    }

    func restoreShowcase() {
        guard let win = window else { return }
        collapsed = false
        UIView.animate(withDuration: 0.28) {
            win.transform = .identity
            win.alpha = 1
        }
    }

    func dismiss() {
        UIView.animate(withDuration: 0.22, animations: {
            self.window?.alpha = 0
        }, completion: { _ in
            self.dismissImmediate()
        })
    }

    private func dismissImmediate() {
        window?.isHidden = true
        window = nil
        webView = nil
        collapsed = false
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "vlueLetteringNative",
              let body = message.body as? [String: Any],
              let type = body["type"] as? String else { return }
        switch type {
        case "endCallKeepOverlay", "revealSystemCallUi":
            revealSystemCallUi()
        case "restoreShowcaseOverlay":
            restoreShowcase()
        case "endCall", "dismiss":
            dismiss()
        case "speaker":
            let on = body["on"] as? Bool ?? false
            try? AVAudioSession.sharedInstance().setCategory(.playAndRecord, options: on ? [.defaultToSpeaker] : [])
            try? AVAudioSession.sharedInstance().overrideOutputAudioPort(on ? .speaker : .none)
        default:
            break
        }
    }
}
