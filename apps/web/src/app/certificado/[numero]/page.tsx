import { notFound } from 'next/navigation'
import Link from 'next/link'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

const CAUSA_LABELS: Record<string, string> = {
  EMBARCADOR: 'Embarcador',
  DESTINATARIO: 'Destinatário',
  TERMINAL: 'Terminal / Porto',
  OUTROS: 'Outros',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function formatDuration(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right max-w-[60%] break-all">{value}</span>
    </div>
  )
}

interface PublicCertificado {
  numero: string
  emitidoAt: string
  assinadoIcpBrasil: boolean
  pdfHash: string
  pdfUrl: string
  checkin: {
    placa: string
    arrivedAt: string
    departedAt: string | null
    tempoEsperaMin: number | null
    tempoExcedenteMin: number | null
    valorEstimado: number | null
    apontamento: {
      causa: string
      causadorNome: string
      causadorCnpj: string
    } | null
  }
}

async function getCertificado(numero: string): Promise<PublicCertificado | null> {
  try {
    const res = await fetch(`${API_BASE}/certificados/publico/${encodeURIComponent(numero)}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: { numero: string } }) {
  return {
    title: `Certificado ${params.numero} — FreteCheck`,
    description: 'Verificação de autenticidade de certificado de tempo de espera no transporte',
  }
}

export default async function CertificadoPublicoPage({ params }: { params: { numero: string } }) {
  const cert = await getCertificado(params.numero)

  if (!cert) notFound()

  const { checkin } = cert

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1E3A5F] text-white">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">FreteCheck</h1>
              <p className="text-blue-200 text-sm mt-0.5">Verificação de Certificado</p>
            </div>
            <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
              Certificado Válido
            </span>
          </div>
        </div>
        <div className="h-1 bg-amber-400" />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Certificado */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Certificado</h2>
          </div>
          <div className="px-4 py-2">
            <Row label="Número" value={<span className="font-mono">{cert.numero}</span>} />
            <Row label="Emitido em" value={formatDate(cert.emitidoAt)} />
            <Row
              label="Assinatura ICP-Brasil"
              value={
                cert.assinadoIcpBrasil ? (
                  <span className="text-green-600 font-semibold">Válida</span>
                ) : (
                  <span className="text-gray-400">Não assinado (desenvolvimento)</span>
                )
              }
            />
          </div>
        </div>

        {/* Dados do Check-in */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Dados do Transporte</h2>
          </div>
          <div className="px-4 py-2">
            <Row label="Placa" value={checkin.placa} />
            <Row label="Chegada" value={formatDate(checkin.arrivedAt)} />
            {checkin.departedAt && <Row label="Saída" value={formatDate(checkin.departedAt)} />}
            {checkin.tempoEsperaMin != null && (
              <Row label="Tempo de espera" value={formatDuration(checkin.tempoEsperaMin)} />
            )}
            {checkin.tempoExcedenteMin != null && checkin.tempoExcedenteMin > 0 && (
              <Row
                label="Tempo excedente"
                value={<span className="text-red-600">{formatDuration(checkin.tempoExcedenteMin)}</span>}
              />
            )}
            {checkin.valorEstimado != null && checkin.valorEstimado > 0 && (
              <Row
                label="Valor estimado"
                value={
                  <span className="text-red-600 font-semibold">
                    {checkin.valorEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                }
              />
            )}
          </div>
        </div>

        {/* Apontamento */}
        {checkin.apontamento && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Responsável pelo Atraso</h2>
            </div>
            <div className="px-4 py-2">
              <Row label="Causa" value={CAUSA_LABELS[checkin.apontamento.causa] ?? checkin.apontamento.causa} />
              <Row label="Responsável" value={checkin.apontamento.causadorNome} />
              <Row
                label="CNPJ"
                value={checkin.apontamento.causadorCnpj.replace(
                  /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
                  '$1.$2.$3/$4-$5',
                )}
              />
            </div>
          </div>
        )}

        {/* Integridade */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Integridade do Documento</h2>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-gray-500 mb-1">Hash SHA-256 do PDF</p>
            <p className="text-xs font-mono text-gray-700 break-all bg-gray-50 rounded px-2 py-1.5">
              {cert.pdfHash}
            </p>
          </div>
        </div>

        {/* Download */}
        <a
          href={cert.pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-[#1E3A5F] text-white rounded-xl py-3 font-medium text-sm hover:bg-[#162d4a] transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Baixar PDF do Certificado
        </a>

        {/* Footer */}
        <div className="text-center pt-2 pb-6">
          <p className="text-xs text-gray-400 leading-relaxed">
            Este certificado foi emitido pela plataforma FreteCheck com base na Lei 11.442/2007 (Art. 11)
            e possui validade jurídica nos termos da MP 2.200-2/2001 (ICP-Brasil).
          </p>
          <Link href="/" className="text-xs text-[#1E3A5F] hover:underline mt-2 inline-block">
            Acessar FreteCheck
          </Link>
        </div>
      </div>
    </div>
  )
}
