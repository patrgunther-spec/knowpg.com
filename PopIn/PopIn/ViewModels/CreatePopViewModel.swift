import Foundation
import CoreLocation

/// Handles creating a new pop: gets location, writes to Firestore
@Observable
class CreatePopViewModel {
    var destination: String = ""
    var message: String = ""
    var isCreating = false
    var errorMessage: String?

    private let popService = PopService()
    private let locationService = LocationService()

    /// Whether the form is ready to submit
    var canSend: Bool {
        !destination.trimmingCharacters(in: .whitespaces).isEmpty && !isCreating
    }

    /// Create and send the pop
    func sendPop(creatorId: String, creatorName: String) async -> Bool {
        isCreating = true
        errorMessage = nil

        do {
            // Grab current location
            let location = try await locationService.getCurrentLocation()

            // Create the pop in Firestore
            _ = try await popService.createPop(
                creatorId: creatorId,
                creatorName: creatorName,
                destination: destination.trimmingCharacters(in: .whitespaces),
                message: message.trimmingCharacters(in: .whitespaces).isEmpty ? nil : message.trimmingCharacters(in: .whitespaces),
                location: location
            )

            isCreating = false
            return true
        } catch {
            errorMessage = error.localizedDescription
            isCreating = false
            return false
        }
    }
}
