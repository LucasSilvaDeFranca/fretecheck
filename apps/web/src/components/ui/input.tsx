import { forwardRef, InputHTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'block w-full rounded-lg border px-4 py-2.5 text-sm transition-all duration-150',
            'bg-dark-800 text-text-secondary placeholder:text-text-muted',
            'focus:outline-none focus:ring-2',
            error
              ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
              : 'border-dark-600 focus:border-brand-500 focus:ring-brand-500/20',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
        {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
      </div>
    )
  },
)
Input.displayName = 'Input'
