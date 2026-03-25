export interface TerminalResponse {
  id: string
  nome: string
  cnpj?: string
  tipo: string
  lat: number
  lng: number
  score: number
  scoreCalcAt?: string
  endereco: TerminalEndereco
}

export interface TerminalEndereco {
  logradouro: string
  numero: string
  bairro: string
  cidade: string
  estado: string
  cep: string
}

export interface TerminalStatsResponse {
  terminalId: string
  periodoInicio: string
  periodoFim: string
  totalCheckins: number
  mediaEsperaMin: number
  mediaExcedenteMin: number
  score: number
  overbookingAlertas: number
}

export interface HeatmapPoint {
  lat: number
  lng: number
  weight: number // 0-1 baseado no score
  terminalId: string
  terminalNome: string
  score: number
}

// Regra de negócio: score público
export const SCORE_BASE = 100
export const SCORE_COEF = 10  // pontos por hora de excedente médio
export const OVERBOOKING_VEICULOS_MIN = 10
export const OVERBOOKING_TEMPO_MIN = 8 * 60  // 8 horas em minutos

export function calcularScore(mediaExcedenteMin30d: number): number {
  const score = SCORE_BASE - (mediaExcedenteMin30d / 60) * SCORE_COEF
  return Math.max(0, Math.min(100, Math.round(score)))
}
