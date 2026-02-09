/**
 * useSpeechToText — React Hook for speech-to-text.
 *
 * Wraps SpeechToTextService with React state management, recording timer,
 * max duration limit, and automatic cleanup on unmount.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { SpeechStatus, SpeechError, SpeechConfig } from '../services/speech/types';
import { SpeechToTextService } from '../services/speech/SpeechToTextService';

const DEFAULT_MAX_DURATION = 30; // seconds
const LOG_PREFIX = '[useSpeechToText]';

export interface UseSpeechToTextOptions {
  /** BCP-47 language code, e.g. "zh-CN". Defaults to system language. */
  language?: string;
  /** Max recording duration in seconds. Defaults to 30. */
  maxDuration?: number;
}

export interface UseSpeechToTextReturn {
  /** Start recording and transcribing */
  startRecording: () => Promise<void>;
  /** Stop recording and get final transcript */
  stopRecording: () => Promise<void>;
  /** Cancel recording and discard audio */
  cancelRecording: () => void;
  /** Current lifecycle status */
  status: SpeechStatus;
  /** Final accumulated transcript text */
  transcript: string;
  /** Real-time interim/partial transcript */
  interimTranscript: string;
  /** Last error, or null */
  error: SpeechError | null;
  /** Recording duration in seconds */
  duration: number;
  /** Whether STT is available in the current environment */
  isAvailable: boolean;
  /** Error describing why STT is unavailable (only set when isAvailable is false) */
  unavailableError: SpeechError | null;
}

export function useSpeechToText(options: UseSpeechToTextOptions = {}): UseSpeechToTextReturn {
  const { language, maxDuration = DEFAULT_MAX_DURATION } = options;

  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<SpeechError | null>(null);
  const [duration, setDuration] = useState(0);
  const [isAvailable, setIsAvailable] = useState(true);
  const [unavailableError, setUnavailableError] = useState<SpeechError | null>(null);

  // Refs to persist across renders without causing re-renders
  const serviceRef = useRef<SpeechToTextService | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRecordingRef = useRef(false);
  const transcriptAccRef = useRef(''); // Accumulates final transcript pieces

  // Initialize service lazily
  const getService = useCallback((): SpeechToTextService => {
    if (!serviceRef.current) {
      serviceRef.current = SpeechToTextService.getInstance();
    }
    return serviceRef.current;
  }, []);

  useEffect(() => {
    const service = getService();
    const available = service.isAvailable();
    setIsAvailable(available);
    setUnavailableError(available ? null : service.getUnavailableError());
  }, [getService]);

  // Timer management
  const startTimer = useCallback(() => {
    setDuration(0);
    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Stop recording implementation (shared between manual stop and auto-stop)
  const doStop = useCallback(async () => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    stopTimer();

    const service = getService();
    setStatus('transcribing');

    try {
      await service.stop();
    } catch {
      // Ignore stop errors
    }

    // Brief delay for any final results to arrive
    await new Promise((resolve) => setTimeout(resolve, 100));

    // If we got transcript, finalize; otherwise stay idle
    const finalText = transcriptAccRef.current;
    setTranscript(finalText);
    setInterimTranscript('');
    setStatus('idle');
    console.debug(LOG_PREFIX, 'Recording stopped, final transcript:', finalText || '(empty)');
  }, [getService, stopTimer]);

  // Auto-stop when max duration reached (Task 5.3)
  useEffect(() => {
    if (status === 'recording' && duration >= maxDuration) {
      console.debug(LOG_PREFIX, 'Max duration reached, auto-stopping');
      const timer = setTimeout(() => {
        void doStop();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [status, duration, maxDuration, doStop]);

  const startRecording = useCallback(async () => {
    const service = getService();

    console.debug(
      LOG_PREFIX,
      'startRecording called, isAvailable:',
      service.isAvailable(),
      'platform:',
      service.getPlatform()
    );

    if (!service.isAvailable()) {
      const unavailErr = service.getUnavailableError();
      console.warn(LOG_PREFIX, 'STT not available:', unavailErr.message);
      setError(unavailErr);
      setStatus('error');
      return;
    }

    // Reset state
    setError(null);
    setTranscript('');
    setInterimTranscript('');
    transcriptAccRef.current = '';

    // Set up callbacks before starting
    service.onResult((result) => {
      if (result.isFinal) {
        transcriptAccRef.current += result.transcript;
        setTranscript(transcriptAccRef.current);
        setInterimTranscript('');
      } else {
        setInterimTranscript(result.transcript);
      }
    });

    service.onError((err) => {
      console.warn(LOG_PREFIX, 'Engine error:', err.code, err.message);
      setError(err);
      if (err.code !== 'no_speech') {
        setStatus('error');
        isRecordingRef.current = false;
        stopTimer();
      }
    });

    // Handle unexpected engine stop (e.g., auto-timeout, browser killed recognition)
    service.onEnd(() => {
      console.debug(LOG_PREFIX, 'Engine ended unexpectedly');
      if (isRecordingRef.current) {
        isRecordingRef.current = false;
        stopTimer();
        const finalText = transcriptAccRef.current;
        setTranscript(finalText);
        setInterimTranscript('');
        setStatus('idle');
      }
    });

    const config: SpeechConfig = { language, maxDuration };

    try {
      await service.start(config);
      isRecordingRef.current = true;
      setStatus('recording');
      startTimer();
      console.debug(LOG_PREFIX, 'Recording started successfully');
    } catch (err) {
      console.error(LOG_PREFIX, 'Failed to start recording:', err);
      isRecordingRef.current = false;
      // FIX: Set the error so the UI can display it
      setError({
        code: 'unknown',
        message: err instanceof Error ? err.message : '启动语音识别失败，请检查浏览器权限设置。',
      });
      setStatus('error');
    }
  }, [getService, language, maxDuration, startTimer, stopTimer]);

  const stopRecording = useCallback(async () => {
    await doStop();
  }, [doStop]);

  const cancelRecording = useCallback(() => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    stopTimer();

    const service = getService();
    service.cancel();

    // Discard everything
    setStatus('idle');
    setTranscript('');
    setInterimTranscript('');
    setDuration(0);
    transcriptAccRef.current = '';
  }, [getService, stopTimer]);

  // Cleanup on unmount (Task 5.4)
  useEffect(() => {
    return () => {
      if (isRecordingRef.current) {
        const service = serviceRef.current;
        if (service) {
          service.cancel();
        }
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    startRecording,
    stopRecording,
    cancelRecording,
    status,
    transcript,
    interimTranscript,
    error,
    duration,
    isAvailable,
    unavailableError,
  };
}
