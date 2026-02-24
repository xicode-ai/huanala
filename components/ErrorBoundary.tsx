import React from 'react';

/**
 * ErrorBoundary 降级 UI 的 Props
 */
interface ErrorFallbackProps {
  error: Error;
  onRetry: () => void;
}

/**
 * 降级 UI 组件
 */
const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, onRetry }) => (
  <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
    <div className="max-w-md w-full mx-4 p-8 bg-white rounded-2xl shadow-card text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
        <span className="material-symbols-outlined text-3xl text-red-500">error</span>
      </div>
      <h2 className="text-lg font-display font-bold text-text-main mb-2">页面出错了</h2>
      <p className="text-sm text-text-sub mb-6">应用遇到了一个意外错误，请尝试刷新页面。</p>
      {import.meta.env?.DEV && (
        <details className="mb-6 text-left">
          <summary className="text-xs text-text-sub cursor-pointer hover:text-text-main">
            错误详情（仅开发环境可见）
          </summary>
          <pre className="mt-2 p-3 bg-slate-50 rounded-xl text-xs text-red-600 overflow-auto max-h-40 whitespace-pre-wrap">
            {error.message}
            {error.stack && `\n\n${error.stack}`}
          </pre>
        </details>
      )}
      <button
        onClick={onRetry}
        className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-soft transition-colors"
      >
        重新加载
      </button>
    </div>
  </div>
);

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary 组件
 *
 * 捕获子组件树中的渲染异常，展示降级 UI，
 * 防止整个应用崩溃为白屏
 *
 * 注意：这是项目中唯一允许使用 class 组件的地方，
 * 因为 React 没有提供函数式组件的 Error Boundary API
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] 捕获到渲染异常:', error, errorInfo.componentStack);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError && this.state.error) {
      return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}
