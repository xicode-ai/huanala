/**
 * SpeechToTextService — platform detection, engine selection, and unified API.
 *
 * Automatically selects the best STT engine based on the runtime environment:
 * - Capacitor (Android/iOS): CapacitorSpeechEngine (native, <300ms latency)
 * - Web (Chrome/Edge): WebSpeechEngine (Web Speech API, <500ms latency)
 * - Unsupported browsers: returns not-available error
 */

import type {
  SpeechEngine,
  SpeechConfig,
  SpeechResultCallback,
  SpeechErrorCallback,
  SpeechEndCallback,
  SpeechError,
} from './types';
import { WebSpeechEngine } from './engines/WebSpeechEngine';
import { CapacitorSpeechEngine } from './engines/CapacitorSpeechEngine';

type Platform = 'capacitor' | 'web';

function detectPlatform(): Platform {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cap = typeof window !== 'undefined' ? (window as any).Capacitor : undefined;
  // Capacitor JS registers on window even in browsers (as an npm dependency).
  // Use isNativePlatform() to distinguish real native shells from plain web.
  if (cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) {
    return 'capacitor';
  }
  return 'web';
}

/** Cached singleton service instance */
let serviceInstance: SpeechToTextService | null = null;

export class SpeechToTextService {
  private engine: SpeechEngine | null = null;
  private platform: Platform;

  constructor() {
    this.platform = detectPlatform();
    this.engine = this.createEngine();
    console.debug(
      '[SpeechToTextService] platform:',
      this.platform,
      'engine:',
      this.engine ? this.engine.constructor.name : 'none'
    );
  }

  /** Get or create the singleton service instance */
  static getInstance(): SpeechToTextService {
    if (!serviceInstance) {
      serviceInstance = new SpeechToTextService();
    }
    return serviceInstance;
  }

  /** Check if speech-to-text is available in the current environment */
  isAvailable(): boolean {
    return this.engine !== null && this.engine.isAvailable();
  }

  /** Get the current platform */
  getPlatform(): Platform {
    return this.platform;
  }

  /** Start listening */
  async start(config: SpeechConfig = {}): Promise<void> {
    if (!this.engine) {
      throw new Error('No speech engine available');
    }
    await this.engine.start(config);
  }

  /** Stop listening and finalize */
  async stop(): Promise<void> {
    if (this.engine) {
      await this.engine.stop();
    }
  }

  /** Cancel and discard */
  cancel(): void {
    if (this.engine) {
      this.engine.cancel();
    }
  }

  /** Register result callback */
  onResult(callback: SpeechResultCallback): void {
    if (this.engine) {
      this.engine.onResult(callback);
    }
  }

  /** Register error callback */
  onError(callback: SpeechErrorCallback): void {
    if (this.engine) {
      this.engine.onError(callback);
    }
  }

  /** Register end callback (engine stopped unexpectedly) */
  onEnd(callback: SpeechEndCallback): void {
    if (this.engine) {
      this.engine.onEnd(callback);
    }
  }

  /** Get an unavailability error describing why STT is not available */
  getUnavailableError(): SpeechError {
    if (this.platform === 'web') {
      return {
        code: 'not_available',
        message: '当前浏览器不支持语音识别，请使用 Chrome 或 Edge 浏览器，或下载花哪了 App。',
      };
    }
    return {
      code: 'not_available',
      message: '语音识别服务不可用，请检查设备设置。',
    };
  }

  /** Clean up resources */
  destroy(): void {
    if (this.engine) {
      this.engine.destroy();
      this.engine = null;
    }
    serviceInstance = null;
  }

  /** Create the appropriate engine for the current platform with fallback */
  private createEngine(): SpeechEngine | null {
    if (this.platform === 'capacitor') {
      const engine = new CapacitorSpeechEngine();
      if (engine.isAvailable()) {
        return engine;
      }
      // Fallback: try Web Speech API even inside Capacitor WebView
      const webEngine = new WebSpeechEngine();
      if (webEngine.isAvailable()) {
        return webEngine;
      }
      return null;
    }

    // Web platform
    const webEngine = new WebSpeechEngine();
    if (webEngine.isAvailable()) {
      return webEngine;
    }

    return null;
  }
}
