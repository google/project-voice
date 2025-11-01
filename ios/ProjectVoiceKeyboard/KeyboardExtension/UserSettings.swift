//
//  UserSettings.swift
//  KeyboardExtension
//
//  Created for Project Voice
//  Copyright 2025 Google LLC
//

import Foundation

class UserSettings {

    static let shared = UserSettings()

    private let defaults: UserDefaults
    private let appGroupIdentifier = "group.com.projectvoice.keyboard"

    // Keys for UserDefaults
    private enum Keys {
        static let persona = "persona"
        static let language = "language"
        static let apiEndpoint = "apiEndpoint"
        static let conversationHistory = "conversationHistory"
        static let lastInputSpeech = "lastInputSpeech"
        static let lastOutputSpeech = "lastOutputSpeech"
        static let selectedEmotion = "selectedEmotion"
    }

    init() {
        // Try to use App Group for sharing data between app and extension
        if let groupDefaults = UserDefaults(suiteName: appGroupIdentifier) {
            self.defaults = groupDefaults
        } else {
            // Fallback to standard UserDefaults
            self.defaults = UserDefaults.standard
        }
    }

    // MARK: - Persona

    var persona: String {
        get {
            return defaults.string(forKey: Keys.persona) ?? "A helpful assistant who provides clear and concise suggestions."
        }
        set {
            defaults.set(newValue, forKey: Keys.persona)
        }
    }

    // MARK: - Language

    var language: String {
        get {
            return defaults.string(forKey: Keys.language) ?? "en-US"
        }
        set {
            defaults.set(newValue, forKey: Keys.language)
        }
    }

    // MARK: - API Endpoint

    var apiEndpoint: String {
        get {
            return defaults.string(forKey: Keys.apiEndpoint) ?? "https://your-api-endpoint.com/api"
        }
        set {
            defaults.set(newValue, forKey: Keys.apiEndpoint)
        }
    }

    // MARK: - Conversation History

    var conversationHistory: [ConversationMessage] {
        get {
            guard let data = defaults.data(forKey: Keys.conversationHistory),
                  let messages = try? JSONDecoder().decode([ConversationMessage].self, from: data) else {
                return []
            }
            return messages
        }
        set {
            if let data = try? JSONEncoder().encode(newValue) {
                defaults.set(data, forKey: Keys.conversationHistory)
            }
        }
    }

    func addToConversationHistory(message: ConversationMessage) {
        var history = conversationHistory
        history.append(message)

        // Keep only last 50 messages to avoid excessive memory usage
        if history.count > 50 {
            history = Array(history.suffix(50))
        }

        conversationHistory = history
    }

    func clearConversationHistory() {
        conversationHistory = []
    }

    // MARK: - Last Speech

    var lastInputSpeech: String {
        get {
            return defaults.string(forKey: Keys.lastInputSpeech) ?? ""
        }
        set {
            defaults.set(newValue, forKey: Keys.lastInputSpeech)
        }
    }

    var lastOutputSpeech: String {
        get {
            return defaults.string(forKey: Keys.lastOutputSpeech) ?? ""
        }
        set {
            defaults.set(newValue, forKey: Keys.lastOutputSpeech)
        }
    }

    // MARK: - Selected Emotion

    var selectedEmotion: String {
        get {
            return defaults.string(forKey: Keys.selectedEmotion) ?? SentenceEmotion.statement.rawValue
        }
        set {
            defaults.set(newValue, forKey: Keys.selectedEmotion)
        }
    }

    // MARK: - Helper

    func getConversationHistoryString() -> String {
        let messages = conversationHistory
        if messages.isEmpty {
            return ""
        }

        return messages.map { message in
            "\(message.role): \(message.content)"
        }.joined(separator: "\n")
    }
}

// MARK: - ConversationMessage

struct ConversationMessage: Codable {
    let role: String  // "user" or "assistant"
    let content: String
    let timestamp: Date

    init(role: String, content: String) {
        self.role = role
        self.content = content
        self.timestamp = Date()
    }
}
