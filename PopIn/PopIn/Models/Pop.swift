import Foundation
import FirebaseFirestore
import CoreLocation

struct Pop: Codable, Identifiable {
    /// Firestore document ID
    let id: String
    /// UID of the person who sent this pop
    let creatorId: String
    /// Creator's display name (denormalized for fast reads)
    var creatorName: String
    /// Where they're headed — "Central Park", "Joe's Pizza"
    var destination: String
    /// Optional extra context — "getting there around 8"
    var message: String?
    /// Creator's latitude when the pop was sent
    var latitude: Double
    /// Creator's longitude when the pop was sent
    var longitude: Double
    /// Whether this pop is still active
    var isActive: Bool
    var createdAt: Date
    /// Auto-expires after 4 hours
    var expiresAt: Date

    /// Convenience: CLLocationCoordinate2D from stored lat/lng
    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }

    /// How long until this pop expires, as a human-readable string
    var timeRemaining: String {
        let remaining = expiresAt.timeIntervalSinceNow
        if remaining <= 0 { return "Expired" }
        let hours = Int(remaining) / 3600
        let minutes = (Int(remaining) % 3600) / 60
        if hours > 0 {
            return "\(hours)h \(minutes)m left"
        }
        return "\(minutes)m left"
    }

    /// Whether this pop has expired
    var isExpired: Bool {
        expiresAt < Date()
    }
}
