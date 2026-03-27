import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface CheckinResponse {
  id: string
  status: string
  arrivedAt: string
  arrivedLat: number
  arrivedLng: number
  placa: string
  terminalId?: string
  terminalNome?: string
  departedAt?: string
  tempoEsperaMin?: number
  tempoExcedenteMin?: number
  valorEstimado?: string
  apontamento?: ApontamentoResponse
  certificadoId?: string
  certificadoNumero?: string
  motoristaId: string
  motoristaNome: string
}

export interface ApontamentoResponse {
  id: string
  causa: string
  causadorCnpj: string
  causadorNome: string
  descricao?: string
  evidenciaUrls: string[]
  createdAt: string
}

export interface CreateCheckinInput {
  placa: string
  marca?: string
  modelo?: string
  capacidadeCargaTon: number
  lat: number
  lng: number
  accuracy: number
  terminalId?: string
  cteNumero?: string
  cteChave?: string
  observacoes?: string
  photoUrl?: string
}

export interface CreateApontamentoInput {
  causa: string
  causadorCnpj?: string
  causadorNome: string
  descricao?: string
  evidenciaUrls?: string[]
  evidenciaOriginaisUrls?: string[]
}

export interface CheckoutInput {
  lat: number
  lng: number
  accuracy: number
}

export function useCheckins(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['checkins', page, limit],
    queryFn: async () => {
      const { data } = await api.get('/checkins', { params: { page, limit } })
      return data as { data: CheckinResponse[]; meta: { page: number; limit: number; total: number; totalPages: number } }
    },
  })
}

export function useCheckin(id: string) {
  return useQuery({
    queryKey: ['checkin', id],
    queryFn: async () => {
      const { data } = await api.get(`/checkins/${id}`)
      return data as CheckinResponse
    },
    enabled: !!id,
  })
}

export function useActiveCheckin() {
  const { data } = useCheckins(1, 5)
  const active = data?.data.find(
    (c) => c.status === 'AWAITING_APPOINTMENT' || c.status === 'AWAITING_CHECKOUT',
  )
  return active ?? null
}

export function useCreateCheckin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateCheckinInput) => {
      const { data } = await api.post('/checkins', input)
      return data as CheckinResponse
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checkins'] }),
  })
}

export function useCreateApontamento(checkinId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateApontamentoInput) => {
      const { data } = await api.post(`/checkins/${checkinId}/apontamento`, input)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checkin', checkinId] })
      qc.invalidateQueries({ queryKey: ['checkins'] })
    },
  })
}

export function useCheckout(checkinId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CheckoutInput) => {
      const { data } = await api.patch(`/checkins/${checkinId}/checkout`, input)
      return data as CheckinResponse
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checkin', checkinId] })
      qc.invalidateQueries({ queryKey: ['checkins'] })
    },
  })
}
