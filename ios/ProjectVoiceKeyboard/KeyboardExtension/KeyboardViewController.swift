//
//  KeyboardViewController.swift
//  KeyboardExtension
//
//  Created for Project Voice
//  Copyright 2025 Google LLC
//

import UIKit

class KeyboardViewController: UIInputViewController {

    private var keyboardView: KeyboardView!
    private var apiClient: ApiClient!
    private var debounceTimer: Timer?
    private var lastFetchedText: String = ""

    override func viewDidLoad() {
        super.viewDidLoad()

        NSLog("========================================")
        NSLog("[KeyboardVC] viewDidLoad called!")
        NSLog("[KeyboardVC] API Endpoint: %@", UserSettings.shared.apiEndpoint)
        NSLog("========================================")

        // Initialize API client
        apiClient = ApiClient()

        // Setup keyboard view
        setupKeyboardView()

        // Update emotion labels for current language
        keyboardView.updateEmotionLabels()

        // Show initial phrases on load
        showInitialPhrases()
    }

    private func setupKeyboardView() {
        keyboardView = KeyboardView(frame: .zero)
        keyboardView.delegate = self
        keyboardView.translatesAutoresizingMaskIntoConstraints = false

        view.addSubview(keyboardView)

        NSLayoutConstraint.activate([
            keyboardView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            keyboardView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            keyboardView.topAnchor.constraint(equalTo: view.topAnchor),
            keyboardView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            keyboardView.heightAnchor.constraint(equalToConstant: 350) // Increased for emotion selector
        ])
    }

    override func textWillChange(_ textInput: UITextInput?) {
        // Called when the text context is about to change
    }

    override func textDidChange(_ textInput: UITextInput?) {
        // Called after the text context has changed
        let proxy = textDocumentProxy

        // Cancel previous debounce timer
        debounceTimer?.invalidate()

        // Get current text for suggestions
        if let contextBefore = proxy.documentContextBeforeInput, !contextBefore.isEmpty {
            // Skip if text hasn't changed (e.g., keyboard switch)
            if contextBefore == lastFetchedText {
                print("[KeyboardVC] textDidChange: text unchanged, skipping fetch")
                return
            }

            print("[KeyboardVC] textDidChange: '\(contextBefore)'")

            // Debounce: wait 50ms before fetching to avoid duplicate calls
            debounceTimer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: false) { [weak self] _ in
                self?.fetchSuggestionsIfNeeded(for: contextBefore)
            }
        } else {
            print("[KeyboardVC] textDidChange: text is empty, showing initial phrases")
            lastFetchedText = ""
            // Show initial phrases when text is empty
            showInitialPhrases()
        }
    }

    private func showInitialPhrases() {
        let settings = UserSettings.shared
        let currentLanguage = settings.currentLanguage
        let initialPhrases = settings.getInitialPhrases(for: currentLanguage)

        DispatchQueue.main.async { [weak self] in
            self?.keyboardView.showInitialPhrases(initialPhrases)
        }
    }

    private func fetchSuggestionsIfNeeded(for text: String) {
        // Skip if already fetched for this text
        if text == lastFetchedText {
            print("[KeyboardVC] Already fetched for this text, skipping")
            return
        }

        lastFetchedText = text
        fetchSuggestions(for: text)
    }

    private func fetchSuggestions(for text: String) {
        print("[KeyboardVC] fetchSuggestions called for: '\(text.prefix(30))...'")

        // Get current emotion from keyboard view
        let emotion = keyboardView.getCurrentEmotion()

        // Get history-based suggestions
        let settings = UserSettings.shared
        let language = LanguageManager.shared.getLanguage(code: settings.currentLanguage)
        let historySuggestions = HistoryProcessor.searchSuggestionsFromHistory(
            text: text,
            history: settings.messageHistoryWithPrefix,
            language: language ?? JapaneseLanguage()
        )

        print("[KeyboardVC] History suggestions: \(historySuggestions.count)")

        // Fetch AI suggestions
        print("[KeyboardVC] Calling apiClient.fetchSuggestions...")
        apiClient.fetchSuggestions(for: text, emotion: emotion) { [weak self] response in
            print("[KeyboardVC] API response received: \(response != nil)")
            guard let self = self, let response = response else {
                // If API fails, show history suggestions only
                DispatchQueue.main.async { [weak self] in
                    self?.keyboardView.updateSuggestions(historySuggestions, currentText: text)
                }
                return
            }

            DispatchQueue.main.async { [weak self] in
                // Split text to get the portion that was sent to LLM (matches web version)
                let (firstHalf, secondHalf) = TextProcessor.splitLastFewSentencesForLLM(text)

                // Apply ignoreUnnecessaryDiffs to AI sentences using secondHalf (matches web version)
                let processedSentences = response.sentences.map { sentence in
                    firstHalf + DiffProcessor.ignoreUnnecessaryDiffs(original: secondHalf, modified: sentence)
                }

                // Combine all suggestions: history + processed AI sentences + AI words
                var allSuggestions = historySuggestions + processedSentences + response.words

                // Remove duplicates while preserving order
                var seen = Set<String>()
                allSuggestions = allSuggestions.filter { suggestion in
                    let lowercased = suggestion.lowercased()
                    if seen.contains(lowercased) {
                        return false
                    }
                    seen.insert(lowercased)
                    return true
                }

                self?.keyboardView.updateSuggestions(allSuggestions, currentText: text)
            }
        }
    }
}

