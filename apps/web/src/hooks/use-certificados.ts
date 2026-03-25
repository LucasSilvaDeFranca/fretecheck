import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface CertificadoResponse {
  id: string
  numero: string
  pdfUrl: string
  pdfHash: string
  assinadoIcpBrasil: boolean
  assinaturaTs?: string
  emitidoAt: string
  checkinId: string
}

export function useCertificado(checkinId: string) {
  return useQuery({
    queryKey: ['certificado', checkinId],
    queryFn: async () => {
      const { data } = await api.get(`/checkins/${checkinId}/certificate`)
      return data as CertificadoResponse
    },
    enabled: !!checkinId,
    retry: false,
  })
}

export function useEmitirCertificado(checkinId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/checkins/${checkinId}/certificate`)
      return data as CertificadoResponse
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['certificado', checkinId] })
      qc.invalidateQueries({ queryKey: ['checkin', checkinId] })
      qc.invalidateQueries({ queryKey: ['checkins'] })
    },
  })
}
