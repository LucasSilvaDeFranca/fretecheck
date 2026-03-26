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
  fonte: 'apibrasil' | 'mock'
}

@Injectable()
export class BrasilIdService {
  private readonly logger = new Logger(BrasilIdService.name)

  constructor(private config: ConfigService) {}

  private get bearerToken() {
    return this.config.get<string>('APIBRASIL_BEARER_TOKEN') ?? ''
  }

  private get deviceToken() {
    return this.config.get<string>('APIBRASIL_DEVICE_TOKEN') ?? ''
  }

  async consultarPlaca(placa: string): Promise<VeiculoInfo> {
    const placaLimpa = placa.replace(/[-\s]/g, '').toUpperCase()

    if (!isValidPlaca(placaLimpa)) {
      throw new BadRequestException(`Placa inválida: ${placa}`)
    }

    // Sem tokens configurados: retornar mock
    if (!this.bearerToken || !this.deviceToken) {
      this.logger.warn('APIBrasil tokens não configurados — usando mock')
      return this.mockVeiculo(placaLimpa)
    }

    try {
      const response = await fetch('https://gateway.apibrasil.io/api/v2/vehicles/dados', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.bearerToken}`,
          'DeviceToken': this.deviceToken,
        },
        body: JSON.stringify({ placa: placaLimpa }),
        signal: AbortSignal.timeout(10_000),
      })

      if (!response.ok) {
        this.logger.warn(`APIBrasil retornou ${response.status} para placa ${placaLimpa}`)
        return this.mockVeiculo(placaLimpa)
      }

      const data = await response.json() as ApiBrasilResponse

      if (data.error || !data.response) {
        this.logger.warn(`APIBrasil sem dados para placa ${placaLimpa}: ${data.message ?? 'sem resposta'}`)
        return this.mockVeiculo(placaLimpa)
      }

      return this.mapResponse(data.response, placaLimpa)
    } catch (err) {
      this.logger.error(`Falha na consulta APIBrasil para placa ${placaLimpa}: ${(err as Error).message}`)
      return this.mockVeiculo(placaLimpa)
    }
  }

  private mapResponse(data: ApiBrasilVeiculo, placa: string): VeiculoInfo {
    const pesoToneladas = this.estimarPeso(data.extra?.tipo_veiculo ?? data.segmento ?? '')

    return {
      placa,
      tipo:   this.normalizarTipo(data.extra?.tipo_veiculo ?? data.segmento ?? ''),
      marca:  data.marca ?? 'N/D',
      modelo: data.modelo ?? 'N/D',
      ano:    data.ano ? parseInt(String(data.ano), 10) : new Date().getFullYear(),
      cor:    data.cor ?? 'N/D',
      chassi: data.extra?.chassi,
      pesoToneladas,
      fonte: 'apibrasil',
    }
  }

  private normalizarTipo(tipo: string): string {
    const t = tipo.toUpperCase()
    if (t.includes('CAMINHAO') || t.includes('CAMINHÃO') || t.includes('CAMINH')) return 'caminhao'
    if (t.includes('CARRETA')) return 'carreta'
    if (t.includes('REBOQUE') || t.includes('SEMI-REBOQUE')) return 'carreta'
    if (t.includes('TRUCK'))   return 'truck'
    if (t.includes('VAN') || t.includes('UTILITARIO')) return 'van'
    if (t.includes('MOTO'))    return 'moto'
    if (t.includes('ONIBUS') || t.includes('ÔNIBUS')) return 'onibus'
    return 'caminhao'
  }

  private estimarPeso(tipo: string): number {
    const t = tipo.toUpperCase()
    if (t.includes('SEMI-REBOQUE') || t.includes('CARRETA')) return 41.5
    if (t.includes('TRUCK') || t.includes('TRUCADO')) return 25
    if (t.includes('CAMINHAO') || t.includes('CAMINHÃO') || t.includes('CAMINH')) return 16
    if (t.includes('VAN') || t.includes('UTILITARIO')) return 3.5
    if (t.includes('MOTO')) return 0.3
    return 16 // padrão: caminhão toco
  }

  private mockVeiculo(placa: string): VeiculoInfo {
    return {
      placa,
      tipo:   'caminhao',
      marca:  'N/D',
      modelo: 'N/D',
      ano:    new Date().getFullYear(),
      cor:    'N/D',
      pesoToneladas: 16,
      fonte: 'mock',
    }
  }
}

// ─── APIBrasil Response Types ────────────────────────────────────────────────

interface ApiBrasilResponse {
  error?: boolean
  message?: string
  response?: ApiBrasilVeiculo
}

interface ApiBrasilVeiculo {
  placa?: string
  marca?: string
  modelo?: string
  ano?: string | number
  anoModelo?: string | number
  cor?: string
  segmento?: string
  sub_segmento?: string
  extra?: {
    chassi?: string
    renavam?: string
    tipo_veiculo?: string
    combustivel?: string
    cilindradas?: string
    cap_max_trac?: string
    municipio?: string
    uf?: string
  }
}
