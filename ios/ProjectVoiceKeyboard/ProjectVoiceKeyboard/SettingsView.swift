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
            TabView {
                GeneralSettingsTab(settingsManager: settingsManager)
                    .tabItem {
                        Label("General", systemImage: "gearshape")
                    }

                ProfileSettingsTab(settingsManager: settingsManager)
                    .tabItem {
                        Label("Profile", systemImage: "person.circle")
                    }

                ConversationHistoryTab(settingsManager: settingsManager)
                    .tabItem {
                        Label("History", systemImage: "bubble.left.and.bubble.right")
                    }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

// MARK: - General Settings Tab

struct GeneralSettingsTab: View {
    @ObservedObject var settingsManager: SettingsManager

    var body: some View {
        Form {
            Section(header: Text("API Configuration")) {
                TextField("API Endpoint", text: $settingsManager.apiEndpoint)
                    .autocapitalization(.none)
                    .keyboardType(.URL)

                Text("Example: https://your-project.uc.r.appspot.com")
                    .font(.caption)
                    .foregroundColor(.gray)
            }

            Section(header: Text("AI Model")) {
                Picker("Model", selection: $settingsManager.aiConfig) {
                    Text("Fast (gemini-2.0-flash-lite)").tag("fast")
                    Text("Smart (gemini-2.0-flash)").tag("smart")
                    Text("Classic (gemini-2.0-flash)").tag("classic")
                    Text("Gemini 2.5 Flash").tag("gemini_2_5_flash")
                }
                .pickerStyle(.menu)

                Text("Smart model provides better suggestions but may be slower.")
                    .font(.caption)
                    .foregroundColor(.gray)
            }

            Section(header: Text("Languages")) {
                ForEach(LanguageManager.shared.allLanguages, id: \.code) { language in
                    Toggle(isOn: Binding(
                        get: { settingsManager.checkedLanguages.contains(language.code) },
                        set: { isOn in
                            if isOn {
                                settingsManager.addLanguage(language.code)
                            } else {
                                settingsManager.removeLanguage(language.code)
                            }
                        }
                    )) {
                        Text(language.displayName)
                    }
                }

                Text("Select at least one language. You can switch languages from the keyboard.")
                    .font(.caption)
                    .foregroundColor(.gray)
            }

            Section(header: Text("Suggestions")) {
                Toggle("Use Smaller Sentence Margin", isOn: $settingsManager.sentenceSmallMargin)

                Text("When enabled, shows 5 suggestions instead of 4.")
                    .font(.caption)
                    .foregroundColor(.gray)
            }
        }
    }
}

// MARK: - Profile Settings Tab

struct ProfileSettingsTab: View {
    @ObservedObject var settingsManager: SettingsManager
    @State private var selectedLanguageForPhrases: String = "ja-JP"

    var body: some View {
        Form {
            Section(header: Text("Persona")) {
                TextEditor(text: $settingsManager.persona)
                    .frame(minHeight: 100)

                Text("Define how the AI should generate suggestions. Leave empty for default behavior.")
                    .font(.caption)
                    .foregroundColor(.gray)
            }

            Section(header: Text("Initial Phrases")) {
                Picker("Language", selection: $selectedLanguageForPhrases) {
                    ForEach(settingsManager.checkedLanguages, id: \.self) { languageCode in
                        if let language = LanguageManager.shared.getLanguage(code: languageCode) {
                            Text(language.displayName).tag(languageCode)
                        }
                    }
                }
                .pickerStyle(.menu)

                ForEach(Array(settingsManager.getInitialPhrases(for: selectedLanguageForPhrases).enumerated()), id: \.offset) { index, phrase in
                    HStack {
                        Text(phrase)
                        Spacer()
                    }
                }

                Button("Reset to Defaults") {
                    settingsManager.resetInitialPhrases(for: selectedLanguageForPhrases)
                }

                Text("These phrases appear when the text field is empty for quick input.")
                    .font(.caption)
                    .foregroundColor(.gray)
            }
        }
        .onAppear {
            if settingsManager.checkedLanguages.isEmpty {
                selectedLanguageForPhrases = "ja-JP"
            } else {
                selectedLanguageForPhrases = settingsManager.checkedLanguages.first ?? "ja-JP"
            }
        }
    }
}

// MARK: - Conversation History Tab

struct ConversationHistoryTab: View {
    @ObservedObject var settingsManager: SettingsManager

    var body: some View {
        Form {
            Section(header: Text("Conversation History")) {
                HStack {
                    Text("Total Messages")
                    Spacer()
                    Text("\(settingsManager.conversationHistoryCount)")
                        .foregroundColor(.gray)
                }

                Button("Clear History", role: .destructive) {
                    settingsManager.clearHistory()
                }

                Text("Conversation history is sent to the AI for context-aware suggestions.")
                    .font(.caption)
                    .foregroundColor(.gray)
            }

            Section(header: Text("Message History")) {
                HStack {
                    Text("Total Sentences")
                    Spacer()
                    Text("\(settingsManager.messageHistoryCount)")
                        .foregroundColor(.gray)
                }

                Button("Clear Message History", role: .destructive) {
                    settingsManager.clearMessageHistory()
                }

                Text("Up to 1024 recent sentences are tracked for history-based suggestions.")
                    .font(.caption)
                    .foregroundColor(.gray)
            }

            Section(header: Text("Recent Conversations")) {
                ForEach(settingsManager.recentConversations, id: \.timestamp) { message in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(message.role.capitalized)
                                .font(.caption)
                                .bold()
                                .foregroundColor(message.role == "user" ? .blue : .green)
                            Spacer()
                            Text(message.timestamp, style: .time)
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                        Text(message.content)
                            .font(.body)
                    }
                    .padding(.vertical, 4)
                }
            }
        }
    }
}

