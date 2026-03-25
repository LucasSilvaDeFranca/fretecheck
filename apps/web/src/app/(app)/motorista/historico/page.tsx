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
          <h1 className="text-2xl font-bold text-gray-900">Histórico</h1>
          <p className="text-gray-500 text-sm mt-0.5">Todos os seus check-ins</p>
        </div>
        <Link href="/motorista/checkin/novo">
          <Button>Novo Check-in</Button>
        </Link>
      </div>

      <Card>
        {isLoading ? (
          <div className="py-12 text-center text-gray-400 text-sm">Carregando...</div>
        ) : checkins.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            Nenhum check-in encontrado.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 -mx-6">
            {checkins.map((c) => (
              <Link
                key={c.id}
                href={`/motorista/checkin/${c.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-gray-900">{c.placa}</p>
                  <p className="text-xs text-gray-500">{formatDate(c.arrivedAt)}</p>
                  {c.apontamento && (
                    <p className="text-xs text-gray-400">Causa: {c.apontamento.causadorNome}</p>
                  )}
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    {c.tempoEsperaMin != null && (
                      <p className="text-xs text-gray-500">{formatDuration(c.tempoEsperaMin)}</p>
                    )}
                    {c.tempoExcedenteMin != null && c.tempoExcedenteMin > 0 && (
                      <p className="text-xs text-red-500">+{formatDuration(c.tempoExcedenteMin)} excedente</p>
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
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <span className="text-sm text-gray-500">
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
