import React, { useEffect, useState } from 'react';
import { useToastStore, Toast as ToastType } from '../stores/useToastStore';

const ToastItem: React.FC<{ toast: ToastType }> = ({ toast }) => {
  const removeToast = useToastStore((state) => state.removeToast);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animation in
    requestAnimationFrame(() => setIsVisible(true));

    // Animation out logic is handled by the removal from store,
    // but for smoother exit we might need more complex logic.
    // For now, simple mounting/unmounting.
  }, []);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'info';
    }
  };

  const getStyles = () => {
    const base =
      'flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg backdrop-blur-md transition-all duration-300 transform translate-y-0 opacity-100 max-w-[90vw]';
    const initial = 'translate-y-4 opacity-0';

    // Using Tailwind colors from config
    switch (toast.type) {
      case 'success':
        return `${base} bg-green-50 text-green-700 border border-green-100`;
      case 'error':
        return `${base} bg-red-50 text-red-700 border border-red-100`;
      case 'warning':
        return `${base} bg-yellow-50 text-yellow-700 border border-yellow-100`;
      case 'info':
      default:
        return `${base} bg-white text-slate-700 border border-slate-100`;
    }
  };

  const getIconColor = () => {
    switch (toast.type) {
      case 'success':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      case 'info':
        return 'text-blue-500';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div
      className={`${getStyles()} ${isVisible ? '' : 'translate-y-4 opacity-0'}`}
      onClick={() => removeToast(toast.id)}
    >
      <span className={`material-symbols-outlined ${getIconColor()}`}>{getIcon()}</span>
      <p className="text-sm font-medium">{toast.message}</p>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const toasts = useToastStore((state) => state.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] flex flex-col gap-2 w-full items-center pointer-events-none">
      <div className="pointer-events-auto flex flex-col gap-2 items-center">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </div>
    </div>
  );
};
