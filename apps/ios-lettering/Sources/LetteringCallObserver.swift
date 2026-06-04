import CallKit
import Foundation

/// CXCallObserver — 통화 시작/종료 (Android PHONE_STATE 대응)
public final class LetteringCallObserver: NSObject, CXCallObserverDelegate {
    public static let shared = LetteringCallObserver()
    private let observer = CXCallObserver()
    private var started = false

    public func start() {
        guard !started else { return }
        do {
            observer.setDelegate(self, queue: nil)
            started = true
        } catch {
            NSLog("[VlueLettering] CallObserver start failed: \(error.localizedDescription)")
        }
    }

    public func stop() {
        started = false
    }

    public func callObserver(_ callObserver: CXCallObserver, callChanged call: CXCall) {
        guard LetteringPrefs.isEnabled else { return }

        do {
            if call.hasEnded {
                LetteringOverlayPresenter.shared.dismiss()
                return
            }
            if call.isOutgoing || call.hasConnected {
                NotificationCenter.default.post(
                    name: .vlueLetteringCallActive,
                    object: nil,
                    userInfo: ["outgoing": call.isOutgoing]
                )
            }
        } catch {
            NSLog("[VlueLettering] callChanged failed: \(error.localizedDescription)")
        }
    }
}

public extension Notification.Name {
    static let vlueLetteringCallActive = Notification.Name("vlueLetteringCallActive")
}
