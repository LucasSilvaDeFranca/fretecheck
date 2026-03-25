import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { JwtPayload, Role } from '@fretecheck/types'

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cpf: true,
        role: true,
        avatarUrl: true,
        whatsappVerified: true,
        empresaId: true,
        empresa: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
        veiculo: { select: { id: true, placa: true, tipo: true } },
        createdAt: true,
      },
    })

    if (!user) throw new NotFoundException('Usuário não encontrado')
    return user
  }

  async findAll(requestingUser: JwtPayload, page = 1, limit = 20) {
    if (requestingUser.role !== Role.PLATFORM_ADMIN) {
      throw new ForbiddenException('Apenas administradores podem listar usuários')
    }

    const skip = (page - 1) * limit
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { deletedAt: null },
        select: {
          id: true, name: true, email: true, phone: true,
          role: true, whatsappVerified: true, empresaId: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where: { deletedAt: null } }),
    ])

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }
  }

  async softDelete(userId: string, requestingUser: JwtPayload) {
    // Usuário pode deletar a si mesmo, admin pode deletar qualquer um
    if (userId !== requestingUser.sub && requestingUser.role !== Role.PLATFORM_ADMIN) {
      throw new ForbiddenException('Acesso negado')
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    })

    await this.prisma.auditLog.create({
      data: {
        action: 'user.deleted',
        resource: 'users',
        resourceId: userId,
        userId: requestingUser.sub,
      },
    })

    return { message: 'Conta removida com sucesso (LGPD)' }
  }
}
