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

// Armazenamento em memória de OTPs (produção: usar Redis)
const otpStore = new Map<string, { code: string; expiresAt: Date }>()

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private email: EmailService,
  ) {}

  async register(dto: RegisterDto): Promise<LoginResponse> {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Informe email ou telefone')
    }

    // Validar CPF se fornecido
    if (dto.cpf) {
      const cleanCpf = dto.cpf.replace(/\D/g, '')
      if (!isValidCpf(cleanCpf)) {
        throw new BadRequestException('CPF inválido')
      }
      // Verificar unicidade do CPF
      const existingCpf = await this.prisma.user.findUnique({ where: { cpf: cleanCpf } })
      if (existingCpf) throw new ConflictException('CPF já cadastrado')
    }

    // Verificar unicidade do email
    if (dto.email) {
      const existingEmail = await this.prisma.user.findUnique({ where: { email: dto.email } })
      if (existingEmail) throw new ConflictException('Email já cadastrado')
    }

    // Verificar unicidade do telefone
    if (dto.phone) {
      const existingPhone = await this.prisma.user.findUnique({ where: { phone: dto.phone } })
      if (existingPhone) throw new ConflictException('Telefone já cadastrado')
    }

    const passwordHash = dto.password ? await bcrypt.hash(dto.password, 12) : null

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

    const tokens = this.generateTokens({
      sub: user.id,
      role: user.role as unknown as Role,
      empresaId: user.empresaId ?? undefined,
    })

    await this.prisma.auditLog.create({
      data: {
        action: 'auth.register',
        resource: 'users',
        resourceId: user.id,
        userId: user.id,
      },
    })

    // Enviar email de boas-vindas (fire-and-forget)
    if (dto.email) {
      this.email.sendWelcome(dto.email, dto.name).catch(() => {})
    }

    return {
      user: this.toUserResponse(user),
      tokens,
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

    // Verificar senha (se fornecida)
    if (dto.password) {
      if (!user.passwordHash) {
        throw new UnauthorizedException('Este usuário não usa senha. Faça login via WhatsApp.')
      }
      const valid = await bcrypt.compare(dto.password, user.passwordHash)
      if (!valid) throw new UnauthorizedException('Credenciais inválidas')
    } else {
      // Sem senha fornecida — direcionar para login via código OTP
      throw new UnauthorizedException('Informe sua senha ou use o login por código enviado ao email')
    }

    const tokens = this.generateTokens({
      sub: user.id,
      role: user.role as unknown as Role,
      empresaId: user.empresaId ?? undefined,
    })

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    await this.prisma.auditLog.create({
      data: {
        action: 'auth.login',
        resource: 'users',
        resourceId: user.id,
        userId: user.id,
      },
    })

    return {
      user: this.toUserResponse(user),
      tokens,
    }
  }

  async sendEmailOtp(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email, deletedAt: null } })
    if (!user) throw new UnauthorizedException('Email não cadastrado')

    const code = Math.floor(100_000 + Math.random() * 900_000).toString()
    const ttl = this.config.get<number>('OTP_TTL_SECONDS', 300)
    const expiresAt = new Date(Date.now() + ttl * 1000)

    otpStore.set(email, { code, expiresAt })

    await this.email.sendOtp(email, code)

    return { message: 'Código enviado para o seu email' }
  }

  async verifyEmailOtp(email: string, code: string): Promise<LoginResponse> {
    const stored = otpStore.get(email)

    if (!stored) throw new UnauthorizedException('Código não encontrado ou expirado')
    if (stored.expiresAt < new Date()) {
      otpStore.delete(email)
      throw new UnauthorizedException('Código expirado')
    }
    if (stored.code !== code) throw new UnauthorizedException('Código inválido')

    otpStore.delete(email)

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

    // Converter expiresIn para segundos
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
