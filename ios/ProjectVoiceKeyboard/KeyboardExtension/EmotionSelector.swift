//
//  EmotionSelector.swift
//  KeyboardExtension
//
//  Created for Project Voice
//  Copyright 2025 Google LLC
//

import UIKit

protocol EmotionSelectorDelegate: AnyObject {
    func emotionSelector(_ selector: EmotionSelector, didSelectEmotion emotion: SentenceEmotion)
}

enum SentenceEmotion: String, CaseIterable {
    case statement = "Statement"
    case question = "Question"
    case request = "Request"
    case negative = "Negative"

    var emoji: String {
        switch self {
        case .statement: return "💬"
        case .question: return "❓"
        case .request: return "🙏"
        case .negative: return "🚫"
        }
    }

    func label(for languageCode: String) -> String {
        if let language =
        LanguageManager.shared.getLanguage(code: languageCode),
           let emotionConfig = language.emotions.first(where: { $0.emoji == self.emoji }) {
            return emotionConfig.label
        }
        // Fallback to Japanese labels
        switch self {
        case .statement: return "普通"
        case .question: return "質問"
        case .request: return "お願い"
        case .negative: return "否定"
        }
    }
}

class EmotionSelector: UIView {

    weak var delegate: EmotionSelectorDelegate?

    private var selectedEmotion: SentenceEmotion = .statement
    private let stackView = UIStackView()
    private var emotionButtons: [SentenceEmotion: UIButton] = [:]

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func setupUI() {
        backgroundColor = UIColor(red: 0.96, green: 0.96, blue: 0.97, alpha: 1.0)

        stackView.axis = .horizontal
        stackView.spacing = 8
        stackView.distribution = .fillEqually
        stackView.translatesAutoresizingMaskIntoConstraints = false
        addSubview(stackView)

        NSLayoutConstraint.activate([
            stackView.topAnchor.constraint(equalTo: topAnchor, constant: 4),
            stackView.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 8),
            stackView.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -8),
            stackView.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -4)
        ])

        // Create buttons for each emotion
        for emotion in SentenceEmotion.allCases {
            let button = createEmotionButton(for: emotion)
            emotionButtons[emotion] = button
            stackView.addArrangedSubview(button)
        }

        // Select default emotion
        updateButtonStates()
    }

    private func createEmotionButton(for emotion: SentenceEmotion) -> UIButton {
        let button = UIButton(type: .system)

        // Create vertical stack for emoji and label
        let containerView = UIView()
        containerView.isUserInteractionEnabled = false
        containerView.tag = 100 // Tag to find it later

        let emojiLabel = UILabel()
        emojiLabel.text = emotion.emoji
        emojiLabel.font = UIFont.systemFont(ofSize: 24)
        emojiLabel.textAlignment = .center
        emojiLabel.tag = 101 // Tag for emoji label
        emojiLabel.translatesAutoresizingMaskIntoConstraints = false

        let textLabel = UILabel()
        textLabel.text = emotion.label(for: UserSettings.shared.currentLanguage)
        textLabel.font = UIFont.systemFont(ofSize: 11, weight: .medium)
        textLabel.textAlignment = .center
        textLabel.textColor = UIColor(red: 0.13, green: 0.13, blue: 0.14, alpha: 1.0)
        textLabel.tag = 102 // Tag for text label
        textLabel.translatesAutoresizingMaskIntoConstraints = false

        containerView.addSubview(emojiLabel)
        containerView.addSubview(textLabel)
        containerView.translatesAutoresizingMaskIntoConstraints = false

        button.addSubview(containerView)

        NSLayoutConstraint.activate([
            containerView.centerXAnchor.constraint(equalTo: button.centerXAnchor),
            containerView.centerYAnchor.constraint(equalTo: button.centerYAnchor),

            emojiLabel.topAnchor.constraint(equalTo: containerView.topAnchor),
            emojiLabel.centerXAnchor.constraint(equalTo: containerView.centerXAnchor),

            textLabel.topAnchor.constraint(equalTo: emojiLabel.bottomAnchor, constant: 2),
            textLabel.centerXAnchor.constraint(equalTo: containerView.centerXAnchor),
            textLabel.bottomAnchor.constraint(equalTo: containerView.bottomAnchor)
        ])

        button.backgroundColor = .white
        button.layer.cornerRadius = 8
        button.layer.borderWidth = 2
        button.layer.borderColor = UIColor.clear.cgColor

        button.tag = emotion.hashValue
        button.addTarget(self, action: #selector(emotionButtonTapped(_:)), for: .touchUpInside)

        return button
    }

    @objc private func emotionButtonTapped(_ sender: UIButton) {
        guard let emotion = SentenceEmotion.allCases.first(where: { $0.hashValue == sender.tag }) else {
            return
        }

        selectedEmotion = emotion
        updateButtonStates()
        delegate?.emotionSelector(self, didSelectEmotion: emotion)
    }

    private func updateButtonStates() {
        for (emotion, button) in emotionButtons {
            if emotion == selectedEmotion {
                button.backgroundColor = UIColor(red: 1.0, green: 0.95, blue: 0.4, alpha: 1.0) // Yellow highlight
                button.layer.borderColor = UIColor.black.cgColor
            } else {
                button.backgroundColor = .white
                button.layer.borderColor = UIColor.clear.cgColor
            }
        }
    }

    func setEmotion(_ emotion: SentenceEmotion) {
        selectedEmotion = emotion
        updateButtonStates()
    }

    func getCurrentEmotion() -> SentenceEmotion {
        return selectedEmotion
    }

    func updateLabelsForCurrentLanguage() {
        let currentLanguage = UserSettings.shared.currentLanguage
        for (emotion, button) in emotionButtons {
            if let containerView = button.viewWithTag(100),
               let textLabel = containerView.viewWithTag(102) as? UILabel {
                textLabel.text = emotion.label(for: currentLanguage)
            }
        }
    }
}
