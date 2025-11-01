//
//  KeyboardView.swift
//  KeyboardExtension
//
//  Created for Project Voice
//  Copyright 2025 Google LLC
//

import UIKit

protocol KeyboardViewDelegate: AnyObject {
    func keyboardView(_ view: KeyboardView, didTapKey key: String)
    func keyboardView(_ view: KeyboardView, didSelectSuggestion suggestion: String)
    func keyboardViewDidRequestKeyboardChange(_ view: KeyboardView)
}

class KeyboardView: UIView {

    weak var delegate: KeyboardViewDelegate?

    private var mode: KeyboardMode = .alphabet
    private var isShifted: Bool = false

    private let emotionSelector = EmotionSelector()
    private let suggestionBar = SuggestionBar()
    private let keyboardStackView = UIStackView()

    // English alphabet keyboard (QWERTY - iOS standard)
    private let alphabetKeys = [
        ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"],
        ["k", "l", "m", "n", "o", "p", "q", "r", "s", "t"],
        ["u", "v", "w", "x", "y", "z", "(", ")", "[", "]"],
        ["-", "_", "/", ":", ";", "&", "@", "#", "*", "'"]
    ]

    // Japanese hiragana keyboard (iOS standard flick layout style)
    // All rows have exactly 10 keys for perfect grid alignment
    private let hiraganaKeys = [
        ["わ", "ら", "や", "ま", "は", "な", "た", "さ", "か", "あ"],
        ["を", "り", "", "み", "ひ", "に", "ち", "し", "き", "い"],
        ["ん", "る", "ゆ", "む", "ふ", "ぬ", "つ", "す", "く", "う"],
        ["ー", "れ", "", "め", "へ", "ね", "て", "せ", "け", "え"],
        ["゛゜小", "ろ", "よ", "も", "ほ", "の", "と", "そ", "こ", "お"]
    ]

    private let numberKeys = [
        ["年", "月", "日", "時", "分", "1", "2", "3"],
        ["×", "÷", "+", "-", "=", "4", "5", "6"],
        ["♪", "☆", "%", "¥", "〒", "7", "8", "9"],
        ["→", "~", "・", "…", "○", "'", "0", "・"]
    ]

    private let symbolKeys = [
        ["[", "]", "{", "}", "#", "%", "^", "*", "+", "="],
        ["_", "\\", "|", "~", "<", ">", "€", "£", "¥", "•"],
        ["123", ".", ",", "?", "!", "'", "delete"]
    ]

    enum KeyboardMode {
        case alphabet
        case hiragana
        case number
        case symbol
    }

