//
//  DiffProcessor.swift
//  KeyboardExtension
//
//  Created for Project Voice
//  Copyright 2025 Google LLC
//
//  Simple diff implementation for ignoring unnecessary LLM changes
//

import Foundation

// MARK: - Diff Types

enum DiffOperation {
    case delete
    case insert
    case equal
}

struct Diff {
    let operation: DiffOperation
    let text: String
}

// MARK: - Simple Diff Implementation

class DiffProcessor {

    /// Heuristically removes unnecessary diffs from the new string
    /// Prevents LLM from modifying text the user didn't intend to change
    static func ignoreUnnecessaryDiffs(original: String, modified: String) -> String {
        let diffs = computeDiffs(original: original, modified: modified)

        // If too many diffs or no common parts, accept new text as-is
        if diffs.count > TextConstants.maxDiffs || !diffs.contains(where: { $0.operation == .equal }) {
            return modified
        }

        var result = ""
        var i = 0

        while i < diffs.count {
            let diff = diffs[i]

            // Keep original text for the unchangeable portion
            if result.count < original.count - TextConstants.modifiableTextLength {
                switch diff.operation {
                case .equal, .delete:
                    result += diff.text
                    // Skip next insert if it's right after a delete
                    if i < diffs.count - 1 && diff.operation == .delete && diffs[i + 1].operation == .insert {
                        i += 1
                    }
                case .insert:
                    // Ignore inserts in unchangeable portion
                    break
                }
            } else {
                // Accept new text for the modifiable portion (last 10 chars)
                switch diff.operation {
                case .equal, .insert:
                    result += diff.text
                case .delete:
                    // Ignore deletes in modifiable portion
                    break
                }
            }

            i += 1
        }

        // If result is identical to original, return modified (LLM made valid changes)
        if result == original {
            return modified
        }

        return result
    }

    /// Computes diffs between two strings using a simple LCS-based algorithm
    private static func computeDiffs(original: String, modified: String) -> [Diff] {
        // Convert to arrays for easier manipulation
        let origChars = Array(original)
        let modChars = Array(modified)

        // Use Longest Common Subsequence approach
        let lcs = longestCommonSubsequence(origChars, modChars)

        var diffs: [Diff] = []
        var i = 0, j = 0, k = 0

        while i < origChars.count || j < modChars.count {
            if k < lcs.count {
                let (lcsI, lcsJ) = lcs[k]

                // Deletions before next common char
                while i < lcsI {
                    if let last = diffs.last, last.operation == .delete {
                        diffs[diffs.count - 1] = Diff(
                            operation: .delete,
                            text: last.text + String(origChars[i])
                        )
                    } else {
                        diffs.append(Diff(operation: .delete, text: String(origChars[i])))
                    }
                    i += 1
                }

                // Insertions before next common char
                while j < lcsJ {
                    if let last = diffs.last, last.operation == .insert {
                        diffs[diffs.count - 1] = Diff(
                            operation: .insert,
                            text: last.text + String(modChars[j])
                        )
                    } else {
                        diffs.append(Diff(operation: .insert, text: String(modChars[j])))
                    }
                    j += 1
                }

                // Common character
                if let last = diffs.last, last.operation == .equal {
                    diffs[diffs.count - 1] = Diff(
                        operation: .equal,
                        text: last.text + String(origChars[i])
                    )
                } else {
                    diffs.append(Diff(operation: .equal, text: String(origChars[i])))
                }
                i += 1
                j += 1
                k += 1
            } else {
                // No more common chars, remaining are all diffs
                while i < origChars.count {
                    if let last = diffs.last, last.operation == .delete {
                        diffs[diffs.count - 1] = Diff(
                            operation: .delete,
                            text: last.text + String(origChars[i])
                        )
                    } else {
                        diffs.append(Diff(operation: .delete, text: String(origChars[i])))
                    }
                    i += 1
                }

                while j < modChars.count {
                    if let last = diffs.last, last.operation == .insert {
                        diffs[diffs.count - 1] = Diff(
                            operation: .insert,
                            text: last.text + String(modChars[j])
                        )
                    } else {
                        diffs.append(Diff(operation: .insert, text: String(modChars[j])))
                    }
                    j += 1
                }
            }
        }

        return diffs
    }

    /// Finds longest common subsequence positions
    private static func longestCommonSubsequence<T: Equatable>(_ a: [T], _ b: [T]) -> [(Int, Int)] {
        let m = a.count
        let n = b.count

        // DP table
        var dp = Array(repeating: Array(repeating: 0, count: n + 1), count: m + 1)

        // Fill DP table
        for i in 1...m {
            for j in 1...n {
                if a[i - 1] == b[j - 1] {
                    dp[i][j] = dp[i - 1][j - 1] + 1
                } else {
                    dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
                }
            }
        }

        // Backtrack to find LCS positions
        var positions: [(Int, Int)] = []
        var i = m, j = n

        while i > 0 && j > 0 {
            if a[i - 1] == b[j - 1] {
                positions.insert((i - 1, j - 1), at: 0)
                i -= 1
                j -= 1
            } else if dp[i - 1][j] > dp[i][j - 1] {
                i -= 1
            } else {
                j -= 1
            }
        }

        return positions
    }
}
