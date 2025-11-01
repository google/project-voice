//
//  SettingsView.swift
//  ProjectVoiceKeyboard
//
//  Created for Project Voice
//  Copyright 2025 Google LLC
//

import SwiftUI

struct SettingsView: View {
    @StateObject private var settingsManager = SettingsManager()

    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("API Configuration")) {
                    TextField("API Endpoint", text: $settingsManager.apiEndpoint)
                        .autocapitalization(.none)
                        .keyboardType(.URL)

                    Text("Example: https://your-api.com/api")
                        .font(.caption)
                        .foregroundColor(.gray)
                }

                Section(header: Text("Language")) {
                    Picker("Language", selection: $settingsManager.language) {
                        Text("English").tag("en-US")
                        Text("Japanese").tag("ja-JP")
                        Text("French").tag("fr-FR")
                        Text("German").tag("de-DE")
                        Text("Swedish").tag("sv-SE")
                    }
                }

                Section(header: Text("Persona")) {
                    TextEditor(text: $settingsManager.persona)
                        .frame(minHeight: 100)

                    Text("Define how the AI should generate suggestions. For example: 'A helpful assistant who provides clear and concise suggestions.'")
                        .font(.caption)
                        .foregroundColor(.gray)
                }

                Section(header: Text("Conversation History")) {
                    HStack {
                        Text("Messages")
                        Spacer()
                        Text("\(settingsManager.conversationHistoryCount)")
                            .foregroundColor(.gray)
                    }

                    Button(action: {
                        settingsManager.clearConversationHistory()
                    }) {
                        Text("Clear History")
                            .foregroundColor(.red)
                    }
                }

                Section(header: Text("About")) {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundColor(.gray)
                    }

                    Link("View on GitHub", destination: URL(string: "https://github.com/google/project-voice")!)
                }
            }
            .navigationTitle("Settings")
        }
    }
}

class SettingsManager: ObservableObject {
    private let settings = UserSettings.shared

    @Published var apiEndpoint: String {
        didSet {
            settings.apiEndpoint = apiEndpoint
        }
    }

    @Published var language: String {
        didSet {
            settings.language = language
        }
    }

    @Published var persona: String {
        didSet {
            settings.persona = persona
        }
    }

    @Published var conversationHistoryCount: Int

    init() {
        self.apiEndpoint = settings.apiEndpoint
        self.language = settings.language
        self.persona = settings.persona
        self.conversationHistoryCount = settings.conversationHistory.count
    }

    func clearConversationHistory() {
        settings.clearConversationHistory()
        conversationHistoryCount = 0
    }
}

#Preview {
    SettingsView()
}
