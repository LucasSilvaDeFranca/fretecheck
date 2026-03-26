'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useCreateCheckin } from '@/hooks/use-checkins'
import { Button, Input, Card, CardHeader, CardTitle } from '@/components/ui'

const schema = z.object({
  placa: z
    .string()
    .regex(/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$|^[A-Z]{3}[0-9]{4}$/, 'Placa inválida (ex: ABC1234 ou ABC1D23)'),
  capacidadeCargaTon: z
    .number({ invalid_type_error: 'Informe a capacidade em toneladas' })
    .min(0.1, 'Mínimo 0.1 toneladas')
    .max(100, 'Máximo 100 toneladas'),
  cteNumero: z.string().optional(),
  observacoes: z.string().optional(),
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

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeo((g) => ({ ...g, loading: false, error: 'Geolocalização não suportada neste dispositivo.' }))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          error: null,
          loading: false,
        })
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
        <h1 className="text-2xl font-bold text-gray-900">Novo Check-in</h1>
        <p className="text-gray-500 text-sm mt-1">Registre sua chegada ao terminal</p>
      </div>

      {/* GPS status */}
      <Card>
        <CardHeader>
          <CardTitle>Localização</CardTitle>
        </CardHeader>
        {geo.loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg className="animate-spin h-4 w-4 text-brand-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Obtendo localização...
          </div>
        ) : geo.error ? (
          <p className="text-sm text-red-600">{geo.error}</p>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm text-green-700 font-medium">Localização obtida</span>
            </div>
            <p className="text-xs text-gray-500">
              {geo.lat?.toFixed(6)}, {geo.lng?.toFixed(6)} · Precisão: {Math.round(geo.accuracy ?? 0)}m
            </p>
            {(geo.accuracy ?? 0) > 500 && (
              <p className="text-xs text-amber-600">Precisão baixa. Aguarde ou se mova para área aberta.</p>
            )}
          </div>
        )}
      </Card>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Placa do veículo"
            {...register('placa')}
            error={errors.placa?.message}
            placeholder="ABC1234"
            className="uppercase"
          />
          <Input
            label="Capacidade de carga (toneladas)"
            type="number"
            step="0.1"
            {...register('capacidadeCargaTon', { valueAsNumber: true })}
            error={errors.capacidadeCargaTon?.message}
            placeholder="Ex: 25"
            hint="Capacidade total que o veículo pode transportar nesta viagem"
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
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {(createCheckin.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                'Erro ao registrar check-in.'}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            loading={createCheckin.isPending}
            disabled={geo.loading || !!geo.error}
          >
            Registrar entrada
          </Button>
        </form>
      </Card>
    </div>
  )
}
