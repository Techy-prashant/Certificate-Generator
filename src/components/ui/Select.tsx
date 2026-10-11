import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, helperText, id, required, className = '', ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold uppercase tracking-wider text-neutral-secondary"
          >
            {label} {required && <span className="text-[#A52A2A]">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          required={required}
          className={`block w-full rounded-md border bg-white py-2 px-3 text-sm text-neutral-main focus-visible:outline-2 focus-visible:outline-brand-violet transition-colors duration-150 ${
            error
              ? 'border-[#A52A2A] focus-visible:outline-[#A52A2A]'
              : 'border-neutral-subtle hover:border-[#D0CAD7]'
          } disabled:bg-[#F5F3F8] disabled:cursor-not-allowed ${className}`}
          {...props}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error ? (
          <p className="text-xs text-[#A52A2A] font-medium" role="alert">
            {error}
          </p>
        ) : helperText ? (
          <p className="text-xs text-neutral-secondary">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
