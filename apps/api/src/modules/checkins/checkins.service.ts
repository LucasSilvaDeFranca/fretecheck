import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateCheckinDto } from './dto/create-checkin.dto'
import { CreateApontamentoDto } from './dto/create-apontamento.dto'
import { CheckoutDto } from './dto/checkout.dto'
import { JwtPayload, TEMPO_LIVRE_MINUTOS, calcularValorEspera } from '@fretecheck/types'
import { isValidCnpj } from '@fretecheck/validators'
import { WebhooksService } from '../webhooks/webhooks.service'
import { CacheService } from '../cache/cache.service'

@Injectable()
export class CheckinsService {
  private readonly logger = new Logger(CheckinsService.name)

  constructor(
    private prisma: PrismaService,
    private webhooks: WebhooksService,
    private cache: CacheService,
  ) {}

  async create(dto: CreateCheckinDto, user: JwtPayload) {
    // Regra: não pode ter check-in aberto
    const aberto = await this.prisma.checkin.findFirst({
      where: {
        motoristaId: user.sub,
        status: { in: ['AWAITING_APPOINTMENT', 'AWAITING_CHECKOUT'] },
      },
    })
    if (aberto) {
      throw new ConflictException('Você já possui um check-in em aberto. Finalize-o antes de iniciar outro.')
    }

    // Buscar ou criar veículo pela placa
    const placa = dto.placa.replace(/[-\s]/g, '').toUpperCase()
    let veiculo = await this.prisma.veiculo.findUnique({ where: { placa } })

    if (!veiculo) {
      veiculo = await this.prisma.veiculo.create({
        data: {
          placa,
          tipo:          'caminhao',
          pesoToneladas: dto.capacidadeCargaTon,
          marca:         dto.marca || null,
          modelo:        dto.modelo || null,
        },
      })
      this.logger.log(`Veículo criado: ${placa} (${dto.marca ?? ''} ${dto.modelo ?? ''})`)
    } else if (dto.marca || dto.modelo) {
      // Atualizar marca/modelo se informados
      veiculo = await this.prisma.veiculo.update({
        where: { placa },
        data: {
          ...(dto.marca ? { marca: dto.marca } : {}),
          ...(dto.modelo ? { modelo: dto.modelo } : {}),
        },
      })
    }

    const checkin = await this.prisma.checkin.create({
      data: {
        motoristaId: user.sub,
        veiculoId: veiculo.id,
        terminalId: dto.terminalId,
        tipoOperacao: dto.tipoOperacao as never,
        docNumero: dto.docNumero as never,
        docUrl: dto.docUrl as never,
        capacidadeCargaTon: dto.capacidadeCargaTon,
        arrivedLat: dto.lat,
        arrivedLng: dto.lng,
        arrivedAccuracy: dto.accuracy,
        arrivedPhotoUrl: dto.photoUrl,
        cteNumero: dto.cteNumero,
        cteChave: dto.cteChave,
        observacoes: dto.observacoes,
      } as never,
      include: {
        motorista: { select: { id: true, name: true, phone: true } },
        veiculo: { select: { placa: true } },
        terminal: { select: { id: true, nome: true } },
      },
    })

    await this.prisma.auditLog.create({
      data: {
        action: 'checkin.created',
        resource: 'checkins',
        resourceId: checkin.id,
        userId: user.sub,
        payload: { placa, lat: dto.lat, lng: dto.lng },
      },
    })

    this.webhooks.dispatch('CHECKIN_CREATED', {
      checkinId: checkin.id,
      placa,
      motoristaId: user.sub,
      arrivedAt: checkin.arrivedAt,
      lat: dto.lat,
      lng: dto.lng,
    })

    await this.cache.del(`checkins:${user.sub}:*`)
    return this.formatCheckin(checkin)
  }

