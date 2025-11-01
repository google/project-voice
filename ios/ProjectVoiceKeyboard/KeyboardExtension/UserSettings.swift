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
        // General Settings
        static let aiConfig = "aiConfig"
        static let checkedLanguages = "checkedLanguages"
        static let sentenceSmallMargin = "sentenceSmallMargin"

        // Profile Settings
        static let persona = "persona"
        static let initialPhrasesPerLanguage = "initialPhrasesPerLanguage"

        // API Settings
        static let apiEndpoint = "apiEndpoint"

        // Message History
        static let messageHistoryWithPrefix = "messageHistoryWithPrefix"

        // Conversation History (for backward compatibility)
        static let conversationHistory = "conversationHistory"
        static let lastInputSpeech = "lastInputSpeech"
        static let lastOutputSpeech = "lastOutputSpeech"

        // Current State
        static let selectedEmotion = "selectedEmotion"
        static let currentLanguage = "currentLanguage"
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

    // MARK: - General Settings

    var aiConfig: String {
        get {
            return defaults.string(forKey: Keys.aiConfig) ?? "smart"
        }
        set {
            defaults.set(newValue, forKey: Keys.aiConfig)
        }
    }

    var checkedLanguages: [String] {
        get {
            return defaults.stringArray(forKey: Keys.checkedLanguages) ?? ["ja-JP"]
        }
        set {
            defaults.set(newValue, forKey: Keys.checkedLanguages)
        }
    }

    var sentenceSmallMargin: Bool {
        get {
            return defaults.bool(forKey: Keys.sentenceSmallMargin)
        }
        set {
            defaults.set(newValue, forKey: Keys.sentenceSmallMargin)
        }
    }

    // MARK: - Profile Settings

    var persona: String {
        get {
            return defaults.string(forKey: Keys.persona) ?? ""
        }
        set {
            defaults.set(newValue, forKey: Keys.persona)
        }
    }

    var initialPhrasesPerLanguage: [String: [String]] {
        get {
            guard let data = defaults.data(forKey: Keys.initialPhrasesPerLanguage),
                  let dict = try? JSONDecoder().decode([String: [String]].self, from: data) else {
                return [:]
            }
            return dict
        }
        set {
            if let data = try? JSONEncoder().encode(newValue) {
                defaults.set(data, forKey: Keys.initialPhrasesPerLanguage)
            }
        }
    }

    func getInitialPhrases(for languageCode: String) -> [String] {
        if let phrases = initialPhrasesPerLanguage[languageCode], !phrases.isEmpty {
            return phrases
        }
        // Return default initial phrases for the language
        return LanguageManager.shared.getLanguage(code: languageCode)?.defaultInitialPhrases ?? []
    }

    func setInitialPhrases(_ phrases: [String], for languageCode: String) {
        var current = initialPhrasesPerLanguage
        current[languageCode] = phrases
        initialPhrasesPerLanguage = current
    }

    // MARK: - API Endpoint

    var apiEndpoint: String {
        get {
            return defaults.string(forKey: Keys.apiEndpoint) ?? "https://project-voice-476504.uc.r.appspot.com"
        }
        set {
            defaults.set(newValue, forKey: Keys.apiEndpoint)
        }
    }

    // MARK: - Message History (matching web version)

    var messageHistoryWithPrefix: [(text: String, prefix: String, timestamp: Double)] {
        get {
            guard let data = defaults.data(forKey: Keys.messageHistoryWithPrefix),
                  let array = try? JSONDecoder().decode([[String]].self, from: data) else {
                return []
            }
            return array.compactMap { item in
                guard item.count == 3,
                      let timestamp = Double(item[2]) else { return nil }
                return (text: item[0], prefix: item[1], timestamp: timestamp)
            }
        }
        set {
            let array = newValue.map { [$0.text, $0.prefix, String($0.timestamp)] }
            if let data = try? JSONEncoder().encode(array) {
                defaults.set(data, forKey: Keys.messageHistoryWithPrefix)
            }
        }
    }

    /// Adds to message history with smart deduplication (matches web version logic)
    func addToMessageHistory(text: String, prefix: String) {
        var history = messageHistoryWithPrefix
        let timestamp = Date().timeIntervalSince1970

        // Web version logic: check if we should update existing entry or create new one
        // If the last entry has the same prefix and current text starts with it, update it
        if let lastEntry = history.last {
            let textLower = text.lowercased()
            let lastTextLower = lastEntry.text.lowercased()

            // If current text starts with last text and same prefix, update (not append)
            if textLower.hasPrefix(lastTextLower) && prefix == lastEntry.prefix {
                // Update the last entry instead of appending
                history[history.count - 1] = (text: text, prefix: prefix, timestamp: timestamp)
                messageHistoryWithPrefix = history
                return
            }
        }

        // Otherwise append new entry
        history.append((text: text, prefix: prefix, timestamp: timestamp))

        // Keep only last 1024 messages (matching web version)
        if history.count > 1024 {
            history = Array(history.suffix(1024))
        }

        messageHistoryWithPrefix = history
    }

    func clearMessageHistory() {
        messageHistoryWithPrefix = []
    }

    // MARK: - Conversation History (legacy support)

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

    // MARK: - Current State

    var selectedEmotion: String {
        get {
            return defaults.string(forKey: Keys.selectedEmotion) ?? SentenceEmotion.statement.rawValue
        }
        set {
            defaults.set(newValue, forKey: Keys.selectedEmotion)
        }
    }

    var currentLanguage: String {
        get {
            return defaults.string(forKey: Keys.currentLanguage) ?? checkedLanguages.first ?? "ja-JP"
        }
        set {
            defaults.set(newValue, forKey: Keys.currentLanguage)
        }
    }

    // MARK: - Helper Methods

    func getConversationHistoryString() -> String {
        let messages = conversationHistory
        if messages.isEmpty {
            return ""
        }

        return messages.map { message in
            "\(message.role): \(message.content)"
        }.joined(separator: "\n")
    }

    func getSuggestionCount() -> Int {
        return sentenceSmallMargin ? 5 : 4
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
