import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus, Res } from '@nestjs/common'
import type { FastifyReply } from 'fastify'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { OtpVerifyDto } from './dto/otp-verify.dto'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Cadastrar novo usuário' })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso' })
  @ApiResponse({ status: 409, description: 'Email ou CPF já cadastrado' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @Get('confirm-email')
  @ApiOperation({ summary: 'Confirmar email via link' })
  async confirmEmail(@Query('token') token: string, @Res() reply: FastifyReply) {
    try {
      await this.authService.confirmEmail(token)
      return reply.status(302).redirect(`https://arbitrax.tec.br/login?confirmed=true`)
    } catch {
      return reply.status(302).redirect(`https://arbitrax.tec.br/login?error=link-invalido`)
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login com email e senha' })
  @ApiResponse({ status: 200, description: 'Login bem-sucedido' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar OTP por email (login sem senha)' })
  @ApiResponse({ status: 200, description: 'Código enviado' })
  sendOtp(@Body('email') email: string) {
    return this.authService.sendEmailOtp(email)
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar OTP e autenticar' })
  @ApiResponse({ status: 200, description: 'Autenticado com sucesso' })
  @ApiResponse({ status: 401, description: 'Código inválido ou expirado' })
  verifyOtp(@Body() dto: OtpVerifyDto) {
    return this.authService.verifyEmailOtp(dto.email, dto.code)
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token' })
  @ApiResponse({ status: 200, description: 'Tokens renovados' })
  @ApiResponse({ status: 401, description: 'Refresh token inválido' })
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken)
  }
}
