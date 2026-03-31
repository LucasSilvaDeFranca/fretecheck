import { CausaType, CheckinStatus } from './enums'

// ── Requests ──────────────────────────────────

export interface CreateCheckinDto {
  placa: string
  lat: number
  lng: number
  accuracy: number // metros
  photoUrl?: string
  cteNumero?: string
  cteChave?: string
  observacoes?: string
  terminalId?: string
}

export interface CreateApontamentoDto {
  causa: CausaType
  causadorCnpj: string
  causadorNome: string
  descricao?: string
  evidenciaUrls?: string[]
}

export interface CheckoutDto {
  lat: number
  lng: number
  accuracy: number
}

// ── Responses ─────────────────────────────────

export interface CheckinResponse {
  id: string
  status: CheckinStatus
  arrivedAt: string // ISO 8601
  arrivedLat: number
  arrivedLng: number
  placa: string
  terminalId?: string
  terminalNome?: string
  tempoEsperaMin?: number
  tempoExcedenteMin?: number
  valorEstimado?: string // Decimal como string
  apontamento?: ApontamentoResponse
  certificadoId?: string
  certificadoNumero?: string
  motoristaId: string
  motoristaNome: string
}

export interface ApontamentoResponse {
  id: string
  causa: CausaType
  causadorCnpj: string
  causadorNome: string
  descricao?: string
  evidenciaUrls: string[]
  registradoVia: string
  createdAt: string
}

export interface CheckoutResponse extends CheckinResponse {
  departedAt: string
  tempoEsperaMin: number
  tempoExcedenteMin: number
  valorEstimado: string
}

// ── Business Rules ─────────────────────────────

export const TEMPO_LIVRE_MINUTOS = 300 // 5 horas — Lei 11.442/2007 Art. 11
export const VALOR_HORA_POR_TON = 2.41  // R$/ton/hora

export function calcularValorEspera(minutos_total: number, peso_ton: number): number {
  // Se passou do tempo livre (300min), cobra o tempo TOTAL de espera
  if (minutos_total <= TEMPO_LIVRE_MINUTOS) return 0
  return (minutos_total / 60) * peso_ton * VALOR_HORA_POR_TON
}
