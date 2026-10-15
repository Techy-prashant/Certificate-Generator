import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '5xl' | 'full';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const widthClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    '5xl': 'max-w-7xl',
    full: 'max-w-[96vw]',
  }[maxWidth] || 'max-w-lg';

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-midnight/60 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="fixed inset-0 bg-transparent"
        aria-hidden="true"
        onClick={onClose}
      />

      <div
        className={`relative w-full ${widthClasses} bg-white rounded-xl shadow-xl border border-neutral-subtle flex flex-col max-h-[90vh] overflow-hidden z-10`}
      >
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-subtle">
          <div>
            <h2 id="modal-title" className="text-base sm:text-lg font-semibold text-neutral-main">{title}</h2>
            {description && <p className="text-xs sm:text-sm text-neutral-secondary mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-secondary hover:text-neutral-main hover:bg-neutral-surface focus-visible:outline-2 focus-visible:outline-brand-violet"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-sm text-neutral-main">
          {children}
        </div>

        {footer && (
          <div className="p-4 sm:p-5 bg-neutral-surface/50 border-t border-neutral-subtle flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
