import Foundation
import UIKit

/// 메인 iOS 앱 진입점에서 1회 호출 — CallKit 옵저버 상시 구동
public enum LetteringBootstrap {
    public static func start() {
        do {
            LetteringCallObserver.shared.start()
            NSLog("[VlueLettering] CallObserver started")
        } catch {
            NSLog("[VlueLettering] bootstrap failed: \(error.localizedDescription)")
        }
    }

    public static func stop() {
        LetteringCallObserver.shared.stop()
    }

    /// SceneDelegate / AppDelegate — 포그라운드 복귀 시 권한·설정 재확인
    public static func onBecomeActive() {
        guard LetteringPrefs.isEnabled else { return }
        LetteringPermissionCoordinator.shared.requestIfNeeded()
    }
}
