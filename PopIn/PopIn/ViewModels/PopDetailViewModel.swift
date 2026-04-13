import Foundation
import FirebaseFirestore

/// Manages the detail view for a single pop: map data + chat messages
@Observable
class PopDetailViewModel {
    var pop: Pop
    var messages: [ChatMessage] = []
    var newMessageText: String = ""

    private let chatService = ChatService()
    private var messagesListener: ListenerRegistration?

    init(pop: Pop) {
        self.pop = pop
    }

    func startListening() {
        messagesListener = chatService.listenToMessages(popId: pop.id) { [weak self] messages in
            self?.messages = messages
        }
    }

    func sendMessage(senderId: String, senderName: String) {
        let text = newMessageText.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }

        let popId = pop.id
        newMessageText = ""

        Task {
            try? await chatService.sendMessage(
                popId: popId,
                senderId: senderId,
                senderName: senderName,
                text: text
            )
        }
    }

    func stopListening() {
        messagesListener?.remove()
    }
}
