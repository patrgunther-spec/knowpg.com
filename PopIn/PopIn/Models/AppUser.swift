import Foundation
import FirebaseFirestore

struct AppUser: Codable, Identifiable {
    /// Firebase Auth UID
    let id: String
    /// Display name from Apple ID
    var displayName: String
    /// 6-character code friends use to add you (e.g. "POP3FK")
    var friendCode: String
    /// FCM device token for push notifications (Phase 2)
    var fcmToken: String?
    var createdAt: Date

    /// Generate a random 6-character friend code
    static func generateFriendCode() -> String {
        let chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no I/O/0/1 to avoid confusion
        return String((0..<6).map { _ in chars.randomElement()! })
    }
}
