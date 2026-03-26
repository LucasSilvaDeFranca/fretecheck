import { HTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({ padding = 'md', className, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-dark-800 rounded-xl border border-dark-600 transition-colors duration-150',
        {
          'p-0': padding === 'none',
          'p-4': padding === 'sm',
          'p-6': padding === 'md',
          'p-8': padding === 'lg',
        },
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('mb-4 pb-4 border-b border-dark-600', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={clsx('text-base font-semibold text-white', className)} {...props}>
      {children}
    </h3>
  )
}
