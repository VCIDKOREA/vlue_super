import UIKit
import VlueLettering

/**
 * 기존 메인 앱 AppDelegate에 붙여넣기:
 *
 * func application(_ application: UIApplication,
 *                  didFinishLaunchingWithOptions ...) -> Bool {
 *     LetteringBootstrap.start()
 *     return true
 * }
 *
 * func applicationDidBecomeActive(_ application: UIApplication) {
 *     LetteringBootstrap.onBecomeActive()
 * }
 */

/// SceneDelegate 사용 시
public final class VlueLetteringSceneDelegate: NSObject, UIWindowSceneDelegate {
    public func sceneDidBecomeActive(_ scene: UIScene) {
        LetteringBootstrap.onBecomeActive()
    }
}
