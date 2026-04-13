import SwiftUI
import MapKit

struct PopDetailView: View {
    let pop: Pop

    @Environment(AuthService.self) private var authService
    @State private var viewModel: PopDetailViewModel
    @State private var cameraPosition: MapCameraPosition

    init(pop: Pop) {
        self.pop = pop
        _viewModel = State(initialValue: PopDetailViewModel(pop: pop))
        _cameraPosition = State(initialValue: .region(
            MKCoordinateRegion(
                center: pop.coordinate,
                span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
            )
        ))
    }

    var body: some View {
        VStack(spacing: 0) {
            // Map (top half)
            Map(position: $cameraPosition) {
                Annotation(pop.creatorName, coordinate: pop.coordinate) {
                    VStack(spacing: 2) {
                        Image(systemName: "mappin.circle.fill")
                            .font(.title)
                            .foregroundStyle(.blue)
                        Text(pop.creatorName)
                            .font(.caption2.weight(.semibold))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(.blue)
                            .foregroundStyle(.white)
                            .cornerRadius(4)
                    }
                }
            }
            .frame(height: 250)

            // Pop info bar
            VStack(spacing: 4) {
                HStack {
                    Image(systemName: "mappin.circle.fill")
                        .foregroundStyle(.blue)
                    Text(pop.destination)
                        .font(.headline)
                    Spacer()
                    Text(pop.timeRemaining)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                if let message = pop.message {
                    Text(message)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .padding()
            .background(Color(.systemBackground))

            Divider()

            // Chat messages
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 12) {
                        ForEach(viewModel.messages) { message in
                            ChatBubble(
                                message: message,
                                isMine: message.senderId == authService.currentUser?.id
                            )
                            .id(message.id)
                        }
                    }
                    .padding()
                }
                .onChange(of: viewModel.messages.count) {
                    if let lastMessage = viewModel.messages.last {
                        withAnimation {
                            proxy.scrollTo(lastMessage.id, anchor: .bottom)
                        }
                    }
                }
            }

            Divider()

            // Message input
            HStack(spacing: 12) {
                TextField("Say something...", text: $viewModel.newMessageText)
                    .textFieldStyle(.roundedBorder)

                Button {
                    if let user = authService.currentUser {
                        viewModel.sendMessage(senderId: user.id, senderName: user.displayName)
                    }
                } label: {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.title2)
                        .foregroundStyle(.blue)
                }
                .disabled(viewModel.newMessageText.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            .padding()
            .background(Color(.systemBackground))
        }
        .navigationTitle(pop.creatorName)
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { viewModel.startListening() }
        .onDisappear { viewModel.stopListening() }
    }
}

// MARK: - Chat Bubble

struct ChatBubble: View {
    let message: ChatMessage
    let isMine: Bool

    var body: some View {
        HStack {
            if isMine { Spacer() }

            VStack(alignment: isMine ? .trailing : .leading, spacing: 2) {
                if !isMine {
                    Text(message.senderName)
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(.secondary)
                }

                Text(message.text)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(isMine ? .blue : Color(.systemGray5))
                    .foregroundStyle(isMine ? .white : .primary)
                    .cornerRadius(16)

                Text(message.createdAt, style: .time)
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }

            if !isMine { Spacer() }
        }
    }
}
