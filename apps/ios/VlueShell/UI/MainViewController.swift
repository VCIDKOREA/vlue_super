import UIKit
import WebKit

/// 전체 화면 WKWebView — VLUE 웹 서비스 + 가족보호 브릿지 스텁
final class MainViewController: UIViewController {
    private var webView: WKWebView!
    private let bridgeHandler = VlueFamilyBridgeMessageHandler()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        setupWebView()
        loadServiceURL()
    }

    deinit {
        webView?.configuration.userContentController.removeScriptMessageHandler(
            forName: VlueFamilyBridge.messageHandlerName
        )
    }

    private func setupWebView() {
        let config = WKWebViewConfiguration()
        let preferences = WKWebpagePreferences()
        preferences.allowsContentJavaScript = true
        config.defaultWebpagePreferences = preferences
        config.preferences.javaScriptCanOpenWindowsAutomatically = true

        let userContent = WKUserContentController()
        userContent.add(bridgeHandler, name: VlueFamilyBridge.messageHandlerName)
        config.userContentController = userContent

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        view.addSubview(webView)

        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])
    }

    private func loadServiceURL() {
        let base = VlueLetteringConfig.webBaseURL
        guard let url = URL(string: "\(base)/") else {
            NSLog("[MainViewController] invalid web base URL: %@", base)
            return
        }
        webView.load(URLRequest(url: url))
    }
}

extension MainViewController: WKNavigationDelegate {
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        VlueFamilyBridge.inject(into: webView)
        VlueFamilyBridge.evaluateBridgeSelfTest(on: webView)
    }

    func webView(
        _ webView: WKWebView,
        didFail navigation: WKNavigation!,
        withError error: Error
    ) {
        NSLog("[MainViewController] navigation failed: %@", error.localizedDescription)
    }

    func webView(
        _ webView: WKWebView,
        didFailProvisionalNavigation navigation: WKNavigation!,
        withError error: Error
    ) {
        NSLog("[MainViewController] provisional navigation failed: %@", error.localizedDescription)
    }
}
