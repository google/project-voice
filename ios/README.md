# Project Voice - iOS Keyboard Extension

This directory contains the native iOS keyboard extension for Project Voice, enabling AI-powered text prediction directly from your iOS keyboard.

## Features

- 🎯 **AI-Powered Suggestions**: Real-time word and sentence suggestions powered by the Project Voice API
- 😊 **Emotion/Sentence Type Selector**: Choose between Statement, Question, Request, or Negative to control suggestion tone (matches web version)
- ⌨️ **Full QWERTY Layout**: Standard iOS-style keyboard with alphabet, number, and symbol modes
- 🔄 **Smart Shift**: Auto-capitalization and shift key functionality
- 💬 **Conversation History**: Tracks conversation context for better AI suggestions
- 👤 **Persona Customization**: Define how the AI generates suggestions
- 🌐 **Multi-Language Support**: English, Japanese, French, German, Swedish
- 📱 **Native iOS Experience**: Built with UIKit for optimal performance
- 🔗 **Dual Suggestions**: Fetches both sentence and word suggestions in parallel

## Project Structure

```
ios/
└── ProjectVoiceKeyboard/
    ├── ProjectVoiceKeyboard/          # Main app (setup & settings)
    │   ├── ProjectVoiceKeyboardApp.swift
    │   ├── ContentView.swift
    │   └── SettingsView.swift        # NEW: Persona, API config
    └── KeyboardExtension/             # Keyboard extension (core functionality)
        ├── KeyboardViewController.swift
        ├── KeyboardView.swift
        ├── EmotionSelector.swift      # NEW: Emotion selector UI
        ├── UserSettings.swift         # NEW: Shared settings storage
        ├── ApiClient.swift            # Enhanced with full context
        └── Info.plist
```

## Setup Instructions

### Prerequisites

- macOS with Xcode 15.0 or later
- iOS 15.0+ deployment target
- Apple Developer account (for testing on device)

### 1. Open in Xcode

Since this is a Swift project, you need to create an Xcode project:

```bash
cd ios
# Open Xcode and create a new iOS App project
# Name: ProjectVoiceKeyboard
# Bundle Identifier: com.yourcompany.ProjectVoiceKeyboard
```

### 2. Add Keyboard Extension Target

1. In Xcode, click **File > New > Target**
2. Select **Custom Keyboard Extension**
3. Name it `KeyboardExtension`
4. Bundle Identifier: `com.yourcompany.ProjectVoiceKeyboard.KeyboardExtension`
5. Click **Activate** when prompted

### 3. Add Source Files

1. Delete the default `KeyboardViewController.swift` created by Xcode
2. Drag and drop the following files into the `KeyboardExtension` group:
   - `KeyboardViewController.swift`
   - `KeyboardView.swift`
   - `ApiClient.swift`
   - `EmotionSelector.swift` ✨ NEW
   - `UserSettings.swift` ✨ NEW
3. Drag and drop the following files into the `ProjectVoiceKeyboard` group:
   - `SettingsView.swift` ✨ NEW
4. Replace the `Info.plist` in the KeyboardExtension target with the provided one

### 4. Configure API Endpoint

You can configure the API endpoint in two ways:

**Option 1: In the main app (recommended)**
1. Run the app
2. Tap "Keyboard Settings" or the gear icon
3. Enter your API endpoint URL in the settings

**Option 2: Default value**
Edit `UserSettings.swift` and update the default:

```swift
var apiEndpoint: String {
    get {
        return defaults.string(forKey: Keys.apiEndpoint) ?? "https://your-api-endpoint.com/api"
    }
    ...
}
```

### 5. Configure App Group (Optional)

For sharing data between the main app and keyboard extension:

1. Enable **App Groups** capability for both targets
2. Add a shared app group: `group.com.yourcompany.ProjectVoiceKeyboard`
3. Update code to use shared UserDefaults if needed

### 6. Build and Run

1. Select your device or simulator
2. Choose the **ProjectVoiceKeyboard** scheme
3. Click **Run** (⌘R)

## Installing the Keyboard on Device

### Enable the Keyboard

1. Open the **ProjectVoiceKeyboard** app on your device
2. Tap **Open Settings** button
3. Navigate to **General > Keyboard > Keyboards**
4. Tap **Add New Keyboard...**
5. Select **Project Voice Keyboard**

### Enable Full Access (Required for API)

1. Go to **Settings > General > Keyboard > Keyboards**
2. Tap **Project Voice Keyboard**
3. Enable **Allow Full Access**

⚠️ **Note**: Full Access is required for the keyboard to make network requests to fetch AI suggestions.

## Using the Keyboard

1. Open any app with text input (Notes, Messages, etc.)
2. Tap on a text field
3. Tap and hold the 🌐 (globe) icon on the keyboard
4. Select **Project Voice Keyboard**

## Keyboard Features

### Emotion Selector ✨ NEW (matches web version)

Located at the top of the keyboard:
- **💬 普通 (Statement)**: Regular statements
- **❓ 質問 (Question)**: Questions
- **🙏 お願い (Request)**: Requests or polite expressions
- **🚫 否定 (Negative)**: Negative or refusing expressions

