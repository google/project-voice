//
//  ContentView.swift
//  ProjectVoiceKeyboard
//
//  Created for Project Voice
//  Copyright 2025 Google LLC
//

import SwiftUI

struct ContentView: View {
    @State private var showingSettings = false

    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Image(systemName: "keyboard")
                    .font(.system(size: 80))
                    .foregroundColor(.blue)

                Text("Project Voice Keyboard")
                    .font(.title)
                    .fontWeight(.bold)

                Text("To enable the keyboard:")
                    .font(.headline)
                    .padding(.top, 20)

                VStack(alignment: .leading, spacing: 10) {
                    InstructionRow(number: 1, text: "Open Settings app")
                    InstructionRow(number: 2, text: "Go to General > Keyboard > Keyboards")
                    InstructionRow(number: 3, text: "Tap \"Add New Keyboard...\"")
                    InstructionRow(number: 4, text: "Select \"Project Voice Keyboard\"")
                    InstructionRow(number: 5, text: "Enable \"Allow Full Access\" for AI suggestions")
                }
                .padding()
                .background(Color.gray.opacity(0.1))
                .cornerRadius(10)

                Button(action: openSettings) {
                    Text("Open iOS Settings")
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color.blue)
                        .cornerRadius(10)
                }
                .padding(.top, 20)

                Button(action: { showingSettings = true }) {
                    Text("Keyboard Settings")
                        .fontWeight(.semibold)
                        .foregroundColor(.blue)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color.white)
                        .cornerRadius(10)
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(Color.blue, lineWidth: 2)
                        )
                }

                Spacer()
            }
            .padding()
            .navigationBarItems(trailing: Button(action: { showingSettings = true }) {
                Image(systemName: "gearshape.fill")
            })
            .sheet(isPresented: $showingSettings) {
                SettingsView()
            }
        }
    }

    private func openSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
    }
}

struct InstructionRow: View {
    let number: Int
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Text("\(number).")
                .fontWeight(.bold)
                .foregroundColor(.blue)
            Text(text)
            Spacer()
        }
    }
}

#Preview {
    ContentView()
}
