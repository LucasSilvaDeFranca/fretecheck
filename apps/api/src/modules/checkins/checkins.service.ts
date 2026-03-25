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
import { BrasilIdService } from '../integrations/brasil-id/brasil-id.service'
import { WebhooksService } from '../webhooks/webhooks.service'

@Injectable()
export class CheckinsService {
  private readonly logger = new Logger(CheckinsService.name)

  constructor(
    private prisma: PrismaService,
    private brasilId: BrasilIdService,
    private webhooks: WebhooksService,
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

    // Buscar ou criar veículo — consultar Brasil-ID para dados reais
    const placa = dto.placa.replace(/[-\s]/g, '').toUpperCase()
    let veiculo = await this.prisma.veiculo.findUnique({ where: { placa } })
    if (!veiculo) {
      this.logger.log(`Consultando Brasil-ID para placa: ${placa}`)
      const veiculoInfo = await this.brasilId.consultarPlaca(placa)

      veiculo = await this.prisma.veiculo.create({
        data: {
          placa,
          tipo:           veiculoInfo.tipo,
          pesoToneladas:  veiculoInfo.pesoToneladas,
          marca:          veiculoInfo.marca,
          modelo:         veiculoInfo.modelo,
          ano:            veiculoInfo.ano,
        },
      })
      this.logger.log(`Veículo criado: ${placa} (${veiculoInfo.modelo}, ${veiculoInfo.pesoToneladas}t) — fonte: ${veiculoInfo.fonte}`)
    }

    const checkin = await this.prisma.checkin.create({
      data: {
        motoristaId: user.sub,
        veiculoId: veiculo.id,
        terminalId: dto.terminalId,
        arrivedLat: dto.lat,
        arrivedLng: dto.lng,
        arrivedAccuracy: dto.accuracy,
        arrivedPhotoUrl: dto.photoUrl,
        cteNumero: dto.cteNumero,
        cteChave: dto.cteChave,
        observacoes: dto.observacoes,
      },
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

    return this.formatCheckin(checkin)
  }

  async findAll(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      this.prisma.checkin.findMany({
        where: { motoristaId: userId },
        orderBy: { arrivedAt: 'desc' },
        skip,
        take: limit,
        include: {
          motorista: { select: { id: true, name: true } },
          veiculo: { select: { placa: true } },
          terminal: { select: { id: true, nome: true } },
          apontamento: true,
          certificado: { select: { id: true, numero: true } },
        },
      }),
      this.prisma.checkin.count({ where: { motoristaId: userId } }),
    ])

    return {
      data: data.map((c: Parameters<typeof this.formatCheckin>[0]) => this.formatCheckin(c)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  async findOne(id: string, user: JwtPayload) {
    const checkin = await this.prisma.checkin.findUnique({
      where: { id },
      include: {
        motorista: { select: { id: true, name: true } },
        veiculo: { select: { placa: true } },
        terminal: { select: { id: true, nome: true } },
        apontamento: true,
        certificado: { select: { id: true, numero: true } },
      },
    })

    if (!checkin) throw new NotFoundException('Check-in não encontrado')

    // Motorista só vê seus próprios; admin vê todos
    if (checkin.motoristaId !== user.sub && user.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Acesso negado')
    }

    return this.formatCheckin(checkin)
  }

  async createApontamento(checkinId: string, dto: CreateApontamentoDto, user: JwtPayload) {
    const checkin = await this.getCheckinOrFail(checkinId)

    if (checkin.motoristaId !== user.sub) throw new ForbiddenException('Acesso negado')
    if (checkin.status !== 'AWAITING_APPOINTMENT') {
      throw new ConflictException(`Check-in está em status ${checkin.status}. Apontamento não permitido.`)
    }
    if (checkin.apontamento) {
      throw new ConflictException('Este check-in já possui um apontamento')
    }

    // Validar CNPJ do causador
    const cnpjLimpo = dto.causadorCnpj.replace(/\D/g, '')
    if (!isValidCnpj(cnpjLimpo)) {
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

    return apontamento
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

    // Calcular valor (usa peso do veículo; se 0, usa peso mínimo de referência = 5t)
    const pesoTon = Number(checkin.veiculo?.pesoToneladas ?? 5)
    const valorEstimado = calcularValorEspera(tempoExcedenteMin, pesoTon)

    const updated = await this.prisma.checkin.update({
      where: { id: checkinId },
      data: {
        departedAt: now,
        departedLat: dto.lat,
        departedLng: dto.lng,
        departedAccuracy: dto.accuracy,
        tempoEsperaMin,
        tempoExcedenteMin,
        valorEstimado,
        status: 'AWAITING_CHECKOUT', // Permanece até certificado ser emitido (Sprint 4)
      },
      include: {
        motorista: { select: { id: true, name: true, phone: true } },
        veiculo: { select: { placa: true } },
        terminal: { select: { id: true, nome: true } },
        apontamento: true,
        certificado: { select: { id: true, numero: true } },
      },
    })

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

    return this.formatCheckin(updated)
  }

  private async getCheckinOrFail(id: string, includeVeiculo = false) {
    const checkin = await this.prisma.checkin.findUnique({
      where: { id },
      include: {
        apontamento: true,
        veiculo: includeVeiculo ? { select: { pesoToneladas: true } } : false,
      },
    })
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
    apontamento?: unknown
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
      apontamento: c.apontamento,
      certificadoId: (c.certificado as { id: string } | null)?.id,
      certificadoNumero: (c.certificado as { numero: string } | null)?.numero,
      motoristaId: c.motorista.id,
      motoristaNome: c.motorista.name,
    }
  }
}
