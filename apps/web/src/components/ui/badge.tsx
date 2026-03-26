import { HTMLAttributes } from 'react'
import { clsx } from 'clsx'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand'

const CHECKIN_STATUS_MAP: Record<string, BadgeVariant> = {
  AWAITING_APPOINTMENT: 'warning',
  AWAITING_CHECKOUT: 'info',
  CHECKED_OUT: 'default',
  CERTIFICATE_ISSUED: 'success',
  TITLE_GENERATED: 'success',
  CANCELLED: 'danger',
}

const CHECKIN_STATUS_LABEL: Record<string, string> = {
  AWAITING_APPOINTMENT: 'Aguardando Apontamento',
  AWAITING_CHECKOUT: 'Aguardando Checkout',
  CHECKED_OUT: 'Saída Registrada',
  CERTIFICATE_ISSUED: 'Certificado Emitido',
  TITLE_GENERATED: 'Título Gerado',
  CANCELLED: 'Cancelado',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest border',
        {
          'bg-dark-700/50 border-dark-500 text-text-muted': variant === 'default',
          'bg-teal-400/10 border-teal-400/25 text-teal-400': variant === 'success',
          'bg-amber-500/10 border-amber-500/25 text-amber-400': variant === 'warning',
          'bg-red-500/10 border-red-500/25 text-red-400': variant === 'danger',
          'bg-blue-500/10 border-blue-500/25 text-blue-400': variant === 'info',
          'bg-brand-500/15 border-brand-500/30 text-brand-500': variant === 'brand',
        },
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export function CheckinStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={CHECKIN_STATUS_MAP[status] ?? 'default'}>
      {CHECKIN_STATUS_LABEL[status] ?? status}
    </Badge>
  )
}
