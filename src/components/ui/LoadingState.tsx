import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingState: React.FC<{ message?: string; className?: string }> = ({
  message = 'Loading data...',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-neutral-secondary ${className}`}>
      <Loader2 className="w-8 h-8 animate-spin text-brand-violet mb-3" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
};
