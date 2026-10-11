import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`bg-white rounded-lg border border-neutral-subtle shadow-xs overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, className = '' }) => {
  return (
    <div className={`p-4 sm:p-5 border-b border-neutral-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}>
      <div>
        <h3 className="text-base font-semibold text-neutral-main">{title}</h3>
        {subtitle && <p className="text-xs sm:text-sm text-neutral-secondary mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

export const CardContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return <div className={`p-4 sm:p-5 ${className}`}>{children}</div>;
};

export const CardFooter: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <div className={`px-4 py-3 sm:px-5 sm:py-3.5 bg-neutral-surface/60 border-t border-neutral-subtle flex items-center justify-between text-xs text-neutral-secondary ${className}`}>
      {children}
    </div>
  );
};
