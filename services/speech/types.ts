/**
 * Speech-to-Text core types and interfaces.
 *
 * Defines the contract for STT engines, status types, and configuration.
 */

/** Recording / transcription lifecycle states */
export type SpeechStatus = 'idle' | 'recording' | 'transcribing' | 'error';

/** Configuration for a speech-to-text session */
export interface SpeechConfig {
  /** BCP-47 language code, e.g. "zh-CN", "en-US". Defaults to system language. */
  language?: string;
  /** Maximum recording duration in seconds. Defaults to 30. */
  maxDuration?: number;
}

/** Final or interim transcription result */
export interface SpeechResult {
  /** The transcribed text */
  transcript: string;
  /** Whether this is a final result (true) or interim/partial (false) */
  isFinal: boolean;
}

/** Structured error from the STT engine */
export interface SpeechError {
  /** Machine-readable error code */
  code: 'permission_denied' | 'not_available' | 'network_error' | 'no_speech' | 'aborted' | 'unknown';
  /** Human-readable error message */
  message: string;
}

/**
 * Callback signatures used by SpeechEngine implementations.
 */
export type SpeechResultCallback = (result: SpeechResult) => void;
export type SpeechErrorCallback = (error: SpeechError) => void;

/** Callback for when the engine stops unexpectedly (e.g., auto-stop, timeout) */
export type SpeechEndCallback = () => void;

/**
 * Abstraction for a speech-to-text engine.
 *
 * Each platform (Web, Capacitor) provides its own implementation.
 * The SpeechToTextService selects the appropriate engine at runtime.
 */
export interface SpeechEngine {
  /** Check if this engine is available in the current environment */
  isAvailable(): boolean;

  /** Start listening / recording. Resolves when recording actually starts. */
  start(config: SpeechConfig): Promise<void>;

  /** Stop listening and finalize transcription */
  stop(): Promise<void>;

  /** Cancel listening, discard all audio */
  cancel(): void;

  /** Register callback for transcription results (both interim and final) */
  onResult(callback: SpeechResultCallback): void;

  /** Register callback for errors */
  onError(callback: SpeechErrorCallback): void;

  /** Register callback for when engine stops unexpectedly */
  onEnd(callback: SpeechEndCallback): void;

  /** Clean up resources */
  destroy(): void;
}
