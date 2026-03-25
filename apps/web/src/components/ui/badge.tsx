import { HTMLAttributes } from 'react'
import { clsx } from 'clsx'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

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
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        {
          'bg-gray-100 text-gray-700': variant === 'default',
          'bg-green-100 text-green-700': variant === 'success',
          'bg-yellow-100 text-yellow-700': variant === 'warning',
          'bg-red-100 text-red-700': variant === 'danger',
          'bg-blue-100 text-blue-700': variant === 'info',
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
