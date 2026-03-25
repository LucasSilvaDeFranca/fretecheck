import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { isValidPlaca } from '@fretecheck/validators'

export interface VeiculoInfo {
  placa: string
  tipo: string
  marca: string
  modelo: string
  ano: number
  cor: string
  chassi?: string
  renavam?: string
  pesoToneladas: number   // Peso Bruto Total (PBT) em toneladas
  proprietarioCpfCnpj?: string
  proprietarioNome?: string
  fonte: 'brasil-id' | 'mock'
}

@Injectable()
export class BrasilIdService {
  private readonly logger = new Logger(BrasilIdService.name)
  private readonly apiKey: string | undefined
  private readonly baseUrl: string

  constructor(private config: ConfigService) {
    this.apiKey  = this.config.get<string>('BRASIL_ID_API_KEY')
    this.baseUrl = this.config.get<string>('BRASIL_ID_BASE_URL', 'https://brasilid.com.br/api/v1')
  }

  async consultarPlaca(placa: string): Promise<VeiculoInfo> {
    const placaLimpa = placa.replace(/[-\s]/g, '').toUpperCase()

    if (!isValidPlaca(placaLimpa)) {
      throw new BadRequestException(`Placa inválida: ${placa}`)
    }

    // Em dev/staging sem API key: retornar mock realista
    if (!this.apiKey || this.config.get('NODE_ENV') === 'test') {
      return this.mockVeiculo(placaLimpa)
    }

    try {
      const response = await fetch(`${this.baseUrl}/veiculos/${placaLimpa}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5_000), // timeout 5s
      })

      if (!response.ok) {
        if (response.status === 404) {
          this.logger.warn(`Placa não encontrada no Brasil-ID: ${placaLimpa}`)
          return this.mockVeiculo(placaLimpa) // Fallback gracioso
        }
        throw new Error(`Brasil-ID error: ${response.status}`)
      }

      const data = await response.json() as BrasilIdResponse
      return this.mapResponse(data, placaLimpa)

    } catch (err) {
      this.logger.error(`Falha na consulta Brasil-ID para placa ${placaLimpa}: ${(err as Error).message}`)
      // Fallback gracioso — não bloqueia o check-in
      return this.mockVeiculo(placaLimpa)
    }
  }

  private mapResponse(data: BrasilIdResponse, placa: string): VeiculoInfo {
    // Converter PBT de kg para toneladas (Brasil-ID retorna em kg)
    const pesoToneladas = data.pbt_kg ? data.pbt_kg / 1000 : 0

    return {
      placa,
      tipo:   this.normalizarTipo(data.categoria ?? ''),
      marca:  data.marca ?? 'N/D',
      modelo: data.modelo ?? 'N/D',
      ano:    data.ano_fabricacao ?? new Date().getFullYear(),
      cor:    data.cor ?? 'N/D',
      chassi: data.chassi,
      renavam: data.renavam,
      pesoToneladas,
      proprietarioCpfCnpj: data.proprietario_cpf_cnpj,
      proprietarioNome:    data.proprietario_nome,
      fonte: 'brasil-id',
    }
  }

  private normalizarTipo(categoria: string): string {
    const cat = categoria.toUpperCase()
    if (cat.includes('CAMINHAO') || cat.includes('CAMINHÃO')) return 'caminhao'
    if (cat.includes('CARRETA'))    return 'carreta'
    if (cat.includes('TRUCK'))      return 'truck'
    if (cat.includes('VAN'))        return 'van'
    if (cat.includes('MOTO'))       return 'moto'
    return 'caminhao'
  }

  private mockVeiculo(placa: string): VeiculoInfo {
    // Mock determinístico baseado na placa para testes consistentes
    const isMercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(placa)
    return {
      placa,
      tipo:   'caminhao',
      marca:  'VOLKSWAGEN',
      modelo: isMercosul ? 'Constellation 25.420' : 'Constellation 19.320',
      ano:    2020,
      cor:    'BRANCO',
      pesoToneladas: 25, // PBT padrão para caminhão trucado
      fonte: 'mock',
    }
  }
}

// Formato de resposta da API Brasil-ID (estrutura aproximada)
interface BrasilIdResponse {
  placa?: string
  marca?: string
  modelo?: string
  ano_fabricacao?: number
  ano_modelo?: number
  cor?: string
  chassi?: string
  renavam?: string
  categoria?: string
  pbt_kg?: number  // Peso Bruto Total em kg
  proprietario_nome?: string
  proprietario_cpf_cnpj?: string
  situacao?: string
}
