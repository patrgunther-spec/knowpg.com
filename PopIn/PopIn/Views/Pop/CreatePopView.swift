import SwiftUI

struct CreatePopView: View {
    let creatorId: String
    let creatorName: String

    @Environment(\.dismiss) private var dismiss
    @State private var viewModel = CreatePopViewModel()

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                // Destination input
                VStack(alignment: .leading, spacing: 8) {
                    Text("Where you headed?")
                        .font(.headline)

                    TextField("Central Park, Joe's Pizza, etc.", text: $viewModel.destination)
                        .textFieldStyle(.roundedBorder)
                        .font(.body)
                }

                // Optional message
                VStack(alignment: .leading, spacing: 8) {
                    Text("Any details?")
                        .font(.headline)

                    TextField("Getting there around 8...", text: $viewModel.message)
                        .textFieldStyle(.roundedBorder)
                        .font(.body)
                }

                // Error message
                if let error = viewModel.errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                }

                Spacer()

                // Send button
                Button {
                    Task {
                        let success = await viewModel.sendPop(
                            creatorId: creatorId,
                            creatorName: creatorName
                        )
                        if success {
                            dismiss()
                        }
                    }
                } label: {
                    HStack {
                        if viewModel.isCreating {
                            ProgressView()
                                .tint(.white)
                        }
                        Text(viewModel.isCreating ? "Sending..." : "Send Pop")
                            .font(.headline)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(viewModel.canSend ? .blue : .gray)
                    .foregroundStyle(.white)
                    .cornerRadius(12)
                }
                .disabled(!viewModel.canSend)
            }
            .padding()
            .navigationTitle("New Pop")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
}
