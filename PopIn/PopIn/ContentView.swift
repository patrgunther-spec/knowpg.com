import SwiftUI

/// Root view — shows sign-in if not authenticated, main app if signed in
struct ContentView: View {
    @Environment(AuthService.self) private var authService

    var body: some View {
        Group {
            if authService.isLoading {
                // Splash / loading state
                VStack(spacing: 16) {
                    Image(systemName: "figure.wave")
                        .font(.system(size: 60))
                        .foregroundStyle(.blue)
                    Text("Pop In")
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                    ProgressView()
                }
            } else if authService.isSignedIn {
                MainTabView()
            } else {
                SignInView()
            }
        }
        .animation(.easeInOut, value: authService.isSignedIn)
        .animation(.easeInOut, value: authService.isLoading)
    }
}

/// Two-tab layout: Pops + Friends
struct MainTabView: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem {
                    Label("Pops", systemImage: "antenna.radiowaves.left.and.right")
                }

            FriendsView()
                .tabItem {
                    Label("Friends", systemImage: "person.2")
                }
        }
    }
}

#Preview {
    ContentView()
        .environment(AuthService())
}
