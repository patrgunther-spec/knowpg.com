import Foundation
import FirebaseFirestore

struct ChatMessage: Codable, Identifiable {
    /// Firestore document ID
    let id: String
    /// UID of the sender
    let senderId: String
    /// Sender's display name (denormalized)
    var senderName: String
    /// The message text
    var text: String
    var createdAt: Date
}
