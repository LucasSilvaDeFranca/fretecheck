import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { JwtPayload } from '@fretecheck/types'
import { PrismaService } from '../../prisma/prisma.service'
import { CacheService } from '../cache/cache.service'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
    private cache: CacheService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    })
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // Cache user lookup por 5min (chamado a cada request autenticado)
    const cacheKey = `jwt:${payload.sub}`
    const cached = await this.cache.get<JwtPayload>(cacheKey)
    if (cached) return cached

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub, deletedAt: null },
      select: { id: true, role: true, empresaId: true },
    })

    if (!user) throw new UnauthorizedException('Token inválido')

    const result: JwtPayload = {
      sub: user.id,
      role: user.role as JwtPayload['role'],
      empresaId: user.empresaId ?? undefined,
    }

    await this.cache.set(cacheKey, result, 300) // 5min
    return result
  }
}
