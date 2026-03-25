import { TituloStatus } from './enums'

export interface CreateTituloDto {
  checkinIds: string[]   // Deve ter mesmo causadorCnpj
  vencimento: string     // ISO 8601
}

export interface ContestarTituloDto {
  motivo: string
  evidenciaUrls?: string[]
}

export interface TituloResponse {
  id: string
  numero: string
  status: TituloStatus
  causadorCnpj: string
  causadorNome: string
  valorTotal: string
  taxaPlataforma: string
  pdfUrl?: string
  vencimento: string
  emitidoAt: string
  empresaId: string
  items: TituloItemResponse[]
}

export interface TituloItemResponse {
  id: string
  checkinId: string
  valor: string
}
