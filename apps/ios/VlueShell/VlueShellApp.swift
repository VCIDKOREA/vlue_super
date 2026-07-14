import SwiftUI

@main
struct VlueShellApp: App {
    @UIApplicationDelegateAdaptor(VlueShellAppDelegate.self) private var appDelegate

    var body: some Scene {
        WindowGroup {
            MainViewControllerRepresentable()
                .ignoresSafeArea()
        }
    }
}

struct MainViewControllerRepresentable: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> MainViewController {
        MainViewController()
    }

    func updateUIViewController(_ uiViewController: MainViewController, context: Context) {}
}

final class VlueShellAppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        LetteringShellBootstrap.start()
        return true
    }

    func application(
        _ app: UIApplication,
        open url: URL,
        options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    ) -> Bool {
        /* vlue://lettering?phone=010...&verified=1 */
        guard url.scheme == "vlue", url.host == "lettering" else { return false }
        let items = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []
        let phone = items.first(where: { $0.name == "phone" })?.value
            ?? items.first(where: { $0.name == "incoming" })?.value
            ?? ""
        let verified = (items.first(where: { $0.name == "verified" })?.value == "1")
        if !phone.isEmpty {
            LetteringShellCallObserver.shared.injectPeer(phone: phone, verified: verified)
            LetteringShellOverlayPresenter.shared.present(phone: phone, verified: verified, outgoing: false)
        }
        return true
    }
}
