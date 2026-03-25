import { Controller, Get, Param, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { TerminaisService } from './terminais.service'

@ApiTags('terminais')
@Controller('terminals')
export class TerminaisController {
  constructor(private service: TerminaisService) {}

  @Get()
  @ApiOperation({ summary: 'Listar terminais com score (público)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'cidade', required: false })
  @ApiQuery({ name: 'estado', required: false })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('cidade') cidade?: string,
    @Query('estado') estado?: string,
  ) {
    return this.service.findAll(page, limit, cidade, estado)
  }

  @Get('heatmap')
  @ApiOperation({ summary: 'Dados de heatmap de terminais (público)' })
  getHeatmap() {
    return this.service.getHeatmap()
  }

  @Get('ranking')
  @ApiOperation({ summary: 'Ranking dos piores terminais (público)' })
  @ApiQuery({ name: 'limit', required: false })
  getRanking(@Query('limit') limit?: number) {
    return this.service.getRanking(limit)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de um terminal (público)' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id)
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Estatísticas de espera do terminal (últimos 30 dias)' })
  getStats(@Param('id') id: string) {
    return this.service.getStats(id)
  }
}
