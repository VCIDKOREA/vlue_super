import SwiftUI
import VlueLettering

@main
struct VlueHostApp: App {
    @UIApplicationDelegateAdaptor(VlueAppDelegate.self) private var appDelegate

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

struct ContentView: View {
    var body: some View {
        Text("VLUE Host — 레터링 모듈 로드됨")
            .padding()
    }
}

/// UIKit AppDelegate — 메인 타겟에 동일 코드 merge
final class VlueAppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        LetteringBootstrap.start()
        return true
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        LetteringBootstrap.onBecomeActive()
    }
}
