/**
 * Web Speech API engine implementation.
 *
 * Uses the browser's built-in SpeechRecognition API (Chrome/Edge: webkitSpeechRecognition).
 * Supports interim results, language configuration, and concurrent recording prevention.
 */

import type {
  SpeechEngine,
  SpeechConfig,
  SpeechResultCallback,
  SpeechErrorCallback,
  SpeechEndCallback,
  SpeechError,
} from '../types';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Browser Web Speech API types (not available in all TS environments)
interface WebSpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0: { transcript: string };
    };
  };
}

interface WebSpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface WebSpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: WebSpeechRecognitionEvent) => void) | null;
  onerror: ((event: WebSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onaudiostart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

function getSpeechRecognitionConstructor(): (new () => WebSpeechRecognitionInstance) | null {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

const LOG_PREFIX = '[WebSpeechEngine]';

export class WebSpeechEngine implements SpeechEngine {
  private recognition: WebSpeechRecognitionInstance | null = null;
  private isRecording = false;
  private resultCallback: SpeechResultCallback | null = null;
  private errorCallback: SpeechErrorCallback | null = null;
  private endCallback: SpeechEndCallback | null = null;
  private stoppedByUser = false;

  isAvailable(): boolean {
    const available = getSpeechRecognitionConstructor() !== null;
    console.debug(LOG_PREFIX, 'isAvailable:', available);
    return available;
  }

  async start(config: SpeechConfig): Promise<void> {
    console.debug(LOG_PREFIX, 'start() called, config:', config);

    // Force-reset stale state from previous session
    if (this.recognition) {
      console.debug(LOG_PREFIX, 'Cleaning up previous recognition instance');
      try {
        this.recognition.abort();
      } catch {
        // ignore
      }
      this.recognition = null;
      this.isRecording = false;
    }

    this.stoppedByUser = false;

    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionCtor) {
      const error: SpeechError = {
        code: 'not_available',
        message: '当前浏览器不支持 Web Speech API，请使用 Chrome 或 Edge 浏览器。',
      };
      console.warn(LOG_PREFIX, 'SpeechRecognition constructor not found');
      this.errorCallback?.(error);
      throw new Error(error.message);
    }

    this.recognition = new SpeechRecognitionCtor();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = config.language || navigator.language || 'zh-CN';

    console.debug(LOG_PREFIX, 'Recognition configured:', {
      continuous: true,
      interimResults: true,
      lang: this.recognition.lang,
    });

    this.recognition.onaudiostart = () => {
      console.debug(LOG_PREFIX, 'Audio capture started (microphone active)');
    };

    this.recognition.onresult = (event: WebSpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        console.debug(LOG_PREFIX, 'Final result:', finalTranscript);
        this.resultCallback?.({ transcript: finalTranscript, isFinal: true });
      }
      if (interimTranscript) {
        console.debug(LOG_PREFIX, 'Interim result:', interimTranscript);
        this.resultCallback?.({ transcript: interimTranscript, isFinal: false });
      }
    };

    this.recognition.onerror = (event: WebSpeechRecognitionErrorEvent) => {
      console.warn(LOG_PREFIX, 'Error event:', event.error, event.message);
      const error = this.mapError(event.error);
      this.errorCallback?.(error);

      // Auto-cleanup on fatal errors
      if (event.error !== 'no-speech') {
        this.isRecording = false;
      }
    };

    this.recognition.onend = () => {
      console.debug(LOG_PREFIX, 'Recognition ended, stoppedByUser:', this.stoppedByUser);
      const wasRecording = this.isRecording;
      this.isRecording = false;

      // If not stopped by user, this is an unexpected stop (auto-timeout, error, etc.)
      // Notify the hook so it can update its state
      if (wasRecording && !this.stoppedByUser) {
        console.debug(LOG_PREFIX, 'Unexpected end — notifying hook');
        this.endCallback?.();
      }
    };

    return new Promise<void>((resolve, reject) => {
      try {
        this.recognition!.start();
        this.isRecording = true;
        console.debug(LOG_PREFIX, 'recognition.start() succeeded');
        resolve();
      } catch (err) {
        this.isRecording = false;
        console.error(LOG_PREFIX, 'recognition.start() threw:', err);
        reject(err);
      }
    });
  }

  async stop(): Promise<void> {
    console.debug(LOG_PREFIX, 'stop() called');
    if (this.recognition && this.isRecording) {
      this.stoppedByUser = true;
      this.recognition.stop();
      this.isRecording = false;
    }
  }

  cancel(): void {
    console.debug(LOG_PREFIX, 'cancel() called');
    if (this.recognition) {
      this.stoppedByUser = true;
      this.recognition.abort();
      this.isRecording = false;
    }
  }

  onResult(callback: SpeechResultCallback): void {
    this.resultCallback = callback;
  }

  onError(callback: SpeechErrorCallback): void {
    this.errorCallback = callback;
  }

  onEnd(callback: SpeechEndCallback): void {
    this.endCallback = callback;
  }

  destroy(): void {
    this.cancel();
    this.resultCallback = null;
    this.errorCallback = null;
    this.endCallback = null;
    this.recognition = null;
  }

  private mapError(errorCode: string): SpeechError {
    switch (errorCode) {
      case 'not-allowed':
        return { code: 'permission_denied', message: '麦克风权限被拒绝，请在浏览器设置中允许麦克风访问。' };
      case 'no-speech':
        return { code: 'no_speech', message: '未检测到语音输入，请靠近麦克风再试一次。' };
      case 'network':
        return { code: 'network_error', message: '网络连接失败，Chrome 语音识别需要联网（使用 Google 服务器）。' };
      case 'aborted':
        return { code: 'aborted', message: '语音识别已取消。' };
      case 'audio-capture':
        return { code: 'not_available', message: '无法访问麦克风，请检查麦克风是否连接并正常工作。' };
      case 'service-not-allowed':
        return {
          code: 'not_available',
          message: '语音识别服务不可用。请确保使用 HTTPS 或 localhost 访问，并检查浏览器设置。',
        };
      default:
        return { code: 'unknown', message: `语音识别出错：${errorCode}` };
    }
  }
}
