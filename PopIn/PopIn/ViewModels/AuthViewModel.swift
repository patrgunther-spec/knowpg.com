import Foundation
import AuthenticationServices

/// Coordinates the Apple Sign In UI flow with AuthService
@Observable
class AuthViewModel {
    var errorMessage: String?
    var isProcessing = false

    private let authService: AuthService

    init(authService: AuthService) {
        self.authService = authService
    }

    /// Configure the Apple Sign In request with the required nonce
    func configureAppleSignIn(_ request: ASAuthorizationAppleIDRequest) {
        let nonce = authService.prepareAppleSignIn()
        request.requestedScopes = [.fullName, .email]
        request.nonce = authService.sha256(nonce)
    }

    /// Handle the result of Apple Sign In
    func handleAppleSignIn(result: Result<ASAuthorization, Error>) {
        isProcessing = true
        errorMessage = nil

        Task { @MainActor in
            switch result {
            case .success(let authorization):
                if let credential = authorization.credential as? ASAuthorizationAppleIDCredential {
                    do {
                        try await authService.handleAppleSignIn(credential: credential)
                    } catch {
                        errorMessage = error.localizedDescription
                    }
                }
            case .failure(let error):
                // User cancelled — don't show an error for that
                if (error as NSError).code != ASAuthorizationError.canceled.rawValue {
                    errorMessage = error.localizedDescription
                }
            }
            isProcessing = false
        }
    }
}
