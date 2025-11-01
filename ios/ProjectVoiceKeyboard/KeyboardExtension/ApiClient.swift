//
//  ApiClient.swift
//  KeyboardExtension
//
//  Created for Project Voice
//  Copyright 2025 Google LLC
//

import Foundation

struct SuggestionResponse {
    let sentences: [String]
    let words: [String]
}

class ApiClient {

    private let settings = UserSettings.shared
    private var currentTasks: [URLSessionDataTask] = []

    // Adaptive delay tracking (QPS-based)
    private var previousCallTimes: [TimeInterval] = []
    private let maxCallHistory = 10

    // MARK: - Main Fetch Method (matches web version)

    func fetchSuggestions(
        for text: String,
        emotion: SentenceEmotion,
        completion: @escaping (SuggestionResponse?) -> Void
    ) {
        // Cancel any ongoing requests
        print("[ApiClient] Cancelling \(currentTasks.count) ongoing tasks")
        for task in currentTasks {
            task.cancel()
        }
        currentTasks.removeAll()

        // Track call time BEFORE delay calculation
        let currentTime = Date().timeIntervalSince1970
        previousCallTimes.append(currentTime)
        if previousCallTimes.count > maxCallHistory {
            previousCallTimes.removeFirst()
        }

        // Calculate adaptive delay
        let delay = calculateAdaptiveDelay()
        print("[ApiClient] fetchSuggestions for text: '\(text.prefix(20))...', delay: \(delay)s")

        // Apply delay if needed
        if delay > 0 {
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
                self?.performFetch(text: text, emotion: emotion, completion: completion)
            }
        } else {
            performFetch(text: text, emotion: emotion, completion: completion)
        }
    }

    private func performFetch(
        text: String,
        emotion: SentenceEmotion,
        completion: @escaping (SuggestionResponse?) -> Void
    ) {
        var baseURL = settings.apiEndpoint
        // CRITICAL FIX: Ensure baseURL is never empty
        if baseURL.isEmpty {
            baseURL = "https://project-voice-476504.uc.r.appspot.com"
            NSLog("[ApiClient] WARNING: apiEndpoint was empty, using default: %@", baseURL)
        }
        NSLog("[ApiClient] Using baseURL: %@", baseURL)

        let currentLanguage = settings.currentLanguage
        let aiConfigName = settings.aiConfig

        // Get AI configuration for current language
        guard let aiConfig = LanguageManager.shared.getAIConfig(languageCode: currentLanguage, configName: aiConfigName) else {
            print("Failed to get AI config for language: \(currentLanguage), config: \(aiConfigName)")
            completion(nil)
            return
        }

        // Split text to send only last ~30 chars to LLM (matching web version)
        let (_, textForLLM) = TextProcessor.splitLastFewSentencesForLLM(text)

        // Prepare request context (matching web version structure)
        let userInputs: [String: String] = [
            "language": currentLanguage,
            "num": String(settings.getSuggestionCount()),
            "text": textForLLM,  // Send only last few sentences
            "persona": settings.persona,
            "lastOutputSpeech": settings.lastOutputSpeech,
            "lastInputSpeech": settings.lastInputSpeech,
            "conversationHistory": settings.getConversationHistoryString(),
            "sentenceEmotion": emotion.rawValue
        ]

        // Fetch both sentence and word suggestions in parallel
        let group = DispatchGroup()

        var sentenceSuggestions: [String] = []
        var wordSuggestions: [String] = []

        // Fetch sentence suggestions
        group.enter()
        fetchMacro(
            baseURL: baseURL,
            macroId: aiConfig.sentenceMacro,
            model: aiConfig.model,
            userInputs: userInputs,
            temperature: 0.0
        ) { sentences in
            sentenceSuggestions = sentences
            group.leave()
        }

        // Fetch word suggestions
        group.enter()
        fetchMacro(
            baseURL: baseURL,
            macroId: aiConfig.wordMacro,
            model: aiConfig.model,
            userInputs: userInputs,
            temperature: 0.0
        ) { words in
            wordSuggestions = words
            group.leave()
        }

        // Wait for both to complete
        group.notify(queue: .main) {
            let response = SuggestionResponse(
                sentences: sentenceSuggestions,
                words: wordSuggestions
            )
            completion(response)
        }
    }

    // MARK: - Fetch Macro (matches web version exactly)

    private func fetchMacro(
        baseURL: String,
        macroId: String,
        model: String,
        userInputs: [String: String],
        temperature: Double,
        completion: @escaping ([String]) -> Void
    ) {
        let urlString = "\(baseURL)/run-macro"
        print("[ApiClient] Attempting to create URL from: '\(urlString)'")
        print("[ApiClient] baseURL is: '\(baseURL)'")

        guard let url = URL(string: urlString) else {
            print("[ApiClient] ERROR: Failed to create URL from '\(urlString)'")
            completion([])
            return
        }

        print("[ApiClient] URL created successfully: \(url)")

        // Create multipart/form-data request (matching web version)
        let boundary = "Boundary-\(UUID().uuidString)"
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        // Build form data body
        var body = Data()

        // Add 'id' field (macro ID)
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"id\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(macroId)\r\n".data(using: .utf8)!)

        // Add 'userInputs' field as JSON string
        if let userInputsJSON = try? JSONSerialization.data(withJSONObject: userInputs),
           let userInputsString = String(data: userInputsJSON, encoding: .utf8) {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"userInputs\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(userInputsString)\r\n".data(using: .utf8)!)
        }

        // Add 'temperature' field
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"temperature\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(temperature)\r\n".data(using: .utf8)!)

        // Add 'model_id' field
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"model_id\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(model)\r\n".data(using: .utf8)!)

        // Add '_csrf_token' field (empty for keyboard extension)
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"_csrf_token\"\r\n\r\n".data(using: .utf8)!)
        body.append("\r\n".data(using: .utf8)!)

        // End boundary
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)

        request.httpBody = body

        // Make the request
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("[ApiClient] Error fetching macro \(macroId): \(error)")
                completion([])
                return
            }

            guard let data = data else {
                print("[ApiClient] No data received for macro \(macroId)")
                completion([])
                return
            }

            do {
                // Parse response matching web version format
                // Expected: { "messages": [{ "text": "1. suggestion\n2. suggestion..." }] }
                if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let messages = json["messages"] as? [[String: Any]],
                   let firstMessage = messages.first,
                   let resultText = firstMessage["text"] as? String {
                    // Parse numbered list format
                    let suggestions = self.parseNumberedList(resultText)
                    print("[ApiClient] Received \(suggestions.count) suggestions for macro \(macroId)")
                    completion(suggestions)
                } else {
                    print("[ApiClient] Unexpected response format for macro \(macroId)")
                    if let responseString = String(data: data, encoding: .utf8) {
                        print("[ApiClient] Response: \(responseString.prefix(200))")
                    }
                    completion([])
                }
            } catch {
                print("[ApiClient] Error parsing response for macro \(macroId): \(error)")
                completion([])
            }
        }

        currentTasks.append(task)
        task.resume()
    }

    // MARK: - Helper Methods

    private func parseNumberedList(_ text: String) -> [String] {
        // Parse format like:
        // 1. First suggestion
        // 2. Second suggestion
        // etc.

        // Clean up response (matching web version)
        let cleanedText = TextProcessor.cleanupResponse(text)

        let lines = cleanedText.components(separatedBy: .newlines)
        var suggestions: [String] = []

        for line in lines {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            // Match lines starting with number and period
            if let range = trimmed.range(of: #"^\d+\.\s?"#, options: .regularExpression) {
                let suggestion = trimmed[range.upperBound...].trimmingCharacters(in: .whitespaces)
                if !suggestion.isEmpty {
                    suggestions.append(String(suggestion))
                }
            }
        }

        // Limit to 5 suggestions (matching web version)
        return Array(suggestions.prefix(5))
    }

    func cancelOngoingRequests() {
        for task in currentTasks {
            task.cancel()
        }
        currentTasks.removeAll()
    }

    // MARK: - Adaptive Delay

    /// Calculates adaptive delay based on recent request frequency (QPS)
    /// Returns delay in seconds (0-0.3) - matches web version formula exactly
    private func calculateAdaptiveDelay() -> TimeInterval {
        let currentTime = Date().timeIntervalSince1970
        let recentCalls = previousCallTimes.filter { currentTime - $0 < 1.0 }  // Calls in last second

        // QPS = number of recent calls
        let qps = recentCalls.count

        // Web version formula: Math.min(150 * (qps - 1), 300)
        // QPS=1 -> 0ms, QPS=2 -> 150ms, QPS=3+ -> 300ms
        let delayMs = min(150 * (qps - 1), 300)
        let delay = Double(delayMs) / 1000.0  // Convert to seconds

        return delay
    }
}
