//
//  TextProcessing.swift
//  KeyboardExtension
//
//  Created for Project Voice
//  Copyright 2025 Google LLC
//

import Foundation

// MARK: - Constants

struct TextConstants {
    static let maxSentenceLengthForLLM = 30
    static let modifiableTextLength = 10
    static let maxDiffs = 10
    static let minMessageLength = 0
    static let minSuggestionLength = 3
    static let messageHistoryLimit = 1024
    static let maxEditDiffLength = 10
    static let largeMarginLineLimit = 4
}

// MARK: - Text Processing Utilities

class TextProcessor {

    /// Splits text into sentences based on punctuation (matches web version exactly)
    static func splitToSentences(_ text: String) -> [String] {
        // Split by Japanese and English sentence terminators
        // Pattern matches web version: ([。？！]|[.?!] ) *
        // Japanese punctuation OR English punctuation + space, followed by optional spaces
        let pattern = "([。？！]|[.?!] ) *"
        guard let regex = try? NSRegularExpression(pattern: pattern) else {
            return [text]
        }

        let range = NSRange(text.startIndex..., in: text)
        let matches = regex.matches(in: text, range: range)

        if matches.isEmpty {
            return [text]
        }

        var sentences: [String] = []
        var lastEnd = text.startIndex

        for match in matches {
            guard let matchRange = Range(match.range, in: text) else { continue }
            let sentence = String(text[lastEnd..<matchRange.upperBound])
            if !sentence.isEmpty {
                sentences.append(sentence)
            }
            lastEnd = matchRange.upperBound
        }

        // Add remaining text if any
        if lastEnd < text.endIndex {
            sentences.append(String(text[lastEnd...]))
        }

        return sentences
    }

