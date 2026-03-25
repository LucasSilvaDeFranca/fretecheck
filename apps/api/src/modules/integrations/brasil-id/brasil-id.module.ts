import { Module } from '@nestjs/common'
import { BrasilIdService } from './brasil-id.service'

@Module({
  providers: [BrasilIdService],
  exports: [BrasilIdService],
})
export class BrasilIdModule {}