  async findAll(userId: string, page = 1, limit = 20) {
    const cacheKey = `checkins:${userId}:${page}:${limit}`
    const cached = await this.cache.get(cacheKey)
    if (cached) return cached

    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      (this.prisma.checkin as any).findMany({
        where: { motoristaId: userId },
        orderBy: { arrivedAt: 'desc' },
        skip,
        take: limit,
        include: {
          motorista: { select: { id: true, name: true } },
          veiculo: { select: { placa: true } },
          terminal: { select: { id: true, nome: true } },
          apontamentos: true,
          certificado: { select: { id: true, numero: true } },
        },
      }) as Promise<any[]>,
      this.prisma.checkin.count({ where: { motoristaId: userId } }),
    ])

    const result = {
      data: data.map((c: any) => this.formatCheckin(c)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }

    await this.cache.set(cacheKey, result, 30) // 30s cache
    return result
  }

  async findOne(id: string, user: JwtPayload) {
    const cacheKey = `checkin:${id}`
    const cached = await this.cache.get<any>(cacheKey)
    if (cached) {
      if (cached.motoristaId !== user.sub && user.role !== 'PLATFORM_ADMIN') {
        throw new ForbiddenException('Acesso negado')
      }
      return cached.formatted
    }

    const checkin = await (this.prisma.checkin as any).findUnique({
      where: { id },
      include: {
        motorista: { select: { id: true, name: true } },
        veiculo: { select: { placa: true } },
        terminal: { select: { id: true, nome: true } },
        apontamentos: true,
        certificado: { select: { id: true, numero: true } },
      },
    }) as any

    if (!checkin) throw new NotFoundException('Check-in não encontrado')

    if (checkin.motoristaId !== user.sub && user.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Acesso negado')
    }

    const formatted = this.formatCheckin(checkin)
    await this.cache.set(cacheKey, { motoristaId: checkin.motoristaId, formatted }, 30)
    return formatted
  }

  async createApontamento(checkinId: string, dto: CreateApontamentoDto, user: JwtPayload) {
    const checkin = await this.getCheckinOrFail(checkinId)

    if (checkin.motoristaId !== user.sub) throw new ForbiddenException('Acesso negado')
    if (checkin.status !== 'AWAITING_APPOINTMENT' && checkin.status !== 'AWAITING_CHECKOUT') {
      throw new ConflictException(`Check-in está em status ${checkin.status}. Apontamento não permitido.`)
    }

    // Validar CNPJ se informado
    const cnpjLimpo = dto.causadorCnpj ? dto.causadorCnpj.replace(/\D/g, '') : ''
    if (cnpjLimpo && !isValidCnpj(cnpjLimpo)) {
      throw new BadRequestException('CNPJ do causador inválido')
    }

    const [apontamento] = await this.prisma.$transaction([
      this.prisma.apontamento.create({
        data: {
          checkinId,
          causa: dto.causa as never,
          causadorCnpj: cnpjLimpo,
          causadorNome: dto.causadorNome,
          descricao: dto.descricao,
          evidenciaUrls: dto.evidenciaUrls ?? [],
        },
      }),
      this.prisma.checkin.update({
        where: { id: checkinId },
        data: { status: 'AWAITING_CHECKOUT' },
      }),
    ])

    // Persistir originais via raw SQL — o campo foi adicionado ao DB mas o cliente Prisma
    // gerado ainda não o conhece (regenerar com `prisma generate` após restart do servidor)
    if (dto.evidenciaOriginaisUrls?.length) {
      await this.prisma.$executeRawUnsafe(
        `UPDATE apontamentos SET "evidenciaOriginaisUrls" = $1::text[] WHERE id = $2`,
        `{${dto.evidenciaOriginaisUrls.map((u) => `"${u.replace(/"/g, '\\"')}"`).join(',')}}`,
        apontamento.id,
      )
    }

    await this.prisma.auditLog.create({
      data: {
        action: 'apontamento.created',
        resource: 'apontamentos',
        resourceId: apontamento.id,
        userId: user.sub,
        payload: { causa: dto.causa, causadorCnpj: cnpjLimpo },
      },
    })

    await this.cache.del(`checkin:${checkinId}`)
    await this.cache.del(`checkins:${user.sub}:*`)
    return apontamento
  }

  async deleteApontamento(apontamentoId: string, user: JwtPayload) {
    const apontamento = await this.prisma.apontamento.findUnique({
      where: { id: apontamentoId },
      include: { checkin: true },
    })

    if (!apontamento) throw new NotFoundException('Apontamento não encontrado')
    if (apontamento.checkin.motoristaId !== user.sub) throw new ForbiddenException('Acesso negado')

    // Não permitir excluir se já tem certificado
    if (apontamento.checkin.status === 'CERTIFICATE_ISSUED' || apontamento.checkin.status === 'TITLE_GENERATED') {
      throw new ConflictException('Não é possível excluir apontamento após emissão do certificado')
    }

    await this.prisma.apontamento.delete({ where: { id: apontamentoId } })

    // Se era o último apontamento, voltar status para AWAITING_APPOINTMENT
    const remaining = await this.prisma.apontamento.count({ where: { checkinId: apontamento.checkinId } })
    if (remaining === 0) {
      await this.prisma.checkin.update({
        where: { id: apontamento.checkinId },
        data: { status: 'AWAITING_APPOINTMENT' },
      })
    }

    await this.cache.del(`checkin:${apontamento.checkinId}`)
    await this.cache.del(`checkins:${apontamento.checkin.motoristaId}:*`)
    return { message: 'Apontamento excluído' }
  }

  async checkout(checkinId: string, dto: CheckoutDto, user: JwtPayload) {
    const checkin = await this.getCheckinOrFail(checkinId, true)

    if (checkin.motoristaId !== user.sub) throw new ForbiddenException('Acesso negado')
    if (checkin.status !== 'AWAITING_CHECKOUT') {
      throw new ConflictException(`Check-in deve estar em AWAITING_CHECKOUT. Status atual: ${checkin.status}`)
    }

    const now = new Date()
    const arrivedAt = new Date(checkin.arrivedAt)
    const tempoEsperaMin = Math.floor((now.getTime() - arrivedAt.getTime()) / 60_000)
    const tempoExcedenteMin = Math.max(0, tempoEsperaMin - TEMPO_LIVRE_MINUTOS)

    // Calcular valor usando capacidade de carga informada no check-in
    const pesoTon = Number((checkin as { capacidadeCargaTon?: unknown }).capacidadeCargaTon ?? 5)
    const valorEstimado = calcularValorEspera(tempoEsperaMin, pesoTon)

    const updated = await (this.prisma.checkin as any).update({
      where: { id: checkinId },
      data: {
        departedAt: now,
        departedLat: dto.lat,
        departedLng: dto.lng,
        departedAccuracy: dto.accuracy,
        tempoEsperaMin,
        tempoExcedenteMin,
        valorEstimado,
        status: 'AWAITING_CHECKOUT',
      },
      include: {
        motorista: { select: { id: true, name: true, phone: true } },
        veiculo: { select: { placa: true } },
        terminal: { select: { id: true, nome: true } },
        apontamentos: true,
        certificado: { select: { id: true, numero: true } },
      },
    }) as any

    await this.prisma.auditLog.create({
      data: {
        action: 'checkout.completed',
        resource: 'checkins',
        resourceId: checkinId,
        userId: user.sub,
        payload: { tempoEsperaMin, tempoExcedenteMin, valorEstimado: valorEstimado.toFixed(2) },
      },
    })

    this.webhooks.dispatch('CHECKOUT_COMPLETED', {
      checkinId,
      motoristaId: user.sub,
      tempoEsperaMin,
      tempoExcedenteMin,
      valorEstimado: valorEstimado.toFixed(2),
      departedAt: now,
    })

    await this.cache.del(`checkin:${checkinId}`)
    await this.cache.del(`checkins:${user.sub}:*`)
    return this.formatCheckin(updated)
  }

  async findVeiculoByPlaca(placa: string) {
    const placaLimpa = placa.replace(/[-\s]/g, '').toUpperCase()
    const veiculo = await this.prisma.veiculo.findUnique({
      where: { placa: placaLimpa },
      select: { placa: true, marca: true, modelo: true },
    })
    if (!veiculo) throw new NotFoundException('Veículo não encontrado')
    return veiculo
  }

  private async getCheckinOrFail(id: string, _includeVeiculo = false) {
    const checkin = await (this.prisma.checkin as any).findUnique({
      where: { id },
      include: {
        apontamentos: true,
      },
    }) as any
    if (!checkin) throw new NotFoundException('Check-in não encontrado')
    return checkin
  }

  private formatCheckin(c: {
    id: string
    status: string
    arrivedAt: Date
    arrivedLat: Prisma.Decimal
    arrivedLng: Prisma.Decimal
    departedAt?: Date | null
    tempoEsperaMin?: number | null
    tempoExcedenteMin?: number | null
    valorEstimado?: Prisma.Decimal | null
    motorista: { id: string; name: string }
    veiculo: { placa: string } | null
    terminal?: { id: string; nome: string } | null
    apontamentos?: unknown
    certificado?: { id: string; numero: string } | null
  }) {
    return {
      id: c.id,
      status: c.status,
      arrivedAt: c.arrivedAt.toISOString(),
      arrivedLat: Number(c.arrivedLat),
      arrivedLng: Number(c.arrivedLng),
      placa: c.veiculo?.placa ?? '',
      terminalId: c.terminal?.id,
      terminalNome: c.terminal?.nome,
      departedAt: c.departedAt?.toISOString(),
      tempoEsperaMin: c.tempoEsperaMin,
      tempoExcedenteMin: c.tempoExcedenteMin,
      valorEstimado: c.valorEstimado ? c.valorEstimado.toFixed(2) : undefined,
      apontamentos: c.apontamentos,
      certificadoId: (c.certificado as { id: string } | null)?.id,
      certificadoNumero: (c.certificado as { numero: string } | null)?.numero,
      motoristaId: c.motorista.id,
      motoristaNome: c.motorista.name,
    }
  }
}
