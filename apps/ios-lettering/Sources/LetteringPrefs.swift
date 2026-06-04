import Foundation

/// UserDefaults — 레터링 on/off (Android SharedPreferences와 동일 키 의미)
public enum LetteringPrefs {
    private static let enabledKey = "vlue_lettering_enabled"

    public static var isEnabled: Bool {
        UserDefaults.standard.bool(forKey: enabledKey)
    }

    public static func setEnabled(_ value: Bool) {
        UserDefaults.standard.set(value, forKey: enabledKey)
    }
}
