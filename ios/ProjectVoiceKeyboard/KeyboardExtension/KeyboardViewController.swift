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

    override func viewDidLoad() {
        super.viewDidLoad()

        // Initialize API client
        apiClient = ApiClient()

        // Setup keyboard view
        setupKeyboardView()
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
        guard let proxy = textDocumentProxy as? UITextDocumentProxy else { return }

        // Get current text for suggestions
        if let contextBefore = proxy.documentContextBeforeInput {
            fetchSuggestions(for: contextBefore)
        }
    }

    private func fetchSuggestions(for text: String) {
        // Get current emotion from keyboard view
        let emotion = keyboardView.getCurrentEmotion()

        apiClient.fetchSuggestions(for: text, emotion: emotion) { [weak self] response in
            guard let self = self, let response = response else { return }

            DispatchQueue.main.async {
                // Combine sentence and word suggestions
                // Show sentence suggestions first, then word suggestions
                let allSuggestions = response.sentences + response.words
                self.keyboardView.updateSuggestions(allSuggestions)
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
        case "123":
            // Switch to number keyboard
            keyboardView.switchToNumberMode()
        case "ABC":
            // Switch to alphabet keyboard
            keyboardView.switchToAlphabetMode()
        default:
            proxy.insertText(key)
        }
    }

    func keyboardView(_ view: KeyboardView, didSelectSuggestion suggestion: String) {
        let proxy = textDocumentProxy

        // Delete the current word being typed
        if let currentWord = getCurrentWord() {
            for _ in 0..<currentWord.count {
                proxy.deleteBackward()
            }
        }

        // Insert the suggestion
        proxy.insertText(suggestion + " ")

        // Update conversation history
        let settings = UserSettings.shared
        settings.lastInputSpeech = suggestion
        settings.addToConversationHistory(message: ConversationMessage(role: "user", content: suggestion))
    }

    func keyboardViewDidRequestKeyboardChange(_ view: KeyboardView) {
        advanceToNextInputMode()
    }

    private func getCurrentWord() -> String? {
        guard let proxy = textDocumentProxy as? UITextDocumentProxy,
              let contextBefore = proxy.documentContextBeforeInput else {
            return nil
        }

        let components = contextBefore.components(separatedBy: .whitespacesAndNewlines)
        return components.last
    }
}
