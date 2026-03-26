'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/hooks/use-auth'
import { useCheckin, useCreateApontamento, useCheckout } from '@/hooks/use-checkins'
import { useCertificado, useEmitirCertificado } from '@/hooks/use-certificados'
import { Button, Input, Card, CardHeader, CardTitle, MediaUploader, CertificateQr } from '@/components/ui'
import { CheckinStatusBadge } from '@/components/ui/badge'

const apontamentoSchema = z.object({
  causa: z.enum(['EMBARCADOR', 'DESTINATARIO', 'TERMINAL', 'OUTROS']),
  causadorCnpj: z.string().regex(/^\d{14}$|^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido'),
  causadorNome: z.string().min(3, 'Nome muito curto'),
  descricao: z.string().optional(),
})

type ApontamentoForm = z.infer<typeof apontamentoSchema>

const CAUSA_LABELS: Record<string, string> = {
  EMBARCADOR: 'Embarcador',
  DESTINATARIO: 'Destinatário',
  TERMINAL: 'Terminal / Porto',
  OUTROS: 'Outros',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function formatDuration(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b border-dark-600 last:border-0">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="text-sm font-medium text-text-primary">{value}</span>
    </div>
  )
}

export default function CheckinDetailPage() {
  const { user } = useAuth({ required: true })
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data: checkin, isLoading } = useCheckin(id)
  const { data: certificado } = useCertificado(id)
  const createApontamento = useCreateApontamento(id)
  const doCheckout = useCheckout(id)
  const emitirCertificado = useEmitirCertificado(id)

  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [evidenciaUrls, setEvidenciaUrls] = useState<string[]>([])
  const [evidenciaOriginaisUrls, setEvidenciaOriginaisUrls] = useState<string[]>([])

  // Status derivado: checkout feito mas certificado ainda não emitido
  const isCheckedOut = !!checkin?.departedAt && checkin.status === 'AWAITING_CHECKOUT'
  const displayStatus = isCheckedOut ? 'CHECKED_OUT' : (checkin?.status ?? '')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ApontamentoForm>({
    resolver: zodResolver(apontamentoSchema),
  })

  const handleCheckout = async () => {
    setCheckoutLoading(true)
    setCheckoutError(null)
    try {
      if (!navigator.geolocation) throw new Error('Geolocalização não suportada.')
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true }),
      )
      await doCheckout.mutateAsync({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy })
    } catch (e) {
      setCheckoutError((e as Error).message ?? 'Erro ao registrar saída.')
    } finally {
      setCheckoutLoading(false)
    }
  }

  const onApontamento = async (data: ApontamentoForm) => {
    await createApontamento.mutateAsync({ ...data, evidenciaUrls, evidenciaOriginaisUrls })
  }

  const evidenciaFolder = `apontamentos/${id}`

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted text-sm">Carregando...</div>
    )
  }

  if (!checkin) {
    return (
      <div className="text-center py-20">
        <p className="text-text-muted">Check-in não encontrado.</p>
        <Link href="/motorista" className="text-brand-500 hover:underline text-sm mt-2 inline-block cursor-pointer">Voltar</Link>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-text-primary">Check-in · {checkin.placa}</h1>
          <CheckinStatusBadge status={displayStatus} />
        </div>
      </div>

      {/* Dados do check-in */}
      <Card>
        <CardHeader><CardTitle>Detalhes</CardTitle></CardHeader>
        <InfoRow label="Placa" value={checkin.placa} />
        <InfoRow label="Entrada" value={formatDate(checkin.arrivedAt)} />
        {checkin.departedAt && <InfoRow label="Saída" value={formatDate(checkin.departedAt)} />}
        {checkin.tempoEsperaMin != null && (
          <InfoRow label="Tempo de espera" value={formatDuration(checkin.tempoEsperaMin)} />
        )}
        {checkin.tempoExcedenteMin != null && checkin.tempoExcedenteMin > 0 && (
          <InfoRow
            label="Tempo excedente"
            value={<span className="text-red-400">{formatDuration(checkin.tempoExcedenteMin)}</span>}
          />
        )}
        {checkin.valorEstimado && Number(checkin.valorEstimado) > 0 && (
          <InfoRow
            label="Valor estimado"
            value={
              <span className="text-brand-500 font-semibold">
                {Number(checkin.valorEstimado).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            }
          />
        )}
        <InfoRow
          label="Coordenadas"
          value={`${checkin.arrivedLat.toFixed(5)}, ${checkin.arrivedLng.toFixed(5)}`}
        />
      </Card>

      {/* Apontamento — já registrado */}
      {checkin.apontamento ? (
        <Card>
          <CardHeader><CardTitle>Apontamento</CardTitle></CardHeader>
          <InfoRow label="Causa" value={CAUSA_LABELS[checkin.apontamento.causa] ?? checkin.apontamento.causa} />
          <InfoRow label="Responsável" value={checkin.apontamento.causadorNome} />
          <InfoRow label="CNPJ" value={checkin.apontamento.causadorCnpj} />
          {checkin.apontamento.descricao && (
            <InfoRow label="Descrição" value={checkin.apontamento.descricao} />
          )}
          {checkin.apontamento.evidenciaUrls.length > 0 && (
            <div className="pt-2">
              <p className="text-xs text-text-muted mb-2">Evidências ({checkin.apontamento.evidenciaUrls.length})</p>
              <div className="flex flex-wrap gap-2">
                {checkin.apontamento.evidenciaUrls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-500 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Evidência {i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}
        </Card>
      ) : checkin.status === 'AWAITING_APPOINTMENT' ? (
        <Card>
          <CardHeader><CardTitle>Registrar Apontamento</CardTitle></CardHeader>
          <p className="text-sm text-text-muted mb-4">Identifique o responsável pelo tempo de espera.</p>
          <form onSubmit={handleSubmit(onApontamento)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Causa</label>
              <select
                {...register('causa')}
                className="w-full rounded-lg border border-dark-600 bg-[#e8f0fd] text-gray-900 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all duration-150 cursor-pointer"
              >
                <option value="">Selecione...</option>
                {Object.entries(CAUSA_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              {errors.causa && <p className="text-xs text-red-400 mt-1">{errors.causa.message}</p>}
            </div>
            <Input
              label="CNPJ do responsável"
              {...register('causadorCnpj')}
              error={errors.causadorCnpj?.message}
              placeholder="00.000.000/0000-00"
            />
            <Input
              label="Nome do responsável"
              {...register('causadorNome')}
              error={errors.causadorNome?.message}
              placeholder="Razão social"
            />
            <Input
              label="Descrição (opcional)"
              {...register('descricao')}
              placeholder="Descreva o motivo da espera..."
            />

            {/* Evidências */}
            <MediaUploader
              folder={evidenciaFolder}
              accept={['image', 'video', 'document']}
              multiple
              maxFiles={10}
              label="Evidências"
              hint="fotos, vídeos, PDFs · opcional · máx 10 arquivos"
              onChange={setEvidenciaUrls}
              watermarkMetadata={checkin ? { placa: checkin.placa, arrivedAt: checkin.arrivedAt, lat: checkin.arrivedLat, lng: checkin.arrivedLng } : undefined}
              onOriginalsChange={setEvidenciaOriginaisUrls}
            />

            {createApontamento.error && (
              <p className="text-sm text-red-400">
                {(createApontamento.error as { response?: { data?: { message?: string | string[] } } })
                  ?.response?.data?.message
                  ? [
                      (createApontamento.error as { response?: { data?: { message?: string | string[] } } })
                        .response!.data!.message!,
                    ]
                      .flat()
                      .join(' · ')
                  : 'Erro ao registrar apontamento.'}
              </p>
            )}
            <Button type="submit" className="w-full" loading={isSubmitting}>
              Registrar apontamento
            </Button>
          </form>
        </Card>
      ) : null}

      {/* Checkout */}
      {checkin.status === 'AWAITING_CHECKOUT' && !checkin.departedAt && (
        <Card>
          <CardHeader><CardTitle>Registrar Saída</CardTitle></CardHeader>
          <p className="text-sm text-text-muted mb-4">
            Confirme sua saída do terminal para calcular o tempo total de espera.
          </p>
          {checkoutError && <p className="text-sm text-red-400 mb-3">{checkoutError}</p>}
          <Button className="w-full" size="lg" onClick={handleCheckout} loading={checkoutLoading}>
            Confirmar saída
          </Button>
        </Card>
      )}

      {/* Certificado */}
      {certificado ? (
        <Card>
          <CardHeader><CardTitle>Certificado</CardTitle></CardHeader>
          <InfoRow label="Número" value={certificado.numero} />
          <InfoRow label="Emitido em" value={formatDate(certificado.emitidoAt)} />
          <InfoRow
            label="Assinatura ICP-Brasil"
            value={
              certificado.assinadoIcpBrasil ? (
                <span className="text-teal-400 font-medium">Válida</span>
              ) : (
                <span className="text-text-muted">Não assinado</span>
              )
            }
          />
          <p className="text-xs text-text-muted mt-2 font-mono break-all">{certificado.pdfHash}</p>
          <div className="pt-3 flex flex-col items-center gap-1 border-t border-dark-600 mt-3">
            <CertificateQr numero={certificado.numero} size={120} />
            <p className="text-xs text-text-muted">Escaneie para verificar autenticidade</p>
          </div>
          <a href={certificado.pdfUrl} target="_blank" rel="noopener noreferrer" className="mt-4 block">
            <Button variant="secondary" className="w-full">
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Baixar PDF
            </Button>
          </a>
        </Card>
      ) : isCheckedOut ? (
        <Card>
          <CardHeader><CardTitle>Certificado</CardTitle></CardHeader>
          <p className="text-sm text-text-muted mb-4">Gere o certificado oficial deste check-in.</p>
          {emitirCertificado.error && (
            <p className="text-sm text-red-400 mb-3">Erro ao emitir certificado.</p>
          )}
          <Button className="w-full" onClick={() => emitirCertificado.mutate()} loading={emitirCertificado.isPending}>
            Emitir certificado
          </Button>
        </Card>
      ) : null}
    </div>
  )
}
