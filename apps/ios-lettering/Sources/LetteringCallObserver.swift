import CallKit
import Foundation

/// CXCallObserver — 통화 시작/종료 (Android PHONE_STATE 대응)
/// 번호는 CallKit이 PSTN 원격번호를 노출하지 않으므로, 최근 조회 캐시 / 외부 inject를 사용.
public final class LetteringCallObserver: NSObject, CXCallObserverDelegate {
    public static let shared = LetteringCallObserver()
    private let observer = CXCallObserver()
    private var started = false
    /// 앱·Call Directory·딥링크에서 주입한 최근 상대 번호
    public private(set) var lastKnownPeerPhone: String = ""
    public var lastKnownVerified: Bool = false

    public func start() {
        guard !started else { return }
        observer.setDelegate(self, queue: nil)
        started = true
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(onPeerHint(_:)),
            name: .vlueLetteringPeerPhoneHint,
            object: nil
        )
    }

    public func stop() {
        started = false
        NotificationCenter.default.removeObserver(self)
    }

    public func injectPeerPhone(_ phone: String, verified: Bool = false) {
        lastKnownPeerPhone = phone
        lastKnownVerified = verified
    }

    @objc private func onPeerHint(_ note: Notification) {
        let phone = note.userInfo?["phone"] as? String ?? ""
        let verified = note.userInfo?["verified"] as? Bool ?? false
        if !phone.isEmpty {
            injectPeerPhone(phone, verified: verified)
        }
    }

    public func callObserver(_ callObserver: CXCallObserver, callChanged call: CXCall) {
        guard LetteringPrefs.isEnabled else { return }

        if call.hasEnded {
            /* 종료 후에도 쇼케이스 유지(사후 감상) — 즉시 dismiss 하지 않음 */
            NotificationCenter.default.post(name: .vlueLetteringCallEnded, object: nil)
            return
        }

        if call.isOutgoing || call.hasConnected || !call.hasEnded {
            NotificationCenter.default.post(
                name: .vlueLetteringCallActive,
                object: nil,
                userInfo: ["outgoing": call.isOutgoing]
            )
            let phone = lastKnownPeerPhone
            if !phone.isEmpty {
                DispatchQueue.main.async {
                    LetteringOverlayPresenter.shared.present(
                        phone: phone,
                        verified: self.lastKnownVerified,
                        outgoing: call.isOutgoing
                    )
                }
            }
        }
    }
}

public extension Notification.Name {
    static let vlueLetteringCallActive = Notification.Name("vlueLetteringCallActive")
    static let vlueLetteringCallEnded = Notification.Name("vlueLetteringCallEnded")
    static let vlueLetteringPeerPhoneHint = Notification.Name("vlueLetteringPeerPhoneHint")
}
