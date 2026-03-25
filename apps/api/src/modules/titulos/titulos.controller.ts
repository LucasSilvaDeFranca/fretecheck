import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { TitulosService, CreateTituloDto, ContestarTituloDto } from './titulos.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Role, JwtPayload } from '@fretecheck/types'

@ApiTags('titulos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('titles')
export class TitulosController {
  constructor(private service: TitulosService) {}

  @Post()
  @Roles(Role.TRANSPORTADORA_ADMIN, Role.TRANSPORTADORA_FINANCEIRO, Role.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Gerar título de cobrança' })
  create(@Body() dto: CreateTituloDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user)
  }

  @Get()
  @Roles(
    Role.TRANSPORTADORA_ADMIN,
    Role.TRANSPORTADORA_OPERACIONAL,
    Role.TRANSPORTADORA_FINANCEIRO,
    Role.PLATFORM_ADMIN,
  )
  @ApiOperation({ summary: 'Listar títulos da transportadora' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.findAll(user, page, limit)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de um título' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOne(id, user)
  }

  @Post(':id/contest')
  @ApiOperation({ summary: 'Contestar um título' })
  contestar(
    @Param('id') id: string,
    @Body() dto: ContestarTituloDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.contestar(id, dto, user)
  }
}