    override init(frame: CGRect) {
        super.init(frame: frame)
        // Set initial mode based on language
        let currentLanguage = UserSettings.shared.currentLanguage
        mode = (currentLanguage == "ja-JP") ? .hiragana : .alphabet
        setupUI()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func setupUI() {
        // iOS standard keyboard background (light mode)
        backgroundColor = UIColor(red: 0.82, green: 0.835, blue: 0.863, alpha: 1.0)

        // Setup emotion selector
        emotionSelector.delegate = self
        emotionSelector.translatesAutoresizingMaskIntoConstraints = false
        addSubview(emotionSelector)

        // Setup suggestion bar
        suggestionBar.delegate = self
        suggestionBar.translatesAutoresizingMaskIntoConstraints = false
        addSubview(suggestionBar)

        // Setup keyboard stack view
        keyboardStackView.axis = .vertical
        keyboardStackView.spacing = 8
        keyboardStackView.distribution = .fillEqually
        keyboardStackView.translatesAutoresizingMaskIntoConstraints = false
        addSubview(keyboardStackView)

        // Hide emotion selector - now using button in keyboard
        emotionSelector.isHidden = true

        NSLayoutConstraint.activate([
            emotionSelector.topAnchor.constraint(equalTo: topAnchor, constant: 4),
            emotionSelector.leadingAnchor.constraint(equalTo: leadingAnchor),
            emotionSelector.trailingAnchor.constraint(equalTo: trailingAnchor),
            emotionSelector.heightAnchor.constraint(equalToConstant: 0), // Set to 0

            suggestionBar.topAnchor.constraint(equalTo: topAnchor, constant: 4), // Start from top
            suggestionBar.leadingAnchor.constraint(equalTo: leadingAnchor),
            suggestionBar.trailingAnchor.constraint(equalTo: trailingAnchor),
            suggestionBar.heightAnchor.constraint(equalToConstant: 40),

            keyboardStackView.topAnchor.constraint(equalTo: suggestionBar.bottomAnchor, constant: 8),
            keyboardStackView.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 3),
            keyboardStackView.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -3),
            keyboardStackView.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -8)
        ])

        renderKeyboard()
    }

    private func renderKeyboard() {
        // Clear existing keys
        keyboardStackView.arrangedSubviews.forEach { $0.removeFromSuperview() }

        let keys = getCurrentKeys()

        // Fixed left column buttons: mode switches and keyboard switch
        let leftColumnKeys = ["☆123", "ABC", "あいう", "🌐"]

        // Fixed right column buttons: delete, space, return
        let rightColumnKeys = ["delete", "空白", "改行"]

        // Render each row with left and right fixed buttons
        for (index, row) in keys.enumerated() {
            let rowStack = UIStackView()
            rowStack.axis = .horizontal
            rowStack.spacing = 4
            rowStack.distribution = .fill

            // Left side: fixed button (mode switch or keyboard switch)
            if index < leftColumnKeys.count {
                let leftButton = createKeyButton(for: leftColumnKeys[index])
                leftButton.widthAnchor.constraint(equalToConstant: 60).isActive = true
                rowStack.addArrangedSubview(leftButton)
            } else {
                // For rows beyond the fixed buttons, add empty spacer
                let spacer = UIView()
                spacer.widthAnchor.constraint(equalToConstant: 60).isActive = true
                rowStack.addArrangedSubview(spacer)
            }

            // Middle: main keys with equal distribution
            let mainKeysStack = UIStackView()
            mainKeysStack.axis = .horizontal
            mainKeysStack.spacing = 4
            mainKeysStack.distribution = .fillEqually

            for key in row {
                if key.isEmpty {
                    // Empty key: add invisible spacer
                    let spacer = UIView()
                    spacer.backgroundColor = .clear
                    mainKeysStack.addArrangedSubview(spacer)
                } else {
                    let button = createKeyButton(for: key)
                    mainKeysStack.addArrangedSubview(button)
                }
            }

            rowStack.addArrangedSubview(mainKeysStack)

            // Right side: fixed button (delete, space, return, or emotion selector)
            if index < rightColumnKeys.count {
                let rightButton = createKeyButton(for: rightColumnKeys[index])
                rightButton.widthAnchor.constraint(equalToConstant: 70).isActive = true
                rowStack.addArrangedSubview(rightButton)
            } else if index == keys.count - 1 {
                // Last row: add emotion selector button
                let emotionButton = createEmotionSelectorButton()
                emotionButton.widthAnchor.constraint(equalToConstant: 70).isActive = true
                rowStack.addArrangedSubview(emotionButton)
            } else {
                // For other rows, add empty spacer
                let spacer = UIView()
                spacer.widthAnchor.constraint(equalToConstant: 70).isActive = true
                rowStack.addArrangedSubview(spacer)
            }

            keyboardStackView.addArrangedSubview(rowStack)
        }
    }

    private func createBottomRow() -> UIStackView {
        let rowStack = UIStackView()
        rowStack.axis = .horizontal
        rowStack.spacing = 4
        rowStack.distribution = .fill

        // ☆123 button
        let modeButton = createKeyButton(for: "☆123")
        modeButton.widthAnchor.constraint(equalToConstant: 60).isActive = true

        // ABC button
        let abcButton = createKeyButton(for: "ABC")
        abcButton.widthAnchor.constraint(equalToConstant: 55).isActive = true

        // Spacer 1
        let spacer1 = UIView()
        spacer1.widthAnchor.constraint(equalToConstant: 10).isActive = true

        // Spacer 2
        let spacer2 = UIView()
        spacer2.widthAnchor.constraint(equalToConstant: 10).isActive = true

        // Spacer 3 (flexible - takes remaining space)
        let spacer3 = UIView()

        // あいう button
        let hiraganaButton = createKeyButton(for: "あいう")
        hiraganaButton.widthAnchor.constraint(equalToConstant: 55).isActive = true

        // 🌐 button
        let globeButton = createKeyButton(for: "🌐")
        globeButton.widthAnchor.constraint(equalToConstant: 45).isActive = true

        // ⌨︎ button
        let keyboardButton = createKeyButton(for: "⌨︎")
        keyboardButton.widthAnchor.constraint(equalToConstant: 45).isActive = true

        rowStack.addArrangedSubview(modeButton)
        rowStack.addArrangedSubview(abcButton)
        rowStack.addArrangedSubview(spacer1)
        rowStack.addArrangedSubview(spacer2)
        rowStack.addArrangedSubview(spacer3)
        rowStack.addArrangedSubview(hiraganaButton)
        rowStack.addArrangedSubview(globeButton)
        rowStack.addArrangedSubview(keyboardButton)

        return rowStack
    }

    private func createKeyButton(for key: String) -> UIButton {
        let button = UIButton(type: .system)
        let displayText = (mode == .alphabet && isShifted) ? key.uppercased() : key

        button.setTitle(displayText, for: .normal)

        // Store the original key value in accessibilityIdentifier
        button.accessibilityIdentifier = key

        // iOS standard key styling
        button.backgroundColor = .white
        button.setTitleColor(.black, for: .normal)
        button.titleLabel?.font = UIFont.systemFont(ofSize: 22, weight: .regular)
        button.layer.cornerRadius = 5

        // iOS standard shadow
        button.layer.shadowColor = UIColor(red: 0, green: 0, blue: 0, alpha: 0.3).cgColor
        button.layer.shadowOpacity = 1.0
        button.layer.shadowOffset = CGSize(width: 0, height: 1)
        button.layer.shadowRadius = 0

        // Special styling for special keys (iOS standard gray keys)
        if ["shift", "delete", "⌫", "123", "☆123", "ABC", "#", "#+=", "🌐", "小", "゛゜小", "あいう", "空白", "改行"].contains(key) {
            button.backgroundColor = UIColor(red: 0.67, green: 0.69, blue: 0.73, alpha: 1.0)
            button.setTitleColor(.black, for: .normal)

            // Special symbols for shift and delete
            if key == "shift" {
                button.setTitle("⇧", for: .normal)
                button.titleLabel?.font = UIFont.systemFont(ofSize: 18, weight: .medium)
            } else if key == "delete" || key == "⌫" {
                button.setTitle("⌫", for: .normal)
                button.titleLabel?.font = UIFont.systemFont(ofSize: 22, weight: .light)
            } else {
                button.titleLabel?.font = UIFont.systemFont(ofSize: 14, weight: .regular)
            }
        }

        button.addTarget(self, action: #selector(keyTapped(_:)), for: .touchUpInside)

        return button
    }

    private func createEmotionSelectorButton() -> UIButton {
        let button = UIButton(type: .system)

        // Get current emotion and display its emoji
        let currentEmotion = emotionSelector.getCurrentEmotion()
        let emoji = getEmotionEmoji(for: currentEmotion)

        button.setTitle(emoji, for: .normal)
        button.titleLabel?.font = UIFont.systemFont(ofSize: 28, weight: .regular)

        // Gray background like other special keys
        button.backgroundColor = UIColor(red: 0.67, green: 0.69, blue: 0.73, alpha: 1.0)
        button.setTitleColor(.black, for: .normal)
        button.layer.cornerRadius = 5

        // iOS standard shadow
        button.layer.shadowColor = UIColor(red: 0, green: 0, blue: 0, alpha: 0.3).cgColor
        button.layer.shadowOpacity = 1.0
        button.layer.shadowOffset = CGSize(width: 0, height: 1)
        button.layer.shadowRadius = 0

        button.addTarget(self, action: #selector(emotionButtonTapped(_:)), for: .touchUpInside)

        return button
    }

    private func getEmotionEmoji(for emotion: SentenceEmotion) -> String {
        switch emotion {
        case .statement:
            return "💬"  // 普通
        case .question:
            return "❓"  // 質問
        case .request:
            return "🙏"  // お願い
        case .negative:
            return "🚫"  // 否定
        }
    }

    @objc private func emotionButtonTapped(_ sender: UIButton) {
        // Cycle through emotions
        let currentEmotion = emotionSelector.getCurrentEmotion()
        let nextEmotion: SentenceEmotion

        switch currentEmotion {
        case .statement:
            nextEmotion = .question
        case .question:
            nextEmotion = .request
        case .request:
            nextEmotion = .negative
        case .negative:
            nextEmotion = .statement
        }

        // Update emotion selector
        emotionSelector.setEmotion(nextEmotion)

        // Update button emoji
        sender.setTitle(getEmotionEmoji(for: nextEmotion), for: .normal)

        // Re-render keyboard to update the button
        renderKeyboard()
    }

    @objc private func keyTapped(_ sender: UIButton) {
        // Use accessibilityIdentifier to get the original key value
        guard let key = sender.accessibilityIdentifier else { return }

        // Handle special keys
        switch key {
        case "🌐":
            delegate?.keyboardViewDidRequestKeyboardChange(self)
        case let k where k.uppercased() == "SHIFT" || k == "⇧":
            toggleShift()
        case "123", "☆123", "ABC", "#+=", "あいう", "#":
            handleModeSwitch(key)
        case "空白":
            delegate?.keyboardView(self, didTapKey: "space")
        case "改行":
            delegate?.keyboardView(self, didTapKey: "return")
        case "delete", "⌫":
            delegate?.keyboardView(self, didTapKey: "delete")
        case "小", "゛゜小":
            // Combined key for dakuten, handakuten, and small kana
            delegate?.keyboardView(self, didTapKey: "小")
        default:
            let outputKey = (mode == .alphabet && isShifted) ? key.lowercased() : key
            delegate?.keyboardView(self, didTapKey: outputKey)

            // Auto un-shift after character input
            if isShifted && mode == .alphabet {
                isShifted = false
                renderKeyboard()
            }
        }
    }

    private func handleModeSwitch(_ key: String) {
        switch key {
        case "123", "☆123":
            switchToNumberMode()
        case "ABC":
            // ABC button always switches to alphabet mode
            mode = .alphabet
            renderKeyboard()
        case "あいう":
            // Hiragana button always switches to hiragana mode
            mode = .hiragana
            renderKeyboard()
        case "#", "#+=":
            mode = .symbol
            renderKeyboard()
        default:
            break
        }
    }

    private func getCurrentKeys() -> [[String]] {
        switch mode {
        case .alphabet:
            return alphabetKeys
        case .hiragana:
            return hiraganaKeys
        case .number:
            return numberKeys
        case .symbol:
            return symbolKeys
        }
    }

    private func getModeButtonLabel() -> String {
        switch mode {
        case .alphabet, .hiragana:
            return "123"
        case .number, .symbol:
            let currentLanguage = UserSettings.shared.currentLanguage
            return (currentLanguage == "ja-JP") ? "あいう" : "ABC"
        }
    }

    // MARK: - Public Methods

    func toggleShift() {
        isShifted.toggle()
        renderKeyboard()
    }

    func switchToNumberMode() {
        mode = .number
        renderKeyboard()
    }

    func switchToAlphabetMode() {
        // Choose alphabet or hiragana based on current language
        let currentLanguage = UserSettings.shared.currentLanguage
        mode = (currentLanguage == "ja-JP") ? .hiragana : .alphabet
        renderKeyboard()
    }

    func updateSuggestions(_ suggestions: [String], currentText: String = "") {
        suggestionBar.updateSuggestions(suggestions, currentText: currentText)
    }

    func showInitialPhrases(_ phrases: [String]) {
        suggestionBar.updateSuggestions(phrases, currentText: "")
    }

    func getCurrentEmotion() -> SentenceEmotion {
        return emotionSelector.getCurrentEmotion()
    }

    func getCurrentLanguage() -> String {
        return UserSettings.shared.currentLanguage
    }

    func updateEmotionLabels() {
        emotionSelector.updateLabelsForCurrentLanguage()
    }
}

// MARK: - EmotionSelectorDelegate
extension KeyboardView: EmotionSelectorDelegate {
    func emotionSelector(_ selector: EmotionSelector, didSelectEmotion emotion: SentenceEmotion) {
        // Notify delegate that emotion changed (can trigger new suggestions)
        // For now, just store it - KeyboardViewController will use it on next fetch
    }
}

// MARK: - SuggestionBarDelegate
extension KeyboardView: SuggestionBarDelegate {
    func suggestionBar(_ bar: SuggestionBar, didSelectSuggestion suggestion: String) {
        delegate?.keyboardView(self, didSelectSuggestion: suggestion)
    }
}

// MARK: - SuggestionBar
protocol SuggestionBarDelegate: AnyObject {
    func suggestionBar(_ bar: SuggestionBar, didSelectSuggestion suggestion: String)
    func suggestionBar(_ bar: SuggestionBar, didSelectPartialSuggestion partial: String, from fullSuggestion: String)
}

class SuggestionBar: UIView {

    weak var delegate: SuggestionBarDelegate?
    private let scrollView = UIScrollView()
    private let stackView = UIStackView()
    private var currentText: String = ""
    private var currentLanguage: Language?

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func setupUI() {
        backgroundColor = UIColor(red: 0.96, green: 0.96, blue: 0.97, alpha: 1.0)

        scrollView.showsHorizontalScrollIndicator = false
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        addSubview(scrollView)

        stackView.axis = .horizontal
        stackView.spacing = 8
        stackView.distribution = .equalSpacing
        stackView.translatesAutoresizingMaskIntoConstraints = false
        scrollView.addSubview(stackView)

        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 8),
            scrollView.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -8),
            scrollView.bottomAnchor.constraint(equalTo: bottomAnchor),

            stackView.topAnchor.constraint(equalTo: scrollView.topAnchor),
            stackView.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor),
            stackView.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor),
            stackView.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor),
            stackView.heightAnchor.constraint(equalTo: scrollView.heightAnchor)
        ])
    }

    func updateSuggestions(_ suggestions: [String], currentText: String = "") {
        // Clear existing suggestions
        stackView.arrangedSubviews.forEach { $0.removeFromSuperview() }

        self.currentText = currentText
        self.currentLanguage = LanguageManager.shared.getLanguage(code: UserSettings.shared.currentLanguage)

        // Add new suggestions with word-by-word selection
        for suggestion in suggestions {
            let container = createSuggestionContainer(for: suggestion)
            stackView.addArrangedSubview(container)
        }
    }

    private func createSuggestionContainer(for suggestion: String) -> UIView {
        let container = UIStackView()
        container.axis = .horizontal
        container.spacing = 2
        container.distribution = .fill

        guard let language = currentLanguage else {
            // Fallback to simple button
            let button = createWordButton(suggestion, fullSuggestion: suggestion)
            container.addArrangedSubview(button)
            return container
        }

        // Check for shared prefix with current text
        let leadingWordsCount = PunctuationProcessor.getLeadingWords(
            suggestion,
            matching: currentText,
            language: language
        )

        // Split into words with punctuation separation
        let words = PunctuationProcessor.splitPunctuations(suggestion)

        // Add ellipsis if there's a shared prefix
        if leadingWordsCount > 0 && !currentText.isEmpty {
            let ellipsisLabel = UILabel()
            ellipsisLabel.text = "… "
            ellipsisLabel.font = UIFont.systemFont(ofSize: 16)
            ellipsisLabel.textColor = .gray
            container.addArrangedSubview(ellipsisLabel)
        }

        // Add word buttons (skip leading shared words)
        let startIndex = min(leadingWordsCount, words.count)
        for i in startIndex..<words.count {
            let word = words[i]
            let button = createWordButton(word, fullSuggestion: suggestion, wordIndex: i)
            container.addArrangedSubview(button)
        }

        return container
    }

    private func createWordButton(_ word: String, fullSuggestion: String, wordIndex: Int = -1) -> UIButton {
        let button = UIButton(type: .system)

        var config = UIButton.Configuration.plain()
        config.contentInsets = NSDirectionalEdgeInsets(top: 4, leading: 6, bottom: 4, trailing: 6)
        config.baseForegroundColor = .black
        config.attributedTitle = AttributedString(
            word,
            attributes: AttributeContainer([.font: UIFont.systemFont(ofSize: 16)])
        )
        button.configuration = config

        // Store full suggestion and word info
        button.accessibilityLabel = fullSuggestion
        button.tag = wordIndex

        button.addTarget(self, action: #selector(wordButtonTapped(_:)), for: .touchUpInside)

        return button
    }

    @objc private func wordButtonTapped(_ sender: UIButton) {
        guard let fullSuggestion = sender.accessibilityLabel else { return }
        let wordIndex = sender.tag

        if wordIndex >= 0 {
            // Partial selection: reconstruct suggestion up to this word
            let words = PunctuationProcessor.splitPunctuations(fullSuggestion)
            if wordIndex < words.count {
                let partial = words[0...wordIndex].joined()
                delegate?.suggestionBar(self, didSelectPartialSuggestion: partial, from: fullSuggestion)
            }
        } else {
            // Full suggestion selection
            delegate?.suggestionBar(self, didSelectSuggestion: fullSuggestion)
        }
    }
}

// MARK: - SuggestionBarDelegate Extension for backward compatibility
extension SuggestionBarDelegate {
    func suggestionBar(_ bar: SuggestionBar, didSelectPartialSuggestion partial: String, from fullSuggestion: String) {
        // Default implementation: treat as full suggestion
        suggestionBar(bar, didSelectSuggestion: partial)
    }
}
