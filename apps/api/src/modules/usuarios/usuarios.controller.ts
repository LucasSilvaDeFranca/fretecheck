import { Controller, Get, Delete, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { UsuariosService } from './usuarios.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Role, JwtPayload } from '@fretecheck/types'

@ApiTags('usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsuariosController {
  constructor(private service: UsuariosService) {}

  @Get('me')
  @ApiOperation({ summary: 'Perfil do usuário autenticado' })
  getMe(@CurrentUser() user: JwtPayload) {
    return this.service.getProfile(user.sub)
  }

  @Get()
  @Roles(Role.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Listar todos os usuários (admin)' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.findAll(user, page, limit)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover conta (LGPD — soft delete)' })
  delete(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.softDelete(id, user)
  }
}
