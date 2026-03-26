'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { useCheckins } from '@/hooks/use-checkins'
import { Card, Button } from '@/components/ui'
import { CheckinStatusBadge } from '@/components/ui/badge'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function formatDuration(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

export default function HistoricoPage() {
  useAuth({ required: true })
  const [page, setPage] = useState(1)
  const { data, isLoading } = useCheckins(page, 20)

  const checkins = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Histórico</h1>
          <p className="text-text-muted text-sm mt-0.5">Todos os seus check-ins</p>
        </div>
        <Link href="/motorista/checkin/novo">
          <Button>Novo Check-in</Button>
        </Link>
      </div>

      <Card>
        {isLoading ? (
          <div className="py-12 text-center text-text-muted text-sm">Carregando...</div>
        ) : checkins.length === 0 ? (
          <div className="py-12 text-center text-text-muted text-sm">
            Nenhum check-in encontrado.
          </div>
        ) : (
          <div className="divide-y divide-dark-600 -mx-6">
            {checkins.map((c) => (
              <Link
                key={c.id}
                href={`/motorista/checkin/${c.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-dark-700 transition-colors duration-150 cursor-pointer"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-text-primary">{c.placa}</p>
                  <p className="text-xs text-text-muted">{formatDate(c.arrivedAt)}</p>
                  {c.apontamento && (
                    <p className="text-xs text-text-muted">Causa: {(c.apontamento as { causadorNome?: string }).causadorNome}</p>
                  )}
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    {c.tempoEsperaMin != null && (
                      <p className="text-xs text-text-muted">{formatDuration(c.tempoEsperaMin)}</p>
                    )}
                    {c.tempoExcedenteMin != null && c.tempoExcedenteMin > 0 && (
                      <p className="text-xs text-red-400">+{formatDuration(c.tempoExcedenteMin)} excedente</p>
                    )}
                  </div>
                  <CheckinStatusBadge status={c.status} />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-dark-600">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <span className="text-sm text-text-muted">
              Página {page} de {meta.totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page === meta.totalPages}
            >
              Próxima
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
