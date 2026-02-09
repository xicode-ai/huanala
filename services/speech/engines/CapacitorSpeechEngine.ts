/**
 * Capacitor Speech Recognition engine implementation.
 *
 * Wraps @capacitor-community/speech-recognition plugin to use native
 * Android SpeechRecognizer / iOS SFSpeechRecognizer.
 * Supports partial results, permission management, and concurrent recording prevention.
 */

import type {
  SpeechEngine,
  SpeechConfig,
  SpeechResultCallback,
  SpeechErrorCallback,
  SpeechEndCallback,
  SpeechError,
} from '../types';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

export class CapacitorSpeechEngine implements SpeechEngine {
  private isRecording = false;
  private resultCallback: SpeechResultCallback | null = null;
  private errorCallback: SpeechErrorCallback | null = null;
  private endCallback: SpeechEndCallback | null = null;

  isAvailable(): boolean {
    // Available ONLY when running inside a real Capacitor native shell (Android/iOS),
    // NOT when Capacitor JS is just loaded as an npm dependency in the browser.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cap = typeof window !== 'undefined' ? (window as any).Capacitor : undefined;
    return cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform();
  }

  async start(config: SpeechConfig): Promise<void> {
    // Concurrent recording prevention
    if (this.isRecording) {
      throw new Error('Recording already in progress');
    }

    // Check and request permissions
    const permResult = await SpeechRecognition.checkPermissions();
    if (permResult.speechRecognition !== 'granted') {
      const reqResult = await SpeechRecognition.requestPermissions();
      if (reqResult.speechRecognition !== 'granted') {
        const error: SpeechError = {
          code: 'permission_denied',
          message: '语音识别权限被拒绝，请在系统设置中允许麦克风和语音识别权限。',
        };
        this.errorCallback?.(error);
        throw new Error(error.message);
      }
    }

    // Set up partial results listener
    SpeechRecognition.addListener('partialResults', (data: { matches: string[] }) => {
      if (data.matches && data.matches.length > 0) {
        this.resultCallback?.({ transcript: data.matches[0], isFinal: false });
      }
    });

    try {
      // Start recognition
      const result = await SpeechRecognition.start({
        language: config.language || 'zh-CN',
        partialResults: true,
        popup: false,
      });

      this.isRecording = true;

      // Handle the final result from start() (some platforms return it here)
      if (result && result.matches && result.matches.length > 0) {
        this.resultCallback?.({ transcript: result.matches[0], isFinal: true });
      }
    } catch (err) {
      this.isRecording = false;
      const error = this.mapError(err);
      this.errorCallback?.(error);
      throw err;
    }
  }

  async stop(): Promise<void> {
    if (this.isRecording) {
      try {
        await SpeechRecognition.stop();
      } catch {
        // Ignore stop errors — engine may have already stopped
      } finally {
        this.isRecording = false;
        await SpeechRecognition.removeAllListeners();
      }
    }
  }

  cancel(): void {
    if (this.isRecording) {
      this.isRecording = false;
      SpeechRecognition.stop().catch(() => {
        // Ignore — best-effort cancel
      });
      SpeechRecognition.removeAllListeners().catch(() => {
        // Ignore
      });
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
  }

  private mapError(err: unknown): SpeechError {
    const message = err instanceof Error ? err.message : String(err);
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes('permission') || lowerMsg.includes('denied')) {
      return { code: 'permission_denied', message: '语音识别权限被拒绝，请在系统设置中允许麦克风和语音识别权限。' };
    }
    if (lowerMsg.includes('network') || lowerMsg.includes('connection')) {
      return { code: 'network_error', message: '网络连接失败，语音识别需要网络支持。' };
    }
    if (lowerMsg.includes('no speech') || lowerMsg.includes('no_speech') || lowerMsg.includes('no match')) {
      return { code: 'no_speech', message: '未检测到语音输入，请靠近麦克风再试一次。' };
    }

    return { code: 'unknown', message: `语音识别出错：${message}` };
  }
}
