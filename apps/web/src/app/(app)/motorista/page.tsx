'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { useCheckins, useActiveCheckin } from '@/hooks/use-checkins'
import { Card, CardHeader, CardTitle, Button } from '@/components/ui'
import { CheckinStatusBadge } from '@/components/ui/badge'

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  return `${h}h ${m}min`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function MotoristaDashboard() {
  const { user } = useAuth({ required: true })
  const { data, isLoading } = useCheckins(1, 10)
  const activeCheckin = useActiveCheckin()

  const checkins = data?.data ?? []
  const completed = checkins.filter((c) => c.status === 'CERTIFICATE_ISSUED' || c.status === 'TITLE_GENERATED')
  const totalExcedente = completed.reduce((sum, c) => sum + (c.tempoExcedenteMin ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Olá, {user?.name?.split(' ')[0]}</h1>
          <p className="text-text-muted text-sm mt-0.5">Painel do motorista</p>
        </div>
        <Link href="/motorista/checkin/novo">
          <Button size="lg">
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Novo Check-in
          </Button>
        </Link>
      </div>

      {/* Active check-in banner */}
      {activeCheckin && (
        <div className="bg-brand-500/10 border border-brand-500/25 rounded-xl p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-brand-500">Check-in ativo</p>
              <p className="text-text-secondary text-sm mt-1">
                Placa <strong className="text-text-primary">{activeCheckin.placa}</strong> · Entrada em {formatDate(activeCheckin.arrivedAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <CheckinStatusBadge status={activeCheckin.status} />
              <Link href={`/motorista/checkin/${activeCheckin.id}`}>
                <Button size="sm" variant="secondary">Ver detalhes</Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-text-muted">Check-ins no período</p>
          <p className="text-3xl font-bold text-text-primary mt-1">{isLoading ? '–' : data?.meta.total ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-text-muted">Certificados emitidos</p>
          <p className="text-3xl font-bold text-teal-400 mt-1">{isLoading ? '–' : completed.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-text-muted">Tempo excedente total</p>
          <p className="text-3xl font-bold text-brand-500 mt-1">
            {isLoading ? '–' : totalExcedente > 0 ? formatDuration(totalExcedente) : '0min'}
          </p>
        </Card>
      </div>

      {/* Recent check-ins */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Últimos check-ins</CardTitle>
            <Link href="/motorista/historico" className="text-sm text-brand-500 hover:text-brand-400 transition-colors cursor-pointer">
              Ver todos
            </Link>
          </div>
        </CardHeader>

        {isLoading ? (
          <div className="py-8 text-center text-text-muted text-sm">Carregando...</div>
        ) : checkins.length === 0 ? (
          <div className="py-8 text-center text-text-muted text-sm">
            Nenhum check-in ainda.{' '}
            <Link href="/motorista/checkin/novo" className="text-brand-500 hover:text-brand-400 cursor-pointer">
              Fazer o primeiro
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-dark-600 -mx-6 mt-4">
            {checkins.map((c) => (
              <Link
                key={c.id}
                href={`/motorista/checkin/${c.id}`}
                className="flex items-center justify-between px-6 py-3 hover:bg-dark-700 transition-colors duration-150 cursor-pointer"
              >
                <div>
                  <p className="text-sm font-medium text-text-primary">{c.placa}</p>
                  <p className="text-xs text-text-muted">{formatDate(c.arrivedAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {c.tempoEsperaMin != null && (
                    <span className="text-xs text-text-muted">{formatDuration(c.tempoEsperaMin)}</span>
                  )}
                  <CheckinStatusBadge status={c.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
