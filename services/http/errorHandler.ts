/**
 * HTTP 错误分类与 Toast 通知工具
 *
 * 将 HTTP 状态码和网络异常映射为用户友好的提示信息，
 * 通过 useToastStore.getState() 在 React 组件外部触发 Toast
 */

import { useToastStore, ToastType } from '../../stores/useToastStore';

interface ErrorClassification {
  message: string;
  type: ToastType;
}

/**
 * 根据 HTTP 状态码分类错误
 */
const classifyHttpError = (status: number): ErrorClassification => {
  if (status === 404) {
    return { message: '请求的资源不存在', type: 'warning' };
  }
  if (status === 408 || status === 504) {
    return { message: '请求超时，请稍后重试', type: 'warning' };
  }
  if (status === 429) {
    return { message: '请求过于频繁，请稍后重试', type: 'warning' };
  }
  if (status >= 500) {
    return { message: '服务器错误，请稍后重试', type: 'error' };
  }
  if (status >= 400) {
    return { message: '请求出错，请重试', type: 'warning' };
  }
  return { message: '发生了未知错误', type: 'error' };
};

/**
 * 处理 HTTP 错误，向用户展示 Toast 提示
 *
 * @param status - HTTP 状态码（网络异常时为 undefined）
 * @param error - 原始错误对象
 */
export const handleHttpError = (status?: number, error?: Error): void => {
  let classification: ErrorClassification;

  if (!status && error) {
    // 网络异常（无法连接到服务器）
    classification = { message: '网络连接异常，请检查网络设置', type: 'error' };
  } else if (status) {
    classification = classifyHttpError(status);
  } else {
    classification = { message: '发生了未知错误', type: 'error' };
  }

  // 使用 getState() 在 React 组件外部访问 store
  useToastStore.getState().addToast(classification.message, classification.type);
};
