import React from 'react';

export interface BadgeProps {
  variant?: 'success' | 'pending' | 'error' | 'info' | 'neutral' | 'gold';
  children: React.ReactNode;
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

const BADGE_VARIANT_STYLES = {
  success: {
    container: 'bg-[#E2F4E9] text-[#17653C] border border-[#A3D9B8]',
    dot: 'bg-[#17653C]',
  },
  pending: {
    container: 'bg-[#FFF0D7] text-[#8C5800] border border-[#F3D19C]',
    dot: 'bg-[#8C5800]',
  },
  error: {
    container: 'bg-[#FBE5E5] text-[#A52A2A] border border-[#F4AFAF]',
    dot: 'bg-[#A52A2A]',
  },
  info: {
    container: 'bg-[#EBE5F7] text-[#4A358A] border border-[#C6B8EC]',
    dot: 'bg-[#7760B5]',
  },
  neutral: {
    container: 'bg-[#F0EDF5] text-[#6E6A78] border border-[#E7E3EB]',
    dot: 'bg-[#6E6A78]',
  },
  gold: {
    container: 'bg-[#FBF8EF] text-[#7A632B] border border-[#D9C7A1]',
    dot: 'bg-[#BFA66A]',
  },
} as const;

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = true,
  className = '',
}) => {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';
  const variantStyles = BADGE_VARIANT_STYLES[variant] || BADGE_VARIANT_STYLES.neutral;

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${sizeClasses} ${variantStyles.container} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${variantStyles.dot}`}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  );
};
