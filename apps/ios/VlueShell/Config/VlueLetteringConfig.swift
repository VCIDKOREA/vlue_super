import Foundation

/// Android `VlueLetteringConfig` 와 동일 키 — Info.plist / xcconfig
enum VlueLetteringConfig {
    private static func string(forKey key: String, fallback: String) -> String {
        guard let raw = Bundle.main.object(forInfoDictionaryKey: key) as? String else {
            return fallback.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        }
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty || trimmed.hasPrefix("$(") {
            return fallback.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        }
        return trimmed.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    }

    static var apiBaseURL: String {
        string(forKey: "VLUE_API_BASE_URL", fallback: "https://api.vlue.kr")
    }

    static var webBaseURL: String {
        string(forKey: "VLUE_WEB_BASE_URL", fallback: "https://www.vlue.kr")
    }

    /// 레터링 오버레이 URL (iOS 플랫폼 태그)
    static func overlayURL(phone: String, verified: Bool, outgoing: Bool) -> String {
        let enc = phone.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? phone
        let dir = outgoing ? "outgoing" : "incoming"
        let ver = verified ? "1" : "0"
        return "\(webBaseURL)/#lettering-overlay?incoming=\(enc)&platform=ios&direction=\(dir)&verified=\(ver)&native=1"
    }
}
