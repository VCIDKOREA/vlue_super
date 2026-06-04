import WebKit

final class VlueLetteringBlockHandler: NSObject, WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any],
              let phone = body["phone"] as? String else { return }
        BlockedPhoneStore.shared.add(phone: phone)
        LetteringOverlayPresenter.shared.dismiss()
    }
}

final class VlueLetteringOpenCertHandler: NSObject, WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        NotificationCenter.default.post(name: .vlueLetteringOpenCert, object: message.body)
        LetteringOverlayPresenter.shared.dismiss()
    }
}

final class VlueLetteringSettingsHandler: NSObject, WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if let body = message.body as? [String: Any], let enabled = body["enabled"] as? Bool {
            LetteringPrefs.setEnabled(enabled)
            if enabled { LetteringPermissionCoordinator.shared.requestIfNeeded() }
        } else if let body = message.body as? [String: Any], body["action"] as? String == "requestPermissions" {
            LetteringPermissionCoordinator.shared.requestIfNeeded()
        }
    }
}

final class BlockedPhoneStore {
    static let shared = BlockedPhoneStore()
    private let key = "vlue_lettering_blocked_phones"
    private init() {}

    func add(phone: String) {
        var set = UserDefaults.standard.stringArray(forKey: key) ?? []
        set.append(phone.filter(\.isNumber))
        UserDefaults.standard.set(set, forKey: key)
    }

    func isBlocked(phone: String) -> Bool {
        let digits = phone.filter(\.isNumber)
        return (UserDefaults.standard.stringArray(forKey: key) ?? []).contains(digits)
    }
}

final class LetteringPermissionCoordinator {
    static let shared = LetteringPermissionCoordinator()
    private init() {}

    func requestIfNeeded() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
    }
}


extension Notification.Name {
    static let vlueLetteringOpenCert = Notification.Name("vlueLetteringOpenCert")
}
