import SwiftUI

@main
struct VlueShellApp: App {
    var body: some Scene {
        WindowGroup {
            MainViewControllerRepresentable()
                .ignoresSafeArea()
        }
    }
}

/// UIKit `MainViewController` 를 SwiftUI 앱 진입점에 연결
struct MainViewControllerRepresentable: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> MainViewController {
        MainViewController()
    }

    func updateUIViewController(_ uiViewController: MainViewController, context: Context) {}
}
