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
    private var currentTask: URLSessionDataTask?

    // MARK: - Main Fetch Method (matches web version)

    func fetchSuggestions(
        for text: String,
        emotion: SentenceEmotion,
        completion: @escaping (SuggestionResponse?) -> Void
    ) {
        // Cancel any ongoing request
        currentTask?.cancel()

        let baseURL = settings.apiEndpoint

        // Prepare request context (matching web version structure)
        let userInputs: [String: String] = [
            "language": settings.language,
            "num": "5",
            "text": text,
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
            macroId: "SentenceGeneric20250311",
            model: "gemini-2.0-flash-001",
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
            macroId: "WordGeneric20240628",
            model: "gemini-2.0-flash-001",
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
        guard let url = URL(string: "\(baseURL)/run-macro") else {
            completion([])
            return
        }

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
                print("Error fetching macro: \(error)")
                completion([])
                return
            }

            guard let data = data else {
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
                    completion(suggestions)
                } else {
                    print("Unexpected response format")
                    completion([])
                }
            } catch {
                print("Error parsing response: \(error)")
                completion([])
            }
        }

        task.resume()
    }

    // MARK: - Helper Methods

    private func parseNumberedList(_ text: String) -> [String] {
        // Parse format like:
        // 1. First suggestion
        // 2. Second suggestion
        // etc.

        // Remove escaped newlines (matching web version)
        var cleanedText = text.replacingOccurrences(of: "\\\n", with: "")

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
        currentTask?.cancel()
    }
}
