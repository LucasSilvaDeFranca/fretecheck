import { Module } from '@nestjs/common'
import { CheckinsController } from './checkins.controller'
import { CheckinsService } from './checkins.service'
import { BrasilIdModule } from '../integrations/brasil-id/brasil-id.module'

@Module({
  imports: [BrasilIdModule],
  controllers: [CheckinsController],
  providers: [CheckinsService],
  exports: [CheckinsService],
})
export class CheckinsModule {}
