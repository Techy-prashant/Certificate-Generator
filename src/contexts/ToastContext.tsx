import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 3800);
  }, [removeToast]);

  const success = useCallback((msg: string) => showToast(msg, 'success'), [showToast]);
  const error = useCallback((msg: string) => showToast(msg, 'error'), [showToast]);
  const info = useCallback((msg: string) => showToast(msg, 'info'), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info }}>
      {children}
      {/* Toast Portal Container */}
      <div
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full"
        aria-live="polite"
        role="region"
      >
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-mac-floating border backdrop-blur-xl animate-in slide-in-from-bottom-3 duration-250 ${
                isSuccess
                  ? 'bg-white/95 border-emerald-200/80 text-emerald-950'
                  : isError
                  ? 'bg-white/95 border-rose-200/80 text-rose-950'
                  : isWarning
                  ? 'bg-white/95 border-amber-200/80 text-amber-950'
                  : 'bg-white/95 border-neutral-subtle/80 text-neutral-main'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                {isError && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                {isWarning && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4 text-brand-violet shrink-0" />}
                <p className="text-xs font-medium tracking-tight truncate">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-neutral-secondary/60 hover:text-neutral-main p-1 rounded-lg hover:bg-neutral-subtle/40 transition-colors"
                aria-label="Dismiss toast"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
