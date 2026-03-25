import { Injectable } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { calcularScore, OVERBOOKING_VEICULOS_MIN, OVERBOOKING_TEMPO_MIN } from '@fretecheck/types'

@Injectable()
export class TerminaisService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 20, cidade?: string, estado?: string) {
    const skip = (page - 1) * limit

    const where = {
      ...(cidade ? { endereco: { path: ['cidade'], equals: cidade } } : {}),
      ...(estado ? { endereco: { path: ['estado'], equals: estado } } : {}),
    }

    const [data, total] = await Promise.all([
      this.prisma.terminal.findMany({
        where,
        orderBy: { score: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.terminal.count({ where }),
    ])

    return {
      data: data.map(this.formatTerminal),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  async findOne(id: string) {
    const terminal = await this.prisma.terminal.findUnique({ where: { id } })
    if (!terminal) return null
    return this.formatTerminal(terminal)
  }

  async getStats(id: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const checkins = await this.prisma.checkin.findMany({
      where: {
        terminalId: id,
        arrivedAt: { gte: thirtyDaysAgo },
        status: { not: 'CANCELLED' },
      },
      select: { tempoEsperaMin: true, tempoExcedenteMin: true },
    })

    const total = checkins.length
    const mediaEspera =
      total > 0 ? checkins.reduce((s: number, c) => s + (c.tempoEsperaMin ?? 0), 0) / total : 0
    const mediaExcedente =
      total > 0 ? checkins.reduce((s: number, c) => s + (c.tempoExcedenteMin ?? 0), 0) / total : 0

    const terminal = await this.prisma.terminal.findUnique({
      where: { id },
      select: { score: true, nome: true },
    })

    return {
      terminalId: id,
      terminalNome: terminal?.nome,
      periodoInicio: thirtyDaysAgo.toISOString(),
      periodoFim: new Date().toISOString(),
      totalCheckins: total,
      mediaEsperaMin: Math.round(mediaEspera),
      mediaExcedenteMin: Math.round(mediaExcedente),
      score: terminal?.score ?? 100,
    }
  }

  async getRanking(limit = 10) {
    return this.prisma.terminal.findMany({
      orderBy: { score: 'asc' }, // Piores primeiro
      take: limit,
      select: { id: true, nome: true, score: true, lat: true, lng: true },
    })
  }

  async getHeatmap() {
    const terminais = await this.prisma.terminal.findMany({
      select: { id: true, nome: true, lat: true, lng: true, score: true },
    })

    return terminais.map((t) => ({
      lat: Number(t.lat),
      lng: Number(t.lng),
      weight: (100 - t.score) / 100, // Score baixo = peso alto no heatmap
      terminalId: t.id,
      terminalNome: t.nome,
      score: t.score,
    }))
  }

  // Recalcular scores todo dia às 03:00 UTC (Sprint 9)
  @Cron('0 3 * * *')
  async recalcularScores() {
    console.log('[CRON] Recalculando scores de terminais...')

    const terminais = await this.prisma.terminal.findMany({ select: { id: true } })
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    for (const { id } of terminais) {
      const checkins = await this.prisma.checkin.findMany({
        where: {
          terminalId: id,
          arrivedAt: { gte: thirtyDaysAgo },
          status: { not: 'CANCELLED' },
          departedAt: { not: null },
        },
        select: { tempoExcedenteMin: true },
      })

      if (checkins.length === 0) continue

      const mediaExcedente =
        checkins.reduce((s: number, c) => s + (c.tempoExcedenteMin ?? 0), 0) / checkins.length

      const novoScore = calcularScore(mediaExcedente)

      await this.prisma.terminal.update({
        where: { id },
        data: { score: novoScore, scoreCalcAt: new Date() },
      })

      // Verificar overbooking
      const agora = new Date()
      const emEspera = await this.prisma.checkin.count({
        where: {
          terminalId: id,
          status: { in: ['AWAITING_APPOINTMENT', 'AWAITING_CHECKOUT'] },
          arrivedAt: {
            lte: new Date(agora.getTime() - OVERBOOKING_TEMPO_MIN * 60_000),
          },
        },
      })

      if (emEspera >= OVERBOOKING_VEICULOS_MIN) {
        console.log(`[ALERTA OVERBOOKING] Terminal ${id}: ${emEspera} veículos aguardando`)
        // TODO Sprint 9: Disparar webhook alerta.overbooking
      }
    }

    console.log(`[CRON] Scores recalculados para ${terminais.length} terminais`)
  }

  private formatTerminal(t: {
    id: string
    nome: string
    cnpj: string | null
    tipo: string
    lat: Prisma.Decimal
    lng: Prisma.Decimal
    score: number
    scoreCalcAt: Date | null
    endereco: Prisma.JsonValue
  }) {
    return {
      id: t.id,
      nome: t.nome,
      cnpj: t.cnpj,
      tipo: t.tipo,
      lat: Number(t.lat),
      lng: Number(t.lng),
      score: t.score,
      scoreCalcAt: t.scoreCalcAt?.toISOString(),
      endereco: t.endereco,
    }
  }
}
