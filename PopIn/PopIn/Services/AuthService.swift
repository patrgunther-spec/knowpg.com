import Foundation
import AuthenticationServices
import FirebaseAuth
import FirebaseFirestore
import CryptoKit

/// Handles Apple Sign In + Firebase Auth + user profile in Firestore
@Observable
class AuthService {
    var currentUser: AppUser?
    var isSignedIn: Bool = false
    var isLoading: Bool = true

    private var authStateListener: AuthStateDidChangeListenerHandle?
    private let db = Firestore.firestore()

    // Apple Sign In requires a nonce for security
    private var currentNonce: String?

    init() {
        listenToAuthState()
    }

    deinit {
        if let listener = authStateListener {
            Auth.auth().removeStateDidChangeListener(listener)
        }
    }

    // MARK: - Auth State

    private func listenToAuthState() {
        authStateListener = Auth.auth().addStateDidChangeListener { [weak self] _, firebaseUser in
            guard let self else { return }
            if let firebaseUser {
                Task {
                    await self.fetchOrCreateUser(firebaseUser: firebaseUser)
                }
            } else {
                self.currentUser = nil
                self.isSignedIn = false
                self.isLoading = false
            }
        }
    }

    // MARK: - Apple Sign In

    /// Call this to start the Apple Sign In flow. Returns the nonce needed for the request.
    func prepareAppleSignIn() -> String {
        let nonce = randomNonceString()
        currentNonce = nonce
        return nonce
    }

    /// SHA256 hash of the nonce (Apple requires this in the request)
    func sha256(_ input: String) -> String {
        let data = Data(input.utf8)
        let hash = SHA256.hash(data: data)
        return hash.map { String(format: "%02x", $0) }.joined()
    }

    /// Handle the Apple Sign In credential after the user authenticates
    func handleAppleSignIn(credential: ASAuthorizationAppleIDCredential) async throws {
        guard let nonce = currentNonce,
              let appleIDToken = credential.identityToken,
              let idTokenString = String(data: appleIDToken, encoding: .utf8) else {
            throw AuthError.missingCredential
        }

        let firebaseCredential = OAuthProvider.appleCredential(
            withIDToken: idTokenString,
            rawNonce: nonce,
            fullName: credential.fullName
        )

        let result = try await Auth.auth().signIn(with: firebaseCredential)

        // On first sign in, Apple provides the name. Save it.
        var displayName = result.user.displayName ?? "Pop In User"
        if let fullName = credential.fullName {
            let parts = [fullName.givenName, fullName.familyName].compactMap { $0 }
            if !parts.isEmpty {
                displayName = parts.joined(separator: " ")
            }
        }

        await fetchOrCreateUser(firebaseUser: result.user, overrideName: displayName)
    }

    // MARK: - Firestore User

    private func fetchOrCreateUser(firebaseUser: User, overrideName: String? = nil) async {
        let docRef = db.collection("users").document(firebaseUser.uid)

        do {
            let document = try await docRef.getDocument()
            if document.exists, let user = try? document.data(as: AppUser.self) {
                self.currentUser = user
            } else {
                // First time — create user profile
                let newUser = AppUser(
                    id: firebaseUser.uid,
                    displayName: overrideName ?? firebaseUser.displayName ?? "Pop In User",
                    friendCode: AppUser.generateFriendCode(),
                    fcmToken: nil,
                    createdAt: Date()
                )
                try docRef.setData(from: newUser)
                self.currentUser = newUser
            }
            self.isSignedIn = true
        } catch {
            print("Error fetching/creating user: \(error)")
        }
        self.isLoading = false
    }

    // MARK: - Sign Out

    func signOut() throws {
        try Auth.auth().signOut()
        currentUser = nil
        isSignedIn = false
    }

    // MARK: - Helpers

    private func randomNonceString(length: Int = 32) -> String {
        var randomBytes = [UInt8](repeating: 0, count: length)
        _ = SecRandomCopyBytes(kSecRandomDefault, randomBytes.count, &randomBytes)
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        return String(randomBytes.map { charset[Int($0) % charset.count] })
    }
}

enum AuthError: LocalizedError {
    case missingCredential

    var errorDescription: String? {
        switch self {
        case .missingCredential:
            return "Missing sign-in credential. Please try again."
        }
    }
}
