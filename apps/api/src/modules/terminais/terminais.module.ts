import { Module } from '@nestjs/common'
import { TerminaisController } from './terminais.controller'
import { TerminaisService } from './terminais.service'

@Module({
  controllers: [TerminaisController],
  providers: [TerminaisService],
})
export class TerminaisModule {}
