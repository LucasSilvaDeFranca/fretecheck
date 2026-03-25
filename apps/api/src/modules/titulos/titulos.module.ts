import { Module } from '@nestjs/common'
import { TitulosController } from './titulos.controller'
import { TitulosService } from './titulos.service'

@Module({
  controllers: [TitulosController],
  providers: [TitulosService],
})
export class TitulosModule {}