    /// Splits the last sentence from text
    /// Returns (prefix, lastSentence) tuple (matches web version)
    static func splitLastSentence(_ text: String) -> (String, String) {
        let sentences = splitToSentences(text)
        if sentences.isEmpty {
            return ("", "")
        }
        if sentences.count == 1 {
            return ("", sentences[0].trimmingCharacters(in: .whitespacesAndNewlines))
        }

        let lastSentence = (sentences.last ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let prefix = sentences.dropLast().joined()
        return (prefix, lastSentence)
    }

    /// Splits the last few sentences to avoid sending too long text to LLM
    /// Returns (prefix, lastSentences) tuple
    static func splitLastFewSentencesForLLM(_ text: String) -> (String, String) {
        let sentences = splitToSentences(text)
        if sentences.isEmpty {
            return ("", "")
        }

        var totalLength = 0
        for i in stride(from: sentences.count - 1, through: 0, by: -1) {
            totalLength += sentences[i].count
            if totalLength >= TextConstants.maxSentenceLengthForLLM {
                let prefix = sentences[0..<i].joined()
                let suffix = sentences[i...].joined()
                return (prefix, suffix)
            }
        }

        return ("", text)
    }

    /// Gets the shared prefix among an array of strings (matches web version)
    static func getSharedPrefix(_ sentences: [String]) -> String {
        if sentences.isEmpty {
            return ""
        }

        // Find the shortest sentence length
        let sentenceLengths = sentences.map { $0.count }
        guard let minLength = sentenceLengths.min() else {
            return ""
        }

        // Check each character position across all sentences
        for i in 0..<minLength {
            let chars = sentences.map { Array($0)[i] }
            let uniqueChars = Set(chars)

            if uniqueChars.count != 1 {
                // Characters differ at position i
                return String(Array(sentences[0])[0..<i])
            }
        }

        // All characters match up to minLength - return the shortest sentence
        if let shortestIndex = sentenceLengths.firstIndex(of: minLength) {
            return sentences[shortestIndex]
        }

        return sentences[0]
    }

    /// Returns the prefix of the given string which contains only chars that can be input from keyboard
    static func getUserInputPrefix(_ text: String) -> String {
        // Match keyboard-inputtable characters (Latin and Japanese hiragana)
        let pattern = "^[A-Za-z あ-んー]*"
        guard let regex = try? NSRegularExpression(pattern: pattern) else {
            return ""
        }

        let range = NSRange(text.startIndex..., in: text)
        if let match = regex.firstMatch(in: text, range: range),
           let matchRange = Range(match.range, in: text) {
            return String(text[matchRange])
        }

        return ""
    }

    /// Normalizes text for consistency (matches web version exactly)
    static func normalize(_ text: String, isLastInputFromSuggestion: Bool = false) -> String {
        var normalized = text

        // Handle dakuten and handakuten specially (before NFKC)
        // Replace combining marks with spacing marks
        normalized = normalized.replacingOccurrences(of: "\u{3099}", with: "゛")  // Combining dakuten
        normalized = normalized.replacingOccurrences(of: "\u{309A}", with: "゜")  // Combining handakuten

        // Apply NFKC normalization for Japanese
        normalized = normalized.precomposedStringWithCompatibilityMapping

        // Restore dakuten/handakuten as combining marks (after NFKC)
        normalized = normalized.replacingOccurrences(of: "゛", with: "\u{3099}")
        normalized = normalized.replacingOccurrences(of: "゜", with: "\u{309A}")

        // Remove leading spaces
        if let regex = try? NSRegularExpression(pattern: "^\\s+") {
            let range = NSRange(normalized.startIndex..., in: normalized)
            normalized = regex.stringByReplacingMatches(in: normalized, range: range, withTemplate: "")
        }

        // Replace multiple spaces with single space
        if let regex = try? NSRegularExpression(pattern: "\\s\\s+") {
            let range = NSRange(normalized.startIndex..., in: normalized)
            normalized = regex.stringByReplacingMatches(in: normalized, range: range, withTemplate: " ")
        }

        // Remove space before punctuation if last input was from suggestion
        if isLastInputFromSuggestion {
            // Replace " ," with ",", " ." with ".", etc. (only at end of string)
            let punctuationPattern = " ([,.?!])$"
            if let regex = try? NSRegularExpression(pattern: punctuationPattern) {
                let range = NSRange(normalized.startIndex..., in: normalized)
                normalized = regex.stringByReplacingMatches(
                    in: normalized,
                    range: range,
                    withTemplate: "$1"
                )
            }
        }

        return normalized
    }

    /// Cleans up LLM response text
    static func cleanupResponse(_ text: String) -> String {
        // Remove escaped newlines
        return text.replacingOccurrences(of: "\\\n", with: "")
    }
}

// MARK: - Punctuation Processing

class PunctuationProcessor {

    /// Splits punctuation from words for word-by-word selection
    /// Example: "Hello!" -> ["Hello", "!"]
    static func splitPunctuations(_ text: String) -> [String] {
        let punctuation = ".,!?;:\"'()[]{}。、！？；：「」『』（）"
        var result: [String] = []
        var currentWord = ""

        for char in text {
            if punctuation.contains(char) {
                if !currentWord.isEmpty {
                    result.append(currentWord)
                    currentWord = ""
                }
                result.append(String(char))
            } else {
                currentWord.append(char)
            }
        }

        if !currentWord.isEmpty {
            result.append(currentWord)
        }

        return result
    }

    /// Gets leading words from a suggestion that match the current text
    /// Used to determine shared prefix for ellipsis display
    static func getLeadingWords(_ suggestion: String, matching text: String, language: Language) -> Int {
        let suggestionWords = language.segment(sentence: suggestion)
        let textWords = language.segment(sentence: text)

        var matchCount = 0
        let minCount = min(suggestionWords.count, textWords.count)

        for i in 0..<minCount {
            if suggestionWords[i] == textWords[i] {
                matchCount += 1
            } else {
                break
            }
        }

        return matchCount
    }
}

// MARK: - Language-Specific Processing

extension Language {

