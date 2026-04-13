import Foundation
import FirebaseFirestore

/// Manages the home feed of active pops from friends
@Observable
class HomeViewModel {
    var friendPops: [Pop] = []
    var myPops: [Pop] = []
    var isLoading = true

    private let popService = PopService()
    private let friendsService = FriendsService()
    private var friendsListener: ListenerRegistration?
    private var myPopsListener: ListenerRegistration?

    func startListening(userId: String) {
        // Listen to friends list, then listen to their pops
        friendsListener = friendsService.listenToFriends(userId: userId) { [weak self] friends in
            guard let self else { return }
            let friendIds = friends.map(\.id)
            self.popService.listenToFriendPops(friendIds: friendIds) { [weak self] pops in
                self?.friendPops = pops
                self?.isLoading = false
            }
        }

        // Also listen to my own active pops
        myPopsListener = popService.listenToMyPops(userId: userId) { [weak self] pops in
            self?.myPops = pops
        }
    }

    /// Deactivate one of your own pops
    func endPop(_ pop: Pop) {
        Task {
            try? await popService.deactivatePop(id: pop.id)
        }
    }

    func stopListening() {
        popService.stopListening()
        friendsListener?.remove()
        myPopsListener?.remove()
    }
}
