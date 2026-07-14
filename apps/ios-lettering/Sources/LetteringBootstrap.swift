import Foundation
import UIKit

/// 메인 iOS 앱 진입점에서 1회 호출 — CallKit 옵저버 + 전면 오버레이 배선
public enum LetteringBootstrap {
    public static func start() {
        LetteringCallObserver.shared.start()
        NotificationCenter.default.addObserver(
            forName: .vlueLetteringCallActive,
            object: nil,
            queue: .main
        ) { note in
            let outgoing = (note.userInfo?["outgoing"] as? Bool) ?? false
            let phone = LetteringCallObserver.shared.lastKnownPeerPhone
            guard !phone.isEmpty else {
                NSLog("[VlueLettering] call active but peer phone unknown — inject via PeerPhoneHint")
                return
            }
            LetteringOverlayPresenter.shared.present(
                phone: phone,
                verified: LetteringCallObserver.shared.lastKnownVerified,
                outgoing: outgoing
            )
        }
        NSLog("[VlueLettering] CallObserver + overlay wiring started")
    }

    public static func stop() {
        LetteringCallObserver.shared.stop()
    }

    public static func onBecomeActive() {
        guard LetteringPrefs.isEnabled else { return }
        LetteringPermissionCoordinator.shared.requestIfNeeded()
    }

    /// 통화 직전/수신 딥링크에서 번호 주입
    public static func injectPeerPhone(_ phone: String, verified: Bool = false) {
        LetteringCallObserver.shared.injectPeerPhone(phone, verified: verified)
    }
}
