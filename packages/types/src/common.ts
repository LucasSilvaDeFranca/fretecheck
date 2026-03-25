// Resposta padrão paginada
export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Resposta padrão de erro
export interface ApiError {
  statusCode: number
  message: string | string[]
  error: string
  timestamp: string
  path: string
}

// Query params comuns
export interface PaginationQuery {
  page?: number
  limit?: number
}

export interface DateRangeQuery {
  startDate?: string
  endDate?: string
}

// Endereço
export interface Endereco {
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  estado: string // UF: SP, RJ, etc.
  cep: string
  lat?: number
  lng?: number
}
