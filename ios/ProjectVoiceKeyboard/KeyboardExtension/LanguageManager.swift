//
//  LanguageManager.swift
//  KeyboardExtension
//
//  Created for Project Voice
//  Copyright 2025 Google LLC
//

import Foundation

// MARK: - Language Protocol

protocol Language {
    var code: String { get }
    var promptName: String { get }
    var displayName: String { get }
    var defaultInitialPhrases: [String] { get }
    var emotions: [EmotionConfig] { get }
    var aiConfigs: [String: AIConfig] { get }
}

// MARK: - EmotionConfig

struct EmotionConfig {
    let emoji: String
    let prompt: String
    let label: String
}

// MARK: - AIConfig

struct AIConfig {
    let model: String
    let sentenceMacro: String
    let wordMacro: String
}

// MARK: - LanguageManager

class LanguageManager {
    static let shared = LanguageManager()

    private(set) var allLanguages: [Language] = []

    private init() {
        allLanguages = [
            EnglishLanguage(),
            JapaneseLanguage(),
            FrenchLanguage(),
            GermanLanguage(),
            MandarinLanguage(),
            SwedishLanguage()
        ]
    }

    func getLanguage(code: String) -> Language? {
        return allLanguages.first { $0.code == code }
    }

    func getAIConfig(languageCode: String, configName: String) -> AIConfig? {
        guard let language = getLanguage(code: languageCode) else { return nil }
        return language.aiConfigs[configName]
    }
}

// MARK: - English

class EnglishLanguage: Language {
    let code = "en-US"
    let promptName = "English"
    let displayName = "English"

    let defaultInitialPhrases = [
        "I",
        "You",
        "They",
        "What",
        "Why",
        "When",
        "Where",
        "How",
        "Who",
        "Can",
        "Could you",
        "Would you",
        "Do you"
    ]

    let emotions = [
        EmotionConfig(emoji: "💬", prompt: "Statement", label: "Statement"),
        EmotionConfig(emoji: "❓", prompt: "Question", label: "Question"),
        EmotionConfig(emoji: "🙏", prompt: "Request", label: "Request"),
        EmotionConfig(emoji: "🚫", prompt: "Negative", label: "Negative")
    ]

    let aiConfigs: [String: AIConfig] = [
        "classic": AIConfig(
            model: "gemini-2.0-flash-001",
            sentenceMacro: "SentenceGeneric20250311",
            wordMacro: "WordGeneric20240628"
        ),
        "fast": AIConfig(
            model: "gemini-2.0-flash-lite-001",
            sentenceMacro: "SentenceGeneric20250311",
            wordMacro: "WordGeneric20240628"
        ),
        "smart": AIConfig(
            model: "gemini-2.0-flash-001",
            sentenceMacro: "SentenceGeneric20250311",
            wordMacro: "WordGeneric20240628"
        ),
        "gemini_2_5_flash": AIConfig(
            model: "gemini-2.5-flash",
            sentenceMacro: "SentenceGeneric20250311",
            wordMacro: "WordGeneric20240628"
        )
    ]
}

// MARK: - Japanese

class JapaneseLanguage: Language {
    let code = "ja-JP"
    let promptName = "Japanese"
    let displayName = "日本語"

    let defaultInitialPhrases = [
        "はい",
        "いいえ",
        "ありがとう",
        "すみません",
        "お願いします",
        "私",
        "あなた",
        "彼",
        "彼女",
        "今日",
        "昨日",
        "明日"
    ]

    let emotions = [
        EmotionConfig(emoji: "💬", prompt: "平叙", label: "普通"),
        EmotionConfig(emoji: "❓", prompt: "疑問", label: "質問"),
        EmotionConfig(emoji: "🙏", prompt: "依頼", label: "お願い"),
        EmotionConfig(emoji: "🚫", prompt: "否定", label: "否定")
    ]

    let aiConfigs: [String: AIConfig] = [
        "classic": AIConfig(
            model: "gemini-2.5-flash",
            sentenceMacro: "SentenceJapanese20240628",
            wordMacro: "WordGeneric20240628"
        ),
        "fast": AIConfig(
            model: "gemini-2.5-flash-lite",
            sentenceMacro: "SentenceJapanese20240628",
            wordMacro: "WordGeneric20240628"
        ),
        "smart": AIConfig(
            model: "gemini-2.5-flash",
            sentenceMacro: "SentenceJapaneseLong20250603",
            wordMacro: "WordJapanese20250623"
        ),
        "gemini_2_5_flash": AIConfig(
            model: "gemini-2.5-flash",
            sentenceMacro: "SentenceJapaneseLong20250603",
            wordMacro: "WordGeneric20240628"
        )
    ]
}

// MARK: - French

class FrenchLanguage: Language {
    let code = "fr-FR"
    let promptName = "French"
    let displayName = "Français (experimental)"

    let defaultInitialPhrases = [
        "Je",
        "Tu",
        "Ils",
        "Que",
        "Pourquoi",
        "Quand",
        "Où",
        "Quelle",
        "Qui",
        "Peux-tu",
        "Pourrais-tu",
        "Ferais-tu",
        "Fais-tu"
    ]

    let emotions = [
        EmotionConfig(emoji: "💬", prompt: "Statement", label: "Statement"),
        EmotionConfig(emoji: "❓", prompt: "Question", label: "Question"),
        EmotionConfig(emoji: "🙏", prompt: "Request", label: "Request"),
        EmotionConfig(emoji: "🚫", prompt: "Negative", label: "Negative")
    ]

