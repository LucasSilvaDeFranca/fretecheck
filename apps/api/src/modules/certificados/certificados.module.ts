import { Module } from '@nestjs/common'
import { CertificadosController, CertificadosPublicController } from './certificados.controller'
import { CertificadosService } from './certificados.service'

@Module({
  controllers: [CertificadosController, CertificadosPublicController],
  providers: [CertificadosService],
  exports: [CertificadosService],
})
export class CertificadosModule {}