    /// Segments a sentence into words (language-specific)
    func segment(sentence: String) -> [String] {
        switch code {
        case "ja-JP":
            // Japanese: use character-based segmentation for now
            // TODO: Integrate TinySegmenter equivalent if needed
            return Array(sentence).map { String($0) }
        case "zh-CN":
            // Mandarin: character-based
            return Array(sentence).map { String($0) }
        default:
            // Latin-based languages: space-separated
            return sentence.components(separatedBy: " ").filter { !$0.isEmpty }
        }
    }

    /// Joins words into a sentence (language-specific)
    func join(words: [String]) -> String {
        switch code {
        case "ja-JP", "zh-CN":
            // No spaces for Japanese and Mandarin
            return words.joined()
        default:
            // Space-separated for Latin languages
            let joined = words.joined(separator: " ")
            // Fix punctuation spacing: " ," -> ","
            let pattern = " ([.,!?]+( |$))"
            if let regex = try? NSRegularExpression(pattern: pattern) {
                let range = NSRange(joined.startIndex..., in: joined)
                let fixed = regex.stringByReplacingMatches(
                    in: joined,
                    range: range,
                    withTemplate: "$1"
                )
                return fixed + " "
            }
            return joined + " "
        }
    }

    /// Appends a word to text (language-specific)
    func appendWord(text: String, word: String) -> String {
        // Handle leading "-" for affixes
        if word.hasPrefix("-") {
            return text + String(word.dropFirst()) + " "
        }

        switch code {
        case "ja-JP":
            // Japanese: no spaces
            return text + word
        case "zh-CN":
            // Mandarin: remove trailing pinyin from text (matches web version)
            var cleanText = text
            // Remove trailing [a-z]+ from text parameter
            if let range = cleanText.range(of: "[a-z]+$", options: .regularExpression) {
                cleanText.removeSubrange(range)
            }
            return cleanText + word
        default:
            // Latin languages: add space
            return text + " " + word + " "
        }
    }
}

// MARK: - History-Based Suggestions

class HistoryProcessor {

    /// Searches message history for suggestions matching the current prefix (matches web version exactly)
    static func searchSuggestionsFromHistory(
        text: String,
        history: [(text: String, prefix: String, timestamp: Double)],
        language: Language
    ) -> [String] {
        guard text.count >= TextConstants.minSuggestionLength else {
            return []
        }

        // Search backwards through history (most recent first)
        for entry in history.reversed() {
            let candidate = entry.text
            let prefix = entry.prefix

            // Web version logic: prefix.startsWith(currentSentence) || sentence.startsWith(currentSentence)
            // Uses CASE-SENSITIVE comparison like web version
            if (prefix.hasPrefix(text) || candidate.hasPrefix(text)) && candidate.count > text.count {
                // Return only 1 suggestion (most recent match) like web version
                return [candidate]
            }
        }

        return []
    }
}

// MARK: - Japanese Small Kana Processing

class JapaneseKanaProcessor {

    // Small kana conversion maps
    private static let smallKanaMap: [String: String] = [
        "あ": "ぁ", "い": "ぃ", "う": "ぅ", "え": "ぇ", "お": "ぉ",
        "や": "ゃ", "ゆ": "ゅ", "よ": "ょ",
        "つ": "っ", "わ": "ゎ",
        "ア": "ァ", "イ": "ィ", "ウ": "ゥ", "エ": "ェ", "オ": "ォ",
        "ヤ": "ャ", "ユ": "ュ", "ヨ": "ョ",
        "ツ": "ッ", "ワ": "ヮ"
    ]

    private static let smallKanaInvertMap: [String: String] = {
        var invertMap: [String: String] = [:]
        for (key, value) in smallKanaMap {
            invertMap[value] = key
        }
        return invertMap
    }()

    /// Converts the last character to small kana if possible
    static func convertLastCharToSmallKana(_ text: String) -> String? {
        guard !text.isEmpty else { return nil }

        let lastChar = String(text.suffix(1))

        // Try normal -> small conversion
        if let small = smallKanaMap[lastChar] {
            return String(text.dropLast()) + small
        }

        // Try small -> normal conversion (toggle)
        if let normal = smallKanaInvertMap[lastChar] {
            return String(text.dropLast()) + normal
        }

        return nil
    }
}
