import SwiftUI
import AuthenticationServices

struct SignInView: View {
    @Environment(AuthService.self) private var authService
    @State private var viewModel: AuthViewModel?

    var body: some View {
        VStack(spacing: 40) {
            Spacer()

            // App branding
            VStack(spacing: 12) {
                Image(systemName: "figure.wave")
                    .font(.system(size: 80))
                    .foregroundStyle(.blue)

                Text("Pop In")
                    .font(.system(size: 48, weight: .bold, design: .rounded))

                Text("Let your friends know where you're at.")
                    .font(.title3)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }

            Spacer()

            // Sign in button
            VStack(spacing: 16) {
                SignInWithAppleButton(.signIn) { request in
                    let vm = AuthViewModel(authService: authService)
                    viewModel = vm
                    vm.configureAppleSignIn(request)
                } onCompletion: { result in
                    viewModel?.handleAppleSignIn(result: result)
                }
                .signInWithAppleButtonStyle(.black)
                .frame(height: 55)
                .cornerRadius(12)

                if let error = viewModel?.errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                }

                if viewModel?.isProcessing == true {
                    ProgressView("Signing in...")
                }
            }
            .padding(.horizontal, 40)

            Spacer()
                .frame(height: 60)
        }
    }
}

#Preview {
    SignInView()
        .environment(AuthService())
}
