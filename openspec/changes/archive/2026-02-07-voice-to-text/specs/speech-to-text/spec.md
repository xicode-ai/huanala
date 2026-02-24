## ADDED Requirements

### Requirement: Microphone permission request

The system SHALL request microphone permission before any audio recording begins. If permission is denied, the system SHALL display a clear error message guiding the user to grant permission. The permission request MUST work consistently across Web browsers, Capacitor Android, and Capacitor iOS.

#### Scenario: First-time permission grant on Web

- **WHEN** user taps the voice recording button for the first time in a Web browser
- **THEN** the browser's native microphone permission dialog is shown, and recording begins immediately upon user approval

#### Scenario: First-time permission grant on Capacitor

- **WHEN** user taps the voice recording button for the first time on a Capacitor-packaged app (Android/iOS)
- **THEN** the native OS permission dialog is shown, and recording begins immediately upon user approval

#### Scenario: Permission denied

- **WHEN** user denies microphone permission or permission was previously denied
- **THEN** the system SHALL display an inline error message explaining that microphone access is required and how to enable it in system settings

#### Scenario: Permission previously granted

- **WHEN** user taps the voice recording button and permission was already granted
- **THEN** recording starts immediately without any permission dialog

### Requirement: Audio recording lifecycle

The system SHALL provide a complete audio recording lifecycle with start, stop, and cancel operations. Recording state MUST be exposed to consuming components in real-time.

#### Scenario: Start recording

- **WHEN** user initiates a voice recording action (tap record button)
- **THEN** the system SHALL begin capturing audio from the microphone and transition to "recording" state within 200ms

#### Scenario: Stop recording

- **WHEN** user stops recording (tap stop button or release hold)
- **THEN** the system SHALL finalize the audio capture and pass the audio data to the STT engine for transcription

#### Scenario: Cancel recording

- **WHEN** user cancels recording (e.g., swipe away or tap cancel)
- **THEN** the system SHALL discard all captured audio, return to "idle" state, and produce no transcription output

#### Scenario: Recording state exposure

- **WHEN** recording is in progress
- **THEN** the system SHALL expose a reactive state object containing at minimum: `status` (idle | recording | transcribing | error), `duration` (seconds elapsed), and `transcript` (partial or final text)

### Requirement: Real-time speech-to-text transcription

The system SHALL convert recorded audio to text with an end-to-end latency of less than 500ms from the moment the user stops speaking to the moment transcription text is available. The transcription MUST support both Chinese (Mandarin) and English languages.

#### Scenario: Short utterance transcription (< 5 seconds)

- **WHEN** user records a short voice clip (under 5 seconds) and stops recording
- **THEN** the final transcription text SHALL be available within 500ms of recording stop, with accuracy suitable for conversational input

#### Scenario: Medium utterance transcription (5-30 seconds)

- **WHEN** user records a voice clip between 5 and 30 seconds
- **THEN** the system SHALL provide interim/partial transcription results during recording (if supported by the STT engine), and the final result SHALL be available within 500ms of recording stop

#### Scenario: Chinese language input

- **WHEN** user speaks in Mandarin Chinese
- **THEN** the transcription SHALL produce accurate Chinese text output including proper character recognition

#### Scenario: English language input

- **WHEN** user speaks in English
- **THEN** the transcription SHALL produce accurate English text output

#### Scenario: Mixed language input

- **WHEN** user speaks with a mix of Chinese and English (common in daily conversation)
- **THEN** the system SHALL produce a reasonable transcription that handles code-switching between the two languages

### Requirement: Cross-platform STT engine abstraction

The system SHALL provide a unified abstraction layer for the STT engine that works across Web browsers and Capacitor native environments. The consuming code (React Hook) MUST NOT need to know which underlying engine is being used.

#### Scenario: Web browser environment

- **WHEN** the application runs in a standard Web browser (Chrome, Safari, Firefox)
- **THEN** the STT engine SHALL use a Web-compatible implementation (e.g., Web Speech API, WebSocket-based cloud service, or WASM-based local model)

#### Scenario: Capacitor Android environment

- **WHEN** the application runs as a Capacitor Android app
- **THEN** the STT engine SHALL use an Android-compatible implementation (e.g., native SpeechRecognizer API or a Capacitor plugin wrapping a native SDK)

#### Scenario: Capacitor iOS environment

- **WHEN** the application runs as a Capacitor iOS app
- **THEN** the STT engine SHALL use an iOS-compatible implementation (e.g., native Speech framework or a Capacitor plugin wrapping a native SDK)

#### Scenario: Engine fallback

- **WHEN** the preferred STT engine is unavailable (e.g., no network for cloud-based engine, or browser does not support Web Speech API)
- **THEN** the system SHALL attempt to use a fallback engine if configured, or display an appropriate error message to the user

### Requirement: useSpeechToText React Hook

The system SHALL provide a `useSpeechToText` React Hook that encapsulates the full recording + transcription lifecycle into a simple, reusable interface for page-level components.

#### Scenario: Hook basic usage

- **WHEN** a React component calls `useSpeechToText()`
- **THEN** the hook SHALL return an object containing: `startRecording()`, `stopRecording()`, `cancelRecording()`, `status` (idle | recording | transcribing | error), `transcript` (string), `interimTranscript` (string), `error` (Error | null), and `duration` (number)

#### Scenario: Hook in Home page for voice accounting

- **WHEN** the Home page uses `useSpeechToText` and the user completes a voice recording
- **THEN** the `transcript` value SHALL contain the final transcription text ready to be submitted as an expense description

#### Scenario: Hook in Chat page for voice input

- **WHEN** the Chat page uses `useSpeechToText` and the user completes a voice recording
- **THEN** the `transcript` value SHALL be populated into the chat input field, allowing the user to review and send

#### Scenario: Hook cleanup on unmount

- **WHEN** the component using `useSpeechToText` unmounts while recording is in progress
- **THEN** the hook SHALL automatically stop recording, release the microphone, and clean up all resources without memory leaks

### Requirement: Error handling and resilience

The system SHALL handle all error conditions gracefully without crashing the application, and provide user-friendly error messages in all failure scenarios.

#### Scenario: Microphone hardware failure

- **WHEN** the microphone becomes unavailable during recording (e.g., Bluetooth headset disconnected)
- **THEN** the system SHALL stop recording, transition to "error" state, and expose an error object describing the issue

#### Scenario: STT engine failure

- **WHEN** the STT engine fails to transcribe audio (e.g., network timeout for cloud service, or engine crash)
- **THEN** the system SHALL transition to "error" state with a descriptive error, and the user SHALL be able to retry the recording

#### Scenario: Empty or inaudible recording

- **WHEN** user records audio but no speech is detected (silence or ambient noise only)
- **THEN** the system SHALL return an empty transcript and optionally inform the user that no speech was detected

#### Scenario: Concurrent recording prevention

- **WHEN** a recording is already in progress and another recording is requested
- **THEN** the system SHALL reject the second request and keep the current recording active
