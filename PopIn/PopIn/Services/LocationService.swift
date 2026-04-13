import Foundation
import CoreLocation

/// One-shot location service. Grabs the user's current location when they send a pop.
@Observable
class LocationService: NSObject, CLLocationManagerDelegate {
    var currentLocation: CLLocationCoordinate2D?
    var authorizationStatus: CLAuthorizationStatus = .notDetermined
    var locationError: String?

    private let manager = CLLocationManager()
    private var continuation: CheckedContinuation<CLLocationCoordinate2D, Error>?

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters // good enough, saves battery
        authorizationStatus = manager.authorizationStatus
    }

    /// Request "When In Use" location permission
    func requestPermission() {
        manager.requestWhenInUseAuthorization()
    }

    /// Get the user's current location (one-shot). Async/await friendly.
    func getCurrentLocation() async throws -> CLLocationCoordinate2D {
        // Request permission if needed
        if authorizationStatus == .notDetermined {
            requestPermission()
            // Wait a moment for the permission dialog
            try await Task.sleep(for: .seconds(0.5))
        }

        guard authorizationStatus == .authorizedWhenInUse ||
              authorizationStatus == .authorizedAlways else {
            throw LocationError.permissionDenied
        }

        return try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation
            manager.requestLocation()
        }
    }

    // MARK: - CLLocationManagerDelegate

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        if let location = locations.first {
            currentLocation = location.coordinate
            continuation?.resume(returning: location.coordinate)
            continuation = nil
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        locationError = error.localizedDescription
        continuation?.resume(throwing: error)
        continuation = nil
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        authorizationStatus = manager.authorizationStatus
    }
}

enum LocationError: LocalizedError {
    case permissionDenied

    var errorDescription: String? {
        switch self {
        case .permissionDenied:
            return "Location permission is needed to show friends where you are. Enable it in Settings."
        }
    }
}
