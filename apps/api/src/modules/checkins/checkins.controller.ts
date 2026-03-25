import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { CheckinsService } from './checkins.service'
import { CreateCheckinDto } from './dto/create-checkin.dto'
import { CreateApontamentoDto } from './dto/create-apontamento.dto'
import { CheckoutDto } from './dto/checkout.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtPayload } from '@fretecheck/types'

@ApiTags('checkins')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('checkins')
export class CheckinsController {
  constructor(private service: CheckinsService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar chegada (check-in)' })
  create(@Body() dto: CreateCheckinDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user)
  }

  @Get()
  @ApiOperation({ summary: 'Listar check-ins do motorista autenticado' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.findAll(user.sub, page, limit)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de um check-in' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOne(id, user)
  }

  @Post(':id/apontamento')
  @ApiOperation({ summary: 'Registrar causa do atraso (apontamento)' })
  createApontamento(
    @Param('id') id: string,
    @Body() dto: CreateApontamentoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createApontamento(id, dto, user)
  }

  @Patch(':id/checkout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Registrar saída (check-out) com cálculo de tempo' })
  checkout(
    @Param('id') id: string,
    @Body() dto: CheckoutDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.checkout(id, dto, user)
  }
}
