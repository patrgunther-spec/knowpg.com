import SwiftUI

struct PopRow: View {
    let pop: Pop
    let isMine: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                if !isMine {
                    Text(pop.creatorName)
                        .font(.headline)
                }
                Spacer()
                Text(pop.timeRemaining)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: 6) {
                Image(systemName: "mappin.circle.fill")
                    .foregroundStyle(.blue)
                Text(pop.destination)
                    .font(.body)
            }

            if let message = pop.message {
                Text(message)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Text(pop.createdAt, style: .relative)
                .font(.caption2)
                .foregroundStyle(.tertiary)
        }
        .padding(.vertical, 4)
    }
}
