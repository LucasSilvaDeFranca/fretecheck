'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useCreateCheckin } from '@/hooks/use-checkins'
import { api } from '@/lib/api'
import { Button, Input, Card, CardHeader, CardTitle, MediaUploader } from '@/components/ui'

const schema = z.object({
  placa: z.string().min(1, 'Informe a placa').max(10, 'Máximo 10 caracteres'),
  marca: z.string().max(150).optional(),
  modelo: z.string().max(150).optional(),
  tipoOperacao: z.enum(['CARREGAMENTO', 'DESCARGA'], { required_error: 'Selecione o tipo de operação' }),
  capacidadeCargaTon: z
    .number({ invalid_type_error: 'Informe a capacidade em toneladas' })
    .min(0.1, 'Mínimo 0.1 toneladas')
    .max(1000000, 'Máximo 1.000.000 toneladas'),
  docNumero: z.string().min(1, 'Informe o número do documento').max(150),
  cteNumero: z.string().max(150).optional(),
  observacoes: z.string().max(150).optional(),
})

type FormData = z.infer<typeof schema>

interface GeoState {
  lat: number | null
  lng: number | null
  accuracy: number | null
  error: string | null
  loading: boolean
}

export default function NovoCheckinPage() {
  useAuth({ required: true })
  const router = useRouter()
  const createCheckin = useCreateCheckin()

  const [geo, setGeo] = useState<GeoState>({ lat: null, lng: null, accuracy: null, error: null, loading: true })
  const [endereco, setEndereco] = useState<string | null>(null)
  const [veiculoFound, setVeiculoFound] = useState(false)
  const [buscandoPlaca, setBuscandoPlaca] = useState(false)
  const [docUrls, setDocUrls] = useState<string[]>([])

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const placaValue = watch('placa')

  // Buscar veículo quando placa tiver formato válido
  const buscarVeiculo = useCallback(async (placa: string) => {
    const placaLimpa = placa.replace(/[-\s]/g, '').toUpperCase()
    if (placaLimpa.length < 2) return

    setBuscandoPlaca(true)
    try {
      const { data } = await api.get(`/checkins/veiculo/${placaLimpa}`)
      if (data.marca) setValue('marca', data.marca)
      if (data.modelo) setValue('modelo', data.modelo)
      setVeiculoFound(true)
    } catch {
      // Veículo novo — limpar campos para preenchimento manual
      setValue('marca', '')
      setValue('modelo', '')
      setVeiculoFound(false)
    } finally {
      setBuscandoPlaca(false)
    }
  }, [setValue])

  // Debounce na placa
  useEffect(() => {
    if (!placaValue || placaValue.length < 2) {
      setVeiculoFound(false)
      return
    }
    const timer = setTimeout(() => buscarVeiculo(placaValue), 400)
    return () => clearTimeout(timer)
  }, [placaValue, buscarVeiculo])

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeo((g) => ({ ...g, loading: false, error: 'Geolocalização não suportada neste dispositivo.' }))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        setGeo({ lat: latitude, lng: longitude, accuracy, error: null, loading: false })

        // Geocodificação reversa (Nominatim/OpenStreetMap — grátis)
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=pt-BR`, {
          headers: { 'User-Agent': 'FreteCheck/1.0' },
        })
          .then((r) => r.json())
          .then((data) => {
            const a = data.address ?? {}
            const rua = a.road ?? a.pedestrian ?? ''
            const cidade = a.city ?? a.town ?? a.village ?? ''
            const estado = a.state ?? ''
            const parts = [rua, cidade, estado].filter(Boolean)
            if (parts.length) setEndereco(parts.join(', '))
          })
          .catch(() => {})
      },
      (err) => {
        setGeo((g) => ({
          ...g,
          loading: false,
          error: err.code === 1 ? 'Permissão de localização negada.' : 'Não foi possível obter sua localização.',
        }))
      },
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }, [])

  const onSubmit = async (data: FormData) => {
    if (!geo.lat || !geo.lng) return
    const result = await createCheckin.mutateAsync({
      placa: data.placa.toUpperCase(),
      marca: data.marca || undefined,
      modelo: data.modelo || undefined,
      tipoOperacao: data.tipoOperacao,
      docNumero: data.docNumero || undefined,
      docUrl: docUrls[0] || undefined,
      capacidadeCargaTon: data.capacidadeCargaTon,
      lat: geo.lat,
      lng: geo.lng,
      accuracy: geo.accuracy ?? 999,
      cteNumero: data.cteNumero || undefined,
      observacoes: data.observacoes || undefined,
    })
    router.push(`/motorista/checkin/${result.id}`)
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Novo Check-in</h1>
        <p className="text-text-muted text-sm mt-1">Registre sua chegada ao terminal</p>
      </div>

      {/* GPS status */}
      <Card>
        <CardHeader>
          <CardTitle>Localização</CardTitle>
        </CardHeader>
        {geo.loading ? (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <svg className="animate-spin h-4 w-4 text-brand-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Obtendo localização...
          </div>
        ) : geo.error ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              <span className="text-sm text-red-400 font-medium">Localização indisponível</span>
            </div>
            <p className="text-sm text-red-400">{geo.error}</p>
            <p className="text-xs text-text-muted">A localização GPS é obrigatória para registrar o check-in. Ative a permissão de localização no seu navegador e recarregue a página.</p>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-teal-400" />
              <span className="text-sm text-teal-400 font-medium">Localização obtida</span>
            </div>
            <p className="text-xs text-text-muted">
              {geo.lat?.toFixed(6)}, {geo.lng?.toFixed(6)} · Precisão: {Math.round(geo.accuracy ?? 0)}m
            </p>
            {endereco && (
              <p className="text-xs text-text-secondary mt-1">{endereco}</p>
            )}
          </div>
        )}
      </Card>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Input
              label="Placa do veículo"
              {...register('placa')}
              error={errors.placa?.message}
              placeholder="ABC1234"
              className="uppercase"
              maxLength={10}
            />
            {buscandoPlaca && (
              <p className="text-xs text-text-muted mt-1">Buscando veículo...</p>
            )}
            {veiculoFound && !buscandoPlaca && (
              <p className="text-xs text-teal-400 mt-1">Veículo encontrado — dados preenchidos</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Marca"
              {...register('marca')}
              error={errors.marca?.message}
              placeholder="Ex: VOLKSWAGEN"
            />
            <Input
              label="Modelo"
              {...register('modelo')}
              error={errors.modelo?.message}
              placeholder="Ex: Constellation"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Tipo de operação</label>
            <select
              {...register('tipoOperacao')}
              className="w-full rounded-lg border border-dark-600 bg-[#e8f0fd] text-gray-900 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all duration-150 cursor-pointer"
            >
              <option value="">Selecione...</option>
              <option value="CARREGAMENTO">Carregamento</option>
              <option value="DESCARGA">Descarga</option>
            </select>
            {errors.tipoOperacao && <p className="text-xs text-red-400 mt-1">{errors.tipoOperacao.message}</p>}
          </div>

          <Input
            label={watch('tipoOperacao') === 'DESCARGA' ? 'DACTE, ticket de balança, canhoto' : 'Número da ordem de carregamento'}
            {...register('docNumero')}
            error={errors.docNumero?.message}
            placeholder={watch('tipoOperacao') === 'DESCARGA' ? 'Nº do documento' : 'Nº da ordem'}
          />

          <MediaUploader
            folder={`checkins/docs`}
            maxFiles={1}
            label="Documento de viagem"
            hint="PDF ou foto · obrigatório"
            onChange={setDocUrls}
          />
          {docUrls.length === 0 && (
            <p className="text-xs text-text-muted">Anexe o documento para continuar</p>
          )}

          <Input
            label="Capacidade de carga (toneladas)"
            type="number"
            step="0.1"
            {...register('capacidadeCargaTon', { valueAsNumber: true })}
            error={errors.capacidadeCargaTon?.message}
            placeholder="Ex: 25"
            hint="Capacidade de carga desta viagem"
          />
          <Input
            label="Número do CT-e (opcional)"
            {...register('cteNumero')}
            error={errors.cteNumero?.message}
            placeholder="000000000"
            hint="Conhecimento de Transporte Eletrônico"
          />
          <Input
            label="Observações (opcional)"
            {...register('observacoes')}
            placeholder="Informações adicionais..."
          />

          {createCheckin.error && (
            <div className="bg-red-500/10 border border-red-500/25 rounded-lg p-3 text-red-400 text-sm">
              {(createCheckin.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                'Erro ao registrar check-in.'}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            loading={createCheckin.isPending}
            disabled={geo.loading || !!geo.error || docUrls.length === 0}
          >
            Registrar entrada
          </Button>
        </form>
      </Card>
    </div>
  )
}
