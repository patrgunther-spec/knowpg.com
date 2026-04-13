import Foundation
import FirebaseFirestore

/// Handles sending and listening to chat messages within a pop
class ChatService {
    private let db = Firestore.firestore()

    /// Send a message to a pop's chat thread
    func sendMessage(
        popId: String,
        senderId: String,
        senderName: String,
        text: String
    ) async throws {
        let docRef = db.collection("pops").document(popId)
            .collection("messages").document()

        let message = ChatMessage(
            id: docRef.documentID,
            senderId: senderId,
            senderName: senderName,
            text: text,
            createdAt: Date()
        )

        try docRef.setData(from: message)
    }

    /// Listen to messages in a pop's chat (real-time, ordered by time)
    func listenToMessages(popId: String, onChange: @escaping ([ChatMessage]) -> Void) -> ListenerRegistration {
        return db.collection("pops").document(popId)
            .collection("messages")
            .order(by: "createdAt", descending: false)
            .addSnapshotListener { snapshot, error in
                guard let documents = snapshot?.documents else {
                    onChange([])
                    return
                }

                let messages = documents.compactMap { doc -> ChatMessage? in
                    try? doc.data(as: ChatMessage.self)
                }

                onChange(messages)
            }
    }
}
