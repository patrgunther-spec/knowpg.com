import SwiftUI

struct HomeView: View {
    @Environment(AuthService.self) private var authService
    @State private var viewModel = HomeViewModel()
    @State private var showCreatePop = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Big "Pop In" button
                Button {
                    showCreatePop = true
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "antenna.radiowaves.left.and.right")
                            .font(.title2)
                        Text("Pop In")
                            .font(.title2.weight(.bold))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
                    .background(.blue)
                    .foregroundStyle(.white)
                    .cornerRadius(16)
                }
                .padding(.horizontal)
                .padding(.top, 8)

                // Active pops feed
                if viewModel.isLoading {
                    Spacer()
                    ProgressView()
                    Spacer()
                } else if viewModel.myPops.isEmpty && viewModel.friendPops.isEmpty {
                    Spacer()
                    ContentUnavailableView(
                        "No pops yet",
                        systemImage: "bubble.left.and.bubble.right",
                        description: Text("Send a pop or add some friends to get started!")
                    )
                    Spacer()
                } else {
                    List {
                        // My active pops
                        if !viewModel.myPops.isEmpty {
                            Section("Your Pops") {
                                ForEach(viewModel.myPops) { pop in
                                    NavigationLink(destination: PopDetailView(pop: pop)) {
                                        PopRow(pop: pop, isMine: true)
                                    }
                                    .swipeActions {
                                        Button("End", role: .destructive) {
                                            viewModel.endPop(pop)
                                        }
                                    }
                                }
                            }
                        }

                        // Friends' pops
                        if !viewModel.friendPops.isEmpty {
                            Section("Friends") {
                                ForEach(viewModel.friendPops) { pop in
                                    NavigationLink(destination: PopDetailView(pop: pop)) {
                                        PopRow(pop: pop, isMine: false)
                                    }
                                }
                            }
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Pop In")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        try? authService.signOut()
                    } label: {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                    }
                }
            }
            .sheet(isPresented: $showCreatePop) {
                if let user = authService.currentUser {
                    CreatePopView(creatorId: user.id, creatorName: user.displayName)
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
    HomeView()
        .environment(AuthService())
}
