import Foundation
import FirebaseFirestore

/// Manages the friends list and adding new friends by code
@Observable
class FriendsViewModel {
    var friends: [Friend] = []
    var friendCodeInput: String = ""
    var isAdding = false
    var errorMessage: String?
    var successMessage: String?
    var showAddFriend = false

    private let friendsService = FriendsService()
    private var listener: ListenerRegistration?

    func startListening(userId: String) {
        listener = friendsService.listenToFriends(userId: userId) { [weak self] friends in
            self?.friends = friends
        }
    }

    /// Add a friend by their 6-character code
    func addFriend(currentUser: AppUser) async {
        let code = friendCodeInput.trimmingCharacters(in: .whitespaces).uppercased()
        guard code.count == 6 else {
            errorMessage = "Friend codes are 6 characters long."
            return
        }

        guard code != currentUser.friendCode else {
            errorMessage = "That's your own code!"
            return
        }

        isAdding = true
        errorMessage = nil
        successMessage = nil

        do {
            guard let friend = try await friendsService.findUserByCode(code) else {
                errorMessage = "No one found with that code. Double-check it!"
                isAdding = false
                return
            }

            // Check if already friends
            if friends.contains(where: { $0.id == friend.id }) {
                errorMessage = "\(friend.displayName) is already your friend!"
                isAdding = false
                return
            }

            try await friendsService.addFriend(currentUser: currentUser, friend: friend)
            successMessage = "\(friend.displayName) added!"
            friendCodeInput = ""
        } catch {
            errorMessage = error.localizedDescription
        }

        isAdding = false
    }

    /// Remove a friend
    func removeFriend(currentUserId: String, friendId: String) {
        Task {
            try? await friendsService.removeFriend(currentUserId: currentUserId, friendId: friendId)
        }
    }

    func stopListening() {
        listener?.remove()
    }
}
