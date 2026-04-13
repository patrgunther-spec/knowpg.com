import Foundation
import FirebaseFirestore
import CoreLocation

/// Handles creating, reading, and deactivating pops in Firestore
class PopService {
    private let db = Firestore.firestore()
    private var listener: ListenerRegistration?

    /// Create a new pop (broadcast to friends)
    func createPop(
        creatorId: String,
        creatorName: String,
        destination: String,
        message: String?,
        location: CLLocationCoordinate2D
    ) async throws -> Pop {
        let docRef = db.collection("pops").document()
        let now = Date()

        let pop = Pop(
            id: docRef.documentID,
            creatorId: creatorId,
            creatorName: creatorName,
            destination: destination,
            message: message,
            latitude: location.latitude,
            longitude: location.longitude,
            isActive: true,
            createdAt: now,
            expiresAt: now.addingTimeInterval(4 * 3600) // 4 hours from now
        )

        try docRef.setData(from: pop)
        return pop
    }

    /// Deactivate a pop (creator ends it early)
    func deactivatePop(id: String) async throws {
        try await db.collection("pops").document(id).updateData([
            "isActive": false
        ])
    }

    /// Listen to active pops from a list of friend IDs (real-time updates)
    func listenToFriendPops(friendIds: [String], onChange: @escaping ([Pop]) -> Void) {
        // Clean up any existing listener
        listener?.remove()

        // If no friends, return empty
        guard !friendIds.isEmpty else {
            onChange([])
            return
        }

        // Firestore "in" queries support max 30 items — fine for MVP
        let ids = Array(friendIds.prefix(30))

        listener = db.collection("pops")
            .whereField("creatorId", in: ids)
            .whereField("isActive", isEqualTo: true)
            .order(by: "createdAt", descending: true)
            .addSnapshotListener { snapshot, error in
                guard let documents = snapshot?.documents else {
                    print("Error fetching pops: \(error?.localizedDescription ?? "unknown")")
                    onChange([])
                    return
                }

                let pops = documents.compactMap { doc -> Pop? in
                    try? doc.data(as: Pop.self)
                }.filter { !$0.isExpired } // client-side filter for expired pops

                onChange(pops)
            }
    }

    /// Listen to the current user's own active pops
    func listenToMyPops(userId: String, onChange: @escaping ([Pop]) -> Void) -> ListenerRegistration {
        return db.collection("pops")
            .whereField("creatorId", isEqualTo: userId)
            .whereField("isActive", isEqualTo: true)
            .order(by: "createdAt", descending: true)
            .addSnapshotListener { snapshot, error in
                guard let documents = snapshot?.documents else {
                    onChange([])
                    return
                }

                let pops = documents.compactMap { doc -> Pop? in
                    try? doc.data(as: Pop.self)
                }.filter { !$0.isExpired }

                onChange(pops)
            }
    }

    /// Stop listening
    func stopListening() {
        listener?.remove()
        listener = nil
    }
}