Tap an emotion to change the tone of AI suggestions. The selected emotion is highlighted in yellow with a black border.

### Suggestion Bar

- Displays AI-powered suggestions below the emotion selector
- Shows both **sentence suggestions** (from context) and **word suggestions** (for completion)
- Tap any suggestion to insert it
- Automatically fetches suggestions as you type
- Uses conversation history and persona for context-aware suggestions

### Key Layout

- **First Row**: Q W E R T Y U I O P
- **Second Row**: A S D F G H J K L
- **Third Row**: Shift Z X C V B N M Delete
- **Bottom Row**: 123/ABC | 🌐 | Space | Return

### Mode Switching

- **123**: Switch to numbers and basic symbols
- **#+=**: Switch to additional symbols (from number mode)
- **ABC**: Switch back to alphabet mode

### Special Keys

- **Shift**: Toggle uppercase (single tap)
- **🌐**: Switch between installed keyboards
- **Delete**: Backspace
- **Return**: Insert newline
- **Space**: Insert space

## API Integration

The keyboard communicates with the Project Voice backend API using the **exact same format as the web version**.

### Endpoint

```
POST {baseURL}/run-macro
Content-Type: multipart/form-data
```

### Request Format (matches web version exactly)

The iOS keyboard sends requests in `multipart/form-data` format with the following fields:

```
id: "SentenceGeneric20250311" or "WordGeneric20240628"
userInputs: JSON string containing:
  {
    "language": "en-US",
    "num": "5",
    "text": "current input text",
    "persona": "user-defined persona",
    "lastOutputSpeech": "previous output",
    "lastInputSpeech": "previous input",
    "conversationHistory": "user: ...\nassistant: ...",
    "sentenceEmotion": "Statement" | "Question" | "Request" | "Negative"
  }
temperature: "0.0"
model_id: "gemini-2.0-flash-001"
_csrf_token: "" (empty for keyboard extension)
```

### Response Format

```json
{
  "messages": [
    {
      "text": "1. First suggestion\n2. Second suggestion\n3. Third suggestion\n4. Fourth suggestion\n5. Fifth suggestion"
    }
  ]
}
```

The iOS client parses the numbered list and extracts suggestions, **exactly matching the web version's `parseResponse` function**.

### Dual Requests

For each text input, the keyboard makes **two parallel requests**:
1. **Sentence suggestions** with `macroId: "SentenceGeneric20250311"`
2. **Word suggestions** with `macroId: "WordGeneric20240628"`

Results are combined and displayed in the suggestion bar.

## Customization

### Adding New Languages

1. Add language-specific key layouts in `KeyboardView.swift`
2. Update `ApiClient.swift` to send the correct language code
3. Add localized strings in the main app

### Changing Keyboard Appearance

Edit the styling in `KeyboardView.swift`:

```swift
// Background color
backgroundColor = UIColor(red: 0.82, green: 0.84, blue: 0.86, alpha: 1.0)

// Key button color
button.backgroundColor = .white

// Special key color
button.backgroundColor = UIColor(red: 0.68, green: 0.71, blue: 0.74, alpha: 1.0)
```

### Adjusting Keyboard Height

In `KeyboardViewController.swift`:

```swift
keyboardView.heightAnchor.constraint(equalToConstant: 280)
```

## Troubleshooting

### Keyboard Not Appearing

- Make sure the keyboard is enabled in Settings
- Try restarting the device
- Check that the app is properly signed

### Suggestions Not Loading

- Verify Full Access is enabled
- Check the API endpoint URL in `ApiClient.swift`
- Test the API endpoint with curl/Postman
- Check Xcode console for network errors

### Build Errors

- Ensure deployment target is iOS 15.0+
- Clean build folder (⌘⇧K)
- Update provisioning profiles

## Architecture

### KeyboardViewController

Main controller that:
- Initializes the keyboard view
- Handles text document proxy interactions
- Fetches AI suggestions from API
- Manages keyboard-text field communication

### KeyboardView

UIKit view that:
- Renders the keyboard layout
- Handles key tap events
- Manages keyboard modes (alphabet/number/symbol)
- Displays suggestion bar

### ApiClient

Network layer that:
- Communicates with Project Voice backend
- Fetches sentence and word suggestions
- Handles JSON serialization/deserialization

## Privacy & Security

- The keyboard requires **Full Access** to make network requests
- All text input is sent to your configured API endpoint
- No data is stored locally by default
- Consider implementing local caching for offline support
- Follow Apple's keyboard extension guidelines for user privacy

## License

Copyright 2025 Google LLC

Licensed under the Apache License, Version 2.0

## Next Steps

1. **Test thoroughly** on multiple devices and iOS versions
2. **Implement offline mode** with local suggestions
3. **Add haptic feedback** for better UX
4. **Optimize API calls** with debouncing/throttling
5. **Add analytics** to improve suggestion quality
6. **Submit to App Store** following Apple's review guidelines

## Resources

- [Apple Keyboard Extension Guide](https://developer.apple.com/documentation/uikit/keyboards_and_input/creating_a_custom_keyboard)
- [UIInputViewController Documentation](https://developer.apple.com/documentation/uikit/uiinputviewcontroller)
- [App Extension Programming Guide](https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/)
