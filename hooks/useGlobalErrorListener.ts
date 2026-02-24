import { useEffect } from 'react';
import { useToastStore } from '../stores/useToastStore';

/**
 * 需要过滤的非业务错误模式
 * 这些错误通常由浏览器扩展、第三方脚本等引起，不应干扰用户
 */
const IGNORED_ERROR_PATTERNS = [
  'ResizeObserver loop',
  'Script error',
  'Non-Error promise rejection',
  'chrome-extension://',
  'moz-extension://',
];

/**
 * 检查错误是否应被忽略（非业务错误）
 */
const shouldIgnoreError = (message: string): boolean => {
  return IGNORED_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
};

/**
 * 全局未捕获异常监听 Hook
 *
 * 监听 window 上的 error 和 unhandledrejection 事件，
 * 过滤非业务错误后通过 Toast 向用户展示提示
 */
export const useGlobalErrorListener = (): void => {
  useEffect(() => {
    const handleError = (event: ErrorEvent): void => {
      const message = event.message || '未知错误';
      if (shouldIgnoreError(message)) return;

      console.error('[GlobalErrorListener] 未捕获异常:', event.error || message);
      useToastStore.getState().addToast('应用发生了意外错误', 'error');
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason || '');
      if (shouldIgnoreError(message)) return;

      console.error('[GlobalErrorListener] 未处理的 Promise rejection:', reason);
      useToastStore.getState().addToast('操作失败，请重试', 'error');
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
};
