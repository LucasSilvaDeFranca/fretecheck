import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { JwtPayload } from '@fretecheck/types'

export class CreateTituloDto {
  checkinIds!: string[]
  vencimento!: string
}

export class ContestarTituloDto {
  motivo!: string
  evidenciaUrls?: string[]
}

const TAXA_PLATAFORMA_DEFAULT = 10 // R$ 10 por título (Sprint 8: integrar Asaas)

@Injectable()
export class TitulosService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTituloDto, user: JwtPayload) {
    // Verificar que todos os check-ins pertencem à empresa do usuário
    // e estão com status CERTIFICATE_ISSUED
    const checkins = await this.prisma.checkin.findMany({
      where: { id: { in: dto.checkinIds } },
      include: { apontamento: true, certificado: true },
    })

    if (checkins.length !== dto.checkinIds.length) {
      throw new NotFoundException('Um ou mais check-ins não foram encontrados')
    }

    const naoEmitidos = checkins.filter((c) => c.status !== 'CERTIFICATE_ISSUED')
    if (naoEmitidos.length > 0) {
      throw new BadRequestException(
        `Check-ins sem certificado emitido: ${naoEmitidos.map((c) => c.id).join(', ')}`,
      )
    }

    // Verificar que todos têm o mesmo CNPJ causador
    const cnpjs = [...new Set(checkins.map((c) => c.apontamento?.causadorCnpj).filter(Boolean))]
    if (cnpjs.length !== 1) {
      throw new BadRequestException('Todos os check-ins devem ter o mesmo CNPJ causador')
    }

    if (!user.empresaId) throw new ForbiddenException('Apenas transportadoras podem emitir títulos')

    const causadorCnpj = cnpjs[0]!
    const causadorNome = checkins[0].apontamento!.causadorNome
    const valorTotal = checkins.reduce((sum, c) => sum + Number(c.valorEstimado ?? 0), 0)

    // Gerar número sequencial (produção: usar sequência no banco)
    const count = await this.prisma.titulo.count()
    const numero = `TIT-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`

    const titulo = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const t = await tx.titulo.create({
        data: {
          numero,
          causadorCnpj,
          causadorNome,
          valorTotal,
          taxaPlataforma: TAXA_PLATAFORMA_DEFAULT,
          vencimento: new Date(dto.vencimento),
          empresaId: user.empresaId!,
          items: {
            create: checkins.map((c) => ({
              checkinId: c.id,
              valor: c.valorEstimado ?? 0,
            })),
          },
        },
        include: { items: true },
      })

      // Atualizar status dos check-ins
      await tx.checkin.updateMany({
        where: { id: { in: dto.checkinIds } },
        data: { status: 'TITLE_GENERATED' },
      })

      return t
    })

    await this.prisma.auditLog.create({
      data: {
        action: 'titulo.gerado',
        resource: 'titulos',
        resourceId: titulo.id,
        userId: user.sub,
        payload: { numero, causadorCnpj, valorTotal },
      },
    })

    return titulo
  }

  async findAll(user: JwtPayload, page = 1, limit = 20) {
    if (!user.empresaId) throw new ForbiddenException('Apenas transportadoras podem ver títulos')

    const skip = (page - 1) * limit
    const [data, total] = await Promise.all([
      this.prisma.titulo.findMany({
        where: { empresaId: user.empresaId },
        orderBy: { emitidoAt: 'desc' },
        skip,
        take: limit,
        include: { items: { select: { id: true, checkinId: true, valor: true } } },
      }),
      this.prisma.titulo.count({ where: { empresaId: user.empresaId } }),
    ])

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  }

  async findOne(id: string, user: JwtPayload) {
    const titulo = await this.prisma.titulo.findUnique({
      where: { id },
      include: {
        items: { include: { checkin: { include: { apontamento: true } } } },
        contestacao: true,
      },
    })

    if (!titulo) throw new NotFoundException('Título não encontrado')
    if (titulo.empresaId !== user.empresaId && user.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Acesso negado')
    }

    return titulo
  }

  async contestar(id: string, dto: ContestarTituloDto, _user: JwtPayload) {
    const titulo = await this.prisma.titulo.findUnique({ where: { id } })
    if (!titulo) throw new NotFoundException('Título não encontrado')

    if (['CANCELLED', 'PAID'].includes(titulo.status)) {
      throw new BadRequestException(`Não é possível contestar título com status ${titulo.status}`)
    }

    const [contestacao] = await this.prisma.$transaction([
      this.prisma.contestacao.create({
        data: {
          tituloId: id,
          motivo: dto.motivo,
          evidenciaUrls: dto.evidenciaUrls ?? [],
        },
      }),
      this.prisma.titulo.update({
        where: { id },
        data: { status: 'CONTESTED' },
      }),
    ])

    return contestacao
  }
}
