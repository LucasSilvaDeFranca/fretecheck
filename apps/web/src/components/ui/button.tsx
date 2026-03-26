'use client'

import { forwardRef, ButtonHTMLAttributes } from 'react'
import { clsx } from 'clsx'
import { Spinner } from './spinner'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          'inline-flex items-center justify-center gap-2 font-semibold rounded-lg cursor-pointer',
          'transition-all duration-150',
          'focus:outline-none focus:ring-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'bg-brand-500 text-white hover:bg-brand-600 focus:ring-brand-500/40 hover:shadow-[0_0_24px_rgba(240,90,26,0.3)]': variant === 'primary',
            'bg-transparent text-brand-500 border-2 border-brand-500 hover:bg-brand-500 hover:text-white focus:ring-brand-500/40': variant === 'secondary',
            'text-text-muted hover:text-white hover:bg-dark-700 focus:ring-dark-500': variant === 'ghost',
            'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500/40': variant === 'danger',
          },
          {
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-5 py-2.5 text-sm': size === 'md',
            'px-6 py-3 text-base': size === 'lg',
          },
          className,
        )}
        {...props}
      >
        {loading && <Spinner size="sm" />}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'
