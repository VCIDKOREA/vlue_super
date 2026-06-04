import UIKit
import WebKit

/// Live Activity / 상단 카드 — WKWebView `#lettering-overlay` 로드
final class LetteringOverlayPresenter {
    static let shared = LetteringOverlayPresenter()
    private var window: UIWindow?
    private var webView: WKWebView?

    func present(phone: String, verified: Bool, outgoing: Bool) {
        guard LetteringPrefs.isEnabled else { return }
        dismiss()

        let scene = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first { $0.activationState == .foregroundActive }
        guard let scene else { return }

        let win = UIWindow(windowScene: scene)
        win.windowLevel = .alert + 1
        win.backgroundColor = .clear

        let config = WKWebViewConfiguration()
        let userContent = config.userContentController
        userContent.add(VlueLetteringBlockHandler(), name: "vlueLetteringBlock")
        userContent.add(VlueLetteringOpenCertHandler(), name: "vlueLetteringOpenCert")
        userContent.add(VlueLetteringSettingsHandler(), name: "vlueLetteringSettings")

        let wv = WKWebView(frame: .zero, configuration: config)
        let enc = phone.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? phone
        let dir = outgoing ? "outgoing" : "incoming"
        let ver = verified ? "1" : "0"
        let base = Bundle.main.object(forInfoDictionaryKey: "VLUEWebBaseURL") as? String ?? "https://www.vlue.kr"
        if let url = URL(string: "\(base)/#lettering-overlay?incoming=\(enc)&platform=ios&direction=\(dir)&verified=\(ver)&native=1") {
            wv.load(URLRequest(url: url))
        }

        let root = UIViewController()
        root.view.backgroundColor = .clear
        wv.translatesAutoresizingMaskIntoConstraints = false
        root.view.addSubview(wv)
        NSLayoutConstraint.activate([
            wv.topAnchor.constraint(equalTo: root.view.safeAreaLayoutGuide.topAnchor, constant: 8),
            wv.leadingAnchor.constraint(equalTo: root.view.leadingAnchor, constant: 8),
            wv.trailingAnchor.constraint(equalTo: root.view.trailingAnchor, constant: -8),
            wv.heightAnchor.constraint(lessThanOrEqualToConstant: 420)
        ])

        root.view.alpha = 0
        root.view.transform = CGAffineTransform(translationX: 0, y: -40)
        win.rootViewController = root
        win.makeKeyAndVisible()

        UIView.animate(withDuration: 0.32, delay: 0, options: .curveEaseOut) {
            root.view.alpha = 1
            root.view.transform = .identity
        }

        window = win
        webView = wv
    }

    func dismiss() {
        guard let root = window?.rootViewController else {
            window = nil
            webView = nil
            return
        }
        UIView.animate(withDuration: 0.26, animations: {
            root.view.alpha = 0
            root.view.transform = CGAffineTransform(translationX: 0, y: -36)
        }, completion: { _ in
            self.window?.isHidden = true
            self.window = nil
            self.webView = nil
        })
    }
}
