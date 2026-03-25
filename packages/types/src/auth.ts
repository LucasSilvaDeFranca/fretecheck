import { Role } from './enums'

// ── Requests ──────────────────────────────────

export interface RegisterDto {
  name: string
  email?: string
  phone?: string // E.164: +5511999999999
  cpf?: string
  password?: string
  role?: Role
  empresaId?: string
}

export interface LoginDto {
  email?: string
  phone?: string
  password?: string
}

export interface WhatsappVerifyDto {
  phone: string
  code: string // OTP 6 dígitos
}

export interface RefreshTokenDto {
  refreshToken: string
}

// ── Responses ─────────────────────────────────

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number // segundos
}

export interface AuthUserResponse {
  id: string
  name: string
  email?: string
  phone?: string
  role: Role
  empresaId?: string
  whatsappVerified: boolean
}

export interface LoginResponse {
  user: AuthUserResponse
  tokens: AuthTokens
}

// ── JWT Payload ────────────────────────────────

export interface JwtPayload {
  sub: string // userId
  role: Role
  empresaId?: string
  iat?: number
  exp?: number
}
