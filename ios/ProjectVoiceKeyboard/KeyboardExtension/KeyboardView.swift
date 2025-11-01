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

    private let alphabetKeys = [
        ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
        ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
        ["shift", "z", "x", "c", "v", "b", "n", "m", "delete"]
    ]

    private let numberKeys = [
        ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
        ["-", "/", ":", ";", "(", ")", "$", "&", "@", "\""],
        ["#+=", ".", ",", "?", "!", "'", "delete"]
    ]

    private let symbolKeys = [
        ["[", "]", "{", "}", "#", "%", "^", "*", "+", "="],
        ["_", "\\", "|", "~", "<", ">", "€", "£", "¥", "•"],
        ["123", ".", ",", "?", "!", "'", "delete"]
    ]

    enum KeyboardMode {
        case alphabet
        case number
        case symbol
    }

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func setupUI() {
        backgroundColor = UIColor(red: 0.82, green: 0.84, blue: 0.86, alpha: 1.0)

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

        NSLayoutConstraint.activate([
            emotionSelector.topAnchor.constraint(equalTo: topAnchor, constant: 4),
            emotionSelector.leadingAnchor.constraint(equalTo: leadingAnchor),
            emotionSelector.trailingAnchor.constraint(equalTo: trailingAnchor),
            emotionSelector.heightAnchor.constraint(equalToConstant: 60),

            suggestionBar.topAnchor.constraint(equalTo: emotionSelector.bottomAnchor, constant: 4),
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

        // Render each row
        for (index, row) in keys.enumerated() {
            let rowStack = UIStackView()
            rowStack.axis = .horizontal
            rowStack.spacing = 6
            rowStack.distribution = .fillEqually

            for key in row {
                let button = createKeyButton(for: key)
                rowStack.addArrangedSubview(button)
            }

            // Add bottom row with special layout
            if index == keys.count - 1 {
                let bottomRow = createBottomRow()
                keyboardStackView.addArrangedSubview(bottomRow)
            } else {
                keyboardStackView.addArrangedSubview(rowStack)
            }
        }
    }

    private func createBottomRow() -> UIStackView {
        let rowStack = UIStackView()
        rowStack.axis = .horizontal
        rowStack.spacing = 6
        rowStack.distribution = .fill

        // Mode switch button (123/ABC)
        let modeButton = createKeyButton(for: getModeButtonLabel())
        modeButton.widthAnchor.constraint(equalToConstant: 60).isActive = true

        // Globe button (keyboard switcher)
        let globeButton = createKeyButton(for: "🌐")
        globeButton.widthAnchor.constraint(equalToConstant: 40).isActive = true

        // Space bar
        let spaceButton = createKeyButton(for: "space")
        spaceButton.setTitle("space", for: .normal)

        // Return button
        let returnButton = createKeyButton(for: "return")
        returnButton.setTitle("return", for: .normal)
        returnButton.backgroundColor = UIColor(red: 0.0, green: 0.48, blue: 1.0, alpha: 1.0)
        returnButton.setTitleColor(.white, for: .normal)
        returnButton.widthAnchor.constraint(equalToConstant: 80).isActive = true

        rowStack.addArrangedSubview(modeButton)
        rowStack.addArrangedSubview(globeButton)
        rowStack.addArrangedSubview(spaceButton)
        rowStack.addArrangedSubview(returnButton)

        return rowStack
    }

    private func createKeyButton(for key: String) -> UIButton {
        let button = UIButton(type: .system)
        let displayText = (mode == .alphabet && isShifted) ? key.uppercased() : key

        button.setTitle(displayText, for: .normal)
        button.backgroundColor = .white
        button.setTitleColor(.black, for: .normal)
        button.titleLabel?.font = UIFont.systemFont(ofSize: 20, weight: .regular)
        button.layer.cornerRadius = 6
        button.layer.shadowColor = UIColor.black.cgColor
        button.layer.shadowOpacity = 0.1
        button.layer.shadowOffset = CGSize(width: 0, height: 1)
        button.layer.shadowRadius = 0

        // Special styling for special keys
        if ["shift", "delete", "123", "ABC", "#+=", "🌐"].contains(key) {
            button.backgroundColor = UIColor(red: 0.68, green: 0.71, blue: 0.74, alpha: 1.0)
            button.titleLabel?.font = UIFont.systemFont(ofSize: 16, weight: .medium)
        }

        button.addTarget(self, action: #selector(keyTapped(_:)), for: .touchUpInside)

        return button
    }

    @objc private func keyTapped(_ sender: UIButton) {
        guard let key = sender.currentTitle else { return }

        // Handle special keys
        switch key {
        case "🌐":
            delegate?.keyboardViewDidRequestKeyboardChange(self)
        case let k where k.uppercased() == "SHIFT" || k == "⇧":
            toggleShift()
        case "123", "ABC", "#+=":
            handleModeSwitch(key)
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
        case "123":
            switchToNumberMode()
        case "ABC":
            switchToAlphabetMode()
        case "#+=":
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
        case .number:
            return numberKeys
        case .symbol:
            return symbolKeys
        }
    }

    private func getModeButtonLabel() -> String {
        switch mode {
        case .alphabet:
            return "123"
        case .number:
            return "#+"
        case .symbol:
            return "ABC"
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
        mode = .alphabet
        renderKeyboard()
    }

    func updateSuggestions(_ suggestions: [String]) {
        suggestionBar.updateSuggestions(suggestions)
    }

    func getCurrentEmotion() -> SentenceEmotion {
        return emotionSelector.getCurrentEmotion()
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
}

class SuggestionBar: UIView {

    weak var delegate: SuggestionBarDelegate?
    private let scrollView = UIScrollView()
    private let stackView = UIStackView()

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

    func updateSuggestions(_ suggestions: [String]) {
        // Clear existing suggestions
        stackView.arrangedSubviews.forEach { $0.removeFromSuperview() }

        // Add new suggestions
        for suggestion in suggestions {
            let button = UIButton(type: .system)
            button.setTitle(suggestion, for: .normal)
            button.setTitleColor(.black, for: .normal)
            button.titleLabel?.font = UIFont.systemFont(ofSize: 16)
            button.contentEdgeInsets = UIEdgeInsets(top: 4, left: 12, bottom: 4, right: 12)
            button.addTarget(self, action: #selector(suggestionTapped(_:)), for: .touchUpInside)

            stackView.addArrangedSubview(button)
        }
    }

    @objc private func suggestionTapped(_ sender: UIButton) {
        guard let suggestion = sender.currentTitle else { return }
        delegate?.suggestionBar(self, didSelectSuggestion: suggestion)
    }
}