// MARK: - Settings Manager

class SettingsManager: ObservableObject {
    private let settings = UserSettings.shared

    @Published var apiEndpoint: String {
        didSet { settings.apiEndpoint = apiEndpoint }
    }

    @Published var aiConfig: String {
        didSet { settings.aiConfig = aiConfig }
    }

    @Published var checkedLanguages: [String] {
        didSet { settings.checkedLanguages = checkedLanguages }
    }

    @Published var sentenceSmallMargin: Bool {
        didSet { settings.sentenceSmallMargin = sentenceSmallMargin }
    }

    @Published var persona: String {
        didSet { settings.persona = persona }
    }

    init() {
        self.apiEndpoint = settings.apiEndpoint
        self.aiConfig = settings.aiConfig
        self.checkedLanguages = settings.checkedLanguages
        self.sentenceSmallMargin = settings.sentenceSmallMargin
        self.persona = settings.persona

        // Ensure at least one language is selected
        if self.checkedLanguages.isEmpty {
            self.checkedLanguages = ["ja-JP"]
            settings.checkedLanguages = ["ja-JP"]
        }
    }

    var conversationHistoryCount: Int {
        return settings.conversationHistory.count
    }

    var messageHistoryCount: Int {
        return settings.messageHistoryWithPrefix.count
    }

    var recentConversations: [ConversationMessage] {
        return Array(settings.conversationHistory.suffix(10).reversed())
    }

    func addLanguage(_ code: String) {
        if !checkedLanguages.contains(code) {
            checkedLanguages.append(code)
        }
    }

    func removeLanguage(_ code: String) {
        // Must keep at least one language
        if checkedLanguages.count > 1 {
            checkedLanguages.removeAll { $0 == code }
        }
    }

    func clearHistory() {
        settings.clearConversationHistory()
        objectWillChange.send()
    }

    func clearMessageHistory() {
        settings.clearMessageHistory()
        objectWillChange.send()
    }

    func getInitialPhrases(for languageCode: String) -> [String] {
        return settings.getInitialPhrases(for: languageCode)
    }

    func resetInitialPhrases(for languageCode: String) {
        settings.setInitialPhrases([], for: languageCode)
        objectWillChange.send()
    }
}

// MARK: - Preview

struct SettingsView_Previews: PreviewProvider {
    static var previews: some View {
        SettingsView()
    }
}
