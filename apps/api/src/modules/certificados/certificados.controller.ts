import { Controller, Post, Get, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { CertificadosService } from './certificados.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtPayload } from '@fretecheck/types'

@ApiTags('certificados')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('checkins')
export class CertificadosController {
  constructor(private service: CertificadosService) {}

  @Post(':id/certificate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Emitir certificado de tempo de espera (ICP-Brasil)' })
  emitir(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.emitir(id, user)
  }

  @Get(':id/certificate')
  @ApiOperation({ summary: 'Buscar certificado emitido para um check-in' })
  buscar(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.buscar(id, user)
  }
}

@ApiTags('certificados-publico')
@Controller('certificados')
export class CertificadosPublicController {
  constructor(private service: CertificadosService) {}

  @Get('publico/:numero')
  @ApiOperation({ summary: 'Verificar autenticidade de um certificado (público, sem autenticação)' })
  buscarPublico(@Param('numero') numero: string) {
    return this.service.buscarPublico(numero)
  }
}
