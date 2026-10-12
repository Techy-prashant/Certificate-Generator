import React from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'warning',
  isLoading = false,
}) => {
  const icons = {
    danger: <AlertCircle className="w-5 h-5 text-[#A52A2A]" />,
    warning: <AlertTriangle className="w-5 h-5 text-[#8C5800]" />,
    info: <Info className="w-5 h-5 text-brand-violet" />,
  };

  const buttonVariants: Record<string, 'primary' | 'destructive' | 'outline'> = {
    danger: 'destructive',
    warning: 'primary',
    info: 'primary',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="sm"
    >
      <div className="space-y-4 pt-1">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-neutral-surface shrink-0 mt-0.5">
            {icons[variant]}
          </div>
          <p className="text-sm text-neutral-secondary leading-relaxed pt-1">
            {message}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-subtle">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={buttonVariants[variant]}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
