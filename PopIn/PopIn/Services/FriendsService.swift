import Foundation
import FirebaseFirestore

/// Handles adding, removing, and listing friends
class FriendsService {
    private let db = Firestore.firestore()

    /// Look up a user by their 6-character friend code
    func findUserByCode(_ code: String) async throws -> AppUser? {
        let snapshot = try await db.collection("users")
            .whereField("friendCode", isEqualTo: code.uppercased())
            .limit(to: 1)
            .getDocuments()

        return snapshot.documents.first.flatMap { try? $0.data(as: AppUser.self) }
    }

    /// Add a friend (bidirectional — both users get each other)
    func addFriend(currentUser: AppUser, friend: AppUser) async throws {
        let batch = db.batch()

        // Add friend to current user's list
        let myFriendRef = db.collection("users").document(currentUser.id)
            .collection("friends").document(friend.id)
        batch.setData([
            "id": friend.id,
            "displayName": friend.displayName,
            "addedAt": FieldValue.serverTimestamp()
        ], forDocument: myFriendRef)

        // Add current user to friend's list
        let theirFriendRef = db.collection("users").document(friend.id)
            .collection("friends").document(currentUser.id)
        batch.setData([
            "id": currentUser.id,
            "displayName": currentUser.displayName,
            "addedAt": FieldValue.serverTimestamp()
        ], forDocument: theirFriendRef)

        try await batch.commit()
    }

    /// Remove a friend (bidirectional)
    func removeFriend(currentUserId: String, friendId: String) async throws {
        let batch = db.batch()

        let myFriendRef = db.collection("users").document(currentUserId)
            .collection("friends").document(friendId)
        batch.deleteDocument(myFriendRef)

        let theirFriendRef = db.collection("users").document(friendId)
            .collection("friends").document(currentUserId)
        batch.deleteDocument(theirFriendRef)

        try await batch.commit()
    }

    /// Listen to the current user's friends list (real-time)
    func listenToFriends(userId: String, onChange: @escaping ([Friend]) -> Void) -> ListenerRegistration {
        return db.collection("users").document(userId)
            .collection("friends")
            .order(by: "displayName")
            .addSnapshotListener { snapshot, error in
                guard let documents = snapshot?.documents else {
                    onChange([])
                    return
                }

                let friends = documents.compactMap { doc -> Friend? in
                    let data = doc.data()
                    guard let id = data["id"] as? String,
                          let displayName = data["displayName"] as? String else {
                        return nil
                    }
                    let addedAt = (data["addedAt"] as? Timestamp)?.dateValue() ?? Date()
                    return Friend(id: id, displayName: displayName, addedAt: addedAt)
                }

                onChange(friends)
            }
    }
}

/// A friend in your list
struct Friend: Identifiable {
    let id: String
    var displayName: String
    var addedAt: Date
}
