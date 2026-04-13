import SwiftUI

struct AddFriendView: View {
    @Bindable var viewModel: FriendsViewModel
    let currentUser: AppUser

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                VStack(spacing: 8) {
                    Text("Enter your friend's code")
                        .font(.headline)

                    Text("Ask them to share their 6-character code from the Friends tab.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }

                TextField("e.g. POP3FK", text: $viewModel.friendCodeInput)
                    .textFieldStyle(.roundedBorder)
                    .font(.system(size: 24, weight: .bold, design: .monospaced))
                    .multilineTextAlignment(.center)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()

                if let error = viewModel.errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                }

                if let success = viewModel.successMessage {
                    Text(success)
                        .font(.caption)
                        .foregroundStyle(.green)
                        .multilineTextAlignment(.center)
                }

                Button {
                    Task {
                        await viewModel.addFriend(currentUser: currentUser)
                    }
                } label: {
                    HStack {
                        if viewModel.isAdding {
                            ProgressView()
                                .tint(.white)
                        }
                        Text(viewModel.isAdding ? "Adding..." : "Add Friend")
                            .font(.headline)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(viewModel.friendCodeInput.count == 6 ? .blue : .gray)
                    .foregroundStyle(.white)
                    .cornerRadius(12)
                }
                .disabled(viewModel.friendCodeInput.count != 6 || viewModel.isAdding)

                Spacer()
            }
            .padding()
            .navigationTitle("Add Friend")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