// MARK: - KeyboardViewDelegate
extension KeyboardViewController: KeyboardViewDelegate {

    func keyboardView(_ view: KeyboardView, didTapKey key: String) {
        let proxy = textDocumentProxy

        switch key {
        case "delete":
            proxy.deleteBackward()
        case "space":
            proxy.insertText(" ")
        case "return":
            proxy.insertText("\n")
        case "shift":
            // Toggle shift state
            keyboardView.toggleShift()
            return  // Don't fetch suggestions for shift
        case "123":
            // Switch to number keyboard
            keyboardView.switchToNumberMode()
            return  // Don't fetch suggestions for mode switch
        case "ABC":
            // Switch to alphabet keyboard
            keyboardView.switchToAlphabetMode()
            return  // Don't fetch suggestions for mode switch
        case "小":
            // Small kana conversion (Japanese)
            handleSmallKanaConversion()
        default:
            proxy.insertText(key)
        }

        // Manually trigger fetch after key press
        // Note: textDidChange will also be called by iOS, but may be delayed
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.01) { [weak self] in
            guard let self = self else { return }
            if let contextBefore = self.textDocumentProxy.documentContextBeforeInput, !contextBefore.isEmpty {
                self.fetchSuggestionsIfNeeded(for: contextBefore)
            }
        }
    }

    func keyboardView(_ view: KeyboardView, didSelectSuggestion suggestion: String) {
        let proxy = textDocumentProxy

        // Get current text before modification
        let currentText = proxy.documentContextBeforeInput ?? ""

        // Delete the current word being typed
        if let currentWord = getCurrentWord() {
            for _ in 0..<currentWord.count {
                proxy.deleteBackward()
            }
        }

        // Normalize suggestion and insert
        let normalizedSuggestion = TextProcessor.normalize(suggestion, isLastInputFromSuggestion: true)
        proxy.insertText(normalizedSuggestion + " ")

        // Update message history with prefix tracking
        let settings = UserSettings.shared
        let prefix = TextProcessor.getUserInputPrefix(normalizedSuggestion)
        settings.addToMessageHistory(text: normalizedSuggestion, prefix: prefix)

        // Update conversation history
        settings.lastInputSpeech = normalizedSuggestion
        settings.addToConversationHistory(message: ConversationMessage(role: "user", content: normalizedSuggestion))
    }

    func keyboardViewDidRequestKeyboardChange(_ view: KeyboardView) {
        advanceToNextInputMode()
    }

    private func getCurrentWord() -> String? {
        let proxy = textDocumentProxy
        guard let contextBefore = proxy.documentContextBeforeInput else {
            return nil
        }

        let components = contextBefore.components(separatedBy: .whitespacesAndNewlines)
        return components.last
    }

    private func handleSmallKanaConversion() {
        let proxy = textDocumentProxy

        // Get current text
        guard let currentText = proxy.documentContextBeforeInput, !currentText.isEmpty else {
            return
        }

        // Try to convert last character to small kana
        if let converted = JapaneseKanaProcessor.convertLastCharToSmallKana(currentText) {
            // Delete current text and insert converted version
            for _ in 0..<currentText.count {
                proxy.deleteBackward()
            }
            proxy.insertText(converted)
        }
    }
}
