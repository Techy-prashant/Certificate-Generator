import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors duration-150 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-3.5 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  }[size];

  const variantClasses = {
    primary: 'bg-brand-violet text-white hover:bg-brand-violet-hover focus-visible:outline-brand-violet shadow-sm active:bg-[#584391]',
    secondary: 'bg-neutral-surface text-neutral-main hover:bg-[#E4DFEC] border border-neutral-subtle active:bg-[#DCD6E6]',
    outline: 'bg-white text-neutral-main border border-neutral-subtle hover:bg-neutral-surface hover:border-[#D5D0DC] active:bg-[#EBE7F2]',
    destructive: 'bg-[#A52A2A] text-white hover:bg-[#8F2323] focus-visible:outline-[#A52A2A] shadow-sm',
    ghost: 'text-neutral-secondary hover:text-neutral-main hover:bg-neutral-surface',
  }[variant];

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
    </button>
  );
};
