import SwiftUI

struct FriendsView: View {
    @Environment(AuthService.self) private var authService
    @State private var viewModel = FriendsViewModel()

    var body: some View {
        NavigationStack {
            List {
                // Your friend code — prominently displayed
                if let user = authService.currentUser {
                    Section {
                        VStack(spacing: 8) {
                            Text("Your Friend Code")
                                .font(.caption)
                                .foregroundStyle(.secondary)

                            Text(user.friendCode)
                                .font(.system(size: 36, weight: .bold, design: .monospaced))
                                .kerning(4)

                            ShareLink(item: "Add me on Pop In! My code is \(user.friendCode)") {
                                Label("Share Code", systemImage: "square.and.arrow.up")
                                    .font(.subheadline)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                    }
                }

                // Friends list
                Section {
                    if viewModel.friends.isEmpty {
                        ContentUnavailableView(
                            "No friends yet",
                            systemImage: "person.2.slash",
                            description: Text("Share your code or tap + to add a friend.")
                        )
                    } else {
                        ForEach(viewModel.friends) { friend in
                            HStack {
                                Image(systemName: "person.circle.fill")
                                    .font(.title2)
                                    .foregroundStyle(.blue)
                                Text(friend.displayName)
                                    .font(.body)
                            }
                            .swipeActions {
                                Button("Remove", role: .destructive) {
                                    if let userId = authService.currentUser?.id {
                                        viewModel.removeFriend(currentUserId: userId, friendId: friend.id)
                                    }
                                }
                            }
                        }
                    }
                } header: {
                    Text("Friends (\(viewModel.friends.count))")
                }
            }
            .navigationTitle("Friends")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        viewModel.showAddFriend = true
                    } label: {
                        Image(systemName: "person.badge.plus")
                    }
                }
            }
            .sheet(isPresented: $viewModel.showAddFriend) {
                if let user = authService.currentUser {
                    AddFriendView(viewModel: viewModel, currentUser: user)
                }
            }
            .onAppear {
                if let userId = authService.currentUser?.id {
                    viewModel.startListening(userId: userId)
                }
            }
            .onDisappear {
                viewModel.stopListening()
            }
        }
    }
}

#Preview {
    FriendsView()
        .environment(AuthService())
}