    let aiConfigs: [String: AIConfig] = [
        "classic": AIConfig(
            model: "gemini-2.0-flash-001",
            sentenceMacro: "SentenceGeneric20250311",
            wordMacro: "WordGeneric20240628"
        ),
        "fast": AIConfig(
            model: "gemini-2.0-flash-lite-001",
            sentenceMacro: "SentenceGeneric20250311",
            wordMacro: "WordGeneric20240628"
        ),
        "smart": AIConfig(
            model: "gemini-2.0-flash-001",
            sentenceMacro: "SentenceGeneric20250311",
            wordMacro: "WordGeneric20240628"
        ),
        "gemini_2_5_flash": AIConfig(
            model: "gemini-2.5-flash",
            sentenceMacro: "SentenceGeneric20250311",
            wordMacro: "WordGeneric20240628"
        )
    ]
}

// MARK: - German

class GermanLanguage: Language {
    let code = "de-DE"
    let promptName = "German"
    let displayName = "Deutsch (experimental)"

    let defaultInitialPhrases = [
        "Ich",
        "Du",
        "Sie",
        "Was",
        "Warum",
        "Wann",
        "Wo",
        "Wie",
        "Wer",
        "Kannst",
        "Könntest du",
        "Würdest du",
        "Tust du"
    ]

    let emotions = [
        EmotionConfig(emoji: "💬", prompt: "Statement", label: "Statement"),
        EmotionConfig(emoji: "❓", prompt: "Question", label: "Question"),
        EmotionConfig(emoji: "🙏", prompt: "Request", label: "Request"),
        EmotionConfig(emoji: "🚫", prompt: "Negative", label: "Negative")
    ]

    let aiConfigs: [String: AIConfig] = [
        "classic": AIConfig(
            model: "gemini-2.0-flash-001",
            sentenceMacro: "SentenceGeneric20250311",
            wordMacro: "WordGeneric20240628"
        ),
        "fast": AIConfig(
            model: "gemini-2.0-flash-lite-001",
            sentenceMacro: "SentenceGeneric20250311",
            wordMacro: "WordGeneric20240628"
        ),
        "smart": AIConfig(
            model: "gemini-2.0-flash-001",
            sentenceMacro: "SentenceGeneric20250311",
            wordMacro: "WordGeneric20240628"
        ),
        "gemini_2_5_flash": AIConfig(
            model: "gemini-2.5-flash",
            sentenceMacro: "SentenceGeneric20250311",
            wordMacro: "WordGeneric20240628"
        )
    ]
}

// MARK: - Mandarin

class MandarinLanguage: Language {
    let code = "zh-CN"
    let promptName = "Mandarin"
    let displayName = "中文"

    let defaultInitialPhrases = [
        "你",
        "我",
        "他",
        "她",
        "它",
        "好",
        "今天",
        "昨天",
        "明天"
    ]

    let emotions = [
        EmotionConfig(emoji: "💬", prompt: "Statement", label: "Statement"),
        EmotionConfig(emoji: "❓", prompt: "Question", label: "Question"),
        EmotionConfig(emoji: "🙏", prompt: "Request", label: "Request"),
        EmotionConfig(emoji: "🚫", prompt: "Negative", label: "Negative")
    ]

    let aiConfigs: [String: AIConfig] = [
        "classic": AIConfig(
            model: "gemini-2.0-flash-001",
            sentenceMacro: "SentenceGeneric20250311",
            wordMacro: "WordGeneric20240628"
        ),
        "fast": AIConfig(
            model: "gemini-2.0-flash-lite-001",
            sentenceMacro: "SentenceGeneric20250311",
            wordMacro: "WordGeneric20240628"
        ),
        "smart": AIConfig(
            model: "gemini-2.0-flash-001",
            sentenceMacro: "SentenceGeneric20250311",
            wordMacro: "WordGeneric20240628"
        ),
        "gemini_2_5_flash": AIConfig(
            model: "gemini-2.5-flash",
            sentenceMacro: "SentenceGeneric20250311",
            wordMacro: "WordGeneric20240628"
        )
    ]
}

// MARK: - Swedish

class SwedishLanguage: Language {
    let code = "sv-SE"
    let promptName = "Swedish"
    let displayName = "Svenska (experimental)"

    let defaultInitialPhrases = [
        "Jag",
        "Du",
        "De",
        "Vad",
        "Varför",
        "När",
        "Var",
        "Hur",
        "Vem",
        "Burk",
        "Kan",
        "Skulle du",
        "Gör du"
    ]

    let emotions = [
        EmotionConfig(emoji: "💬", prompt: "Statement", label: "Statement"),
        EmotionConfig(emoji: "❓", prompt: "Question", label: "Question"),
        EmotionConfig(emoji: "🙏", prompt: "Request", label: "Request"),
        EmotionConfig(emoji: "🚫", prompt: "Negative", label: "Negative")
    ]

    let aiConfigs: [String: AIConfig] = [
        "classic": AIConfig(
            model: "gemini-2.0-flash-001",
            sentenceMacro: "SentenceGeneric20250311",
            wordMacro: "WordGeneric20240628"
        ),
        "fast": AIConfig(
            model: "gemini-2.0-flash-lite-001",
            sentenceMacro: "SentenceGeneric20250311",
            wordMacro: "WordGeneric20240628"
        ),
        "smart": AIConfig(
            model: "gemini-2.0-flash-001",
            sentenceMacro: "SentenceGeneric20250311",
            wordMacro: "WordGeneric20240628"
        ),
        "gemini_2_5_flash": AIConfig(
            model: "gemini-2.5-flash",
            sentenceMacro: "SentenceGeneric20250311",
            wordMacro: "WordGeneric20240628"
        )
    ]
}
