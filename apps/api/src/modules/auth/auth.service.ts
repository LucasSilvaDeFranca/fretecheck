import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../../prisma/prisma.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { AuthTokens, AuthUserResponse, LoginResponse, JwtPayload, Role } from '@fretecheck/types'
import { isValidCpf } from '@fretecheck/validators'
import { EmailService } from '../email/email.service'
import { CacheService } from '../cache/cache.service'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private email: EmailService,
    private cache: CacheService,
  ) {}

  async register(dto: RegisterDto): Promise<{ message: string }> {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Informe email ou telefone')
    }

    // Validar CPF se fornecido
    if (dto.cpf) {
      const cleanCpf = dto.cpf.replace(/\D/g, '')
      if (!isValidCpf(cleanCpf)) {
        throw new BadRequestException('CPF inválido')
      }
      const existingCpf = await this.prisma.user.findUnique({ where: { cpf: cleanCpf } })
      if (existingCpf) throw new ConflictException('CPF já cadastrado')
    }

    if (dto.email) {
      const existingEmail = await this.prisma.user.findUnique({ where: { email: dto.email } })
      if (existingEmail) throw new ConflictException('Email já cadastrado')
    }

    if (dto.phone) {
      const existingPhone = await this.prisma.user.findUnique({ where: { phone: dto.phone } })
      if (existingPhone) throw new ConflictException('Telefone já cadastrado')
    }

    const passwordHash = dto.password ? await bcrypt.hash(dto.password, 10) : null

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        cpf: dto.cpf ? dto.cpf.replace(/\D/g, '') : undefined,
        passwordHash: passwordHash ?? undefined,
        role: (dto.role ?? 'MOTORISTA') as never,
        empresaId: dto.empresaId,
      },
    })

    // Fire-and-forget
    this.prisma.auditLog.create({
      data: { action: 'auth.register', resource: 'users', resourceId: user.id, userId: user.id },
    }).catch(() => {})

    // Gerar token de confirmação (1h) e enviar email de boas-vindas
    if (dto.email) {
      const secret = this.config.getOrThrow<string>('JWT_SECRET')
      const confirmToken = this.jwt.sign(
        { sub: user.id, purpose: 'email-confirm' },
        { secret, expiresIn: '1h' },
      )
      this.email.sendWelcome(dto.email, dto.name, confirmToken).catch(() => {})
    }

    return { message: 'Conta criada com sucesso! Verifique seu email para ativar sua conta.' }
  }

  async confirmEmail(token: string): Promise<{ message: string }> {
    try {
      const secret = this.config.getOrThrow<string>('JWT_SECRET')
      const payload = this.jwt.verify<{ sub: string; purpose: string }>(token, { secret })

      if (payload.purpose !== 'email-confirm') {
        throw new BadRequestException('Token inválido')
      }

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } })
      if (!user) throw new BadRequestException('Usuário não encontrado')

      if (user.emailVerifiedAt) {
        return { message: 'Email já confirmado. Faça login normalmente.' }
      }

      await this.prisma.user.update({
        where: { id: payload.sub },
        data: { emailVerifiedAt: new Date() },
      })

      return { message: 'Email confirmado com sucesso! Agora você pode fazer login.' }
    } catch (err) {
      if (err instanceof BadRequestException) throw err
      throw new BadRequestException('Link de confirmação inválido ou expirado. Faça um novo cadastro.')
    }
  }

  async login(dto: LoginDto): Promise<LoginResponse> {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Informe email ou telefone')
    }

    const user = await this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [
          dto.email ? { email: dto.email } : {},
          dto.phone ? { phone: dto.phone } : {},
        ],
      },
    })

    if (!user) throw new UnauthorizedException('Credenciais inválidas')

    // Verificar se email foi confirmado
    if (user.email && !user.emailVerifiedAt) {
      throw new UnauthorizedException('Confirme seu email antes de fazer login. Verifique sua caixa de entrada.')
    }

    // Verificar senha
    if (dto.password) {
      if (!user.passwordHash) {
        throw new UnauthorizedException('Este usuário não usa senha. Faça login via WhatsApp.')
      }
      const valid = await bcrypt.compare(dto.password, user.passwordHash)
      if (!valid) throw new UnauthorizedException('Credenciais inválidas')
    } else {
      throw new UnauthorizedException('Informe sua senha ou use o login por código enviado ao email')
    }

    const tokens = this.generateTokens({
      sub: user.id,
      role: user.role as unknown as Role,
      empresaId: user.empresaId ?? undefined,
    })

    // Fire-and-forget: update + auditLog em paralelo, não bloqueia o response
    Promise.all([
      this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
      this.prisma.auditLog.create({ data: { action: 'auth.login', resource: 'users', resourceId: user.id, userId: user.id } }),
    ]).catch(() => {})

    return {
      user: this.toUserResponse(user),
      tokens,
    }
  }

  async sendEmailOtp(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email, deletedAt: null } })
    if (!user) throw new UnauthorizedException('Email não cadastrado')

    // Verificar se email foi confirmado
    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException('Confirme seu email antes de fazer login. Verifique sua caixa de entrada.')
    }

    const code = Math.floor(100_000 + Math.random() * 900_000).toString()
    const ttl = this.config.get<number>('OTP_TTL_SECONDS', 300)

    await this.cache.set(`otp:${email}`, code, ttl)

    await this.email.sendOtp(email, code)

    return { message: 'Código enviado para o seu email' }
  }

  async verifyEmailOtp(email: string, code: string): Promise<LoginResponse> {
    const stored = await this.cache.get<string>(`otp:${email}`)

    if (!stored) throw new UnauthorizedException('Código não encontrado ou expirado')
    if (stored !== code) throw new UnauthorizedException('Código inválido')

    await this.cache.del(`otp:${email}`)

    const user = await this.prisma.user.findUnique({ where: { email, deletedAt: null } })
    if (!user) throw new UnauthorizedException('Usuário não encontrado')

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    const tokens = this.generateTokens({
      sub: user.id,
      role: user.role as unknown as Role,
      empresaId: user.empresaId ?? undefined,
    })

    return {
      user: this.toUserResponse(user),
      tokens,
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = this.jwt.verify<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      })

      return this.generateTokens({ sub: payload.sub, role: payload.role, empresaId: payload.empresaId })
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado')
    }
  }

  private generateTokens(payload: Omit<JwtPayload, 'iat' | 'exp'>): AuthTokens {
    const secret = this.config.getOrThrow<string>('JWT_SECRET')
    const expiresIn = this.config.get<string>('JWT_EXPIRATION', '15m')
    const refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRATION', '7d')

    const accessToken = this.jwt.sign(payload, { secret, expiresIn })
    const refreshToken = this.jwt.sign(payload, { secret, expiresIn: refreshExpiresIn })

    const seconds = expiresIn.endsWith('m')
      ? parseInt(expiresIn) * 60
      : expiresIn.endsWith('h')
        ? parseInt(expiresIn) * 3600
        : parseInt(expiresIn)

    return { accessToken, refreshToken, expiresIn: seconds }
  }

  private toUserResponse(user: {
    id: string
    name: string
    email: string | null
    phone: string | null
    role: string
    empresaId: string | null
    whatsappVerified: boolean
  }): AuthUserResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email ?? undefined,
      phone: user.phone ?? undefined,
      role: user.role as Role,
      empresaId: user.empresaId ?? undefined,
      whatsappVerified: user.whatsappVerified,
    }
  }
}
